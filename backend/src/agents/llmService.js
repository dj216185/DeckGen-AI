import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = process.env.GEMMA_MODEL ||"gemma-3-4b-it";
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
 * Call the Gemini LLM and return the text response.
 * @param {string} prompt
 * @param {number} [temperature=0.7]
 * @returns {Promise<string>}
 */
export async function callLLM(prompt, temperature = 0.7) {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { temperature }
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

/**
 * Clean LLM response by stripping markdown code fences and extra whitespace.
 * Handles multiple fences, BOM characters, and trailing commentary after the JSON.
 * @param {string} raw
 * @returns {string}
 */
export function cleanLLMResponse(raw) {
  if (!raw) return "";

  // Remove BOM if present
  let cleaned = raw.replace(/^\uFEFF/, "");

  // Remove all ``` code fence variants (```json, ```JSON, ``` etc.) — greedy strip
  // This handles cases where the model wraps the whole response in fences
  cleaned = cleaned.replace(/^```(?:json|JSON|js|javascript)?\s*/m, "");
  cleaned = cleaned.replace(/\s*```\s*$/m, "");

  // If there are still fences inside (e.g. model put commentary before the JSON block)
  // extract just the fenced block's content
  const fencedMatch = cleaned.match(/```(?:json|JSON|js|javascript)?\s*([\s\S]*?)\s*```/);
  if (fencedMatch) {
    cleaned = fencedMatch[1];
  }

  cleaned = cleaned.trim();

  // Trim any trailing commentary after the final ] or } of the JSON
  // e.g. "[ ... ]\n\nHere is the JSON you requested."
  const lastBracket = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  if (lastBracket !== -1 && lastBracket < cleaned.length - 1) {
    cleaned = cleaned.slice(0, lastBracket + 1);
  }

  return cleaned.trim();
}

/**
 * Attempt to repair common LLM JSON corruption:
 *  - Unescaped literal newlines inside string values (the main cause of
 *    "Expected ':' after property name" errors)
 *  - Trailing commas before ] or }
 *  - Single-quoted strings (replace with double quotes)
 * @param {string} raw
 * @returns {string}
 */
export function repairJSON(raw) {
  if (!raw) return raw;

  let s = raw;

  // Replace unescaped literal newlines/tabs INSIDE JSON strings.
  // Strategy: walk char-by-char tracking whether we're inside a string.
  let result = "";
  let inString = false;
  let escape = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (escape) {
      result += ch;
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      result += ch;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString) {
      // Escape unescaped control characters that break JSON
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
      // Escape other raw control chars (\x00-\x1F)
      const code = ch.charCodeAt(0);
      if (code < 0x20) { result += `\\u${code.toString(16).padStart(4, "0")}`; continue; }
    }

    result += ch;
  }

  s = result;

  // Remove trailing commas before closing brackets/braces: ,] or ,}
  s = s.replace(/,\s*([\]\}])/g, "$1");

  return s;
}

