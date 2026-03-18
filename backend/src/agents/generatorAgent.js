import { callLLM, cleanLLMResponse } from "./llmService.js";
import { searchAssistant } from "./searchService.js";

/**
 * Parse a JSON array from an LLM response with salvage mode.
 */
function parseBatchSlidesResilient(cleaned) {
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* continue */ }

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* continue */ }
  }

  // Salvage: extract complete objects
  const recovered = [];
  const objPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g;
  let match;
  while ((match = objPattern.exec(cleaned)) !== null) {
    try {
      const obj = JSON.parse(match[0]);
      if (typeof obj === "object" && obj !== null && obj.slide_title) {
        recovered.push(obj);
      }
    } catch { /* skip */ }
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

  // Step 3: Batch generate all slides via Gemini with rich mixed-format content
  const batchPrompt = `You are a senior presentation designer and writer. Create ALL slides for this presentation. Each slide must feel like it was crafted by a professional — rich, readable, and visually structured.

Project: ${userInput}
Additional Context: ${projectInfo}

Research Data:
${searchResults}

Slides to Generate:
${slidesList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SLIDE TYPE GUIDE — Choose the best layout per slide:

1. "bullets" — Pure bullet list. Best for: feature comparisons, step-by-step processes, key takeaways, requirements.
   Format:
   • Main point with **key term** highlighted
       - Supporting sub-detail (indent with 4 spaces + dash)
   • Second main point
       - Another sub-detail

2. "para_bullets" — Opening paragraph followed by bullets. Best for: context-setting slides, introductions, analysis slides.
   Format:
   A 2–3 sentence paragraph that sets up the topic with context, background, or the core insight. Use **bold** for emphasis.
   
   • First key takeaway or action
       - Detail or example
   • Second key takeaway
   • Third key takeaway

3. "paragraph" — Flowing text only. Best for: executive summaries, definitions, conclusions, storytelling slides.
   Format:
   First paragraph: 2–3 sentences with the core idea. **Bold key figures or terms.** Keep sentences crisp.
   
   Second paragraph: 2–3 sentences expanding with evidence, data, or implications.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT RULES:
- Each slide must feel COMPLETE and SELF-CONTAINED — no "see next slide" references
- Mix slide types across the presentation for variety (do NOT make every slide "bullets")
- For bullets: max 5 main bullets, each under 18 words. Sub-bullets under 14 words.
- For paragraphs: max 2 paragraphs per slide, each 2–3 sentences
- For para_bullets: 1 paragraph (2–3 sentences) + 3–4 bullets
- Bold emphasis (**text**) for: key statistics, named concepts, percentages, critical terms
- NO generic filler like "This slide covers..." or "In conclusion..."
- NO markdown headers inside slide_content (no # lines)
- Slide titles are handled separately — don't repeat them in slide_content

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT — Return ONLY a valid JSON array, no extra text:
[
  {
    "slide_title": "exact title from slides list",
    "section": "section name from slides list",
    "slide_type": "bullets | para_bullets | paragraph",
    "slide_content": "content using the format for the chosen slide_type",
    "image_prompt": "optional short keyword phrase or empty string"
  }
]

Generate ALL ${totalSlides} slides now:`;

  let slidesStructuredJson = [];

  try {
    const response = await callLLM(batchPrompt, 0.75);
    if (!response) throw new Error("Empty response from LLM");

    const cleanedResponse = cleanLLMResponse(response);
    if (!cleanedResponse.trim()) throw new Error("Empty cleaned response");

    const batchSlides = parseBatchSlidesResilient(cleanedResponse);

    for (const slideJson of batchSlides) {
      const titleSafe = sanitizeText(slideJson.slide_title || "Untitled");
      const sectionSafe = sanitizeText(slideJson.section || "General");
      const typeSafe = sanitizeText(slideJson.slide_type || "bullets");

      let rawContent = slideJson.slide_content || "";
      if (Array.isArray(rawContent)) rawContent = rawContent.join("\n");
      const contentSafe = sanitizeText(rawContent);

      const imagePromptRaw = String(slideJson.image_prompt || "").trim();
      const imagePromptSimple = imagePromptRaw.length > 60 ? "" : imagePromptRaw;

      slidesStructuredJson.push({
        slide_title: titleSafe,
        section: sectionSafe,
        slide_type: typeSafe,
        slide_content: contentSafe || `• Key insights about ${titleSafe}\n• Professional analysis and findings\n• Strategic recommendations`,
        image_prompt: imagePromptSimple
      });
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
      reconciledSlides.push({
        slide_title: sanitizeText(slide_title),
        section: sanitizeText(section),
        slide_type: matched.slide_type,
        slide_content: matched.slide_content,
        image_prompt: matched.image_prompt
      });
    } else {
      // No match — generate a placeholder so the slide isn't missing
      console.warn(`[generator] No match for outline slide "${slide_title}" — using fallback content`);
      reconciledSlides.push({
        slide_title: sanitizeText(slide_title),
        section: sanitizeText(section),
        slide_type: "bullets",
        slide_content: `• Key insights about ${slide_title}\n• Research-backed analysis\n• Strategic recommendations and next steps`,
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
