import { callLLM, extractJSON } from "./llmService.js";

const MIN_SLIDES = 10;
const MAX_SLIDES = 15;

function clampSlideCount(value, defaultVal = 15) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return defaultVal;
  return Math.max(MIN_SLIDES, Math.min(MAX_SLIDES, n));
}

/**
 * Normalize the outline JSON to guarantee MIN_SLIDES <= total <= MAX_SLIDES.
 */
function normalizeOutlineSlideCount(outlineJson, targetSlideCount, projectName) {
  if (typeof outlineJson !== "object" || outlineJson === null || Array.isArray(outlineJson)) {
    return outlineJson;
  }

  const sectionOrder = [];
  let flatTitles = [];

  for (const [section, slides] of Object.entries(outlineJson)) {
    sectionOrder.push(section);
    if (Array.isArray(slides)) {
      for (const title of slides) {
        const t = String(title).trim();
        if (t) flatTitles.push({ section, title: t });
      }
    }
  }

  if (flatTitles.length === 0) {
    flatTitles = [
      { section: "Introduction", title: `${projectName} Overview` },
      { section: "Introduction", title: "Agenda" },
      { section: "Analysis", title: "Current Landscape" },
      { section: "Analysis", title: "Key Challenges" },
      { section: "Analysis", title: "Opportunities" },
      { section: "Strategy", title: "Strategic Priorities" },
      { section: "Strategy", title: "Recommended Approach" },
      { section: "Execution", title: "Implementation Plan" },
      { section: "Execution", title: "Success Metrics" },
      { section: "Conclusion", title: "Next Steps" }
    ];
  }

  // Trim to max
  if (flatTitles.length > MAX_SLIDES) flatTitles = flatTitles.slice(0, MAX_SLIDES);

  // Pad to min
  const supplementals = [
    "Executive Summary", "Problem Statement", "Market Context",
    "Risk Considerations", "Resource Plan", "Timeline & Milestones",
    "Action Plan", "Final Recommendations"
  ];
  let suppIdx = 0;
  while (flatTitles.length < MIN_SLIDES) {
    const title = suppIdx < supplementals.length
      ? supplementals[suppIdx++]
      : `Additional Insight ${flatTitles.length + 1}`;
    flatTitles.push({ section: "Additional Insights", title });
  }

  const target = clampSlideCount(targetSlideCount);
  if (flatTitles.length > target) flatTitles = flatTitles.slice(0, target);

  // Rebuild
  const normalized = {};
  for (const s of sectionOrder) normalized[s] = [];
  for (const { section, title } of flatTitles) {
    if (!(section in normalized)) normalized[section] = [];
    normalized[section].push(title);
  }
  // Remove empty sections
  for (const k of Object.keys(normalized)) {
    if (normalized[k].length === 0) delete normalized[k];
  }
  return normalized;
}

/**
 * Run the slide outline agent.
 * @param {{ user_input: string, project_info: string, slide_count: number }} state
 * @returns {Promise<{ slide_outline: object, slide_count: number }>}
 */
export async function slideOutlineAgent(state) {
  const projectName = state.user_input || "";
  const projectContext = state.project_info || "";
  const targetSlideCount = clampSlideCount(state.slide_count || 15);

  const sectionsRange = targetSlideCount <= 8 ? "3-5 sections" : "4-6 sections";
  const slidesPerSection = targetSlideCount <= 8 ? "2-3 slide titles per section" : "2-4 slide titles per section";

  const prompt = `You are a presentation architect focused on creating clean, readable presentations with optimal content density.

Context:
- Project/Prompt: ${projectName}
- Additional Details: ${projectContext}
- Target Slide Count: ${targetSlideCount} slides (including title slide)

CRITICAL DESIGN PRINCIPLES:
- Prioritize readability: each slide should have 4-6 main points maximum
- Prefer more focused slides over dense content-heavy slides
- Create exactly around ${targetSlideCount} total slides (±2 slides acceptable)

Structure Requirements:
- ${sectionsRange} total, each addressing a key aspect of the topic
- Each section should have ${slidesPerSection}
- Each slide title should represent a single concept or focused discussion point

Content Optimization:
- Slide titles must be specific and actionable
- Avoid generic titles
- Break complex concepts into multiple digestible slides

STRICT OUTPUT FORMAT — READ CAREFULLY:
- Output ONLY a raw JSON object. Nothing else. No preamble, no explanation, no bullet lists, no markdown.
- DO NOT repeat or summarize the instructions. DO NOT use * or # or - formatting.
- The VERY FIRST character of your response must be { and the VERY LAST character must be }.
- Use double-quoted keys and values only. No single quotes. No trailing commas.
- Exact required format:
{"Section A":["Slide Title 1","Slide Title 2"],"Section B":["Slide Title 3","Slide Title 4"]}
YOUR RESPONSE MUST START WITH { AND END WITH } — NO EXCEPTIONS.`;

  const raw = await callLLM(prompt, 0.7);
  if (!raw?.trim()) throw new Error("LLM returned empty response for slide outline");

  let outlineJson;
  try {
    outlineJson = extractJSON(raw, "object");
    if (typeof outlineJson !== "object" || outlineJson === null || Array.isArray(outlineJson)) {
      throw new Error("Outline JSON is not an object");
    }
  } catch (err) {
    throw new Error(`Invalid JSON from outline agent: ${err.message}. Preview: ${String(raw).slice(0, 200)}`);
  }

  const normalized = normalizeOutlineSlideCount(outlineJson, targetSlideCount, projectName);
  return { slide_outline: normalized, slide_count: targetSlideCount };
}
