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
    generationConfig: { temperature, maxOutputTokens: 8192 },
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

    // Strategy 3: extract outermost array or object directly from raw, then repair
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

    // Strategy 4: same as 3 but with single-quote conversion
    () => {
      const cleaned = convertSingleQuotes(cleanLLMResponse(raw));
      const pattern = expectedType === "array" ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
      const m = cleaned.match(pattern);
      if (!m) throw new Error("No JSON structure found after quote conversion");
      return JSON.parse(repairJSON(m[0]));
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
