import fs from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { runPipeline } from "./pipeline.js";
import { MAX_SLIDES, MIN_SLIDES, SEARCH_INFO_DIR } from "./config.js";

const tasks = new Map();

function nowIso() {
  return new Date().toISOString();
}

function clampSlides(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return MAX_SLIDES;
  return Math.max(MIN_SLIDES, Math.min(MAX_SLIDES, Math.floor(n)));
}

function ensureSearchDir() {
  if (!fs.existsSync(SEARCH_INFO_DIR)) fs.mkdirSync(SEARCH_INFO_DIR, { recursive: true });
}

function safeName(text) {
  return String(text || "research")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "research";
}

function createSearchFile(task, searchInfo) {
  ensureSearchDir();
  const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
  const filename = `search_${safeName(task.user_query)}_${ts}.md`;
  const full = path.join(SEARCH_INFO_DIR, filename);
  const content = `# Search Results for: ${task.user_query}\n\nGenerated: ${new Date().toISOString()}\n\n---\n\n${searchInfo}`;
  fs.writeFileSync(full, content, "utf-8");
  return full;
}

export function createTask({ user_query, project_info, theme, slide_count }) {
  const task_id = uuidv4();
  const boundedSlides = clampSlides(slide_count);

  const task = {
    task_id,
    user_query,
    project_info: project_info || "",
    theme: theme || "modern_wine",
    slide_count: boundedSlides,
    status: "queued",
    progress: 0,
    stage: "queued",
    current_stage_name: "Queued",
    message: "Queued for processing...",
    created_at: nowIso(),
    estimated_time: 60 + boundedSlides * 3,
    estimated_completion: new Date(Date.now() + (60 + boundedSlides * 3) * 1000).toISOString(),
    outline: null,
    search_info: null,
    search_file: null,
    filename: null,
    pptx_file: null,
    md_file: null,
    actual_time: null,
    logs: []
  };

  tasks.set(task_id, task);

  // Run the native Node.js pipeline (no Python subprocess needed)
  runPipeline({
    taskId: task_id,
    topic: user_query,
    projectInfo: task.project_info,
    theme: task.theme,
    slideCount: boundedSlides,
    onEvent: (evt) => {
      const t = tasks.get(task_id);
      if (!t) return;

      if (evt.type === "progress") {
        t.status = "processing";
        t.progress = Math.max(t.progress, Number(evt.progress || 0));
        t.stage = evt.stage || t.stage;
        t.message = evt.message || t.message;
        t.current_stage_name = evt.current_stage_name || evt.stage || t.current_stage_name;
      }

      if (evt.type === "outline" && evt.outline) {
        t.outline = evt.outline;
        t.estimated_slides = Object.values(evt.outline).reduce((a, arr) => a + (Array.isArray(arr) ? arr.length : 0), 0);
      }

      if (evt.type === "research" && evt.search_info) {
        t.search_info = evt.search_info;
        t.search_file = createSearchFile(t, evt.search_info);
      }

      if (evt.type === "completed") {
        t.status = "completed";
        t.progress = 100;
        t.stage = "complete";
        t.current_stage_name = "Completed";
        t.message = "Presentation completed successfully";
        t.pptx_file = evt.pptx_file || null;
        t.md_file = evt.md_file || null;
        t.filename = evt.filename || (evt.pptx_file ? path.basename(evt.pptx_file) : "presentation.pptx");
        t.slide_count = Number(evt.slide_count || t.slide_count);
        t.actual_time = Number(evt.actual_time || 0);

        if (evt.search_info && !t.search_info) {
          t.search_info = evt.search_info;
          t.search_file = createSearchFile(t, evt.search_info);
        }
      }

      if (evt.type === "error") {
        t.status = "error";
        t.stage = "error";
        t.current_stage_name = "Error";
        t.message = evt.message || "Generation failed";
      }

      if (evt.type === "log") {
        t.logs.push({ at: nowIso(), type: evt.type, message: evt.message });
        if (t.logs.length > 200) t.logs.shift();
      }
    }
  }).catch((err) => {
    // Pipeline threw — mark task as errored if not already
    const t = tasks.get(task_id);
    if (t && t.status !== "completed" && t.status !== "error") {
      t.status = "error";
      t.stage = "error";
      t.current_stage_name = "Error";
      t.message = err?.message || "Generation failed unexpectedly";
    }
  });

  return task;
}

export function getTask(task_id) {
  return tasks.get(task_id) || null;
}

export function listTasks() {
  return Array.from(tasks.values()).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function deleteTask(task_id) {
  return tasks.delete(task_id);
}

export function slideLimits() {
  return { min: MIN_SLIDES, max: MAX_SLIDES };
}
