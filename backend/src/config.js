import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BACKEND_ROOT = path.resolve(__dirname, "..");
export const APP_ROOT = path.resolve(BACKEND_ROOT, "..");
export const PROJECT_ROOT = path.resolve(APP_ROOT, "..");

export const CUSTOM_THEMES_DIR = path.join(PROJECT_ROOT, "custom_themes");
export const OUTPUT_DIR = path.join(PROJECT_ROOT, "output_final");
export const SEARCH_INFO_DIR = path.join(PROJECT_ROOT, "search_info");

export const PORT = Number(process.env.PORT || 5001);

export const MIN_SLIDES = 10;
export const MAX_SLIDES = 15;

export const DEFAULT_THEME = process.env.DEFAULT_THEME || "modern_dark";
