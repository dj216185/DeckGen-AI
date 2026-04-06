import { callLLM, extractJSON } from "./llmService.js";

const MIN_SLIDES = 10;
const MAX_SLIDES = 15;

// Keys a model might output as part of its reasoning / instruction-echo.
// Do NOT include "section" or "slide" here — those are legitimate outline keys.
const META_KEY_RE = /^(role|goal|constraint|note|instruction|output|format|topic|context|example|requirement|objective|step|structure|principle|rule|description|response)$/i;

function clampSlideCount(value, defaultVal = 15) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return defaultVal;
  return Math.max(MIN_SLIDES, Math.min(MAX_SLIDES, n));
}

/**
 * Remove meta / reasoning keys that some models add to the JSON output,
 * and clean up slide title strings (strip leading numbers, "Title Slide:" etc.).
 */
function sanitizeOutline(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;

  const cleaned = {};

  for (const [key, val] of Object.entries(raw)) {
    // Skip meta-vocabulary keys
    if (META_KEY_RE.test(key.trim())) continue;
    // Skip keys whose value is not a non-empty array
    if (!Array.isArray(val) || val.length === 0) continue;

    // Clean each slide title string
    const titles = val
      .map((t) => String(t)
        .replace(/^\d+[\.\)]\s*/, "")          // strip "1. " or "1) " prefixes
        .replace(/^(title\s*slide\s*[:–-]?\s*)/i, "") // strip "Title Slide:" prefix
        .replace(/^(slide\s*\d+\s*[:–-]?\s*)/i, "")  // strip "Slide 3:" prefix
        .replace(/\*+/g, "")                    // strip stray markdown asterisks
        .trim()
      )
      .filter((t) => t.length > 2 && t.length < 120);

    if (titles.length > 0) {
      cleaned[key] = titles;
    }
  }

  return cleaned;
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
      { section: "Introduction",     title: `${projectName} Overview`       },
      { section: "Introduction",     title: "Key Themes & Agenda"           },
      { section: "Analysis",         title: "Current Landscape"             },
      { section: "Analysis",         title: "Key Challenges"                },
      { section: "Analysis",         title: "Emerging Opportunities"        },
      { section: "Strategy",         title: "Strategic Priorities"          },
      { section: "Strategy",         title: "Recommended Approach"          },
      { section: "Execution",        title: "Implementation Roadmap"        },
      { section: "Execution",        title: "Success Metrics & KPIs"        },
      { section: "Conclusion",       title: "Next Steps & Call to Action"   },
    ];
  }

  if (flatTitles.length > MAX_SLIDES) flatTitles = flatTitles.slice(0, MAX_SLIDES);

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

  const normalized = {};
  for (const s of sectionOrder) normalized[s] = [];
  for (const { section, title } of flatTitles) {
    if (!(section in normalized)) normalized[section] = [];
    normalized[section].push(title);
  }
  for (const k of Object.keys(normalized)) {
    if (normalized[k].length === 0) delete normalized[k];
  }
  return normalized;
}

/**
 * Run the slide outline agent.
 */
export async function slideOutlineAgent(state) {
  const projectName      = state.user_input   || "";
  const projectContext   = state.project_info || "";
  const targetSlideCount = clampSlideCount(state.slide_count || 15);
  const sectionsCount    = targetSlideCount <= 8 ? "3–4" : "4–6";
  const slidesPerSection = targetSlideCount <= 8 ? "2–3"  : "2–4";

  // ── Minimal, echo-resistant prompt ──────────────────────────────────────
  // Avoid verbose header words ("Role:", "Constraint:", "Goal:", "Context:")
  // that smaller models echo back as JSON keys.
  const contextLine = projectContext.trim()
    ? `Additional context: ${projectContext.trim()}`
    : "";

  const prompt = `Create a presentation outline for: "${projectName}"
${contextLine}
Total slides: ${targetSlideCount} (±2 acceptable). Sections: ${sectionsCount}. Slides per section: ${slidesPerSection}.
Slide titles must be specific and actionable — no generic titles.

Output ONLY the following JSON format with no other text:
{"Section Name":["Slide Title 1","Slide Title 2"],"Another Section":["Slide Title 3","Slide Title 4"]}

First character MUST be {. Last character MUST be }. No markdown, no explanation, no preamble.`;

  const raw = await callLLM(prompt, 0.6);
  if (!raw?.trim()) throw new Error("LLM returned empty response for slide outline");

  // Log raw response for diagnostics
  console.log(`[outline] LLM response (${raw.length} chars): ${raw.slice(0, 400)}`);

  let outlineJson;
  try {
    const parsed = extractJSON(raw, "object");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Parsed value is not an object");
    }
    // Strip any meta-reasoning keys the model smuggled in
    outlineJson = sanitizeOutline(parsed);
    console.log(`[outline] Parsed sections: ${Object.keys(outlineJson).join(", ")} (${Object.values(outlineJson).flat().length} slides total)`);
    if (Object.keys(outlineJson).length === 0) {
      throw new Error("All keys were filtered as meta-data — model did not output a real outline");
    }
  } catch (err) {
    throw new Error(`Invalid JSON from outline agent: ${err.message}. Preview: ${String(raw).slice(0, 200)}`);
  }

  const normalized = normalizeOutlineSlideCount(outlineJson, targetSlideCount, projectName);
  return { slide_outline: normalized, slide_count: targetSlideCount };
}
