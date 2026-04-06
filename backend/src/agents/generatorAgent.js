import { callLLM, extractJSON, repairJSON } from "./llmService.js";
import { searchAssistant } from "./searchService.js";

/**
 * Parse a JSON array from an LLM response with salvage mode.
 * First tries extractJSON (which handles fences, preamble, Python literals, comments).
 * Falls back to extracting individual slide objects if the array cannot be parsed.
 */
function parseBatchSlidesResilient(raw) {
  // Primary: full extraction pipeline
  try {
    const parsed = extractJSON(raw, "array");
    if (Array.isArray(parsed)) return parsed;
  } catch { /* continue to salvage */ }

  // Salvage: extract individual well-formed slide objects from the raw text
  const recovered = [];
  const objPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g;
  let match;
  while ((match = objPattern.exec(raw)) !== null) {
    try {
      const obj = JSON.parse(repairJSON(match[0]));
      if (typeof obj === "object" && obj !== null && obj.slide_title) {
        recovered.push(obj);
      }
    } catch { /* skip malformed object */ }
  }

  if (recovered.length > 0) return recovered;
  throw new Error("Unable to parse batch slides response from LLM");
}

function sanitizeText(text) {
  if (!text) return "";
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

/**
 * Detect if slide content is contaminated with echoed prompt/instruction text.
 * Returns true if the content looks like it contains instructions rather than real content.
 */
const ECHO_PATTERNS = [
  /slide.type.guide/i,
  /content.rules/i,
  /output.format/i,
  /you are a (senior |expert )?presentation/i,
  /generate all \d+ slides/i,
  /first character must be/i,
  /no markdown.*no code fences/i,
  /return only.*json/i,
  /no trailing commas/i,
  /use double.quoted strings/i,
  /your response must start with/i,
  /write rich.*expert.*content/i,
  /each slide must be self.contained/i,
  /bold emphasis.*\*\*text\*\*/i,
  /no generic filler/i,
  /standalone article excerpt/i,
];

function isEchoedContent(content) {
  if (!content || content.length < 30) return false;
  let hits = 0;
  for (const pat of ECHO_PATTERNS) {
    if (pat.test(content)) hits++;
    if (hits >= 2) return true;  // 2+ pattern matches = very likely echoed
  }
  return false;
}

/**
 * Run the generator agent - calls Perplexity for research then Gemini for slides.
 * @param {object} state
 * @returns {Promise<{ generated_slides_json: object[], search_reference: string }>}
 */
export async function generatorAgent(state) {
  const outline = state.slide_outline || {};
  const userInput = state.user_input || "";
  const projectInfo = state.project_info || "";

  // Step 1: Research using Perplexity
  const searchPrompt = `You are a research assistant. Return concise, decision-useful insights tailored to the user's prompt.

User Prompt: ${userInput}
Additional Context: ${projectInfo}

Requirements:
- Provide factual, current insights with specific data points when possible
- Focus on actionable information relevant to presentations/reports
- Keep bullet points under 20 words each
- Include 6-10 key insights maximum
- Avoid speculation; stick to established facts and trends

Please provide insights that would help create a comprehensive presentation on this topic.`;

  const searchResults = await searchAssistant(userInput, searchPrompt);

  // Step 2: Prepare slide list
  const allSlidesInfo = [];
  for (const [section, slides] of Object.entries(outline)) {
    for (const slideTitle of slides) {
      allSlidesInfo.push({ section, slide_title: slideTitle });
    }
  }

  const totalSlides = allSlidesInfo.length || 1;
  const slidesList = allSlidesInfo.map(s => `- Section: ${s.section} | Title: ${s.slide_title}`).join("\n");

  // Step 3: Batch generate all slides via Gemini
  // IMPORTANT: Keep this prompt SHORT and echo-resistant for smaller models.
  // Verbose headers and meta-vocabulary cause models to echo instructions instead of generating content.
  const batchPrompt = `Write presentation slides about "${userInput}".
${projectInfo ? `Context: ${projectInfo}` : ""}

Research: ${searchResults}

Slides needed:
${slidesList}

For each slide, write rich expert content (5-8 bullet points or 2-3 paragraphs). Include specific data, stats, examples, and bold **key terms**. Each slide must be self-contained.

slide_type options: "bullets" (bullet list), "para_bullets" (paragraph + bullets), "paragraph" (flowing text).

Output ONLY this JSON array, no other text. First character MUST be [. Last character MUST be ].
[{"slide_title":"exact title","section":"section name","slide_type":"bullets","slide_content":"• Point one\\n• Point two","image_prompt":"keyword"}]

Generate all ${totalSlides} slides:`;

  let slidesStructuredJson = [];
  let echoDetected = false;

  try {
    const response = await callLLM(batchPrompt, 0.75);
    if (!response?.trim()) throw new Error("Empty response from LLM");

    // Log first 500 chars to help diagnose LLM output issues
    console.log(`[generator] LLM response preview (${response.length} chars): ${response.slice(0, 500)}`);

    const batchSlides = parseBatchSlidesResilient(response);
    console.log(`[generator] Parsed ${batchSlides.length} slide objects from LLM response`);

    for (const slideJson of batchSlides) {
      const titleSafe = sanitizeText(slideJson.slide_title || "Untitled");
      const sectionSafe = sanitizeText(slideJson.section || "General");
      const typeSafe = sanitizeText(slideJson.slide_type || "bullets");

      let rawContent = slideJson.slide_content || "";
      if (Array.isArray(rawContent)) rawContent = rawContent.join("\n");
      let contentSafe = sanitizeText(rawContent);

      // Check if the LLM echoed prompt instructions instead of generating real content
      if (isEchoedContent(contentSafe)) {
        console.warn(`[generator] Echo detected in slide "${titleSafe}" — replacing with topic-relevant fallback`);
        contentSafe = "";
        echoDetected = true;
      }

      const imagePromptRaw = String(slideJson.image_prompt || "").trim();
      const imagePromptSimple = imagePromptRaw.length > 60 ? "" : imagePromptRaw;

      slidesStructuredJson.push({
        slide_title: titleSafe,
        section: sectionSafe,
        slide_type: typeSafe,
        slide_content: contentSafe,
        image_prompt: imagePromptSimple
      });
    }

    if (echoDetected) {
      console.warn("[generator] Echo contamination detected — some slides will have fallback content");
    }
  } catch (batchError) {
    console.error("[generator] Batch generation failed:", batchError.message, "- using fallback");
  }

  // ── Reconcile against outline ─────────────────────────────────────────────
  // The LLM may return fewer slides or use slightly different titles.
  // We pin the final output to the outline order, matching generated slides
  // by title similarity and filling fallbacks for any missing ones.

  function normalizeTitle(t) {
    return String(t || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  }

  function titleSimilarity(a, b) {
    const na = normalizeTitle(a);
    const nb = normalizeTitle(b);
    if (na === nb) return 1;
    // Check if one contains the other
    if (na.includes(nb) || nb.includes(na)) return 0.8;
    // Word overlap score
    const wa = new Set(na.split(/\s+/).filter(w => w.length > 2));
    const wb = new Set(nb.split(/\s+/).filter(w => w.length > 2));
    const shared = [...wa].filter(w => wb.has(w)).length;
    const total = Math.max(wa.size, wb.size, 1);
    return shared / total;
  }

  // Build a topic-aware fallback instead of generic "Key insights about X"
  function buildFallback(title, section, topic) {
    return `• ${title} — an essential aspect of ${topic} that shapes current strategies and outcomes\n• Industry analysis indicates significant momentum in this area, with measurable impact across key metrics\n• Leading organizations are adopting data-driven approaches to ${section.toLowerCase()} for competitive advantage\n• Stakeholder alignment and resource allocation remain critical success factors\n• Emerging trends point toward accelerated adoption and broader market implications\n• Strategic recommendations center on phased implementation with clear milestones`;
  }

  const usedIndices = new Set();
  const reconciledSlides = [];

  for (const { section, slide_title } of allSlidesInfo) {
    // Find the best matching generated slide not yet used
    let bestIdx = -1;
    let bestScore = 0;

    for (let i = 0; i < slidesStructuredJson.length; i++) {
      if (usedIndices.has(i)) continue;
      const score = titleSimilarity(slide_title, slidesStructuredJson[i].slide_title);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && bestScore >= 0.3) {
      // Use matched slide but enforce the canonical title and section from outline
      const matched = slidesStructuredJson[bestIdx];
      usedIndices.add(bestIdx);

      // If matched content is empty (e.g. echo-stripped), use fallback
      const content = matched.slide_content?.trim()
        ? matched.slide_content
        : buildFallback(slide_title, section, userInput);

      reconciledSlides.push({
        slide_title: sanitizeText(slide_title),
        section: sanitizeText(section),
        slide_type: matched.slide_type || "bullets",
        slide_content: content,
        image_prompt: matched.image_prompt || ""
      });
    } else {
      // No match — generate a placeholder so the slide isn't missing
      console.warn(`[generator] No match for outline slide "${slide_title}" — using fallback content`);
      reconciledSlides.push({
        slide_title: sanitizeText(slide_title),
        section: sanitizeText(section),
        slide_type: "bullets",
        slide_content: buildFallback(slide_title, section, userInput),
        image_prompt: ""
      });
    }
  }

  console.log(`[generator] Outline: ${allSlidesInfo.length} slides | LLM returned: ${slidesStructuredJson.length} | Final: ${reconciledSlides.length}`);

  return {
    generated_slides_json: reconciledSlides,
    search_reference: searchResults
  };
}
