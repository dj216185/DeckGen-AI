import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../config.js";

const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || "sonar";
const SEARCH_TIMEOUT_MS = 60_000;
const CACHE_DIR = path.join(PROJECT_ROOT, "search_cache");
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getCacheKey(prompt) {
  return crypto.createHash("md5").update(prompt, "utf8").digest("hex");
}

function getCachedResult(cacheKey) {
  ensureCacheDir();
  const file = path.join(CACHE_DIR, `${cacheKey}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    const age = Date.now() - new Date(data.timestamp).getTime();
    if (age > CACHE_EXPIRY_MS) {
      fs.unlinkSync(file);
      return null;
    }
    return data.content;
  } catch {
    return null;
  }
}

function saveToCache(cacheKey, content) {
  ensureCacheDir();
  const file = path.join(CACHE_DIR, `${cacheKey}.json`);
  try {
    fs.writeFileSync(file, JSON.stringify({ timestamp: new Date().toISOString(), content }, null, 2), "utf-8");
  } catch {
    // ignore cache write failures
  }
}

/**
 * Call Perplexity API for web research.
 * @param {string} userInput - The user's topic
 * @param {string} searchPrompt - The full search prompt
 * @returns {Promise<string>}
 */
export async function searchAssistant(userInput, searchPrompt) {
  const cacheKey = getCacheKey(searchPrompt);
  const cached = getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return `Research unavailable (PERPLEXITY_API_KEY not set). Topic: ${userInput}`;
  }

  const body = {
    model: PERPLEXITY_MODEL,
    messages: [
      { role: "system", content: "You are a research assistant providing concise factual insights for presentations." },
      { role: "user", content: searchPrompt }
    ],
    max_tokens: 1000
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Perplexity API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";
    if (content) {
      saveToCache(cacheKey, content);
    }
    return content || `No research results available for: ${userInput}`;
  } catch (err) {
    if (err.name === "AbortError") {
      return `Research timed out for: ${userInput}. Using topic knowledge only.`;
    }
    return `Research unavailable (${err.message}). Topic: ${userInput}`;
  } finally {
    clearTimeout(timer);
  }
}
