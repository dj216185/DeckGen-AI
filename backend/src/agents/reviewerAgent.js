/**
 * Reviewer agent - validates and sanitizes slide content.
 * Lightweight pass-through validation (no extra LLM call for performance).
 */

function sanitizeText(text) {
  if (!text) return "";
  return String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

/**
 * @param {object} state
 * @returns {{ final_output: string, reviewed_slides_json: object[] }}
 */
export function reviewerAgent(state) {
  const slidesJson = state.generated_slides_json || [];

  if (!slidesJson.length) {
    return { final_output: "", reviewed_slides_json: [] };
  }

  const reviewedSlides = slidesJson.map((slide) => ({
    slide_title: sanitizeText(slide.slide_title || "Untitled"),
    section: sanitizeText(slide.section || ""),
    slide_type: sanitizeText(slide.slide_type || "content"),
    slide_content: sanitizeText(slide.slide_content || ""),
    image_prompt: sanitizeText(slide.image_prompt || "")
  }));

  const markdownOutput = reviewedSlides
    .map((s) => `# ${s.slide_title}\n${s.slide_content}`)
    .join("\n\n");

  return {
    final_output: markdownOutput,
    reviewed_slides_json: reviewedSlides
  };
}
