import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = process.env.GEMMA_MODEL || "gemma-3-4b-it";
const LLM_TIMEOUT_MS = 120_000;

let _client = null;

function getClient() {
  if (!_client) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set. Please add it to your .env file.");
    _client = new GoogleGenerativeAI(key);
    console.log(`[llmService] Initialized with model: ${MODEL_NAME}`);
  }
  return _client;
}

/**
 * Call the Gemini/Gemma LLM and return the text response.
 * @param {string} prompt
 * @param {number} [temperature=0.7]
 * @returns {Promise<string>}
 */
export async function callLLM(prompt, temperature = 0.7) {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { temperature, maxOutputTokens: 16384 },
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`LLM timed out after ${LLM_TIMEOUT_MS / 1000}s`)), LLM_TIMEOUT_MS)
  );

  const generatePromise = model.generateContent(prompt).then((result) => {
    const text = result?.response?.text?.();
    if (!text) throw new Error("Empty response from Gemini");
    return text;
  });

  return Promise.race([generatePromise, timeoutPromise]);
}

// ─── Comment stripper ────────────────────────────────────────────────────────
// Walks char-by-char tracking string state to safely strip // and /* */ comments.
// Necessary because smaller models (Gemma, Mistral) sometimes emit JS-style comments
// inside JSON output.

function stripJSComments(s) {
  let result = "";
  let inString = false;
  let escaped = false;
  let i = 0;

  while (i < s.length) {
    const ch = s[i];

    if (escaped) {
      result += ch;
      escaped = false;
      i++;
      continue;
    }

    if (inString) {
      if (ch === "\\") { escaped = true; result += ch; i++; continue; }
      if (ch === '"') inString = false;
      result += ch;
      i++;
      continue;
    }

    // Outside string: check for comment starts
    if (ch === '"') {
      inString = true;
      result += ch;
      i++;
      continue;
    }

    if (ch === "/" && s[i + 1] === "/") {
      // Single-line comment — skip to end of line
      while (i < s.length && s[i] !== "\n") i++;
      continue;
    }

    if (ch === "/" && s[i + 1] === "*") {
      // Multi-line comment — skip to */
      i += 2;
      while (i < s.length - 1 && !(s[i] === "*" && s[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

// ─── Single-quote converter ──────────────────────────────────────────────────
// Some smaller models output JSON with single-quoted strings.
// Converts 'value' → "value", handling apostrophes inside values conservatively.

function convertSingleQuotes(s) {
  let result = "";
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  while (i < s.length) {
    const ch = s[i];

    if (escaped) {
      result += ch;
      escaped = false;
      i++;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      result += ch;
      i++;
      continue;
    }

    if (!inDouble && ch === "'") {
      // Toggle single-quote string, emit double-quote
      inSingle = !inSingle;
      result += '"';
      i++;
      continue;
    }

    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      result += ch;
      i++;
      continue;
    }

    // Inside a single-quoted string: escape any bare double-quotes
    if (inSingle && ch === '"') {
      result += '\\"';
      i++;
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

/**
 * Clean LLM response by stripping markdown fences, leading/trailing prose,
 * BOM characters, and extracting the core JSON structure.
 *
 * Handles models that:
 * - Wrap output in ```json ... ```
 * - Add preamble like "Here is the JSON:"
 * - Add postamble like "I hope this helps!"
 * @param {string} raw
 * @returns {string}
 */
export function cleanLLMResponse(raw) {
  if (!raw) return "";

  // Strip BOM
  let cleaned = raw.replace(/^\uFEFF/, "");

  // If there's a fenced block, extract its contents directly
  const fencedMatch = cleaned.match(/```(?:json|JSON|js|javascript)?\s*([\s\S]*?)\s*```/);
  if (fencedMatch) {
    cleaned = fencedMatch[1].trim();
  } else {
    // Strip lone opening/closing fences
    cleaned = cleaned.replace(/^```(?:json|JSON|js|javascript)?\s*/m, "");
    cleaned = cleaned.replace(/\s*```\s*$/m, "");
    cleaned = cleaned.trim();
  }

  // Find the first JSON structure opener ({ or [) and anchor from there.
  // This removes any leading prose the model added before the JSON
  // (e.g. "Here is your JSON array:\n[...")
  const firstBrace  = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  let start = -1;
  if (firstBrace === -1)      start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else                         start = Math.min(firstBrace, firstBracket);

  if (start > 0) cleaned = cleaned.slice(start);

  // Trim trailing prose after the final ] or }
  const lastBrace   = cleaned.lastIndexOf("}");
  const lastBracket = cleaned.lastIndexOf("]");
  const end = Math.max(lastBrace, lastBracket);
  if (end !== -1 && end < cleaned.length - 1) {
    cleaned = cleaned.slice(0, end + 1);
  }

  return cleaned.trim();
}

/**
 * Repair common LLM JSON corruption so JSON.parse() can succeed.
 *
 * Handles:
 * - JS-style line comments (//) and block comments (slash-star ... star-slash) in LLM output
 * - Python literals: None → null, True → true, False → false
 * - Unescaped control characters (newlines, tabs) inside string values
 * - Single-quoted strings → double-quoted
 * - Trailing commas before ] or }
 * @param {string} raw
 * @returns {string}
 */
export function repairJSON(raw) {
  if (!raw) return raw;

  let s = raw;

  // 1. Strip JS-style comments before any other processing
  s = stripJSComments(s);

  // 2. Replace Python/Ruby literals with JSON equivalents
  //    Use word-boundary anchors to avoid clobbering values like "None of the above"
  s = s.replace(/\bNone\b/g, "null");
  s = s.replace(/\bTrue\b/g, "true");
  s = s.replace(/\bFalse\b/g, "false");

  // 3. Fix unescaped control characters inside string values.
  //    Walk char-by-char tracking string/escape state.
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      result += ch;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString) {
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
      const code = ch.charCodeAt(0);
      if (code < 0x20) { result += `\\u${code.toString(16).padStart(4, "0")}`; continue; }
    }

    result += ch;
  }

  s = result;

  // 4. Remove trailing commas before closing brackets/braces: ,] or ,}
  s = s.replace(/,\s*([\]\}])/g, "$1");

  return s;
}

/**
 * Strip only markdown fences from LLM output, without trimming at last bracket.
 * Used for truncated JSON where the aggressive cleanLLMResponse would cut valid data.
 */
function stripFencesOnly(raw) {
  let s = raw.replace(/^\uFEFF/, "").trim();
  const fenced = s.match(/```(?:json|JSON|js|javascript)?\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1].trim();
  s = s.replace(/^```(?:json|JSON|js|javascript)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
  // Strip leading prose before first { or [
  const fb = s.indexOf("{");
  const fl = s.indexOf("[");
  let start = -1;
  if (fb === -1) start = fl;
  else if (fl === -1) start = fb;
  else start = Math.min(fb, fl);
  if (start > 0) s = s.slice(start);
  return s;
}

/**
 * Scan a string and return { inString, stack } describing nesting state.
 */
function scanJSONState(s) {
  let inString = false;
  let escaped = false;
  const stack = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (inString) { if (ch === '"') inString = false; continue; }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{' || ch === '[') { stack.push(ch); continue; }
    if (ch === '}') { if (stack.length && stack[stack.length - 1] === '{') stack.pop(); continue; }
    if (ch === ']') { if (stack.length && stack[stack.length - 1] === '[') stack.pop(); continue; }
  }
  return { inString, stack };
}

/**
 * Attempt to repair truncated JSON by closing unclosed strings, arrays, and objects.
 * Works best when the JSON was cut off mid-stream (e.g. LLM hit token limit).
 */
function repairTruncatedJSON(raw) {
  if (!raw) return raw;
  let s = raw.trim();

  const { inString, stack } = scanJSONState(s);

  // Already well-formed
  if (!inString && stack.length === 0) return s;

  // Close unclosed string
  if (inString) s += '"';

  // Attempt 1: remove trailing comma and close all brackets
  let attempt = s.replace(/,\s*$/, "");
  const closers = [...stack].reverse().map(c => c === '{' ? '}' : ']').join('');
  attempt += closers;

  try { JSON.parse(attempt); return attempt; } catch { /* continue */ }

  // Attempt 2: the partial element can't just be closed — truncate it.
  // Find the last top-level comma (depth 1) and cut there, then close brackets.
  let depth = 0;
  let inStr2 = false;
  let esc2 = false;
  let lastTopComma = -1;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc2) { esc2 = false; continue; }
    if (ch === "\\") { esc2 = true; continue; }
    if (inStr2) { if (ch === '"') inStr2 = false; continue; }
    if (ch === '"') { inStr2 = true; continue; }
    if (ch === '{' || ch === '[') { depth++; continue; }
    if (ch === '}' || ch === ']') { depth--; continue; }
    if (ch === ',' && depth === 1) lastTopComma = i;
  }

  if (lastTopComma > 0) {
    s = s.slice(0, lastTopComma).trim();
    const st2 = scanJSONState(s);
    if (st2.inString) s += '"';
    s = s.replace(/,\s*$/, "");
    const closers2 = [...st2.stack].reverse().map(c => c === '{' ? '}' : ']').join('');
    s += closers2;
    try { JSON.parse(s); return s; } catch { /* fall through */ }
  }

  // Attempt 3: fallback — return the first attempt (may still fail upstream)
  return attempt;
}

/**
 * Parse a markdown bullet-list outline into a JSON object.
 * Handles smaller models that output markdown instead of JSON, e.g.:
 *   * **Section Name**
 *     * Slide Title 1
 *     * Slide Title 2
 * Also handles: "* *Section:*", "## Section", "- Section:", indented items.
 */
function parseMarkdownOutline(raw) {
  const lines = raw.split("\n");
  const result = {};
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect indentation — indented lines are slide items, not section headers
    const isIndented = line.startsWith("  ") || line.startsWith("\t");

    // Strip all markdown formatting from a string
    const strip = (s) => s.replace(/\*+/g, "").replace(/#+/g, "").replace(/:+$/, "").trim();

    // ── Section header detection ──────────────────────────────────────────
    // Patterns (all non-indented):
    //   * **Section Name** or * *Section Name*
    //   **Section Name** or *Section Name*
    //   ## Section Name
    //   * Section Name:  (bullet ending in colon)
    //   Section Name:    (plain text ending in colon)
    let sectionName = null;
    if (!isIndented) {
      const patterns = [
        /^\*\s+\*{1,2}(.+?)\*{0,2}\s*:?\s*$/,  // * **Title** or * *Title*
        /^\*{1,2}(.+?)\*{0,2}\s*:?\s*$/,        // **Title** or *Title*
        /^#+\s+(.+)/,                            // ## Title
        /^[-*]\s+([^*].+?):\s*$/,               // * Title:
        /^([A-Z][^a-z]{3,}.+?):\s*$/,           // SECTION NAME: (all-caps-ish)
      ];
      for (const pat of patterns) {
        const m = trimmed.match(pat);
        if (m) {
          const candidate = strip(m[1]);
          // Must be a non-trivial string that looks like a section (not a slide title mixed in)
          if (candidate.length > 2 && candidate.length < 80) {
            sectionName = candidate;
            break;
          }
        }
      }
    }

    if (sectionName) {
      currentSection = sectionName;
      if (!result[currentSection]) result[currentSection] = [];
      continue;
    }

    // ── Slide item detection ──────────────────────────────────────────────
    // Patterns: "  * Title", "  - Title", "    * Title", plain indented text
    if (currentSection) {
      let slideTitle = null;
      const slidePatterns = [
        /^[-*]\s+(.+)/,   // - Title or * Title (also catches un-indented sub-items)
      ];
      for (const pat of slidePatterns) {
        const m = trimmed.match(pat);
        if (m) {
          slideTitle = strip(m[1]);
          break;
        }
      }
      // Plain indented text with no bullet
      if (!slideTitle && isIndented && trimmed.length > 2) {
        slideTitle = strip(trimmed);
      }

      if (slideTitle && slideTitle.length > 2 && slideTitle.length < 120) {
        result[currentSection].push(slideTitle);
      }
    }
  }

  // Remove empty sections
  for (const k of Object.keys(result)) {
    if (result[k].length === 0) delete result[k];
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Full JSON extraction pipeline: clean → repair → parse.
 * Falls back through several strategies before giving up.
 *
 * @param {string} raw - Raw LLM response text
 * @param {"object"|"array"} [expectedType] - Expected top-level JSON type for targeted extraction
 * @returns {any} Parsed JSON value
 * @throws {Error} if all strategies fail
 */
export function extractJSON(raw, expectedType) {
  if (!raw) throw new Error("extractJSON: empty input");

  const strategies = [
    // Strategy 1: clean + parse
    () => JSON.parse(repairJSON(cleanLLMResponse(raw))),

    // Strategy 2: clean + single-quote convert + parse
    () => JSON.parse(repairJSON(convertSingleQuotes(cleanLLMResponse(raw)))),

    // Strategy 3: merge multiple concatenated JSON objects
    // Some models output {obj1} {obj2} instead of one combined object.
    // Must run BEFORE the extract-outermost strategies which would discard the second object.
    () => {
      const stripped = stripFencesOnly(raw);
      // Split on }...{ boundary (closing brace, optional whitespace/comma, opening brace)
      const parts = stripped.split(/\}\s*[,]?\s*\{/);
      if (parts.length < 2) throw new Error("Not multiple objects");

      console.warn(`[extractJSON] Merging ${parts.length} concatenated JSON objects`);
      const merged = {};
      for (let i = 0; i < parts.length; i++) {
        let chunk = parts[i];
        // Re-add braces stripped by split
        if (i > 0) chunk = "{" + chunk;
        if (i < parts.length - 1) chunk = chunk + "}";
        // The last chunk might be truncated — try repair
        let parsed;
        try {
          parsed = JSON.parse(repairJSON(chunk));
        } catch {
          try {
            parsed = JSON.parse(repairTruncatedJSON(repairJSON(chunk)));
          } catch { continue; }
        }
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          Object.assign(merged, parsed);
        }
      }
      if (Object.keys(merged).length === 0) throw new Error("No valid objects after merge");
      return merged;
    },

    // Strategy 4: extract outermost array or object directly from raw, then repair
    () => {
      const cleaned = cleanLLMResponse(raw);
      const pattern = expectedType === "array"
        ? /\[[\s\S]*\]/
        : expectedType === "object"
          ? /\{[\s\S]*\}/
          : /[\[{][\s\S]*[\]}]/;
      const m = cleaned.match(pattern);
      if (!m) throw new Error("No JSON structure found");
      return JSON.parse(repairJSON(m[0]));
    },

    // Strategy 5: same as 4 but with single-quote conversion
    () => {
      const cleaned = convertSingleQuotes(cleanLLMResponse(raw));
      const pattern = expectedType === "array" ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
      const m = cleaned.match(pattern);
      if (!m) throw new Error("No JSON structure found after quote conversion");
      return JSON.parse(repairJSON(m[0]));
    },

    // Strategy 6: repair truncated JSON (LLM hit token limit mid-output)
    // Uses stripFencesOnly (not cleanLLMResponse) to avoid trimming at last bracket.
    () => {
      const stripped = stripFencesOnly(raw);
      const repaired = repairTruncatedJSON(repairJSON(stripped));
      console.warn("[extractJSON] Attempting truncated JSON repair");
      return JSON.parse(repaired);
    },

    // Strategy 7: truncated repair with single-quote conversion
    () => {
      const stripped = convertSingleQuotes(stripFencesOnly(raw));
      const repaired = repairTruncatedJSON(repairJSON(stripped));
      return JSON.parse(repaired);
    },

    // Strategy 8: markdown outline → JSON object
    // Handles smaller models that ignore JSON instructions and return markdown lists.
    // e.g. "* **Section Name**\n  * Slide Title\n  * Slide Title"
    // Only applies when an object is expected (slide outline use-case).
    () => {
      if (expectedType !== "object") throw new Error("Markdown fallback only for objects");
      const result = parseMarkdownOutline(raw);
      if (!result || Object.keys(result).length === 0) throw new Error("No markdown outline found");
      return result;
    },
  ];

  let lastErr;
  for (const strategy of strategies) {
    try {
      return strategy();
    } catch (err) {
      lastErr = err;
    }
  }

  throw new Error(`extractJSON failed all strategies. Last error: ${lastErr?.message}. Input preview: ${String(raw).slice(0, 300)}`);
}
