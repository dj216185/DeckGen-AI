# DeckGen Node Full App

AI-powered presentation generator with a React frontend and Node.js backend.

## Architecture

- `backend/` — Express API server + AI pipeline (Gemini LLM + Perplexity search)
- `frontend/` — React + Vite SPA

## Folder Structure

```
backend/
  src/
    server.js          — Express API routes
    config.js          — App constants and paths
    taskStore.js       — In-memory task state + pipeline orchestration
    pipeline.js        — Generation pipeline (outline → research → slides → PPTX)
    agents/
      llmService.js      — Gemini LLM client
      searchService.js   — Perplexity research client
      slideOutlineAgent.js — Creates structured slide outline
      generatorAgent.js  — Generates slide content with research
      reviewerAgent.js   — Validates and sanitizes slides
      pptxCreator.js     — Builds PPTX files via pptxgenjs

frontend/
  src/
    api.js     — API client (uses Vite proxy)
    App.jsx    — Shell layout, sidebar, routing
    pages/     — Route components (Home, History, Themes, etc.)
```

## Prerequisites

- Node.js 18+

## Setup

1. Copy `.env.example` or create `.env` in `node_full_app/`:

```env
PORT=5001
DEFAULT_THEME=modern_dark
GEMINI_API_KEY=your-key
PERPLEXITY_API_KEY=your-key
GEMMA_MODEL=gemma-3-4b-it
```

2. Install backend deps:

```bash
cd backend && npm install
```

3. Install frontend deps:

```bash
cd frontend && npm install
```

## Run

**Terminal 1 — Backend:**
```bash
cd backend && npm run dev
# → http://localhost:5001
```

**Terminal 2 — Frontend:**
```bash
cd frontend && npm run dev
# → http://localhost:5176
```

The Vite dev server proxies `/generate`, `/status`, `/download`, `/themes`, and `/api/*` to the backend.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/config` | Slide limits, default theme, env status |
| POST | `/generate` | Start generation (topic, theme, slide_count) |
| GET | `/status/:task_id` | Poll task progress |
| GET | `/download/:task_id` | Download PPTX |
| GET | `/download_search/:task_id/:format?` | Download research (md/txt/pdf) |
| GET | `/api/history` | List recent tasks |
| GET | `/themes` | List available themes |
| POST | `/api/save-custom-theme` | Save custom theme |
| GET | `/api/load-custom-themes` | Load custom themes |
| DELETE | `/api/delete-custom-theme/:id` | Delete custom theme |
| DELETE | `/api/tasks/:task_id` | Delete task |

## Notes

- Slide count is enforced to 10–15.
- Output files go to `output_final/`, `search_info/`, `custom_themes/` in the project root.
