import fs from "node:fs";
import PptxGenJS from "pptxgenjs";

// ─── Theme Definitions ─────────────────────────────────────────────────────
const THEMES = {
  professional_light: {
    background: { color: "FFFFFF" },
    titleColor: "002060",
    bodyColor: "1A1A1A",
    paraColor: "333333",
    subColor: "555555",
    accentColor: "0078D7",
    accent2Color: "D0D9E8",
    bulletColor: "0078D7",
    titleFont: "Georgia",
    bodyFont: "Calibri",
    isDark: false
  },
  modern_dark: {
    background: { color: "1A1A2E" },
    titleColor: "FFFFFF",
    bodyColor: "E8E8F0",
    paraColor: "D0D0E0",
    subColor: "9090A8",
    accentColor: "8A5CF6",
    accent2Color: "3D2A6E",
    bulletColor: "A07EF8",
    titleFont: "Calibri",
    bodyFont: "Calibri",
    isDark: true
  },
  ocean_breeze: {
    background: { color: "F0FAFA" },
    titleColor: "006666",
    bodyColor: "1A2A2A",
    paraColor: "2A3A3A",
    subColor: "445555",
    accentColor: "20B2AA",
    accent2Color: "A0DEDD",
    bulletColor: "009988",
    titleFont: "Calibri",
    bodyFont: "Calibri",
    isDark: false
  },
  modern_wine: {
    background: { color: "1A0A0A" },
    titleColor: "F5E6D3",
    bodyColor: "EAD8C4",
    paraColor: "D8C8B4",
    subColor: "A89080",
    accentColor: "C44E7B",
    accent2Color: "6A1E3C",
    bulletColor: "E070A0",
    titleFont: "Calibri",
    bodyFont: "Calibri",
    isDark: true
  }
};

function getTheme(themeName) {
  if (!themeName) return THEMES.modern_dark;
  const base = themeName.replace(/^custom_/, "");
  return THEMES[themeName] || THEMES[base] || THEMES.modern_dark;
}

// ─── Text Parsing Utilities ─────────────────────────────────────────────────

/**
 * Parse **bold** markers into [{text, bold}] runs.
 */
function parseBoldRuns(text) {
  const parts = text.split(/\*\*(.+?)\*\*/);
  return parts
    .map((p, i) => ({ text: p, bold: i % 2 === 1 }))
    .filter(r => r.text);
}

/**
 * Classify a raw content line.
 * Returns: { type: "bullet"|"subbullet"|"paragraph"|"blank", text: string }
 */
function classifyLine(raw) {
  const line = raw.replace(/\r/g, "");
  const trimmed = line.trim();

  if (!trimmed) return { type: "blank", text: "" };

  const indent = line.length - line.trimStart().length;

  // Sub-bullet: indented 4+ chars with a dash/bullet
  if (indent >= 4 && /^[-•*]/.test(trimmed)) {
    return { type: "subbullet", text: trimmed.replace(/^[-•*]\s*/, "") };
  }

  // Main bullet: starts with •, -, *, >, ●, ▪
  if (/^[•●○◦▪▸►→\-*]\s/.test(trimmed)) {
    return { type: "bullet", text: trimmed.replace(/^[•●○◦▪▸►→\-*]\s*/, "") };
  }

  // Numbered list: "1. ", "2) " etc
  if (/^\d+[.)]\s/.test(trimmed)) {
    return { type: "bullet", text: trimmed.replace(/^\d+[.)]\s*/, "") };
  }

  // Otherwise it's a paragraph line
  return { type: "paragraph", text: trimmed };
}

/**
 * Parse raw slide_content into a structured block list.
 * Merges consecutive paragraph lines into single paragraph blocks.
 * Returns: { type: "bullet"|"subbullet"|"paragraph", text: string }[]
 */
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

    if (type === "blank") {
      flushPara();
      continue;
    }

    if (type === "paragraph") {
      pendingPara.push(text);
    } else {
      flushPara();
      blocks.push({ type, text });
    }
  }

  flushPara();
  return blocks;
}

// ─── pptxgenjs Text Object Builders ────────────────────────────────────────

/**
 * Build a pptxgenjs text object array from parsed content blocks.
 */
function buildTextObjects(blocks, theme, slideType) {
  if (blocks.length === 0) return [];

  // Adaptive sizing
  const blockCount = blocks.length;
  const mainFontSize = blockCount > 12 ? 13 : blockCount > 8 ? 14 : 16;
  const subFontSize = mainFontSize - 1;
  const paraFontSize = blockCount > 6 ? 14 : 15;

  const textObjects = [];

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    const isFirst = bi === 0;
    const prevIsParaOrBullet = bi > 0 && blocks[bi - 1].type !== "blank";

    if (block.type === "paragraph") {
      const runs = parseBoldRuns(block.text);

      for (let ri = 0; ri < runs.length; ri++) {
        const run = runs[ri];
        const opts = {
          fontSize: paraFontSize,
          fontFace: theme.bodyFont,
          color: run.bold ? theme.bulletColor : (theme.paraColor || theme.bodyColor),
          bold: run.bold,
          lineSpacingMultiple: 1.35,
          charSpacing: 0
        };

        // First run of block: set paragraph spacing and no bullet
        if (ri === 0) {
          opts.bullet = false;
          opts.indentLevel = 0;
          opts.paraSpaceBefore = isFirst ? 0 : 10;
          opts.paraSpaceAfter = 4;
        }

        textObjects.push({ text: run.text, options: opts });
      }

      // Explicit line break after paragraph (before next block)
      if (bi < blocks.length - 1 && blocks[bi + 1].type !== "blank") {
        textObjects.push({
          text: "\n",
          options: { fontSize: paraFontSize - 4, bullet: false }
        });
      }

    } else if (block.type === "bullet") {
      const runs = parseBoldRuns(block.text);

      for (let ri = 0; ri < runs.length; ri++) {
        const run = runs[ri];
        const opts = {
          fontSize: mainFontSize,
          fontFace: theme.bodyFont,
          color: run.bold ? theme.bulletColor : theme.bodyColor,
          bold: run.bold,
          lineSpacingMultiple: 1.2
        };

        if (ri === 0) {
          opts.bullet = { code: "2022" }; // • solid bullet
          opts.indentLevel = 0;
          opts.paraSpaceBefore = (isFirst || prevIsParaOrBullet) ? 6 : 2;
          opts.paraSpaceAfter = 2;
        }

        textObjects.push({ text: run.text, options: opts });
      }

    } else if (block.type === "subbullet") {
      const runs = parseBoldRuns(block.text);

      for (let ri = 0; ri < runs.length; ri++) {
        const run = runs[ri];
        const opts = {
          fontSize: subFontSize,
          fontFace: theme.bodyFont,
          color: run.bold
            ? (theme.subColor || (theme.isDark ? "A0A0B0" : "555566"))
            : (theme.subColor || (theme.isDark ? "9090A8" : "666677")),
          bold: run.bold,
          lineSpacingMultiple: 1.15
        };

        if (ri === 0) {
          opts.bullet = { code: "2013" }; // – en-dash
          opts.indentLevel = 1;
          opts.paraSpaceBefore = 2;
          opts.paraSpaceAfter = 1;
        }

        textObjects.push({ text: run.text, options: opts });
      }
    }
  }

  return textObjects;
}

// ─── Slide Builders ─────────────────────────────────────────────────────────

function addTitleSlide(pptx, theme, mainTitle) {
  const slide = pptx.addSlide();
  slide.background = theme.background;

  // Top accent bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: 0.08,
    fill: { color: theme.accentColor },
    line: { type: "none" }
  });

  // Left accent strip
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0.08, w: 0.06, h: 7.42,
    fill: { color: theme.accentColor },
    line: { type: "none" }
  });

  // Decorative accent box (bottom-right)
  slide.addShape(pptx.ShapeType.rect, {
    x: 7.5, y: 6.5, w: 2.5, h: 1.0,
    fill: { color: theme.accent2Color },
    line: { type: "none" }
  });

  // Title
  slide.addText(mainTitle || "Presentation", {
    x: 0.5, y: 2.0, w: 9, h: 2.0,
    fontSize: mainTitle && mainTitle.length > 50 ? 36 : 44,
    bold: true,
    color: theme.titleColor,
    fontFace: theme.titleFont,
    align: "center",
    valign: "middle",
    lineSpacingMultiple: 1.1
  });

  slide.addText("Made with DeckGen AI", {
    x: 0.5, y: 4.5, w: 9, h: 0.6,
    fontSize: 18,
    color: theme.isDark ? "777788" : "999999",
    fontFace: theme.bodyFont,
    align: "center"
  });
}

function addContentSlide(pptx, theme, slideInfo, slideNum) {
  const slide = pptx.addSlide();
  slide.background = theme.background;

  const hasImage = slideInfo.image_path && fs.existsSync(slideInfo.image_path);

  // Top accent bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: 0.06,
    fill: { color: theme.accentColor },
    line: { type: "none" }
  });

  // Left accent strip
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0.06, w: 0.04, h: 7.44,
    fill: { color: theme.accentColor },
    line: { type: "none" }
  });

  // Bottom accent line
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.45, y: 7.05, w: 9.1, h: 0.03,
    fill: { color: theme.accent2Color },
    line: { type: "none" }
  });

  // Slide number
  slide.addText(String(slideNum), {
    x: 9.1, y: 7.1, w: 0.6, h: 0.3,
    fontSize: 10,
    color: theme.isDark ? "555566" : "AAAAAA",
    fontFace: theme.bodyFont,
    align: "right"
  });

  // Title underline
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 0.98, w: 2.4, h: 0.035,
    fill: { color: theme.accentColor },
    line: { type: "none" }
  });

  // Slide title
  const title = slideInfo.slide_title || "Untitled";
  slide.addText(title, {
    x: 0.4, y: 0.12, w: 9.2, h: 0.88,
    fontSize: title.length > 55 ? 20 : title.length > 40 ? 24 : title.length > 28 ? 27 : 30,
    bold: true,
    color: theme.titleColor,
    fontFace: theme.titleFont,
    valign: "middle"
  });

  // Layout dimensions: split when image present
  const contentX = 0.45;
  const contentW = hasImage ? 5.6 : 9.1;
  const contentH = 5.7;
  const contentY = 1.15;

  // Build content
  const blocks = parseContentBlocks(slideInfo.slide_content || "");
  const slideType = (slideInfo.slide_type || "bullets").toLowerCase();
  const textObjects = buildTextObjects(blocks, theme, slideType);

  if (textObjects.length > 0) {
    slide.addText(textObjects, {
      x: contentX,
      y: contentY,
      w: contentW,
      h: contentH,
      valign: "top",
      shrinkText: true
    });
  }

  // Image panel (right side)
  if (hasImage) {
    // Subtle image background panel
    slide.addShape(pptx.ShapeType.rect, {
      x: 6.3, y: 1.05, w: 3.3, h: 5.9,
      fill: { color: theme.isDark ? "111122" : "F4F6FA" },
      line: { color: theme.accent2Color, pt: 1 }
    });

    // Embed the image, centered within the panel
    slide.addImage({
      path: slideInfo.image_path,
      x: 6.35,
      y: 1.1,
      w: 3.2,
      h: 5.8,
      sizing: { type: "contain", w: 3.2, h: 5.8 }
    });
  }
}

function addEndSlide(pptx, theme) {
  const slide = pptx.addSlide();
  slide.background = theme.background;

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: 0.08,
    fill: { color: theme.accentColor },
    line: { type: "none" }
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0.08, w: 0.06, h: 7.42,
    fill: { color: theme.accentColor },
    line: { type: "none" }
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 7.05, w: 9, h: 0.04,
    fill: { color: theme.accent2Color },
    line: { type: "none" }
  });

  slide.addText("Thank You", {
    x: 0.5, y: 2.8, w: 9, h: 1.5,
    fontSize: 48,
    bold: true,
    color: theme.titleColor,
    fontFace: theme.titleFont,
    align: "center",
    valign: "middle"
  });

  slide.addText("Generated by DeckGen AI", {
    x: 0.5, y: 4.5, w: 9, h: 0.6,
    fontSize: 18,
    color: theme.isDark ? "777788" : "999999",
    fontFace: theme.bodyFont,
    align: "center"
  });
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Create a PPTX file from structured slide data.
 * @param {object[]} slidesData
 * @param {string} outputPath
 * @param {{ themeName?: string, mainTitle?: string }} options
 */
export async function createPresentation(slidesData, outputPath, { themeName, mainTitle } = {}) {
  const theme = getTheme(themeName);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  addTitleSlide(pptx, theme, mainTitle);

  let slideNum = 1;
  for (const slideInfo of slidesData) {
    const type = (slideInfo.slide_type || "").toLowerCase();
    if (type === "title") continue;
    addContentSlide(pptx, theme, slideInfo, slideNum++);
  }

  addEndSlide(pptx, theme);

  await pptx.writeFile({ fileName: outputPath });
}
