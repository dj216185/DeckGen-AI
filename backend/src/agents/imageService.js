import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

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
 * Build a concise, clean image search query from slide metadata.
 */
export function craftImageQuery(topic, imagePrompt = "", section = "") {
  // Prefer image_prompt if it's non-generic
  const source = imagePrompt?.trim() || `${topic} ${section}`;

  // Strip markdown noise
  let text = source
    .replace(/\*\*/g, "")
    .replace(/[#*_`~\[\]()]/g, " ")
    .replace(/[^\w\s]/g, " ");

  // Filter stopwords and short tokens
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w));

  // Cap at 5 meaningful words
  const query = words.slice(0, 5).join(" ");

  return query || topic || "technology background";
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
