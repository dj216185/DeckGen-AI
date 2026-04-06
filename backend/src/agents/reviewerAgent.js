/**
 * Reviewer agent - validates and sanitizes slide content.
 * Lightweight pass-through validation (no extra LLM call for performance).
 */

function sanitizeText(text) {
  if (!text) return "";
  return String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

/**
 * Validate and sanitize chart data structure.
 * Returns cleaned chart_data or null if invalid.
 */
function validateChartData(chartData) {
  if (!chartData || typeof chartData !== "object") return null;

  const labels = chartData.labels;
  const datasets = chartData.datasets;

  if (!Array.isArray(labels) || labels.length === 0) return null;
  if (!Array.isArray(datasets) || datasets.length === 0) return null;

  const cleanLabels = labels.map(l => sanitizeText(String(l || "")).slice(0, 50));

  const cleanDatasets = datasets
    .filter(ds => ds && Array.isArray(ds.values))
    .map(ds => ({
      name: sanitizeText(String(ds.name || "Data")).slice(0, 40),
      values: ds.values.map(v => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      }),
    }))
    .filter(ds => ds.values.length === cleanLabels.length);

  if (cleanDatasets.length === 0) return null;

  return { labels: cleanLabels, datasets: cleanDatasets };
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

  const VALID_SLIDE_TYPES = new Set(["bullets", "para_bullets", "paragraph", "chart"]);
  const VALID_CHART_TYPES = new Set(["bar", "pie", "line", "doughnut"]);

  const reviewedSlides = slidesJson.map((slide) => {
    let slideType = sanitizeText(slide.slide_type || "bullets");
    if (!VALID_SLIDE_TYPES.has(slideType)) slideType = "bullets";

    const reviewed = {
      slide_title: sanitizeText(slide.slide_title || "Untitled"),
      section: sanitizeText(slide.section || ""),
      slide_type: slideType,
      slide_content: sanitizeText(slide.slide_content || ""),
      image_prompt: sanitizeText(slide.image_prompt || ""),
    };

    // Validate chart data if slide is a chart type
    if (slideType === "chart") {
      const chartType = sanitizeText(slide.chart_type || "bar");
      reviewed.chart_type = VALID_CHART_TYPES.has(chartType) ? chartType : "bar";

      const validatedData = validateChartData(slide.chart_data);
      if (validatedData) {
        reviewed.chart_data = validatedData;
      } else {
        // Invalid chart data — fall back to bullets
        reviewed.slide_type = "bullets";
        console.warn(`[reviewer] Chart data invalid for "${reviewed.slide_title}" — falling back to bullets`);
      }
    }

    return reviewed;
  });

  const markdownOutput = reviewedSlides
    .map((s) => {
      let md = `# ${s.slide_title}\n${s.slide_content}`;
      if (s.chart_data) {
        md += `\n\n[Chart: ${s.chart_type} — ${s.chart_data.labels.join(", ")}]`;
      }
      return md;
    })
    .join("\n\n");

  return {
    final_output: markdownOutput,
    reviewed_slides_json: reviewedSlides
  };
}
