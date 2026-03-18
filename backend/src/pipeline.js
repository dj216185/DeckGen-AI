import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "./config.js";
import { slideOutlineAgent } from "./agents/slideOutlineAgent.js";
import { generatorAgent } from "./agents/generatorAgent.js";
import { reviewerAgent } from "./agents/reviewerAgent.js";
import { createPresentation } from "./agents/pptxCreator.js";
import { fetchAllSlideImages, craftImageQuery } from "./agents/imageService.js";

function getSafeFilename(text) {
  return String(text || "presentation")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50) || "presentation";
}

function nowStamp() {
  return new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

/**
 * Run the full PPT generation pipeline natively in Node.js.
 * Emits progress events via the onEvent callback.
 *
 * @param {{
 *   taskId: string,
 *   topic: string,
 *   projectInfo: string,
 *   theme: string,
 *   slideCount: number,
 *   onEvent: (evt: object) => void
 * }} params
 */
export async function runPipeline({ taskId, topic, projectInfo, theme, slideCount, onEvent }) {
  const emit = (evt) => {
    try { onEvent?.(evt); } catch { /* ignore */ }
  };

  const startTime = Date.now();

  try {
    // ── Stage 1: Initialize ──────────────────────────────────────────────────
    console.log(`[pipeline] Starting generation for task ${taskId}: "${topic}"`);
    emit({ type: "progress", progress: 6, stage: "init", message: "Initializing AI agents...", current_stage_name: "Initialization" });

    const state = {
      task_id: taskId,
      user_input: topic,
      project_info: projectInfo || "",
      slide_count: slideCount || 15
    };

    // ── Stage 2: User Input Processing ───────────────────────────────────────
    emit({ type: "progress", progress: 15, stage: "user_input", message: "Analyzing your request...", current_stage_name: "Processing Input" });

    // ── Stage 3: Slide Outline ───────────────────────────────────────────────
    console.log(`[pipeline] Creating slide outline...`);
    emit({ type: "progress", progress: 25, stage: "outline", message: "Creating slide outline...", current_stage_name: "Creating Outline" });

    const outlineResult = await slideOutlineAgent(state);
    Object.assign(state, outlineResult);

    emit({ type: "progress", progress: 40, stage: "outline", message: "Slide outline created", current_stage_name: "Creating Outline" });
    if (state.slide_outline) {
      emit({ type: "outline", outline: state.slide_outline });
    }

    // ── Stage 4: Research + Slide Generation ─────────────────────────────────
    console.log(`[pipeline] Researching and generating slides...`);
    emit({ type: "progress", progress: 55, stage: "generation", message: "Researching and generating slides with AI...", current_stage_name: "Generating Slides" });

    const generatorResult = await generatorAgent(state);
    Object.assign(state, generatorResult);

    emit({ type: "progress", progress: 75, stage: "generation", message: "Slides generated successfully", current_stage_name: "Generating Slides" });
    if (generatorResult.search_reference) {
      emit({ type: "research", search_info: generatorResult.search_reference });
    }

    // ── Stage 5: Review ───────────────────────────────────────────────────────
    console.log(`[pipeline] Reviewing content quality...`);
    emit({ type: "progress", progress: 80, stage: "review", message: "Reviewing content quality...", current_stage_name: "Reviewing Content" });

    const reviewedResult = reviewerAgent(state);
    Object.assign(state, reviewedResult);

    const reviewedSlides = state.reviewed_slides_json;
    if (!reviewedSlides || reviewedSlides.length === 0) {
      throw new Error("No slides were generated");
    }

    // ── Stage 6: Fetch Images ─────────────────────────────────────────────────
    console.log(`[pipeline] Fetching slide images from DuckDuckGo...`);
    emit({ type: "progress", progress: 87, stage: "images", message: "Fetching images for slides...", current_stage_name: "Fetching Images" });

    const imagesTmpDir = path.join(PROJECT_ROOT, "output_final", ".img_cache", taskId);
    let imageMap = new Map();

    try {
      imageMap = await fetchAllSlideImages(reviewedSlides, imagesTmpDir, 3);
      const fetched = [...imageMap.values()].filter(Boolean).length;
      console.log(`[pipeline] Images fetched: ${fetched}/${reviewedSlides.length}`);
    } catch (imgErr) {
      console.warn(`[pipeline] Image fetch failed (will continue without images): ${imgErr.message}`);
    }

    // Attach image paths to slides
    for (const slide of reviewedSlides) {
      slide.image_path = imageMap.get(slide.slide_title) || null;
    }

    // ── Stage 7: Build PPTX ───────────────────────────────────────────────────
    console.log(`[pipeline] Building PPTX deck...`);
    emit({ type: "progress", progress: 93, stage: "pptx", message: "Building presentation deck...", current_stage_name: "Creating Deck" });

    const outputDir = path.join(PROJECT_ROOT, "output_final");
    fs.mkdirSync(outputDir, { recursive: true });

    const stamp = nowStamp();
    const baseName = `${getSafeFilename(topic)}_${stamp}`;
    const pptxFile = path.join(outputDir, `${baseName}.pptx`);
    const mdFile = path.join(outputDir, `${baseName}.md`);

    // Save markdown
    fs.writeFileSync(mdFile, state.final_output || "No content generated.", "utf-8");

    // Generate PPTX (slides now have image_path attached)
    await createPresentation(reviewedSlides, pptxFile, { themeName: theme, mainTitle: topic });

    // Cleanup temp image cache
    try { fs.rmSync(imagesTmpDir, { recursive: true, force: true }); } catch { /* ignore */ }

    const actualTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`[pipeline] ✓ Completed in ${actualTime}s — ${reviewedSlides.length} slides → ${pptxFile}`);

    emit({
      type: "completed",
      pptx_file: pptxFile,
      md_file: mdFile,
      filename: path.basename(pptxFile),
      slide_count: reviewedSlides.length,
      actual_time: actualTime,
      search_info: state.search_reference || ""
    });

  } catch (err) {
    console.error(`[pipeline] ✗ Error:`, err?.message || err);
    emit({ type: "error", message: String(err?.message || err || "Generation failed") });
    throw err;
  }
}
