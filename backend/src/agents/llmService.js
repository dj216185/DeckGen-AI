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
 * @param {string} raw
 * @returns {string}
 */
export function cleanLLMResponse(raw) {
  if (!raw) return "";
  // Strip ```json ... ``` or ``` ... ``` fences
  let cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  return cleaned;
}

