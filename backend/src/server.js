import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { v4 as uuidv4 } from "uuid";
import {
  APP_ROOT,
  CUSTOM_THEMES_DIR,
  DEFAULT_THEME,
  MAX_SLIDES,
  MIN_SLIDES,
  PORT,
  PROJECT_ROOT
} from "./config.js";
import { createTask, deleteTask, getTask, listTasks } from "./taskStore.js";

dotenv.config({ path: path.join(APP_ROOT, ".env"), override: false });
dotenv.config({ path: path.join(PROJECT_ROOT, ".env"), override: false });

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Helpers ────────────────────────────────────────────────────────────────

function knownThemeNames() {
  return ["professional_light", "modern_dark", "ocean_breeze", "modern_wine"];
}

function statusPayload(task) {
  const response = {
    status: task.status,
    progress: task.progress,
    message: task.message,
    stage: task.stage,
    current_stage_name: task.current_stage_name
  };

  if (task.outline) {
    response.outline = task.outline;
    response.estimated_slides = task.estimated_slides || 0;
  }

  if (task.search_info) {
    const preview = String(task.search_info);
    response.search_preview = preview.length > 500 ? `${preview.slice(0, 500)}...` : preview;
    response.has_search_file = Boolean(task.search_file);
  }

  if (task.estimated_time) {
    response.estimated_time = task.estimated_time;
    response.estimated_completion = task.estimated_completion;
  }

  if (task.actual_time != null) {
    response.actual_time = task.actual_time;
  }

  if (task.status === "completed") {
    response.filename = task.filename;
    response.slide_count = task.slide_count;
    response.has_search_file = Boolean(task.search_file || task.search_info);
  }

  return response;
}

function loadCustomThemes() {
  if (!fs.existsSync(CUSTOM_THEMES_DIR)) return [];

  const items = [];
  for (const filename of fs.readdirSync(CUSTOM_THEMES_DIR)) {
    if (!filename.endsWith(".json")) continue;
    try {
      const full = path.join(CUSTOM_THEMES_DIR, filename);
      const data = JSON.parse(fs.readFileSync(full, "utf-8"));
      items.push(data);
    } catch {
      // ignore malformed files
    }
  }

  items.sort((a, b) => {
    const ad = a?.custom_data?.created_at || "";
    const bd = b?.custom_data?.created_at || "";
    return ad < bd ? 1 : -1;
  });

  return items;
}

function ensureCustomThemesDir() {
  if (!fs.existsSync(CUSTOM_THEMES_DIR)) fs.mkdirSync(CUSTOM_THEMES_DIR, { recursive: true });
}

function envStatus() {
  return {
    gemini_api_key: Boolean(process.env.GEMINI_API_KEY),
    perplexity_api_key: Boolean(process.env.PERPLEXITY_API_KEY),
    perplexity_model: process.env.PERPLEXITY_MODEL || "sonar"
  };
}

function markdownSearch(task) {
  return `# Search Results for: ${task.user_query}\n\nGenerated: ${new Date().toISOString()}\n\n---\n\n${task.search_info || ""}`;
}

// ─── API Routes ─────────────────────────────────────────────────────────────

// Health & Config
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "deckgen-node", slide_limits: { min: MIN_SLIDES, max: MAX_SLIDES } });
});

app.get("/api/config", (_req, res) => {
  res.json({
    slide_limits: { min: MIN_SLIDES, max: MAX_SLIDES },
    default_theme: DEFAULT_THEME,
    env: envStatus()
  });
});

// Generation
app.post("/generate", (req, res) => {
  try {
    const user_query = String(req.body.topic || "").trim();
    const project_info = String(req.body.project_info || "").trim();
    const theme = String(req.body.theme || DEFAULT_THEME).trim();

    let slide_count = Number(req.body.slide_count || MAX_SLIDES);
    if (!Number.isFinite(slide_count)) slide_count = MAX_SLIDES;
    slide_count = Math.max(MIN_SLIDES, Math.min(MAX_SLIDES, Math.floor(slide_count)));

    if (!user_query) {
      return res.status(400).json({ error: "Please provide a topic" });
    }

    const task = createTask({ user_query, project_info, theme, slide_count });
    return res.json({
      task_id: task.task_id,
      message: "Generation started",
      estimated_time: task.estimated_time,
      estimated_completion: task.estimated_completion
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to start generation" });
  }
});

// Status
app.get("/status/:task_id", (req, res) => {
  const task = getTask(req.params.task_id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  return res.json(statusPayload(task));
});

// Downloads
app.get("/download/:task_id", (req, res) => {
  const task = getTask(req.params.task_id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.status !== "completed") return res.status(400).json({ error: "Presentation not ready yet" });
  if (!task.pptx_file || !fs.existsSync(task.pptx_file)) return res.status(404).json({ error: "File not found" });

  return res.download(task.pptx_file, task.filename || path.basename(task.pptx_file));
});

app.get(["/download_search", "/download_search/:task_id", "/download_search/:task_id/:format"], (req, res) => {
  const taskId = req.params.task_id || req.query.task_id;
  const format = String(req.params.format || req.query.format || "md").toLowerCase();

  if (!taskId) return res.status(400).json({ error: "Task ID required" });

  const task = getTask(taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!task.search_info && !task.search_file) return res.status(404).json({ error: "Search content not found" });

  const content = task.search_info || (task.search_file && fs.existsSync(task.search_file) ? fs.readFileSync(task.search_file, "utf-8") : "");
  const baseName = `${(task.user_query || "research").replace(/[^a-z0-9]+/gi, "_").toLowerCase().slice(0, 60) || "research"}_research`;

  if (format === "txt") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=${baseName}.txt`);
    return res.send(content);
  }

  if (format === "pdf") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${baseName}.pdf`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    doc.fontSize(16).text(`Research Report: ${task.user_query}`, { underline: true });
    doc.moveDown();
    doc.fontSize(10).fillColor("#666").text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown();
    doc.fillColor("#111").fontSize(11).text(content || "No content");
    doc.end();
    return;
  }

  const md = markdownSearch(task);
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=${baseName}.md`);
  return res.send(md);
});

// History
app.get("/api/history", (_req, res) => {
  const tasks = listTasks().slice(0, 100).map((t) => ({
    task_id: t.task_id,
    user_query: t.user_query,
    status: t.status,
    created_at: t.created_at,
    slide_count: t.slide_count,
    filename: t.filename,
    actual_time: t.actual_time,
    has_search_file: Boolean(t.search_file || t.search_info)
  }));
  return res.json(tasks);
});

// Themes
app.get("/themes", (_req, res) => {
  const known = knownThemeNames().map((name) => ({
    name,
    display_name: name.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
  }));

  const custom = loadCustomThemes().map((t) => {
    const cd = t.custom_data || {};
    const id = cd.theme_id || uuidv4();
    return {
      name: `custom_${id}`,
      display_name: cd.name || "Custom Theme"
    };
  });

  res.json([...known, ...custom]);
});

// Custom Themes CRUD
app.post("/api/save-custom-theme", (req, res) => {
  try {
    const data = req.body || {};
    const theme = data.theme || {};
    if (!theme.name) return res.status(400).json({ error: "Theme name is required" });

    ensureCustomThemesDir();
    const id = uuidv4();
    theme.created_at = new Date().toISOString();
    theme.theme_id = id;

    const payload = {
      custom_data: theme,
      pptx_theme: {
        background_type: theme.pattern === "gradient" ? "gradient" : "solid",
        title_font: theme.titleFont || "Calibri",
        body_font: theme.bodyFont || "Calibri",
        title_color: theme.textColor || "#212121",
        body_color: theme.textColor || "#212121",
        accent_color_1: theme.accentColor || "#ff5722",
        accent_color_2: theme.secondaryColor || "#3f51b5",
        pattern: theme.pattern || "none",
        title_size: theme.titleSize || 48,
        subtitle_size: theme.subtitleSize || 24,
        body_size: theme.bodySize || 16,
        background_color: theme.primaryColor || "#1a237e",
        gradient_stops:
          theme.pattern === "gradient"
            ? [
                [theme.primaryColor || "#1a237e", 0],
                [theme.secondaryColor || "#3f51b5", 0.5],
                [theme.accentColor || "#ff5722", 1]
              ]
            : []
      }
    };

    const safe = String(theme.name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "custom_theme";
    const filePath = path.join(CUSTOM_THEMES_DIR, `${safe}.json`);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");

    return res.json({ success: true, message: "Theme saved successfully", theme_id: id, filename: filePath });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save theme" });
  }
});

app.get("/api/load-custom-themes", (_req, res) => {
  try {
    return res.json({ themes: loadCustomThemes() });
  } catch {
    return res.status(500).json({ error: "Failed to load themes" });
  }
});

app.delete("/api/delete-custom-theme/:theme_id", (req, res) => {
  try {
    const target = req.params.theme_id;
    if (!fs.existsSync(CUSTOM_THEMES_DIR)) return res.status(404).json({ error: "Theme not found" });

    for (const filename of fs.readdirSync(CUSTOM_THEMES_DIR)) {
      if (!filename.endsWith(".json")) continue;
      const full = path.join(CUSTOM_THEMES_DIR, filename);
      try {
        const data = JSON.parse(fs.readFileSync(full, "utf-8"));
        if (data?.custom_data?.theme_id === target) {
          fs.unlinkSync(full);
          return res.json({ success: true, message: "Theme deleted successfully" });
        }
      } catch {
        // continue
      }
    }

    return res.status(404).json({ error: "Theme not found" });
  } catch {
    return res.status(500).json({ error: "Failed to delete theme" });
  }
});

// Task Delete
app.delete("/api/tasks/:task_id", (req, res) => {
  const ok = deleteTask(req.params.task_id);
  if (!ok) return res.status(404).json({ error: "Task not found" });
  return res.json({ success: true });
});

// ─── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log("=".repeat(60));
  console.log("DeckGen Node API Server");
  console.log(`Running on http://localhost:${PORT}`);
  console.log("=".repeat(60));
});
