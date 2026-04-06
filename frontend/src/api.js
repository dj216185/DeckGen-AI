// Use VITE_API_BASE_URL if explicitly set, otherwise use relative URLs
// (Vite proxy forwards /api, /generate, /status, /download, /themes to backend)
const API_BASE = String(import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(res.ok ? 'Invalid response from server' : `Server error (${res.status}): ${text.slice(0, 200)}`);
  }
}

export async function getConfig() {
  const res = await fetch(apiUrl('/api/config'));
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || 'Failed to load config');
  return data;
}

export async function getThemes() {
  const res = await fetch(apiUrl('/themes'));
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || 'Failed to load themes');
  return data;
}

export async function loadCustomThemes() {
  const res = await fetch(apiUrl('/api/load-custom-themes'));
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || 'Failed to load custom themes');
  return data.themes || [];
}

export async function deleteCustomTheme(themeId) {
  const res = await fetch(apiUrl(`/api/delete-custom-theme/${encodeURIComponent(themeId)}`), {
    method: 'DELETE'
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || 'Failed to delete custom theme');
  return data;
}

export async function saveCustomTheme(theme) {
  const res = await fetch(apiUrl('/api/save-custom-theme'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme })
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || 'Failed to save custom theme');
  return data;
}

export async function getTemplates() {
  const res = await fetch(apiUrl('/api/templates'));
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || 'Failed to load templates');
  return data;
}

export async function startGeneration({ topic, project_info, theme, slide_count, template }) {
  const body = { topic, project_info: project_info || '', theme: theme || 'modern_dark', slide_count: Number(slide_count) };
  if (template) body.template = template;

  const res = await fetch(apiUrl('/generate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || 'Failed to start generation');
  return data;
}

export async function getStatus(taskId) {
  const res = await fetch(apiUrl(`/status/${taskId}`));
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || 'Failed to load status');
  return data;
}

export async function getHistory() {
  const res = await fetch(apiUrl('/api/history'));
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || 'Failed to load history');
  return data;
}

export async function deleteTask(taskId) {
  const res = await fetch(apiUrl(`/api/tasks/${encodeURIComponent(taskId)}`), {
    method: 'DELETE'
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || 'Failed to delete task');
  return data;
}

export function getDownloadUrl(taskId) {
  return apiUrl(`/download/${taskId}`);
}

export function getDownloadSearchUrl(taskId, format = 'md') {
  return apiUrl(`/download_search/${taskId}/${format}`);
}

export function downloadPptx(taskId) {
  window.location.href = getDownloadUrl(taskId);
}

export function downloadSearch(taskId, format = 'md') {
  window.location.href = getDownloadSearchUrl(taskId, format);
}

// ─── Review & Finalize ──────────────────────────────────────────────────────

export async function getReviewData(taskId) {
  const res = await fetch(apiUrl(`/api/tasks/${encodeURIComponent(taskId)}/review`));
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || 'Failed to load review data');
  return data;
}

export function getSlideImageUrl(taskId, filename) {
  return apiUrl(`/api/tasks/${encodeURIComponent(taskId)}/images/${encodeURIComponent(filename)}`);
}

export async function finalizePresentation(taskId, selections) {
  const res = await fetch(apiUrl(`/api/tasks/${encodeURIComponent(taskId)}/finalize`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selections })
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || 'Failed to finalize presentation');
  return data;
}
