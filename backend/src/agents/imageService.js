import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// 1x1 PNG fallback used when external image sources fail.
const LOCAL_PLACEHOLDER_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5/Y4sAAAAASUVORK5CYII=";

// ─── Stopwords for query cleanup ─────────────────────────────────────────────
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "are", "was", "were", "be",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "can", "this", "that",
  "these", "those", "here", "there", "where", "when", "how", "why", "what"
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip markdown noise and split into meaningful words.
 */
function extractWords(text) {
  return String(text || "")
    .replace(/\*\*/g, "")
    .replace(/[#*_`~\[\]()•—–]/g, " ")
    .replace(/[^\w\s]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Build a concise, clean image search query from slide metadata.
 */
export function craftImageQuery(topic, imagePrompt = "", section = "") {
  // Prefer image_prompt if it's non-generic
  const source = imagePrompt?.trim() || `${topic} ${section}`;
  const words = extractWords(source);
  const query = words.slice(0, 5).join(" ");
  return query || topic || "technology background";
}

/**
 * Generate 3 distinct search queries for a single slide so the images are diverse.
 * Each query approaches the slide from a different angle.
 *
 * @param {string} slideTitle
 * @param {string} section
 * @param {string} imagePrompt - LLM-generated image keyword
 * @param {string} slideContent - the actual bullet/paragraph content
 * @param {string} userTopic - the overall presentation topic
 * @returns {string[]} - 3 distinct queries
 */
export function craftDiverseImageQueries(slideTitle, section = "", imagePrompt = "", slideContent = "", userTopic = "") {
  const titleWords = extractWords(slideTitle);
  const sectionWords = extractWords(section);
  const promptWords = extractWords(imagePrompt);
  const contentWords = extractWords(slideContent);
  const topicWords = extractWords(userTopic);

  // Deduplicate: pool of all unique words ordered by relevance
  const seen = new Set();
  const allWords = [];
  for (const w of [...promptWords, ...titleWords, ...sectionWords, ...contentWords, ...topicWords]) {
    if (!seen.has(w)) { seen.add(w); allWords.push(w); }
  }

  const queries = [];

  // Query 1: image_prompt keywords + slide title (most specific)
  const q1Words = [...new Set([...promptWords, ...titleWords])].slice(0, 5);
  if (q1Words.length >= 2) queries.push(q1Words.join(" "));

  // Query 2: section + key content words (different angle)
  const usedInQ1 = new Set(q1Words);
  const q2Candidates = [...sectionWords, ...contentWords].filter(w => !usedInQ1.has(w));
  // Add 1-2 anchor words from title for relevance, then unique content words
  const q2Words = [...titleWords.slice(0, 2), ...q2Candidates].slice(0, 5);
  if (q2Words.length >= 2) queries.push([...new Set(q2Words)].join(" "));

  // Query 3: topic + different content words (broadest, still relevant)
  const usedSoFar = new Set([...q1Words, ...q2Words]);
  const q3Fresh = allWords.filter(w => !usedSoFar.has(w));
  const q3Words = [...topicWords.slice(0, 2), ...q3Fresh].slice(0, 5);
  if (q3Words.length >= 2) queries.push([...new Set(q3Words)].join(" "));

  // Fill any missing slots with variations
  while (queries.length < 3) {
    // Shift window over allWords to create variety
    const offset = queries.length * 3;
    const fallback = allWords.slice(offset, offset + 5).join(" ");
    queries.push(fallback || userTopic || slideTitle || "professional presentation");
  }

  // Deduplicate queries — if two ended up identical, tweak the duplicate
  for (let i = 1; i < queries.length; i++) {
    if (queries[i] === queries[i - 1] || !queries[i].trim()) {
      queries[i] = `${userTopic} ${slideTitle}`.replace(/[^\w\s]/g, " ").trim().split(/\s+/).slice(0, 5).join(" ") + ` ${i}`;
    }
  }

  return queries.slice(0, 3);
}

/**
 * Get the VQD token DDG requires for image queries.
 */
async function getDdgVqd(query) {
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=images`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(8000)
  });
  const html = await res.text();
  const m = html.match(/vqd=['"]?([\d-]+)['"]?/) || html.match(/vqd=([\d-]+)/);
  if (!m) throw new Error("Could not extract VQD token from DDG HTML");
  return m[1];
}

/**
 * Search DDG Images and return an array of image URLs.
 */
async function searchDdgImages(query, maxResults = 10) {
  const vqd = await getDdgVqd(query);

  const params = new URLSearchParams({
    q: query,
    vqd,
    p: "1",
    f: ",,,,,",
    s: "0",
    o: "json"
  });

  const res = await fetch(`https://duckduckgo.com/i.js?${params}`, {
    headers: {
      "User-Agent": USER_AGENT,
      "Referer": "https://duckduckgo.com/",
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "en-US,en;q=0.9"
    },
    signal: AbortSignal.timeout(10000)
  });

  const data = await res.json();
  const results = (data.results || []).slice(0, maxResults);
  return results.map(r => r.image || r.thumbnail || r.url).filter(Boolean);
}

/**
 * Download an image URL to a local file.
 * Returns the saved file path, or null on failure.
 */
async function downloadImage(url, outDir, filename) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "image/*,*/*;q=0.8",
        "Referer": "https://duckduckgo.com/"
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;

    const ext = contentType.includes("png") ? ".png"
      : contentType.includes("webp") ? ".webp"
      : contentType.includes("gif") ? ".gif"
      : ".jpg";

    const filePath = path.join(outDir, filename + ext);
    fs.mkdirSync(outDir, { recursive: true });

    const body = res.body;
    if (!body) return null;

    await pipeline(Readable.fromWeb(body), fs.createWriteStream(filePath));

    // Validate the file has content
    const stat = fs.statSync(filePath);
    if (stat.size < 1000) {
      fs.unlinkSync(filePath);
      return null;
    }

    return filePath;
  } catch {
    return null;
  }
}

/**
 * Download a free stock image variant using deterministic seed.
 * This avoids paid APIs while guaranteeing broad image availability.
 */
async function downloadSeededStockImage(seed, outDir, filename) {
  const safeSeed = String(seed || "deckgen").replace(/[^a-z0-9_-]/gi, "_");
  const url = `https://picsum.photos/seed/${encodeURIComponent(safeSeed)}/1600/900`;
  return downloadImage(url, outDir, filename);
}

/**
 * Always-available local placeholder fallback.
 */
function writeLocalPlaceholderImage(outDir, filename) {
  try {
    fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(outDir, `${filename}.png`);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, Buffer.from(LOCAL_PLACEHOLDER_PNG_BASE64, "base64"));
    }
    return filePath;
  } catch {
    return null;
  }
}

/**
 * Main: fetch one image for a slide.
 * Tries multiple URLs until one downloads successfully.
 *
 * @param {string} query - search keywords
 * @param {string} outDir - local dir to save image
 * @param {string} safeBasename - filename prefix (no extension)
 * @returns {Promise<string|null>} - local file path, or null
 */
export async function fetchSlideImage(query, outDir, safeBasename) {
  if (!query?.trim()) return null;

  try {
    const urls = await searchDdgImages(query, 15);
    if (!urls.length) return null;

    for (let i = 0; i < Math.min(urls.length, 8); i++) {
      const filePath = await downloadImage(urls[i], outDir, `${safeBasename}_${i}`);
      if (filePath) {
        console.log(`[imageService] ✓ Downloaded image for "${query}" → ${path.basename(filePath)}`);
        return filePath;
      }
    }

    console.warn(`[imageService] ✗ No downloadable image found for "${query}"`);
    return null;
  } catch (err) {
    console.warn(`[imageService] ✗ Image search failed for "${query}": ${err.message}`);
    return null;
  }
}

/**
 * Fetch 3 diverse images for a slide using different search queries.
 * Each image comes from a different query so they look genuinely different.
 *
 * @param {string[]} queries - 3 distinct search queries
 * @param {string} outDir - local dir to save images
 * @param {string} safeBasename - filename prefix
 * @returns {Promise<string[]>} - array of local file paths (up to 3)
 */
export async function fetchSlideImageOptions(queries, outDir, safeBasename) {
  if (!queries?.length) return [];

  const results = [];
  const usedDomains = new Set(); // avoid same-site duplicates

  for (let q = 0; q < queries.length; q++) {
    const query = queries[q];
    if (!query?.trim()) continue;

    try {
      const urls = await searchDdgImages(query, 12);

      for (const url of urls) {
        // Skip URLs from domains we already downloaded from
        try {
          const domain = new URL(url).hostname;
          if (usedDomains.has(domain)) continue;
        } catch { /* ignore parse errors */ }

        const filePath = await downloadImage(url, outDir, `${safeBasename}_opt${results.length}`);
        if (filePath) {
          try { usedDomains.add(new URL(url).hostname); } catch {}
          results.push(filePath);
          console.log(`[imageService] ✓ Option ${results.length}/3 for "${query}" → ${path.basename(filePath)}`);
          break; // one image per query
        }
      }
    } catch (err) {
      console.warn(`[imageService] ✗ Query ${q + 1} failed for "${query}": ${err.message}`);
    }
  }

  // If we still have fewer than 3, try more results from the first query as fallback
  if (results.length < 3 && queries[0]?.trim()) {
    try {
      const urls = await searchDdgImages(queries[0], 20);
      for (const url of urls) {
        if (results.length >= 3) break;
        try {
          const domain = new URL(url).hostname;
          if (usedDomains.has(domain)) continue;
        } catch {}
        const filePath = await downloadImage(url, outDir, `${safeBasename}_opt${results.length}_fb`);
        if (filePath) {
          try { usedDomains.add(new URL(url).hostname); } catch {}
          results.push(filePath);
        }
      }
    } catch {}
  }

  // Fill remaining slots with seeded stock images (free source, no API keys).
  if (results.length < 3) {
    const joined = queries.join("_").replace(/[^a-z0-9_]/gi, "_").slice(0, 60) || "slide";
    let attempts = 0;
    while (results.length < 3 && attempts < 6) {
      const seed = `${safeBasename}_${joined}_${attempts}`;
      const stock = await downloadSeededStockImage(seed, outDir, `${safeBasename}_stock_${results.length}_${attempts}`);
      if (stock) results.push(stock);
      attempts++;
    }
  }

  // Final hard fallback: local placeholder images so every slide has options.
  while (results.length < 3) {
    const placeholder = writeLocalPlaceholderImage(outDir, `${safeBasename}_placeholder_${results.length}`);
    if (!placeholder) break;
    results.push(placeholder);
  }

  // Deduplicate while preserving order.
  const unique = [];
  const seen = new Set();
  for (const p of results) {
    if (!seen.has(p)) {
      seen.add(p);
      unique.push(p);
    }
  }

  // If dedupe reduced list, pad by repeating last available image.
  while (unique.length < 3 && unique.length > 0) {
    unique.push(unique[unique.length - 1]);
  }

  console.log(`[imageService] ✓ ${unique.length}/3 diverse options for slide "${safeBasename}"`);
  return unique.slice(0, 3);
}

/**
 * Fetch images for all slides in parallel (with concurrency cap).
 *
 * @param {Array<{slide_title, image_prompt, section}>} slides
 * @param {string} outDir
 * @param {number} concurrency
 * @returns {Promise<Map<string, string|null>>} - map of slide_title → filePath
 */
export async function fetchAllSlideImages(slides, outDir, concurrency = 3) {
  const results = new Map();
  const queue = [...slides];
  const topic = slides[0]?.slide_title || "";

  async function worker() {
    while (queue.length > 0) {
      const slide = queue.shift();
      if (!slide) continue;

      const query = craftImageQuery(topic, slide.image_prompt, slide.section);
      const safeBase = (slide.slide_title || "slide")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40);

      const filePath = await fetchSlideImage(query, outDir, safeBase);
      results.set(slide.slide_title, filePath);
    }
  }

  // Run N workers in parallel
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

/**
 * Fetch 3 diverse image options for all slides (for review/selection).
 *
 * @param {Array<{slide_title, image_prompt, section, slide_content}>} slides
 * @param {string} outDir
 * @param {number} concurrency
 * @param {string} userTopic - the overall presentation topic
 * @returns {Promise<Map<string, string[]>>} - map of slide_title → [filePath1, filePath2, filePath3]
 */
export async function fetchAllSlideImageOptions(slides, outDir, concurrency = 2, userTopic = "") {
  const results = new Map();
  const queue = [...slides];

  async function worker() {
    while (queue.length > 0) {
      const slide = queue.shift();
      if (!slide) continue;

      const safeBase = (slide.slide_title || "slide")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40);

      // Generate 3 diverse search queries for this slide
      const queries = craftDiverseImageQueries(
        slide.slide_title,
        slide.section,
        slide.image_prompt,
        slide.slide_content,
        userTopic
      );
      console.log(`[imageService] Slide "${slide.slide_title}" queries: ${queries.map(q => `"${q}"`).join(", ")}`);

      const paths = await fetchSlideImageOptions(queries, outDir, safeBase);
      results.set(slide.slide_title, paths);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}
