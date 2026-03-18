import { useEffect, useMemo, useRef, useState } from "react";
import { getConfig, getStatus, getThemes, startGeneration, getDownloadUrl, getDownloadSearchUrl } from "../api";

// ─── Stage config ────────────────────────────────────────────────────────────
const STAGES = [
  { key: "init",       label: "Analyzing Request",   icon: "manage_search",    progMin: 0  },
  { key: "outline",    label: "Creating Outline",     icon: "account_tree",     progMin: 20 },
  { key: "generation", label: "AI Writing Slides",    icon: "auto_fix_high",    progMin: 45 },
  { key: "images",     label: "Fetching Images",      icon: "image_search",     progMin: 80 },
  { key: "pptx",       label: "Building PPTX",        icon: "slideshow",        progMin: 90 },
];

function resolveStageIdx(status) {
  if (!status) return -1;
  const raw = String(status.stage || status.current_stage_name || "").toLowerCase();
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (raw.includes(STAGES[i].key) || raw.includes(STAGES[i].label.toLowerCase().split(" ")[0])) return i;
  }
  const p = status.progress || 0;
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (p >= STAGES[i].progMin) return i;
  }
  return 0;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function HomePage() {
  const fallbackThemes = [
    { name: "modern_wine",  display_name: "Wine & Cream" },
    { name: "modern_dark",  display_name: "Modern Dark"  },
    { name: "ocean_breeze", display_name: "Ocean Breeze" },
  ];

  // Form state
  const [topic,       setTopic]       = useState("");
  const [projectInfo, setProjectInfo] = useState("");
  const [theme,       setTheme]       = useState("modern_dark");
  const [slideCount,  setSlideCount]  = useState(15);
  const [themes,      setThemes]      = useState([]);
  const [limits,      setLimits]      = useState({ min: 10, max: 15 });

  // Generation state
  const [taskId, setTaskId] = useState("");
  const [status, setStatus] = useState(null);
  const [busy,   setBusy]   = useState(false);
  const [error,  setError]  = useState("");
  const pollRef  = useRef(0);
  const aliveRef = useRef(true);

  const progress      = status?.progress || 0;
  const stageIdx      = useMemo(() => resolveStageIdx(status), [status]);
  const isGenerating  = Boolean(taskId) && status?.status !== "completed" && status?.status !== "error";
  const isDone        = status?.status === "completed";
  const isFailed      = status?.status === "error";
  const showPanel     = Boolean(taskId) && status !== null;

  const effectiveThemes = themes.length ? themes : fallbackThemes;

  const resolveThemeClass = (name) => {
    if (name?.includes("wine"))  return "wine-theme";
    if (name?.includes("dark"))  return "dark-theme";
    if (name?.includes("ocean")) return "ocean-theme";
    return "wine-theme";
  };

  const scrollToGenerator = () =>
    document.getElementById("generatorSection")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const scrollToProgress = () =>
    document.getElementById("progressPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Boot: load config + themes
  useEffect(() => {
    (async () => {
      try {
        const [cfg, themeList] = await Promise.all([getConfig(), getThemes()]);
        setLimits(cfg.slide_limits || { min: 10, max: 15 });
        setSlideCount((cfg.slide_limits || { max: 15 }).max);
        setThemes(Array.isArray(themeList) ? themeList : []);
      } catch (e) {
        setError(e.message);
      }
    })();

    const selectedRaw = window.localStorage.getItem("deckgen-selected-template");
    if (selectedRaw) {
      try { const s = JSON.parse(selectedRaw); if (s?.topic) setTopic(s.topic); } catch {}
      window.localStorage.removeItem("deckgen-selected-template");
    }
    const pt = window.localStorage.getItem("deckgen-preferred-theme");
    if (pt) setTheme(pt);
    const ps = window.localStorage.getItem("deckgen-default-slides");
    if (ps) { const n = Number(ps); if (Number.isFinite(n)) setSlideCount(Math.max(10, Math.min(15, Math.floor(n)))); }
  }, []);

  // Polling loop
  useEffect(() => {
    if (!taskId) return;
    aliveRef.current = true;
    pollRef.current  = 0;

    const poll = async (delay = 1500) => {
      if (!aliveRef.current) return;
      try {
        const data = await getStatus(taskId);
        if (!aliveRef.current) return;
        pollRef.current = 0;
        setError("");
        setStatus(data);
        if (data.status === "completed" || data.status === "error") {
          setBusy(false);
          return;
        }
      } catch (e) {
        if (!aliveRef.current) return;
        pollRef.current += 1;
        const msg = String(e?.message || "");
        if (msg.toLowerCase().includes("task not found")) {
          setBusy(false);
          setError("Task not found. The backend may have restarted — please try again.");
          return;
        }
        if (pollRef.current >= 15) {
          setBusy(false);
          setError("Lost connection to the backend. Make sure the backend server is reachable.");
          return;
        }
        setError(`Retrying… (attempt ${pollRef.current})`);
        const backoff = Math.min(10000, delay * 1.5);
        if (aliveRef.current) setTimeout(() => poll(backoff), backoff);
        return;
      }
      if (aliveRef.current) setTimeout(() => poll(1500), 1500);
    };

    poll();
    return () => { aliveRef.current = false; };
  }, [taskId]);

  // Scroll to progress panel when it appears
  useEffect(() => {
    if (!showPanel) return;
    // Small delay so React has painted the element
    setTimeout(() => {
      const el = document.getElementById("progressPanel");
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }, 150);
  }, [showPanel]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!topic.trim()) { setError("Topic is required."); return; }
    try {
      setBusy(true);
      setStatus(null);
      setTaskId("");
      const bounded = Math.max(limits.min, Math.min(limits.max, Number(slideCount) || limits.max));
      setSlideCount(bounded);
      const data = await startGeneration({ topic: topic.trim(), project_info: projectInfo.trim(), theme, slide_count: bounded });
      setTaskId(data.task_id);
      setStatus({ status: "queued", progress: 1, message: "Starting generation pipeline...", stage: "init" });
    } catch (e2) {
      setBusy(false);
      setError(e2.message);
    }
  };

  const resetPanel = () => { setStatus(null); setTaskId(""); setError(""); setBusy(false); };

  // ─── Outline entries ───────────────────────────────────────────────────────
  const outlineEntries = useMemo(() => Object.entries(status?.outline || {}), [status?.outline]);

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="hero-modern" data-reveal>
        <div className="hero-background">
          <div className="hero-gradient" />
          <div className="hero-pattern" />
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
        </div>
        <div className="hero-content-modern">
          <div className="hero-badge">
            <span className="material-icons-outlined">auto_awesome</span>
            <span>Presentation Intelligence Engine</span>
          </div>
          <h1 className="hero-title-modern">
            From Raw Idea to <span className="hero-highlight">Boardroom-Ready Deck</span>
          </h1>
          <p className="hero-description-modern">
            DeckGen writes, structures, and polishes high-impact presentations with narrative flow,
            real images, and downloadable output in one run.
          </p>
          <div className="hero-cta-cluster">
            <button type="button" className="generate-btn-modern hero-main-cta" onClick={scrollToGenerator}>
              <span className="btn-content">
                <span className="material-icons-outlined">rocket_launch</span>
                <span className="btn-text">Start Building My Deck</span>
              </span>
              <div className="btn-ripple" />
            </button>
            <button
              type="button"
              className="hero-secondary-cta"
              onClick={() => {
                setTopic("Winning Product Pitch for 2026");
                setProjectInfo("Audience: investors\nGoal: secure funding\nTone: bold and data-driven");
                scrollToGenerator();
              }}
            >
              <span className="material-icons-outlined">bolt</span>
              <span>Load a high-impact demo</span>
            </button>
          </div>
          <div className="hero-proof-grid" aria-label="Platform highlights">
            <div className="hero-proof-card"><span className="material-icons-outlined">auto_graph</span><span>Story-led slide flow</span></div>
            <div className="hero-proof-card"><span className="material-icons-outlined">image_search</span><span>Real images from web</span></div>
            <div className="hero-proof-card"><span className="material-icons-outlined">download_done</span><span>Instant PPTX export</span></div>
          </div>
        </div>
        <aside className="hero-floating-panel" aria-label="Deck quality preview">
          <div className="floating-panel-header">
            <span className="material-icons-outlined">insights</span>
            <span>Live Build Quality</span>
          </div>
          <div className="floating-metric-row"><span>Narrative coherence</span><strong>98%</strong></div>
          <div className="floating-metric-row"><span>Visual polish</span><strong>95%</strong></div>
          <div className="floating-metric-row"><span>Executive clarity</span><strong>97%</strong></div>
          <div className="floating-progress-line" />
          <p>Generated decks are structured for clarity, momentum, and action.</p>
        </aside>
      </section>

      {/* ── Impact strip ──────────────────────────────────────────────────── */}
      <section className="landing-impact-strip" data-reveal>
        <div className="impact-pill"><span className="material-icons-outlined">timer</span><div><strong>2-3 Minutes</strong><p>to first polished draft</p></div></div>
        <div className="impact-pill"><span className="material-icons-outlined">architecture</span><div><strong>10-15 Slides</strong><p>focused and presentation-safe</p></div></div>
        <div className="impact-pill"><span className="material-icons-outlined">image</span><div><strong>Real Images</strong><p>auto-fetched per slide</p></div></div>
      </section>

      {/* ── Generator form ────────────────────────────────────────────────── */}
      <section className="generator-section" id="generatorSection" data-reveal>
        <div className="section-header">
          <h2 className="section-title">✨ AI Presentation Generator</h2>
          <p className="section-subtitle">Tell us your topic and we will create a professional presentation</p>
        </div>
        <div className="generator-card">
          <form className="modern-form" onSubmit={onSubmit}>
            <div className="input-group-modern">
              <label htmlFor="topic" className="input-label-modern">
                <span className="material-icons-outlined">lightbulb</span>
                What's your presentation about?
              </label>
              <div className="input-wrapper-modern">
                <input
                  id="topic" name="topic" className="input-modern"
                  value={topic} onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Marketing Strategy 2026" required
                />
                <div className="input-focus-line" />
              </div>
              <div className="input-suggestions">
                <button type="button" className="suggestion-tag" onClick={() => setTopic("Tech Product Launch")}>Tech Product Launch</button>
                <button type="button" className="suggestion-tag" onClick={() => setTopic("Business Strategy 2026")}>Business Strategy 2026</button>
                <button type="button" className="suggestion-tag" onClick={() => setTopic("Educational Content")}>Educational Content</button>
              </div>
            </div>

            <div className="input-group-modern">
              <label htmlFor="project_info" className="input-label-modern">
                <span className="material-icons-outlined">info</span>
                Additional Details <span className="optional-badge">Optional</span>
              </label>
              <div className="input-wrapper-modern">
                <textarea
                  id="project_info" name="project_info" rows={4} className="textarea-modern"
                  value={projectInfo} onChange={(e) => setProjectInfo(e.target.value)}
                  placeholder="Target audience, key points, constraints..."
                />
                <div className="input-focus-line" />
              </div>
            </div>

            <div className="input-group-modern">
              <label className="input-label-modern">
                <span className="material-icons-outlined">color_lens</span>
                Choose Your Style
              </label>
              <div className="theme-selector">
                {effectiveThemes.map((t) => {
                  const selected = theme === t.name;
                  return (
                    <button key={t.name} type="button" className={`theme-option ${selected ? "selected" : ""}`}
                      data-theme={t.name} onClick={() => setTheme(t.name)}>
                      <div className={`theme-preview ${resolveThemeClass(t.name)}`}><div className="theme-color-bar" /></div>
                      <span>{t.display_name || t.name}</span>
                      <div className="theme-check">
                        <span className="material-icons-outlined">{selected ? "check_circle" : "radio_button_unchecked"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="input-group-modern">
              <label htmlFor="slide_count" className="input-label-modern">
                <span className="material-icons-outlined">format_list_numbered</span>
                Number of Slides
              </label>
              <div className="input-wrapper-modern">
                <input
                  id="slide_count" name="slide_count" className="input-modern"
                  type="number" min={limits.min} max={limits.max}
                  value={slideCount} onChange={(e) => setSlideCount(e.target.value)}
                />
                <div className="input-focus-line" />
              </div>
              <div className="input-help">
                <span className="material-icons-outlined">info</span>
                <span>Choose between {limits.min}–{limits.max} slides</span>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="generate-btn-modern" disabled={busy}>
                <span className="btn-content">
                  <span className="material-icons-outlined">{busy ? "hourglass_top" : "auto_awesome"}</span>
                  <span className="btn-text">{busy ? "Generating..." : "Generate My Presentation"}</span>
                </span>
                <div className="btn-ripple" />
              </button>
              <div className="form-footer">
                <div className="feature-list">
                  <div className="feature"><span className="material-icons-outlined">schedule</span><span>2-3 minutes</span></div>
                  <div className="feature"><span className="material-icons-outlined">image</span><span>Real images included</span></div>
                  <div className="feature"><span className="material-icons-outlined">download</span><span>Instant PPTX download</span></div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && !isGenerating ? (
        <div className="card error-card" style={{ margin: "0 0 20px" }}>
          <div className="error-icon">❌</div>
          <h3>Error</h3>
          <p>{error}</p>
          <button type="button" className="hero-secondary-cta" style={{ marginTop: "12px" }} onClick={resetPanel}>
            <span className="material-icons-outlined">refresh</span><span>Try Again</span>
          </button>
        </div>
      ) : null}

      {/* ── Progress panel (inline, no overlay) ──────────────────────────── */}
      {showPanel ? (
        <section id="progressPanel" style={{
          background: "var(--md-sys-color-surface-container-low)",
          borderRadius: "20px",
          padding: "32px",
          margin: "0 0 40px",
          border: "1px solid var(--md-sys-color-outline-variant)",
          boxShadow: "var(--md-sys-elevation-level2)",
          position: "relative"
        }}>
          {/* Close button (only when done/error) */}
          {!isGenerating ? (
            <button
              type="button"
              onClick={resetPanel}
              aria-label="Close"
              style={{
                position: "absolute", top: "16px", right: "16px",
                background: "var(--md-sys-color-surface-container)",
                border: "1px solid var(--md-sys-color-outline-variant)",
                borderRadius: "50%", width: "36px", height: "36px",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--md-sys-color-on-surface-variant)"
              }}
            >
              <span className="material-icons-outlined" style={{ fontSize: "20px" }}>close</span>
            </button>
          ) : null}

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "10px",
              background: isDone ? "rgba(34,197,94,0.1)" : isFailed ? "var(--md-sys-color-error-container)" : "var(--md-sys-color-secondary-container)",
              borderRadius: "40px", padding: "8px 20px", marginBottom: "16px",
              border: `1px solid ${isDone ? "rgba(34,197,94,0.3)" : isFailed ? "var(--md-sys-color-error)" : "var(--md-sys-color-outline-variant)"}`
            }}>
              <span className="material-icons-outlined" style={{ fontSize: "18px", color: isDone ? "#16a34a" : isFailed ? "var(--md-sys-color-error)" : "var(--md-sys-color-primary)" }}>
                {isDone ? "check_circle" : isFailed ? "error" : "auto_awesome"}
              </span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: isDone ? "#16a34a" : isFailed ? "var(--md-sys-color-on-error-container)" : "var(--md-sys-color-on-secondary-container)" }}>
                {isDone ? "Presentation Ready!" : isFailed ? "Generation Failed" : "AI is building your deck…"}
              </span>
            </div>

            <h2 style={{ fontSize: "clamp(18px,3vw,24px)", fontWeight: 700, margin: 0, color: "var(--md-sys-color-on-surface)" }}>
              {isDone ? `✨ "${topic}" is ready` : isFailed ? status?.message || "Something went wrong" : topic}
            </h2>
          </div>

          {/* Progress bar */}
          {!isFailed ? (
            <div style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "var(--md-sys-color-on-surface-variant)", fontWeight: 500 }}>
                  {status?.message || "Working…"}
                </span>
                <span style={{ fontSize: "22px", fontWeight: 800, color: isDone ? "#16a34a" : "var(--md-sys-color-primary)" }}>
                  {progress}%
                </span>
              </div>
              <div style={{
                height: "10px", borderRadius: "10px",
                background: "var(--md-sys-color-surface-container)",
                overflow: "hidden", position: "relative"
              }}>
                <div style={{
                  height: "100%",
                  width: `${Math.max(2, progress)}%`,
                  borderRadius: "10px",
                  background: isDone
                    ? "linear-gradient(90deg,#16a34a,#22c55e)"
                    : `linear-gradient(90deg, var(--md-sys-color-primary), var(--md-sys-color-secondary))`,
                  transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                  position: "relative",
                  overflow: "hidden"
                }}>
                  {isGenerating ? (
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.25) 50%,transparent 100%)",
                      animation: "shimmer 1.5s infinite"
                    }} />
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {/* Stage steps */}
          {!isFailed ? (
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${STAGES.length},1fr)`,
              gap: "8px",
              marginBottom: "28px"
            }}>
              {STAGES.map((stage, i) => {
                const done    = i < stageIdx || isDone;
                const active  = i === stageIdx && !isDone;
                const pending = !done && !active;
                return (
                  <div key={stage.key} style={{ textAlign: "center" }}>
                    <div style={{
                      width: "40px", height: "40px", borderRadius: "50%",
                      margin: "0 auto 6px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: done ? "rgba(34,197,94,0.12)" : active ? "var(--md-sys-color-secondary-container)" : "var(--md-sys-color-surface-container)",
                      border: `2px solid ${done ? "#22c55e" : active ? "var(--md-sys-color-primary)" : "var(--md-sys-color-outline-variant)"}`,
                      boxShadow: active ? "0 0 0 4px var(--md-sys-color-secondary-container)" : "none",
                      transition: "all 0.3s ease",
                      animation: active ? "pulse-ring 2s infinite" : "none"
                    }}>
                      <span className="material-icons-outlined" style={{
                        fontSize: "18px",
                        color: done ? "#16a34a" : active ? "var(--md-sys-color-primary)" : "var(--md-sys-color-on-surface-variant)",
                        opacity: pending ? 0.4 : 1
                      }}>
                        {done ? "check" : stage.icon}
                      </span>
                    </div>
                    <div style={{
                      fontSize: "10px", fontWeight: active ? 700 : 500,
                      color: done ? "#16a34a" : active ? "var(--md-sys-color-primary)" : "var(--md-sys-color-on-surface-variant)",
                      opacity: pending ? 0.5 : 1,
                      lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden",
                      textOverflow: "ellipsis", padding: "0 2px"
                    }}>
                      {stage.label}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Retry message during polling */}
          {isGenerating && error ? (
            <p style={{ textAlign: "center", color: "var(--md-sys-color-error)", fontSize: "13px", margin: "0 0 16px" }}>
              ⚠ {error}
            </p>
          ) : null}

          {/* Outline preview */}
          {outlineEntries.length > 0 ? (
            <div style={{
              background: "var(--md-sys-color-surface-container)", borderRadius: "12px",
              border: "1px solid var(--md-sys-color-outline-variant)", padding: "20px",
              marginBottom: "20px", maxHeight: "220px", overflowY: "auto"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <span className="material-icons-outlined" style={{ fontSize: "18px", color: "var(--md-sys-color-primary)" }}>account_tree</span>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--md-sys-color-on-surface)" }}>
                  Slide Outline {status?.estimated_slides ? `· ${status.estimated_slides} slides` : ""}
                </h4>
              </div>
              {outlineEntries.map(([section, slides]) => (
                <div key={section} style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--md-sys-color-primary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                    {section}
                  </div>
                  {(slides || []).map((s, i) => (
                    <div key={i} style={{
                      fontSize: "13px", color: "var(--md-sys-color-on-surface-variant)",
                      padding: "4px 0 4px 12px", borderLeft: "2px solid var(--md-sys-color-outline)"
                    }}>
                      {i + 1}. {s}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : isGenerating ? (
            <div style={{
              background: "var(--md-sys-color-surface-container)", borderRadius: "12px",
              border: "1px solid var(--md-sys-color-outline-variant)", padding: "20px",
              marginBottom: "20px", textAlign: "center", color: "var(--md-sys-color-on-surface-variant)",
              fontSize: "13px"
            }}>
              <span className="material-icons-outlined" style={{ fontSize: "24px", display: "block", marginBottom: "6px", opacity: 0.4 }}>hourglass_top</span>
              Outline will appear here shortly…
            </div>
          ) : null}

          {/* Download buttons (when done) */}
          {isDone && taskId ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <a
                href={getDownloadUrl(taskId)}
                className="generate-btn-modern"
                style={{ textDecoration: "none", margin: 0, display: "flex", justifyContent: "center" }}
                download
              >
                <span className="btn-content" style={{ justifyContent: "center" }}>
                  <span className="material-icons-outlined">download</span>
                  <span className="btn-text" style={{ color: "white" }}>Download PPTX</span>
                </span>
                <div className="btn-ripple" />
              </a>
              <a
                href={getDownloadSearchUrl(taskId, "pdf")}
                className="hero-secondary-cta"
                style={{ textDecoration: "none", margin: 0, justifyContent: "center" }}
                download
              >
                <span className="material-icons-outlined">analytics</span>
                <span>Research PDF</span>
              </a>
              <button
                type="button"
                className="hero-secondary-cta"
                style={{ gridColumn: "1/-1", justifyContent: "center" }}
                onClick={resetPanel}
              >
                <span className="material-icons-outlined">add_circle_outline</span>
                <span>Generate Another Presentation</span>
              </button>
            </div>
          ) : null}

          {/* Error actions */}
          {isFailed ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "var(--md-sys-color-error)", marginBottom: "16px" }}>{status?.message || error}</p>
              <button type="button" className="hero-secondary-cta" onClick={resetPanel}>
                <span className="material-icons-outlined">refresh</span><span>Try Again</span>
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── Shimmer + pulse keyframes injected once ───────────────────────── */}
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(102,34,34,0.4); }
          70%  { box-shadow: 0 0 0 8px rgba(102,34,34,0); }
          100% { box-shadow: 0 0 0 0 rgba(102,34,34,0); }
        }
      `}</style>

      {/* ── A11y live region ──────────────────────────────────────────────── */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {status?.message || "Ready"}
      </div>
    </>
  );
}
