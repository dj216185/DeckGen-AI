// Use VITE_API_BASE_URL if explicitly set, otherwise use relative URLs
// (Vite proxy forwards /api, /generate, /status, /download, /themes to backend)
const API_BASE = String(import.meta.env.VITE_API_BASE_URL || "").trim();

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

export async function getConfig() {
  const res = await fetch(apiUrl('/api/config'));
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load config');
  return data;
}

export async function getThemes() {
  const res = await fetch(apiUrl('/themes'));
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load themes');
  return data;
}

export async function loadCustomThemes() {
  const res = await fetch(apiUrl('/api/load-custom-themes'));
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load custom themes');
  return data.themes || [];
}

export async function deleteCustomTheme(themeId) {
  const res = await fetch(apiUrl(`/api/delete-custom-theme/${encodeURIComponent(themeId)}`), {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete custom theme');
  return data;
}

export async function saveCustomTheme(theme) {
  const res = await fetch(apiUrl('/api/save-custom-theme'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save custom theme');
  return data;
}

export async function startGeneration({ topic, project_info, theme, slide_count }) {
  const body = new URLSearchParams();
  body.set('topic', topic);
  body.set('project_info', project_info || '');
  body.set('theme', theme || 'modern_dark');
  body.set('slide_count', String(slide_count));

  const res = await fetch(apiUrl('/generate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to start generation');
  return data;
}

export async function getStatus(taskId) {
  const res = await fetch(apiUrl(`/status/${taskId}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load status');
  return data;
}

export async function getHistory() {
  const res = await fetch(apiUrl('/api/history'));
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load history');
  return data;
}

export async function deleteTask(taskId) {
  const res = await fetch(apiUrl(`/api/tasks/${encodeURIComponent(taskId)}`), {
    method: 'DELETE'
  });
  const data = await res.json();
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
