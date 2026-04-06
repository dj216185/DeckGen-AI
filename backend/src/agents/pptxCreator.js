import fs from "node:fs";
import path from "node:path";
import PptxGenJS from "pptxgenjs";
import { CUSTOM_THEMES_DIR } from "../config.js";

// ─── Theme Definitions ─────────────────────────────────────────────────────
// Each theme is drastically different: colors, fonts, accent sizes, feel.

const THEMES = {
  professional_light: {
    background: { color: "FFFFFF" },
    titleColor: "1B3A5C",
    bodyColor: "2C3E50",
    paraColor: "34495E",
    subColor: "7F8C8D",
    accentColor: "2980B9",
    accent2Color: "D4E6F1",
    accent3Color: "EBF5FB",
    bulletColor: "2980B9",
    titleFont: "Georgia",
    bodyFont: "Calibri",
    isDark: false,
  },
  modern_dark: {
    background: { color: "0F0F1A" },
    titleColor: "EEEEF5",
    bodyColor: "CDCDE0",
    paraColor: "B8B8D0",
    subColor: "8888AA",
    accentColor: "7C3AED",
    accent2Color: "3B1D8E",
    accent3Color: "1A1040",
    bulletColor: "A78BFA",
    titleFont: "Trebuchet MS",
    bodyFont: "Segoe UI",
    isDark: true,
  },
  ocean_breeze: {
    background: { color: "F0F9FA" },
    titleColor: "0A4F4F",
    bodyColor: "1C3B3B",
    paraColor: "2A4C4C",
    subColor: "5E8080",
    accentColor: "0EA5A5",
    accent2Color: "B2DFDB",
    accent3Color: "E0F2F1",
    bulletColor: "00897B",
    titleFont: "Palatino Linotype",
    bodyFont: "Calibri",
    isDark: false,
  },
  modern_wine: {
    background: { color: "140808" },
    titleColor: "F5E0C8",
    bodyColor: "E8D4BC",
    paraColor: "D4C0A8",
    subColor: "A08878",
    accentColor: "D4426E",
    accent2Color: "6B1E3A",
    accent3Color: "2B0F18",
    bulletColor: "F06090",
    titleFont: "Book Antiqua",
    bodyFont: "Garamond",
    isDark: true,
  },
};

/**
 * Resolve a theme object. Handles:
 * - Built-in theme names ("modern_dark")
 * - Custom theme names ("custom_<uuid>") — loaded from disk
 */
function getTheme(themeName) {
  if (!themeName) return THEMES.modern_dark;

  // Check built-in first
  if (THEMES[themeName]) return THEMES[themeName];

  // Handle "custom_<id>" — load from custom_themes directory
  if (themeName.startsWith("custom_")) {
    const customTheme = loadCustomThemeForPptx(themeName.replace(/^custom_/, ""));
    if (customTheme) return customTheme;
  }

  // Try without prefix
  const base = themeName.replace(/^custom_/, "");
  if (THEMES[base]) return THEMES[base];

  return THEMES.modern_dark;
}

/**
 * Load a custom theme from disk and convert it into a pptx-ready theme object.
 */
function loadCustomThemeForPptx(themeId) {
  try {
    if (!fs.existsSync(CUSTOM_THEMES_DIR)) return null;

    for (const filename of fs.readdirSync(CUSTOM_THEMES_DIR)) {
      if (!filename.endsWith(".json")) continue;
      const full = path.join(CUSTOM_THEMES_DIR, filename);
      const data = JSON.parse(fs.readFileSync(full, "utf-8"));
      const cd = data.custom_data || {};
      const pt = data.pptx_theme || {};

      if (cd.theme_id !== themeId) continue;

      // Normalize hex colors (strip leading #)
      const strip = (c) => String(c || "").replace(/^#/, "") || null;

      const bgColor = strip(pt.background_color || cd.primaryColor) || "1A1A2E";
      const isDark = isDarkColor(bgColor);

      return {
        background: { color: bgColor },
        titleColor: strip(pt.title_color || cd.textColor) || (isDark ? "EEEEF5" : "1A1A2E"),
        bodyColor: strip(pt.body_color || cd.textColor) || (isDark ? "CDCDE0" : "2C3E50"),
        paraColor: isDark ? "B8B8D0" : "34495E",
        subColor: isDark ? "8888AA" : "7F8C8D",
        accentColor: strip(pt.accent_color_1 || cd.accentColor) || "7C3AED",
        accent2Color: strip(pt.accent_color_2 || cd.secondaryColor) || "3B1D8E",
        accent3Color: isDark ? "1A1040" : "EBF5FB",
        bulletColor: strip(pt.accent_color_1 || cd.accentColor) || "A78BFA",
        titleFont: pt.title_font || cd.titleFont || "Calibri",
        bodyFont: pt.body_font || cd.bodyFont || "Calibri",
        isDark,
      };
    }
  } catch (err) {
    console.warn(`[pptxCreator] Failed to load custom theme ${themeId}:`, err.message);
  }
  return null;
}

function isDarkColor(hex) {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

// ─── Template Definitions ───────────────────────────────────────────────────
// Each template defines layout sequence AND visual style overrides:
//   - accentThickness: how bold the accent bars are
//   - titleStyle: title slide approach
//   - decorStyle: how decorative elements look (shapes, bars, panels)

const TEMPLATES = {
  corporate_modern: {
    name: "Corporate Modern",
    titleLayout: "title_centered",
    endLayout: "end_accent",
    layouts: [
      "text_left_image_right",
      "full_text_two_column",
      "text_right_image_left",
      "big_number_highlight",
      "full_text_with_sidebar",
      "text_left_image_right",
      "quote_callout",
      "full_text_two_column",
    ],
    sectionDivider: true,
    // Visual style
    accentTopH: 0.06,
    accentLeftW: 0.04,
    titleUnderlineW: 2.4,
    imgPanelRatio: 0.30,
    decorStyle: "clean",        // minimal shapes
  },
  startup_pitch: {
    name: "Startup Pitch",
    titleLayout: "title_bold",
    endLayout: "end_cta",
    layouts: [
      "big_number_highlight",
      "text_left_image_right",
      "full_text_two_column",
      "text_right_image_left",
      "quote_callout",
      "text_left_image_right",
      "big_number_highlight",
      "full_text_with_sidebar",
    ],
    sectionDivider: true,
    accentTopH: 0.12,
    accentLeftW: 0.08,
    titleUnderlineW: 4.0,
    imgPanelRatio: 0.35,
    decorStyle: "bold",         // thick bars, large shapes
  },
  academic_clean: {
    name: "Academic Clean",
    titleLayout: "title_centered",
    endLayout: "end_accent",
    layouts: [
      "full_text_with_sidebar",
      "text_left_image_right",
      "full_text_two_column",
      "text_right_image_left",
      "full_text_with_sidebar",
      "text_left_image_right",
      "quote_callout",
      "full_text_two_column",
    ],
    sectionDivider: true,
    accentTopH: 0.03,
    accentLeftW: 0.0,           // no left accent
    titleUnderlineW: 1.8,
    imgPanelRatio: 0.28,
    decorStyle: "minimal",      // very sparse
  },
  creative_bold: {
    name: "Creative Bold",
    titleLayout: "title_bold",
    endLayout: "end_cta",
    layouts: [
      "full_bleed_image_overlay",
      "text_left_image_right",
      "big_number_highlight",
      "text_right_image_left",
      "full_bleed_image_overlay",
      "quote_callout",
      "full_text_two_column",
      "text_left_image_right",
    ],
    sectionDivider: false,
    accentTopH: 0.14,
    accentLeftW: 0.10,
    titleUnderlineW: 5.0,
    imgPanelRatio: 0.40,
    decorStyle: "heavy",        // large geometric shapes
  },
  data_insights: {
    name: "Data Insights",
    titleLayout: "title_centered",
    endLayout: "end_accent",
    layouts: [
      "big_number_highlight",
      "full_text_two_column",
      "text_left_image_right",
      "big_number_highlight",
      "full_text_with_sidebar",
      "text_right_image_left",
      "full_text_two_column",
      "big_number_highlight",
    ],
    sectionDivider: true,
    accentTopH: 0.05,
    accentLeftW: 0.05,
    titleUnderlineW: 3.0,
    imgPanelRatio: 0.28,
    decorStyle: "data",         // grid-like, structured
  },
  executive_summary: {
    name: "Executive Summary",
    titleLayout: "title_centered",
    endLayout: "end_accent",
    layouts: [
      "full_text_with_sidebar",
      "text_left_image_right",
      "quote_callout",
      "full_text_two_column",
      "text_right_image_left",
      "big_number_highlight",
      "full_text_with_sidebar",
      "text_left_image_right",
    ],
    sectionDivider: true,
    accentTopH: 0.04,
    accentLeftW: 0.03,
    titleUnderlineW: 2.0,
    imgPanelRatio: 0.25,
    decorStyle: "elegant",      // thin lines, wide spacing
  },
  product_launch: {
    name: "Product Launch",
    titleLayout: "title_bold",
    endLayout: "end_cta",
    layouts: [
      "full_bleed_image_overlay",
      "big_number_highlight",
      "text_left_image_right",
      "full_text_two_column",
      "text_right_image_left",
      "full_bleed_image_overlay",
      "quote_callout",
      "text_left_image_right",
    ],
    sectionDivider: false,
    accentTopH: 0.14,
    accentLeftW: 0.10,
    titleUnderlineW: 4.5,
    imgPanelRatio: 0.38,
    decorStyle: "heavy",
  },
  workshop_training: {
    name: "Workshop Training",
    titleLayout: "title_centered",
    endLayout: "end_accent",
    layouts: [
      "full_text_with_sidebar",
      "text_left_image_right",
      "full_text_two_column",
      "quote_callout",
      "text_right_image_left",
      "full_text_with_sidebar",
      "big_number_highlight",
      "text_left_image_right",
    ],
    sectionDivider: true,
    accentTopH: 0.06,
    accentLeftW: 0.05,
    titleUnderlineW: 2.5,
    imgPanelRatio: 0.30,
    decorStyle: "clean",
  },
  minimal_professional: {
    name: "Minimal Professional",
    titleLayout: "title_centered",
    endLayout: "end_accent",
    layouts: [
      "text_left_image_right",
      "full_text_with_sidebar",
      "text_right_image_left",
      "full_text_two_column",
      "text_left_image_right",
      "quote_callout",
      "full_text_with_sidebar",
      "text_left_image_right",
    ],
    sectionDivider: false,
    accentTopH: 0.02,
    accentLeftW: 0.0,
    titleUnderlineW: 1.5,
    imgPanelRatio: 0.25,
    decorStyle: "minimal",
  },
};

function getTemplate(templateName) {
  if (!templateName) return TEMPLATES.corporate_modern;
  return TEMPLATES[templateName] || TEMPLATES.corporate_modern;
}

// ─── Text Parsing ───────────────────────────────────────────────────────────

function parseBoldRuns(text) {
  const parts = text.split(/\*\*(.+?)\*\*/);
  return parts.map((p, i) => ({ text: p, bold: i % 2 === 1 })).filter(r => r.text);
}

function classifyLine(raw) {
  const line = raw.replace(/\r/g, "");
  const trimmed = line.trim();
  if (!trimmed) return { type: "blank", text: "" };
  const indent = line.length - line.trimStart().length;
  if (indent >= 4 && /^[-*•]/.test(trimmed))
    return { type: "subbullet", text: trimmed.replace(/^[-*•]\s*/, "") };
  if (/^[•]\s/.test(trimmed))
    return { type: "bullet", text: trimmed.replace(/^[•]\s*/, "") };
  if (/^[*\-]\s/.test(trimmed))
    return { type: "bullet", text: trimmed.replace(/^[*\-]\s*/, "") };
  if (/^\d+[.)]\s/.test(trimmed))
    return { type: "bullet", text: trimmed.replace(/^\d+[.)]\s*/, "") };
  // Lines starting with bold text pattern are likely bullet-style content
  if (/^\*\*[^*]+\*\*\s*[—\-–:]/.test(trimmed))
    return { type: "bullet", text: trimmed };
  return { type: "paragraph", text: trimmed };
}

function parseContentBlocks(contentText) {
  if (!contentText) return [];
  const lines = contentText.split("\n");
  const blocks = [];
  let pendingPara = [];
  const flushPara = () => {
    if (pendingPara.length > 0) {
      blocks.push({ type: "paragraph", text: pendingPara.join(" ") });
      pendingPara = [];
    }
  };
  for (const raw of lines) {
    const { type, text } = classifyLine(raw);
    if (type === "blank") { flushPara(); continue; }
    if (type === "paragraph") pendingPara.push(text);
    else { flushPara(); blocks.push({ type, text }); }
  }
  flushPara();
  return blocks;
}

function extractBigNumber(blocks) {
  for (const block of blocks) {
    const m = block.text.match(/\*\*([^*]+)\*\*/);
    if (m) {
      const val = m[1].trim();
      if (/[\d%$]/.test(val) && val.length <= 12) return val;
    }
    const nm = block.text.match(/(\$?[\d,.]+[%+]?(?:\s*(?:billion|million|trillion|B|M|K|x))?)/i);
    if (nm && nm[1].length <= 15) return nm[1].trim();
  }
  return null;
}

function extractQuote(blocks) {
  for (const b of blocks) {
    if (b.type === "paragraph" && b.text.length > 30 && b.text.length < 200)
      return b.text.replace(/\*\*/g, "");
  }
  return blocks.length > 0 ? blocks[0].text.replace(/\*\*/g, "").slice(0, 180) : "";
}

// ─── Text Object Builder ───────────────────────────────────────────────────

function buildTextObjects(blocks, theme) {
  if (!blocks.length) return [];
  const n = blocks.length;
  // Adaptive font sizes based on content density
  const mainFS = n > 12 ? 13 : n > 8 ? 14 : n > 5 ? 15 : 16;
  const subFS = mainFS - 1.5;
  const paraFS = n > 6 ? 14 : n > 3 ? 15 : 16;
  const out = [];

  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi];
    const isFirst = bi === 0;
    const prevActive = bi > 0 && blocks[bi - 1].type !== "blank";

    if (b.type === "paragraph") {
      const runs = parseBoldRuns(b.text);
      for (const [ri, run] of runs.entries()) {
        const o = {
          fontSize: paraFS,
          fontFace: theme.bodyFont,
          color: run.bold ? theme.bulletColor : (theme.paraColor || theme.bodyColor),
          bold: run.bold,
          lineSpacingMultiple: 1.45,
        };
        if (ri === 0) {
          o.bullet = false;
          o.indentLevel = 0;
          o.paraSpaceBefore = isFirst ? 0 : 12;
          o.paraSpaceAfter = 6;
        }
        out.push({ text: run.text, options: o });
      }
      if (bi < blocks.length - 1 && blocks[bi + 1].type !== "blank")
        out.push({ text: "\n", options: { fontSize: paraFS - 4, bullet: false } });
    } else if (b.type === "bullet") {
      // Detect if bullet has bold lead-in pattern: "**Term** — detail"
      const hasBoldLead = /^\*\*[^*]+\*\*/.test(b.text);
      const runs = parseBoldRuns(b.text);

      for (const [ri, run] of runs.entries()) {
        const isBoldLead = hasBoldLead && ri === 0 && run.bold;
        const o = {
          fontSize: isBoldLead ? mainFS + 0.5 : mainFS,
          fontFace: theme.bodyFont,
          color: run.bold ? theme.accentColor : theme.bodyColor,
          bold: run.bold,
          lineSpacingMultiple: 1.3,
        };
        if (ri === 0) {
          o.bullet = { code: "2022" };
          o.color = run.bold ? theme.accentColor : theme.bodyColor;
          o.indentLevel = 0;
          o.paraSpaceBefore = isFirst ? 4 : 8;
          o.paraSpaceAfter = 3;
        }
        out.push({ text: run.text, options: o });
      }
    } else if (b.type === "subbullet") {
      const runs = parseBoldRuns(b.text);
      for (const [ri, run] of runs.entries()) {
        const o = {
          fontSize: subFS,
          fontFace: theme.bodyFont,
          color: run.bold ? (theme.bulletColor || "A0A0B0") : (theme.subColor || "9090A8"),
          bold: run.bold,
          lineSpacingMultiple: 1.2,
        };
        if (ri === 0) {
          o.bullet = { code: "2013" };
          o.indentLevel = 1;
          o.paraSpaceBefore = 3;
          o.paraSpaceAfter = 2;
        }
        out.push({ text: run.text, options: o });
      }
    }
  }
  return out;
}

// ─── Slide Constants ────────────────────────────────────────────────────────

const SW = 13.33;
const SH = 7.5;
const MARGIN = 0.45;

// ─── Decorators (template-aware) ────────────────────────────────────────────

function addTopAccent(slide, pptx, theme, tpl) {
  const h = tpl.accentTopH || 0.06;
  if (h <= 0) return;
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h,
    fill: { color: theme.accentColor }, line: { type: "none" }
  });
}

function addLeftAccent(slide, pptx, theme, tpl) {
  const w = tpl.accentLeftW || 0.04;
  if (w <= 0) return;
  const topH = tpl.accentTopH || 0.06;
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: topH, w, h: SH - topH,
    fill: { color: theme.accentColor }, line: { type: "none" }
  });
}

function addBottomBar(slide, pptx, theme, tpl) {
  const thick = tpl.decorStyle === "bold" || tpl.decorStyle === "heavy" ? 0.05 : 0.03;
  slide.addShape(pptx.ShapeType.rect, {
    x: MARGIN, y: 7.1, w: SW - MARGIN * 2, h: thick,
    fill: { color: theme.accent2Color }, line: { type: "none" }
  });
}

function addDecorativeShapes(slide, pptx, theme, tpl) {
  const ds = tpl.decorStyle || "clean";
  if (ds === "minimal") return;

  if (ds === "bold" || ds === "heavy") {
    // Large corner accent
    slide.addShape(pptx.ShapeType.rect, {
      x: SW - 1.8, y: SH - 0.5, w: 1.8, h: 0.5,
      fill: { color: theme.accent2Color }, line: { type: "none" }
    });
    if (ds === "heavy") {
      // Additional diagonal accent top-right
      slide.addShape(pptx.ShapeType.rect, {
        x: SW - 3.0, y: 0, w: 3.0, h: (tpl.accentTopH || 0.06) * 2,
        fill: { color: theme.accent2Color }, line: { type: "none" }
      });
    }
  }

  if (ds === "data") {
    // Subtle grid dots at bottom-right
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        slide.addShape(pptx.ShapeType.ellipse, {
          x: SW - 1.2 + i * 0.35, y: SH - 1.2 + j * 0.35, w: 0.06, h: 0.06,
          fill: { color: theme.accent2Color }, line: { type: "none" }
        });
      }
    }
  }

  if (ds === "elegant") {
    // Thin horizontal line in bottom third
    slide.addShape(pptx.ShapeType.rect, {
      x: SW - 4.0, y: SH - 0.6, w: 3.5, h: 0.015,
      fill: { color: theme.accent2Color }, line: { type: "none" }
    });
  }
}

function addSlideNumber(slide, theme, num) {
  slide.addText(String(num), {
    x: SW - 0.7, y: 7.13, w: 0.55, h: 0.28,
    fontSize: 10, color: theme.isDark ? "555566" : "AAAAAA",
    fontFace: theme.bodyFont, align: "right"
  });
}

function addSlideTitle(slide, theme, title, x, w) {
  const t = title || "Untitled";
  slide.addText(t, {
    x: x || MARGIN, y: 0.18, w: w || (SW - MARGIN * 2), h: 0.78,
    fontSize: t.length > 55 ? 20 : t.length > 40 ? 24 : t.length > 28 ? 27 : 30,
    bold: true, color: theme.titleColor, fontFace: theme.titleFont, valign: "middle"
  });
}

function addTitleUnderline(slide, pptx, theme, tpl, x) {
  slide.addShape(pptx.ShapeType.rect, {
    x: x || MARGIN, y: 0.96, w: tpl.titleUnderlineW || 2.4, h: 0.035,
    fill: { color: theme.accentColor }, line: { type: "none" }
  });
}

// ─── Title Slides ───────────────────────────────────────────────────────────

function addTitleSlide_Centered(pptx, theme, mainTitle, tpl) {
  const slide = pptx.addSlide();
  slide.background = theme.background;

  addTopAccent(slide, pptx, theme, tpl);
  addLeftAccent(slide, pptx, theme, tpl);

  // Decorative accent box (bottom-right)
  const boxW = tpl.decorStyle === "minimal" ? 1.5 : tpl.decorStyle === "heavy" ? 4.0 : 3.0;
  const boxH = tpl.decorStyle === "minimal" ? 0.5 : tpl.decorStyle === "heavy" ? 1.5 : 1.0;
  slide.addShape(pptx.ShapeType.rect, {
    x: SW - boxW, y: SH - boxH, w: boxW, h: boxH,
    fill: { color: theme.accent2Color }, line: { type: "none" }
  });

  slide.addText(mainTitle || "Presentation", {
    x: MARGIN + 0.5, y: 1.8, w: SW - MARGIN * 2 - 1.0, h: 2.6,
    fontSize: mainTitle && mainTitle.length > 50 ? 36 : 46,
    bold: true, color: theme.titleColor, fontFace: theme.titleFont,
    align: "center", valign: "middle", lineSpacingMultiple: 1.1
  });

  // Underline below title
  const ulW = tpl.titleUnderlineW || 2.4;
  slide.addShape(pptx.ShapeType.rect, {
    x: (SW - ulW) / 2, y: 4.5, w: ulW, h: 0.04,
    fill: { color: theme.accentColor }, line: { type: "none" }
  });

  slide.addText("Made with DeckGen AI", {
    x: MARGIN, y: 5.0, w: SW - MARGIN * 2, h: 0.6,
    fontSize: 16, color: theme.isDark ? "666678" : "999999",
    fontFace: theme.bodyFont, align: "center"
  });
}

function addTitleSlide_Bold(pptx, theme, mainTitle, tpl) {
  const slide = pptx.addSlide();
  slide.background = theme.background;

  const topH = tpl.accentTopH || 0.12;
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: topH,
    fill: { color: theme.accentColor }, line: { type: "none" }
  });

  // Large left panel
  const panelW = tpl.decorStyle === "heavy" ? 0.9 : 0.6;
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: topH, w: panelW, h: SH - topH,
    fill: { color: theme.accent2Color }, line: { type: "none" }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: topH, w: tpl.accentLeftW || 0.08, h: SH - topH,
    fill: { color: theme.accentColor }, line: { type: "none" }
  });

  const textX = panelW + 0.6;
  slide.addText(mainTitle || "Presentation", {
    x: textX, y: 1.2, w: SW - textX - 0.5, h: 3.2,
    fontSize: mainTitle && mainTitle.length > 50 ? 40 : 54,
    bold: true, color: theme.titleColor, fontFace: theme.titleFont,
    align: "left", valign: "middle", lineSpacingMultiple: 1.05
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: textX, y: 4.6, w: tpl.titleUnderlineW || 4.0, h: 0.06,
    fill: { color: theme.accentColor }, line: { type: "none" }
  });

  slide.addText("Made with DeckGen AI", {
    x: textX, y: 5.1, w: SW - textX - 0.5, h: 0.6,
    fontSize: 16, color: theme.isDark ? "666678" : "999999",
    fontFace: theme.bodyFont, align: "left"
  });

  // Bottom-right accent block
  const brW = tpl.decorStyle === "heavy" ? 3.5 : 2.5;
  slide.addShape(pptx.ShapeType.rect, {
    x: SW - brW, y: SH - 0.8, w: brW, h: 0.8,
    fill: { color: theme.accentColor }, line: { type: "none" }
  });
}

// ─── Section Divider ────────────────────────────────────────────────────────

function addSectionDivider(pptx, theme, sectionName, tpl) {
  const slide = pptx.addSlide();
  slide.background = theme.background;

  addTopAccent(slide, pptx, theme, tpl);

  const panelW = tpl.decorStyle === "heavy" ? 0.8 : tpl.decorStyle === "minimal" ? 0.2 : 0.5;
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: (tpl.accentTopH || 0.06), w: panelW, h: SH - (tpl.accentTopH || 0.06),
    fill: { color: theme.accent2Color }, line: { type: "none" }
  });
  if (tpl.accentLeftW > 0) {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: (tpl.accentTopH || 0.06), w: tpl.accentLeftW, h: SH - (tpl.accentTopH || 0.06),
      fill: { color: theme.accentColor }, line: { type: "none" }
    });
  }

  const textX = panelW + 0.7;
  slide.addText(sectionName || "Section", {
    x: textX, y: 2.0, w: SW - textX - 1.0, h: 3.0,
    fontSize: 44, bold: true, color: theme.titleColor,
    fontFace: theme.titleFont, align: "left", valign: "middle"
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: textX, y: 5.2, w: tpl.titleUnderlineW || 3.0, h: 0.05,
    fill: { color: theme.accentColor }, line: { type: "none" }
  });

  addBottomBar(slide, pptx, theme, tpl);
}

// ─── Content Slide Layouts ──────────────────────────────────────────────────

function addSlide_TextLeftImageRight(pptx, theme, slideInfo, slideNum, tpl) {
  const slide = pptx.addSlide();
  slide.background = theme.background;
  const hasImage = slideInfo.image_path && fs.existsSync(slideInfo.image_path);

  const imgRatio = tpl.imgPanelRatio || 0.30;
  const imgPanelW = SW * imgRatio;
  const imgPanelX = SW - imgPanelW - 0.1;
  const textW = hasImage ? imgPanelX - MARGIN - 0.15 : SW - MARGIN * 2;

  addTopAccent(slide, pptx, theme, tpl);
  addLeftAccent(slide, pptx, theme, tpl);
  addBottomBar(slide, pptx, theme, tpl);
  addDecorativeShapes(slide, pptx, theme, tpl);
  addSlideNumber(slide, theme, slideNum);
  addSlideTitle(slide, theme, slideInfo.slide_title);
  addTitleUnderline(slide, pptx, theme, tpl);

  const blocks = parseContentBlocks(slideInfo.slide_content || "");
  const textObjs = buildTextObjects(blocks, theme);
  if (textObjs.length > 0) {
    slide.addText(textObjs, { x: MARGIN, y: 1.15, w: textW, h: 5.75, valign: "top", shrinkText: true });
  }

  if (hasImage) {
    slide.addShape(pptx.ShapeType.rect, {
      x: imgPanelX, y: 1.05, w: imgPanelW, h: 5.9,
      fill: { color: theme.isDark ? "111122" : "F4F6FA" },
      line: { color: theme.accent2Color, pt: 1 }
    });
    slide.addImage({
      path: slideInfo.image_path,
      x: imgPanelX + 0.08, y: 1.12, w: imgPanelW - 0.16, h: 5.76,
      sizing: { type: "contain", w: imgPanelW - 0.16, h: 5.76 }
    });
  }
}

function addSlide_TextRightImageLeft(pptx, theme, slideInfo, slideNum, tpl) {
  const slide = pptx.addSlide();
  slide.background = theme.background;
  const hasImage = slideInfo.image_path && fs.existsSync(slideInfo.image_path);

  const imgRatio = tpl.imgPanelRatio || 0.30;
  const imgPanelW = SW * imgRatio;
  const imgPanelX = 0.1;
  const textX = hasImage ? imgPanelX + imgPanelW + 0.2 : MARGIN;
  const textW = hasImage ? SW - textX - MARGIN : SW - MARGIN * 2;

  addTopAccent(slide, pptx, theme, tpl);
  addBottomBar(slide, pptx, theme, tpl);
  addDecorativeShapes(slide, pptx, theme, tpl);
  addSlideNumber(slide, theme, slideNum);

  // Right accent strip
  if ((tpl.accentLeftW || 0.04) > 0) {
    slide.addShape(pptx.ShapeType.rect, {
      x: SW - (tpl.accentLeftW || 0.04), y: (tpl.accentTopH || 0.06), w: tpl.accentLeftW || 0.04, h: SH - (tpl.accentTopH || 0.06),
      fill: { color: theme.accentColor }, line: { type: "none" }
    });
  }

  addSlideTitle(slide, theme, slideInfo.slide_title, textX, textW);
  addTitleUnderline(slide, pptx, theme, tpl, textX);

  const blocks = parseContentBlocks(slideInfo.slide_content || "");
  const textObjs = buildTextObjects(blocks, theme);
  if (textObjs.length > 0) {
    slide.addText(textObjs, { x: textX, y: 1.15, w: textW, h: 5.75, valign: "top", shrinkText: true });
  }

  if (hasImage) {
    slide.addShape(pptx.ShapeType.rect, {
      x: imgPanelX, y: 1.05, w: imgPanelW, h: 5.9,
      fill: { color: theme.isDark ? "111122" : "F4F6FA" },
      line: { color: theme.accent2Color, pt: 1 }
    });
    slide.addImage({
      path: slideInfo.image_path,
      x: imgPanelX + 0.08, y: 1.12, w: imgPanelW - 0.16, h: 5.76,
      sizing: { type: "contain", w: imgPanelW - 0.16, h: 5.76 }
    });
  }
}

function addSlide_FullBleedImageOverlay(pptx, theme, slideInfo, slideNum, tpl) {
  const slide = pptx.addSlide();
  const hasImage = slideInfo.image_path && fs.existsSync(slideInfo.image_path);

  if (hasImage) {
    slide.addImage({
      path: slideInfo.image_path,
      x: 0, y: 0, w: SW, h: SH,
      sizing: { type: "cover", w: SW, h: SH }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: SW, h: SH,
      fill: { color: "000000", transparency: 40 }, line: { type: "none" }
    });
  } else {
    slide.background = theme.background;
  }

  // Content panel in lower half
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: SH * 0.42, w: SW, h: SH * 0.58,
    fill: { color: theme.isDark ? "0A0A15" : "000000", transparency: hasImage ? 25 : 95 },
    line: { type: "none" }
  });

  // Bold accent line
  const accentH = tpl.decorStyle === "heavy" ? 0.06 : 0.04;
  slide.addShape(pptx.ShapeType.rect, {
    x: MARGIN, y: SH * 0.42, w: SW - MARGIN * 2, h: accentH,
    fill: { color: theme.accentColor }, line: { type: "none" }
  });

  const title = slideInfo.slide_title || "Untitled";
  slide.addText(title, {
    x: MARGIN + 0.3, y: 0.3, w: SW - MARGIN * 2 - 0.6, h: 1.4,
    fontSize: title.length > 40 ? 30 : 38,
    bold: true, color: hasImage ? "FFFFFF" : theme.titleColor,
    fontFace: theme.titleFont, valign: "middle"
  });

  const blocks = parseContentBlocks(slideInfo.slide_content || "");
  const forcedTheme = {
    ...theme,
    bodyColor: hasImage ? "E8E8F0" : theme.bodyColor,
    paraColor: hasImage ? "D0D0E0" : theme.paraColor,
    subColor: hasImage ? "A0A0B8" : theme.subColor,
  };
  const textObjs = buildTextObjects(blocks, forcedTheme);
  if (textObjs.length > 0) {
    slide.addText(textObjs, {
      x: MARGIN + 0.3, y: SH * 0.46, w: SW - MARGIN * 2 - 0.6, h: SH * 0.46,
      valign: "top", shrinkText: true
    });
  }

  addSlideNumber(slide, { ...theme, isDark: true }, slideNum);
}

function addSlide_TwoColumn(pptx, theme, slideInfo, slideNum, tpl) {
  const slide = pptx.addSlide();
  slide.background = theme.background;

  addTopAccent(slide, pptx, theme, tpl);
  addLeftAccent(slide, pptx, theme, tpl);
  addBottomBar(slide, pptx, theme, tpl);
  addDecorativeShapes(slide, pptx, theme, tpl);
  addSlideNumber(slide, theme, slideNum);
  addSlideTitle(slide, theme, slideInfo.slide_title);
  addTitleUnderline(slide, pptx, theme, tpl);

  const blocks = parseContentBlocks(slideInfo.slide_content || "");
  const mid = Math.ceil(blocks.length / 2);
  const colW = (SW - MARGIN * 2 - 0.5) / 2;

  // Divider — thickness varies by template
  const divW = tpl.decorStyle === "bold" || tpl.decorStyle === "heavy" ? 0.05 : 0.025;
  slide.addShape(pptx.ShapeType.rect, {
    x: MARGIN + colW + 0.22, y: 1.2, w: divW, h: 5.5,
    fill: { color: theme.accent2Color }, line: { type: "none" }
  });

  const leftObjs = buildTextObjects(blocks.slice(0, mid), theme);
  if (leftObjs.length > 0) {
    slide.addText(leftObjs, { x: MARGIN, y: 1.15, w: colW, h: 5.75, valign: "top", shrinkText: true });
  }
  const rightObjs = buildTextObjects(blocks.slice(mid), theme);
  if (rightObjs.length > 0) {
    slide.addText(rightObjs, { x: MARGIN + colW + 0.5, y: 1.15, w: colW, h: 5.75, valign: "top", shrinkText: true });
  }
}

function addSlide_BigNumber(pptx, theme, slideInfo, slideNum, tpl) {
  const slide = pptx.addSlide();
  slide.background = theme.background;

  addTopAccent(slide, pptx, theme, tpl);
  addLeftAccent(slide, pptx, theme, tpl);
  addBottomBar(slide, pptx, theme, tpl);
  addDecorativeShapes(slide, pptx, theme, tpl);
  addSlideNumber(slide, theme, slideNum);

  const blocks = parseContentBlocks(slideInfo.slide_content || "");
  const bigNum = extractBigNumber(blocks);
  const title = slideInfo.slide_title || "Untitled";

  addSlideTitle(slide, theme, title);
  addTitleUnderline(slide, pptx, theme, tpl);

  if (bigNum) {
    const numPanelW = SW * 0.38;
    // Number panel — size varies by template
    const panelH = tpl.decorStyle === "heavy" ? 4.0 : 3.2;

    slide.addShape(pptx.ShapeType.rect, {
      x: MARGIN, y: 1.2, w: numPanelW, h: panelH,
      fill: { color: theme.accent2Color }, line: { type: "none" }, rectRadius: 0.1
    });

    // The big number itself
    const numFS = bigNum.length > 8 ? 48 : bigNum.length > 5 ? 60 : 72;
    slide.addText(bigNum, {
      x: MARGIN + 0.2, y: 1.3, w: numPanelW - 0.4, h: panelH * 0.65,
      fontSize: numFS, bold: true, color: theme.accentColor,
      fontFace: theme.titleFont, align: "center", valign: "middle"
    });

    // Context label
    const label = blocks[0]?.text.replace(/\*\*/g, "").slice(0, 60) || "";
    slide.addText(label, {
      x: MARGIN + 0.2, y: 1.3 + panelH * 0.65, w: numPanelW - 0.4, h: panelH * 0.3,
      fontSize: 12, color: theme.isDark ? "B0B0C0" : "555555",
      fontFace: theme.bodyFont, align: "center", valign: "top"
    });

    // Remaining bullets on right
    const remaining = buildTextObjects(blocks.slice(1), theme);
    if (remaining.length > 0) {
      slide.addText(remaining, {
        x: MARGIN + numPanelW + 0.3, y: 1.15,
        w: SW - MARGIN * 2 - numPanelW - 0.3, h: 5.75,
        valign: "top", shrinkText: true
      });
    }
  } else {
    const textObjs = buildTextObjects(blocks, theme);
    if (textObjs.length > 0) {
      slide.addText(textObjs, { x: MARGIN, y: 1.15, w: SW - MARGIN * 2, h: 5.75, valign: "top", shrinkText: true });
    }
  }
}

function addSlide_QuoteCallout(pptx, theme, slideInfo, slideNum, tpl) {
  const slide = pptx.addSlide();
  slide.background = theme.background;

  addTopAccent(slide, pptx, theme, tpl);
  addLeftAccent(slide, pptx, theme, tpl);
  addBottomBar(slide, pptx, theme, tpl);
  addDecorativeShapes(slide, pptx, theme, tpl);
  addSlideNumber(slide, theme, slideNum);
  addSlideTitle(slide, theme, slideInfo.slide_title);
  addTitleUnderline(slide, pptx, theme, tpl);

  const blocks = parseContentBlocks(slideInfo.slide_content || "");
  const quote = extractQuote(blocks);

  // Quote panel — height varies by template
  const qH = tpl.decorStyle === "heavy" ? 2.8 : 2.4;
  const qBarW = tpl.decorStyle === "heavy" ? 0.12 : tpl.decorStyle === "minimal" ? 0.04 : 0.08;
  slide.addShape(pptx.ShapeType.rect, {
    x: MARGIN + 0.3, y: 1.3, w: SW - MARGIN * 2 - 0.6, h: qH,
    fill: { color: theme.accent2Color }, line: { type: "none" }, rectRadius: 0.08
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: MARGIN + 0.3, y: 1.3, w: qBarW, h: qH,
    fill: { color: theme.accentColor }, line: { type: "none" }
  });

  slide.addText("\u201C", {
    x: MARGIN + 0.5 + qBarW, y: 1.15, w: 0.8, h: 0.9,
    fontSize: 60, color: theme.accentColor, fontFace: "Georgia", bold: true
  });

  slide.addText(quote, {
    x: MARGIN + 0.7 + qBarW, y: 1.8, w: SW - MARGIN * 2 - 1.6 - qBarW, h: qH - 0.7,
    fontSize: 18, italic: true, color: theme.bodyColor,
    fontFace: theme.bodyFont, lineSpacingMultiple: 1.4, valign: "middle"
  });

  const remaining = blocks.filter(b => b.text.replace(/\*\*/g, "") !== quote);
  const textObjs = buildTextObjects(remaining, theme);
  if (textObjs.length > 0) {
    slide.addText(textObjs, {
      x: MARGIN, y: 1.3 + qH + 0.3, w: SW - MARGIN * 2, h: SH - (1.3 + qH + 0.3) - 0.5,
      valign: "top", shrinkText: true
    });
  }
}

function addSlide_TextWithSidebar(pptx, theme, slideInfo, slideNum, tpl) {
  const slide = pptx.addSlide();
  slide.background = theme.background;

  addTopAccent(slide, pptx, theme, tpl);
  addBottomBar(slide, pptx, theme, tpl);
  addSlideNumber(slide, theme, slideNum);

  // Sidebar width varies by template
  const sidebarW = tpl.decorStyle === "heavy" ? 0.9 : tpl.decorStyle === "minimal" ? 0.3 : 0.6;
  const topH = tpl.accentTopH || 0.06;

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: topH, w: sidebarW, h: SH - topH,
    fill: { color: theme.accent2Color }, line: { type: "none" }
  });

  if ((tpl.accentLeftW || 0) > 0) {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: topH, w: tpl.accentLeftW, h: SH - topH,
      fill: { color: theme.accentColor }, line: { type: "none" }
    });
  }

  // Sidebar dots (if not minimal)
  if (tpl.decorStyle !== "minimal") {
    const dotCount = tpl.decorStyle === "heavy" ? 5 : 3;
    for (let i = 0; i < dotCount; i++) {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: sidebarW / 2 - 0.06, y: 2.2 + i * 0.45, w: 0.12, h: 0.12,
        fill: { color: i === 0 ? theme.accentColor : (theme.isDark ? "333344" : "CCCCCC") },
        line: { type: "none" }
      });
    }
  }

  const textX = sidebarW + 0.3;
  const textW = SW - textX - MARGIN;
  addSlideTitle(slide, theme, slideInfo.slide_title, textX, textW);

  slide.addShape(pptx.ShapeType.rect, {
    x: textX, y: 0.96, w: tpl.titleUnderlineW || 2.4, h: 0.035,
    fill: { color: theme.accentColor }, line: { type: "none" }
  });

  const blocks = parseContentBlocks(slideInfo.slide_content || "");
  const hasImage = slideInfo.image_path && fs.existsSync(slideInfo.image_path);
  const contentW = hasImage ? textW * 0.63 : textW;
  const textObjs = buildTextObjects(blocks, theme);

  if (textObjs.length > 0) {
    slide.addText(textObjs, { x: textX, y: 1.15, w: contentW, h: 5.75, valign: "top", shrinkText: true });
  }

  if (hasImage) {
    const imgW = textW * 0.33;
    const imgX = SW - MARGIN - imgW;
    slide.addShape(pptx.ShapeType.rect, {
      x: imgX, y: 1.3, w: imgW, h: 4.5,
      fill: { color: theme.isDark ? "111122" : "F4F6FA" },
      line: { color: theme.accent2Color, pt: 1 }, rectRadius: 0.06
    });
    slide.addImage({
      path: slideInfo.image_path,
      x: imgX + 0.05, y: 1.35, w: imgW - 0.1, h: 4.4,
      sizing: { type: "contain", w: imgW - 0.1, h: 4.4 }
    });
  }
}

// ─── End Slides ─────────────────────────────────────────────────────────────

function addEndSlide_Accent(pptx, theme, tpl) {
  const slide = pptx.addSlide();
  slide.background = theme.background;

  addTopAccent(slide, pptx, theme, tpl);
  addLeftAccent(slide, pptx, theme, tpl);

  const boxW = tpl.decorStyle === "heavy" ? 4.0 : tpl.decorStyle === "minimal" ? 1.5 : 3.0;
  slide.addShape(pptx.ShapeType.rect, {
    x: SW - boxW, y: SH - 0.8, w: boxW, h: 0.8,
    fill: { color: theme.accent2Color }, line: { type: "none" }
  });

  slide.addText("Thank You", {
    x: MARGIN, y: 2.2, w: SW - MARGIN * 2, h: 2.0,
    fontSize: 56, bold: true, color: theme.titleColor,
    fontFace: theme.titleFont, align: "center", valign: "middle"
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: (SW - (tpl.titleUnderlineW || 2.4)) / 2, y: 4.3, w: tpl.titleUnderlineW || 2.4, h: 0.04,
    fill: { color: theme.accentColor }, line: { type: "none" }
  });

  slide.addText("Generated by DeckGen AI", {
    x: MARGIN, y: 4.7, w: SW - MARGIN * 2, h: 0.6,
    fontSize: 16, color: theme.isDark ? "666678" : "999999",
    fontFace: theme.bodyFont, align: "center"
  });
}

function addEndSlide_CTA(pptx, theme, tpl) {
  const slide = pptx.addSlide();
  slide.background = theme.background;

  const topH = tpl.accentTopH || 0.12;
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: topH,
    fill: { color: theme.accentColor }, line: { type: "none" }
  });

  const panelW = tpl.decorStyle === "heavy" ? 0.9 : 0.6;
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: topH, w: panelW, h: SH - topH,
    fill: { color: theme.accent2Color }, line: { type: "none" }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: topH, w: tpl.accentLeftW || 0.08, h: SH - topH,
    fill: { color: theme.accentColor }, line: { type: "none" }
  });

  const textX = panelW + 0.6;
  slide.addText("Thank You", {
    x: textX, y: 1.8, w: SW - textX - 0.5, h: 2.0,
    fontSize: 56, bold: true, color: theme.titleColor,
    fontFace: theme.titleFont, align: "left", valign: "middle"
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: textX, y: 4.0, w: tpl.titleUnderlineW || 4.0, h: 0.06,
    fill: { color: theme.accentColor }, line: { type: "none" }
  });

  slide.addText("Questions? Let's discuss.", {
    x: textX, y: 4.4, w: SW - textX - 0.5, h: 0.8,
    fontSize: 22, color: theme.isDark ? "AAAACC" : "666666",
    fontFace: theme.bodyFont, align: "left"
  });

  slide.addText("Generated by DeckGen AI", {
    x: textX, y: 5.8, w: SW - textX - 0.5, h: 0.5,
    fontSize: 14, color: theme.isDark ? "555566" : "999999",
    fontFace: theme.bodyFont, align: "left"
  });

  const brW = tpl.decorStyle === "heavy" ? 3.5 : 2.5;
  slide.addShape(pptx.ShapeType.rect, {
    x: SW - brW, y: SH - 0.8, w: brW, h: 0.8,
    fill: { color: theme.accentColor }, line: { type: "none" }
  });
}

// ─── Chart Slides ──────────────────────────────────────────────────────────

/**
 * Map PptxGenJS chart type enum from string.
 */
function getChartType(pptx, chartTypeStr) {
  const map = {
    bar: pptx.charts.BAR,
    pie: pptx.charts.PIE,
    line: pptx.charts.LINE,
    doughnut: pptx.charts.DOUGHNUT,
  };
  return map[chartTypeStr] || pptx.charts.BAR;
}

/**
 * Generate an array of contrasting chart colors derived from the theme.
 */
function getChartColors(theme) {
  const base = [
    theme.accentColor,
    theme.accent2Color,
    theme.bulletColor,
  ];
  // Extra distinct colors for more data points
  const extras = [
    "E74C3C", "3498DB", "2ECC71", "F39C12", "9B59B6",
    "1ABC9C", "E67E22", "34495E", "16A085", "D35400",
  ];
  return [...base, ...extras];
}

function addSlide_Chart(pptx, theme, slideInfo, slideNum, tpl) {
  const slide = pptx.addSlide();
  slide.background = theme.background;

  addTopAccent(slide, pptx, theme, tpl);
  addLeftAccent(slide, pptx, theme, tpl);
  addBottomBar(slide, pptx, theme, tpl);
  addDecorativeShapes(slide, pptx, theme, tpl);
  addSlideNumber(slide, theme, slideNum);
  addSlideTitle(slide, theme, slideInfo.slide_title);
  addTitleUnderline(slide, pptx, theme, tpl);

  const chartType = slideInfo.chart_type || "bar";
  const chartData = slideInfo.chart_data;
  const colors = getChartColors(theme);
  const isPieType = chartType === "pie" || chartType === "doughnut";

  if (chartData && chartData.labels && chartData.datasets) {
    // Build PptxGenJS chart data format
    const pptxChartData = chartData.datasets.map((ds, i) => ({
      name: ds.name || `Series ${i + 1}`,
      labels: chartData.labels,
      values: ds.values,
    }));

    // Chart options
    const chartOpts = {
      showTitle: false,
      showLegend: true,
      legendPos: "b",
      legendFontSize: 10,
      legendColor: theme.bodyColor,
      legendFontFace: theme.bodyFont,
    };

    if (isPieType) {
      // Pie/Doughnut: centered chart with insights below
      const chartW = 5.5;
      const chartH = 4.2;
      const chartX = (SW - chartW) / 2;

      // Color each slice
      chartOpts.chartColors = colors.slice(0, chartData.labels.length);
      chartOpts.showPercent = true;
      chartOpts.showValue = false;
      chartOpts.dataLabelColor = theme.isDark ? "FFFFFF" : "333333";
      chartOpts.dataLabelFontSize = 11;
      chartOpts.dataLabelFontFace = theme.bodyFont;
      chartOpts.x = chartX;
      chartOpts.y = 1.15;
      chartOpts.w = chartW;
      chartOpts.h = chartH;

      slide.addChart(getChartType(pptx, chartType), pptxChartData, chartOpts);

      // Key insights below the chart
      const blocks = parseContentBlocks(slideInfo.slide_content || "");
      const textObjs = buildTextObjects(blocks, theme);
      if (textObjs.length > 0) {
        slide.addText(textObjs, {
          x: MARGIN, y: 5.5, w: SW - MARGIN * 2, h: 1.4,
          valign: "top", shrinkText: true,
        });
      }
    } else {
      // Bar/Line: chart on left, insights on right
      const chartW = SW * 0.58;
      const chartH = 4.8;
      const insightX = MARGIN + chartW + 0.3;
      const insightW = SW - insightX - MARGIN;

      chartOpts.chartColors = colors.slice(0, chartData.datasets.length);
      chartOpts.showValue = true;
      chartOpts.dataLabelColor = theme.isDark ? "CCCCDD" : "444444";
      chartOpts.dataLabelFontSize = 9;
      chartOpts.dataLabelFontFace = theme.bodyFont;
      chartOpts.dataLabelPosition = "outEnd";
      chartOpts.catAxisLabelColor = theme.bodyColor;
      chartOpts.catAxisLabelFontSize = 10;
      chartOpts.catAxisLabelFontFace = theme.bodyFont;
      chartOpts.valAxisLabelColor = theme.subColor || theme.bodyColor;
      chartOpts.valAxisLabelFontSize = 9;
      chartOpts.valAxisLabelFontFace = theme.bodyFont;
      chartOpts.catGridLine = { style: "none" };
      chartOpts.valGridLine = { color: theme.isDark ? "333344" : "E0E0E0", style: "dash", size: 0.5 };
      chartOpts.x = MARGIN;
      chartOpts.y = 1.15;
      chartOpts.w = chartW;
      chartOpts.h = chartH;

      if (chartType === "bar") {
        chartOpts.barDir = "bar";
        chartOpts.barGapWidthPct = 80;
      }

      slide.addChart(getChartType(pptx, chartType), pptxChartData, chartOpts);

      // Key insights panel on the right
      // Accent background for insights
      slide.addShape(pptx.ShapeType.rect, {
        x: insightX - 0.1, y: 1.15, w: insightW + 0.2, h: chartH,
        fill: { color: theme.accent3Color || (theme.isDark ? "1A1040" : "F5F7FA") },
        line: { type: "none" }, rectRadius: 0.06,
      });

      slide.addText("Key Insights", {
        x: insightX, y: 1.25, w: insightW, h: 0.4,
        fontSize: 13, bold: true, color: theme.accentColor,
        fontFace: theme.titleFont,
      });

      const blocks = parseContentBlocks(slideInfo.slide_content || "");
      const textObjs = buildTextObjects(blocks, theme);
      if (textObjs.length > 0) {
        slide.addText(textObjs, {
          x: insightX, y: 1.7, w: insightW, h: chartH - 0.65,
          valign: "top", shrinkText: true,
        });
      }
    }
  } else {
    // Fallback: no valid chart data, render as text
    const blocks = parseContentBlocks(slideInfo.slide_content || "");
    const textObjs = buildTextObjects(blocks, theme);
    if (textObjs.length > 0) {
      slide.addText(textObjs, {
        x: MARGIN, y: 1.15, w: SW - MARGIN * 2, h: 5.75,
        valign: "top", shrinkText: true,
      });
    }
  }
}

// ─── Layout Router ──────────────────────────────────────────────────────────

const LAYOUT_FNS = {
  text_left_image_right: addSlide_TextLeftImageRight,
  text_right_image_left: addSlide_TextRightImageLeft,
  full_bleed_image_overlay: addSlide_FullBleedImageOverlay,
  full_text_two_column: addSlide_TwoColumn,
  big_number_highlight: addSlide_BigNumber,
  quote_callout: addSlide_QuoteCallout,
  full_text_with_sidebar: addSlide_TextWithSidebar,
  chart: addSlide_Chart,
};

// ─── Exports ────────────────────────────────────────────────────────────────

export function getAvailableTemplates() {
  return Object.entries(TEMPLATES).map(([key, val]) => ({
    id: key,
    name: val.name,
    layouts: val.layouts,
    sectionDivider: val.sectionDivider,
    decorStyle: val.decorStyle,
  }));
}

export async function createPresentation(slidesData, outputPath, { themeName, mainTitle, templateName } = {}) {
  const theme = getTheme(themeName);
  const tpl = getTemplate(templateName);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  // Title slide
  if (tpl.titleLayout === "title_bold") {
    addTitleSlide_Bold(pptx, theme, mainTitle, tpl);
  } else {
    addTitleSlide_Centered(pptx, theme, mainTitle, tpl);
  }

  let lastSection = null;
  let slideNum = 1;
  let layoutIdx = 0;

  for (const slideInfo of slidesData) {
    if ((slideInfo.slide_type || "").toLowerCase() === "title") continue;

    // Section divider
    if (tpl.sectionDivider && slideInfo.section && slideInfo.section !== lastSection) {
      lastSection = slideInfo.section;
      addSectionDivider(pptx, theme, slideInfo.section, tpl);
    }

    // Use chart layout if slide has chart data, otherwise follow template sequence
    if (slideInfo.slide_type === "chart" && slideInfo.chart_data) {
      addSlide_Chart(pptx, theme, slideInfo, slideNum++, tpl);
    } else {
      const layoutKey = tpl.layouts[layoutIdx % tpl.layouts.length];
      const layoutFn = LAYOUT_FNS[layoutKey] || addSlide_TextLeftImageRight;
      layoutFn(pptx, theme, slideInfo, slideNum++, tpl);
    }
    layoutIdx++;
  }

  // End slide
  if (tpl.endLayout === "end_cta") {
    addEndSlide_CTA(pptx, theme, tpl);
  } else {
    addEndSlide_Accent(pptx, theme, tpl);
  }

  await pptx.writeFile({ fileName: outputPath });
}
