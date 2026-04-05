import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getConfig, getStatus, getThemes, getTemplates,
  startGeneration, getDownloadUrl, getDownloadSearchUrl,
} from "../api";

// ─── Stage pipeline ──────────────────────────────────────────────────────────
const STAGES = [
  { key: "init",       label: "Analyzing",  icon: "manage_search", progMin: 0  },
  { key: "outline",    label: "Outlining",  icon: "account_tree",  progMin: 20 },
  { key: "generation", label: "Writing",    icon: "auto_fix_high", progMin: 45 },
  { key: "images",     label: "Images",     icon: "image_search",  progMin: 80 },
  { key: "pptx",       label: "Building",   icon: "slideshow",     progMin: 90 },
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

// ─── Template catalog ────────────────────────────────────────────────────────
const TEMPLATE_META = {
  corporate_modern:     { name: "Corporate",   desc: "Boardroom-ready precision",    icon: "business_center",     color: "#60A5FA", glow: "rgba(96,165,250,0.25)"  },
  startup_pitch:        { name: "Startup",     desc: "Bold investor-facing energy",  icon: "rocket_launch",       color: "#FB923C", glow: "rgba(251,146,60,0.25)"  },
  academic_clean:       { name: "Academic",    desc: "Structured scholarly rigor",   icon: "school",              color: "#4ADE80", glow: "rgba(74,222,128,0.25)"  },
  creative_bold:        { name: "Creative",    desc: "Vibrant high-impact visual",   icon: "palette",             color: "#F472B6", glow: "rgba(244,114,182,0.25)" },
  data_insights:        { name: "Data",        desc: "Metrics-first analytics",      icon: "insights",            color: "#22D3EE", glow: "rgba(34,211,238,0.25)"  },
  executive_summary:    { name: "Executive",   desc: "Concise leadership brief",     icon: "diamond",             color: "#A78BFA", glow: "rgba(167,139,250,0.25)" },
  product_launch:       { name: "Product",     desc: "Feature showcase launch",      icon: "storefront",          color: "#FCD34D", glow: "rgba(252,211,77,0.25)"  },
  workshop_training:    { name: "Workshop",    desc: "Interactive session guide",    icon: "groups",              color: "#6EE7B7", glow: "rgba(110,231,183,0.25)" },
  minimal_professional: { name: "Minimal",     desc: "Clean understated elegance",   icon: "auto_awesome",        color: "#CBD5E1", glow: "rgba(203,213,225,0.25)" },
};

// ─── Theme swatches ──────────────────────────────────────────────────────────
const FALLBACK_THEMES = [
  { name: "modern_wine",        display_name: "Wine & Cream"   },
  { name: "modern_dark",        display_name: "Modern Dark"    },
  { name: "ocean_breeze",       display_name: "Ocean Breeze"   },
  { name: "professional_light", display_name: "Professional"   },
];

const THEME_SWATCHES = {
  modern_wine:          { from: "#D4426E", to: "#6B1E3A", label: "Deep wine with warm cream" },
  modern_dark:          { from: "#7C3AED", to: "#1A1040", label: "Midnight with neon violet" },
  ocean_breeze:         { from: "#0EA5A5", to: "#0A4F4F", label: "Teal ocean gradients"      },
  professional_light:   { from: "#2980B9", to: "#1B3A5C", label: "Clean corporate blue"      },
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();

  const [topic,       setTopic]       = useState("");
  const [projectInfo, setProjectInfo] = useState("");
  const [theme,       setTheme]       = useState("modern_wine");
  const [template,    setTemplate]    = useState("corporate_modern");
  const [slideCount,  setSlideCount]  = useState(15);
  const [themes,      setThemes]      = useState([]);
  const [templates,   setTemplates]   = useState([]);
  const [limits,      setLimits]      = useState({ min: 10, max: 15 });

  const [taskId,   setTaskId]   = useState("");
  const [status,   setStatus]   = useState(null);
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState("");
  const pollRef  = useRef(0);
  const aliveRef = useRef(true);

  const progress     = status?.progress || 0;
  const stageIdx     = useMemo(() => resolveStageIdx(status), [status]);
  const isGenerating = Boolean(taskId) && status?.status !== "completed" && status?.status !== "error";
  const isDone       = status?.status === "completed";
  const isFailed     = status?.status === "error";
  const showPanel    = Boolean(taskId) && status !== null;

  const effectiveThemes = themes.length ? themes : FALLBACK_THEMES;

  // ── Boot ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [cfg, themeList, templateList] = await Promise.all([
          getConfig(), getThemes(), getTemplates().catch(() => []),
        ]);
        setLimits(cfg.slide_limits || { min: 10, max: 15 });
        setSlideCount((cfg.slide_limits || { max: 15 }).max);
        setThemes(Array.isArray(themeList) ? themeList : []);
        setTemplates(Array.isArray(templateList) ? templateList : []);
      } catch (e) {
        setError(e.message);
      }
    })();

    const raw = localStorage.getItem("deckgen-selected-template");
    if (raw) {
      try {
        const s = JSON.parse(raw);
        if (s?.topic) setTopic(s.topic);
        if (s?.template) setTemplate(s.template);
      } catch {}
      localStorage.removeItem("deckgen-selected-template");
    }
    const pt = localStorage.getItem("deckgen-preferred-theme");
    if (pt) setTheme(pt);
    const ps = localStorage.getItem("deckgen-default-slides");
    if (ps) { const n = Number(ps); if (Number.isFinite(n)) setSlideCount(Math.max(10, Math.min(15, Math.floor(n)))); }
  }, []);

  // ── Polling ───────────────────────────────────────────────────────────────
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
        if (data.status === "completed" || data.status === "error") { setBusy(false); return; }
      } catch (e) {
        if (!aliveRef.current) return;
        pollRef.current += 1;
        const msg = String(e?.message || "");
        if (msg.toLowerCase().includes("task not found")) {
          setBusy(false); setError("Task not found. The backend may have restarted."); return;
        }
        if (pollRef.current >= 15) { setBusy(false); setError("Lost connection to the backend."); return; }
        setError(`Retrying… (${pollRef.current})`);
        if (aliveRef.current) setTimeout(() => poll(Math.min(10000, delay * 1.5)), Math.min(10000, delay * 1.5));
        return;
      }
      if (aliveRef.current) setTimeout(() => poll(1500), 1500);
    };

    poll();
    return () => { aliveRef.current = false; };
  }, [taskId]);

  useEffect(() => {
    if (!showPanel) return;
    setTimeout(() => {
      const el = document.getElementById("progressPanel");
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 88, behavior: "smooth" });
    }, 150);
  }, [showPanel]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!topic.trim()) { setError("Please enter a presentation topic."); return; }
    try {
      setBusy(true);
      setStatus(null);
      setTaskId("");
      const bounded = Math.max(limits.min, Math.min(limits.max, Number(slideCount) || limits.max));
      setSlideCount(bounded);
      const data = await startGeneration({ topic: topic.trim(), project_info: projectInfo.trim(), theme, slide_count: bounded, template });
      setTaskId(data.task_id);
      setStatus({ status: "queued", progress: 1, message: "Starting generation pipeline…", stage: "init" });
    } catch (e2) {
      setBusy(false);
      setError(e2.message);
    }
  };

  const resetPanel = () => { setStatus(null); setTaskId(""); setError(""); setBusy(false); };

  const outlineEntries = useMemo(() => Object.entries(status?.outline || {}), [status?.outline]);

  const templateOptions = useMemo(() => {
    const base = templates.length > 0
      ? templates.map((t) => ({ id: t.id, ...( TEMPLATE_META[t.id] || { name: t.name, desc: "", icon: "slideshow", color: "#E53E5A", glow: "rgba(229,62,90,0.25)" }) }))
      : Object.entries(TEMPLATE_META).map(([id, meta]) => ({ id, ...meta }));
    return base;
  }, [templates]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full" style={{ background: "var(--bg-app)" }}>

      {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: "380px" }}>
        {/* Atmospheric bg */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse 70% 80% at 10% 50%, rgba(196,41,74,0.22) 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 90% 20%, rgba(229,62,90,0.12) 0%, transparent 55%), linear-gradient(170deg,#0D0509 0%,#07030A 100%)" }}
          />
          {/* Noise grain */}
          <div className="absolute inset-0 opacity-[0.045]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: "180px" }}
          />
          {/* Orbs */}
          <div className="absolute -top-20 -left-16 w-[500px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(196,41,74,0.18) 0%, transparent 68%)", filter: "blur(72px)", animation: "orbFloat 10s ease-in-out infinite" }} />
          <div className="absolute top-1/2 right-[20%] -translate-y-1/2 w-[300px] h-[300px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(229,62,90,0.1) 0%, transparent 70%)", filter: "blur(56px)", animation: "orbFloat 7s ease-in-out 3s infinite" }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-14 lg:py-20 grid lg:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-7 rounded-full text-[11px] font-bold tracking-widest uppercase"
              style={{ background: "rgba(229,62,90,0.12)", border: "1px solid rgba(229,62,90,0.3)", color: "#E53E5A" }}>
              <span className="material-icons-outlined text-[13px]">auto_awesome</span>
              AI Presentation Engine
            </div>

            <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(2.2rem, 4vw, 3.4rem)", lineHeight: 1.08, color: "#F0E4E8", marginBottom: "1.25rem" }}>
              From Idea to{" "}
              <span style={{ color: "#E53E5A", fontStyle: "italic" }}>Professional Deck</span>
            </h1>

            <p className="mb-9 max-w-[460px]" style={{ fontSize: "16px", lineHeight: 1.7, color: "var(--text-secondary)" }}>
              Choose a template, describe your topic, and get a polished presentation with varied layouts, real images, and instant PPTX download.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-9">
              <button type="button" className="btn-primary text-[15px] h-12 px-7 rounded-2xl"
                onClick={() => document.getElementById("generatorSection")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <span className="material-icons-outlined text-[18px]">rocket_launch</span>
                Start Building
              </button>
              <button type="button" className="btn-ghost h-12 px-6 rounded-2xl"
                onClick={() => navigate("/templates")}>
                <span className="material-icons-outlined text-[18px]">dashboard_customize</span>
                Browse Templates
              </button>
            </div>

            {/* Pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: "view_carousel",       text: "7 layout types" },
                { icon: "image_search",        text: "Real images"    },
                { icon: "dashboard_customize", text: "9 templates"    },
                { icon: "download_done",       text: "Instant PPTX"  },
              ].map(({ icon, text }) => (
                <div key={text} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)" }}>
                  <span className="material-icons-outlined text-[13px]" style={{ color: "var(--crimson)" }}>{icon}</span>
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Floating preview card */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[320px] rounded-3xl p-6"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(229,62,90,0.2)", boxShadow: "0 2px 4px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", animation: "panelEntrance 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s both, panelFloat 7s ease-in-out 1.2s infinite" }}>

              <div className="flex items-center gap-2.5 pb-4 mb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-center w-9 h-9 rounded-xl"
                  style={{ background: "rgba(229,62,90,0.15)" }}>
                  <span className="material-icons-outlined text-[20px]" style={{ color: "#E53E5A" }}>view_carousel</span>
                </div>
                <span className="text-[14px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Slide Layouts</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { icon: "view_sidebar",  text: "Text + Image" },
                  { icon: "view_column",   text: "Two Column"   },
                  { icon: "pin",           text: "Big Number"   },
                  { icon: "format_quote",  text: "Quote"        },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "var(--text-secondary)", cursor: "default" }}>
                    <span className="material-icons-outlined text-[15px]" style={{ color: "#E53E5A" }}>{icon}</span>
                    {text}
                  </div>
                ))}
              </div>

              <div className="h-[4px] rounded-full mb-3" style={{ background: "linear-gradient(90deg,#E53E5A,#8B1A2E,rgba(229,62,90,0.3))", animation: "progressPulse 2.5s ease-in-out infinite" }} />
              <p className="text-center text-[11.5px] italic" style={{ color: "var(--text-muted)" }}>Every deck uses varied layouts for visual impact.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATS STRIP ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap" style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        {[
          { icon: "timer",              strong: "2–3 Min",     sub: "to polished deck"        },
          { icon: "view_carousel",      strong: "7 Layouts",   sub: "per presentation"         },
          { icon: "image",              strong: "Real Images",  sub: "auto-fetched from web"   },
          { icon: "dashboard_customize",strong: "9 Templates", sub: "professional designs"     },
        ].map(({ icon, strong, sub }, i, arr) => (
          <div key={strong} className="flex items-center gap-3.5 px-7 py-4 flex-1 min-w-[160px] relative transition-colors"
            style={{ borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
              style={{ background: "rgba(229,62,90,0.1)" }}>
              <span className="material-icons-outlined text-[20px]" style={{ color: "#E53E5A" }}>{icon}</span>
            </div>
            <div>
              <div className="text-[13.5px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{strong}</div>
              <div className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ══ GENERATOR FORM ════════════════════════════════════════════════════ */}
      <section id="generatorSection" className="max-w-3xl mx-auto px-5 py-14">

        <div className="text-center mb-10">
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            AI Presentation Generator
          </h2>
          <p style={{ fontSize: "14.5px", color: "var(--text-muted)" }}>
            Choose your template, describe your topic, get a professional deck
          </p>
        </div>

        <div className="rounded-3xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 8px 40px rgba(0,0,0,0.5)" }}>
          <form onSubmit={onSubmit} className="p-7 lg:p-9 space-y-9">

            {/* ── Template selector ── */}
            <div>
              <label className="field-label mb-4">
                <span className="material-icons-outlined">dashboard_customize</span>
                Choose Template
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {templateOptions.map((t) => {
                  const sel = template === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplate(t.id)}
                      className="flex flex-col items-start gap-3 p-4 rounded-2xl text-left relative transition-all duration-200"
                      style={{
                        background:   sel ? `linear-gradient(145deg, ${t.glow.replace("0.25", "0.22")}, rgba(255,255,255,0.03))` : "rgba(255,255,255,0.035)",
                        border:       sel ? `1.5px solid ${t.color}` : "1.5px solid rgba(255,255,255,0.07)",
                        boxShadow:    sel ? `0 0 0 3px ${t.glow}, 0 12px 40px ${t.glow}, inset 0 1px 0 ${t.color}33` : "none",
                        transform:    sel ? "scale(1.03) translateY(-2px)" : "scale(1)",
                      }}
                    >
                      {/* Icon */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200"
                        style={{
                          background: sel ? `${t.color}22` : "rgba(255,255,255,0.06)",
                          boxShadow:  sel ? `0 4px 16px ${t.glow}` : "none",
                        }}>
                        <span className="material-icons-outlined text-[20px]"
                          style={{ color: sel ? t.color : "var(--text-muted)" }}>{t.icon}</span>
                      </div>

                      <div>
                        <div className="text-[13px] font-bold leading-tight mb-0.5"
                          style={{ color: sel ? t.color : "var(--text-primary)" }}>{t.name}</div>
                        <div className="text-[11px] leading-snug"
                          style={{ color: sel ? `${t.color}99` : "var(--text-muted)" }}>{t.desc}</div>
                      </div>

                      {/* Selected badge */}
                      {sel && (
                        <div className="absolute top-3 right-3 flex items-center justify-center w-5 h-5 rounded-full"
                          style={{ background: t.color, boxShadow: `0 2px 8px ${t.glow}` }}>
                          <span className="material-icons-outlined text-[12px] text-black font-black">check</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11.5px] flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                <span className="material-icons-outlined text-[13px]">info</span>
                Each template uses different slide layout sequences.{" "}
                <button type="button" className="underline transition-colors" style={{ color: "var(--crimson)" }}
                  onClick={() => navigate("/templates")}>View details</button>
              </p>
            </div>

            {/* ── Topic ── */}
            <div>
              <label htmlFor="topic" className="field-label">
                <span className="material-icons-outlined">lightbulb</span>
                Presentation Topic
              </label>
              <input
                id="topic"
                className="input-field"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., AI in Healthcare 2026"
                required
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {["Tech Product Launch", "Business Strategy 2026", "AI & ML Trends"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTopic(s)}
                    className="px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition-all duration-150"
                    style={{ background: "rgba(229,62,90,0.08)", color: "#E53E5A", border: "1px solid rgba(229,62,90,0.2)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(229,62,90,0.18)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(229,62,90,0.08)"; e.currentTarget.style.transform = ""; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Context ── */}
            <div>
              <label htmlFor="project_info" className="field-label">
                <span className="material-icons-outlined">notes</span>
                Additional Context
                <span className="ml-2 px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider"
                  style={{ background: "rgba(229,62,90,0.1)", color: "#E53E5A" }}>Optional</span>
              </label>
              <textarea
                id="project_info"
                rows={3}
                className="textarea-field"
                value={projectInfo}
                onChange={(e) => setProjectInfo(e.target.value)}
                placeholder="Target audience, key points, tone, specific data to include…"
              />
            </div>

            {/* ── Theme + Slide count ── */}
            <div className="grid sm:grid-cols-2 gap-7">

              {/* Color theme */}
              <div>
                <label className="field-label">
                  <span className="material-icons-outlined">color_lens</span>
                  Color Theme
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {effectiveThemes.map((t) => {
                    const sel = theme === t.name;
                    const sw  = THEME_SWATCHES[t.name] || { from: "#E53E5A", to: "#C4294A", label: "Custom theme" };
                    return (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => setTheme(t.name)}
                        className="relative flex flex-col gap-2.5 p-3.5 rounded-2xl text-left transition-all duration-200"
                        style={{
                          background: sel ? `linear-gradient(145deg, ${sw.from}18, rgba(255,255,255,0.03))` : "rgba(255,255,255,0.04)",
                          border:     sel ? `1.5px solid ${sw.from}` : "1.5px solid rgba(255,255,255,0.07)",
                          boxShadow:  sel ? `0 0 0 3px ${sw.from}22, 0 8px 28px ${sw.from}30` : "none",
                          transform:  sel ? "scale(1.03)" : "scale(1)",
                        }}
                      >
                        {/* Swatch */}
                        <div className="w-full h-7 rounded-lg"
                          style={{ background: `linear-gradient(135deg, ${sw.from}, ${sw.to})` }} />
                        <div>
                          <div className="text-[12px] font-bold leading-tight"
                            style={{ color: sel ? sw.from : "var(--text-primary)" }}>
                            {t.display_name || t.name}
                          </div>
                          <div className="text-[10.5px] mt-0.5 leading-snug"
                            style={{ color: "var(--text-muted)" }}>{sw.label}</div>
                        </div>
                        {sel && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: sw.from, boxShadow: `0 2px 8px ${sw.from}55` }}>
                            <span className="material-icons-outlined text-[12px]" style={{ color: "#fff" }}>check</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slide count */}
              <div>
                <label htmlFor="slide_count" className="field-label">
                  <span className="material-icons-outlined">format_list_numbered</span>
                  Slide Count
                </label>
                <input
                  id="slide_count"
                  type="number"
                  className="input-field mb-3"
                  min={limits.min}
                  max={limits.max}
                  value={slideCount}
                  onChange={(e) => setSlideCount(e.target.value)}
                />
                <p className="text-[12px] mb-4" style={{ color: "var(--text-muted)" }}>
                  <span className="material-icons-outlined text-[13px] align-middle mr-1">info</span>
                  {limits.min}–{limits.max} slides per deck
                </p>

                {/* Summary card */}
                <div className="rounded-2xl p-4 space-y-2.5"
                  style={{ background: "rgba(229,62,90,0.06)", border: "1px solid rgba(229,62,90,0.15)" }}>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#E53E5A" }}>Your Selection</p>
                  {[
                    { icon: "dashboard_customize", val: TEMPLATE_META[template]?.name || template },
                    { icon: "color_lens",          val: effectiveThemes.find((t) => t.name === theme)?.display_name || theme },
                    { icon: "slideshow",           val: `${slideCount} slides` },
                  ].map(({ icon, val }) => (
                    <div key={icon} className="flex items-center gap-2 text-[12.5px] font-medium" style={{ color: "var(--text-secondary)" }}>
                      <span className="material-icons-outlined text-[14px]" style={{ color: "#E53E5A" }}>{icon}</span>
                      {val}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Submit ── */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={busy}
                className="btn-primary w-full rounded-2xl font-bold"
                style={{ height: "56px", fontSize: "16px", letterSpacing: "0.03em" }}
              >
                <span className="material-icons-outlined text-[20px]">{busy ? "hourglass_top" : "auto_awesome"}</span>
                {busy ? "Generating your deck…" : "Generate Presentation"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ══ ERROR BANNER ═════════════════════════════════════════════════════ */}
      {error && !isGenerating && (
        <div className="max-w-3xl mx-auto px-5 pb-6">
          <div className="flex items-start gap-3 px-5 py-4 rounded-2xl"
            style={{ background: "rgba(186,26,26,0.1)", border: "1.5px solid rgba(186,26,26,0.3)" }}>
            <span className="material-icons-outlined text-[20px] mt-0.5" style={{ color: "#F87171" }}>error</span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold" style={{ color: "#F87171" }}>Error</p>
              <p className="text-[13px] mt-0.5" style={{ color: "#FCA5A5" }}>{error}</p>
            </div>
            <button type="button" onClick={resetPanel}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors"
              style={{ color: "#F87171" }}>
              <span className="material-icons-outlined text-[16px]">refresh</span>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ══ PROGRESS PANEL ════════════════════════════════════════════════════ */}
      {showPanel && (
        <section id="progressPanel" className="max-w-3xl mx-auto px-5 pb-16">
          <div className="rounded-3xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 16px 56px rgba(0,0,0,0.6)" }}>

            {/* Header */}
            <div className="px-7 pt-7 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11.5px] font-bold mb-3"
                    style={{
                      background: isDone ? "rgba(74,222,128,0.12)" : isFailed ? "rgba(248,113,113,0.12)" : "rgba(229,62,90,0.12)",
                      color:      isDone ? "#4ADE80"               : isFailed ? "#F87171"               : "#E53E5A",
                    }}>
                    <span className="material-icons-outlined text-[14px]">
                      {isDone ? "check_circle" : isFailed ? "error" : "auto_awesome"}
                    </span>
                    {isDone ? "Ready!" : isFailed ? "Failed" : "Building…"}
                  </div>
                  <h3 className="text-[18px] font-bold leading-snug" style={{ color: "var(--text-primary)", fontFamily: "'DM Serif Display', serif" }}>
                    {isDone ? `"${topic}" is ready` : isFailed ? (status?.message || "Something went wrong") : topic || "Generating…"}
                  </h3>
                </div>
                {!isGenerating && (
                  <button type="button" onClick={resetPanel}
                    className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors"
                    style={{ color: "var(--text-muted)" }}>
                    <span className="material-icons-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>
            </div>

            <div className="px-7 py-6 space-y-6">

              {/* Progress bar */}
              {!isFailed && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{status?.message || "Working…"}</span>
                    <span className="text-[13px] font-bold tabular-nums" style={{ color: isDone ? "#4ADE80" : "#E53E5A" }}>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500 relative overflow-hidden"
                      style={{
                        width: `${Math.max(2, progress)}%`,
                        background: isDone
                          ? "linear-gradient(90deg,#4ADE80,#22C55E)"
                          : "linear-gradient(90deg,#E53E5A,#C4294A,#8B1A2E)"
                      }}
                    >
                      {isGenerating && (
                        <div className="absolute inset-0 opacity-60"
                          style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)", animation: "shimmer 1.5s ease-in-out infinite" }} />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Stage steps */}
              {!isFailed && (
                <div className="flex items-center gap-1">
                  {STAGES.map((stage, i) => {
                    const done   = i < stageIdx || isDone;
                    const active = i === stageIdx && !isDone;
                    return (
                      <div key={stage.key} className="flex flex-col items-center gap-1.5 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200"
                          style={{
                            background: done ? "#4ADE80" : active ? "#E53E5A" : "rgba(255,255,255,0.06)",
                            boxShadow:  active ? "0 4px 16px rgba(229,62,90,0.5)" : done ? "0 4px 12px rgba(74,222,128,0.3)" : "none",
                          }}>
                          <span className="material-icons-outlined text-[15px]"
                            style={{ color: done || active ? "#fff" : "var(--text-disabled)" }}>
                            {done ? "check" : stage.icon}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-center leading-tight"
                          style={{ color: done ? "#4ADE80" : active ? "#E53E5A" : "var(--text-disabled)" }}>
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Outline */}
              {outlineEntries.length > 0 ? (
                <div className="rounded-2xl overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-2 px-4 py-3"
                    style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="material-icons-outlined text-[16px]" style={{ color: "#E53E5A" }}>account_tree</span>
                    <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
                      Slide Outline {status?.estimated_slides ? `· ${status.estimated_slides} slides` : ""}
                    </span>
                  </div>
                  <div className="px-4 py-3 space-y-3 max-h-64 overflow-y-auto">
                    {outlineEntries.map(([section, slides]) => (
                      <div key={section}>
                        <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "#E53E5A" }}>{section}</p>
                        {(slides || []).map((s, i) => (
                          <div key={i} className="flex items-start gap-2 py-1 text-[12.5px]" style={{ color: "var(--text-secondary)" }}>
                            <span className="text-[10px] font-bold tabular-nums mt-0.5 shrink-0"
                              style={{ color: "rgba(229,62,90,0.4)", minWidth: "18px" }}>{i + 1}</span>
                            {s}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : isGenerating ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: "rgba(229,62,90,0.06)", border: "1px solid rgba(229,62,90,0.15)" }}>
                  <span className="material-icons-outlined text-[16px]" style={{ color: "#E53E5A", animation: "spin 1.5s linear infinite" }}>hourglass_top</span>
                  <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Outline will appear here shortly…</span>
                </div>
              ) : null}

              {/* Downloads */}
              {isDone && taskId && (
                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                  <a href={getDownloadUrl(taskId)} download
                    className="btn-primary flex items-center justify-center gap-2 no-underline text-[14px]"
                    style={{ height: "48px", borderRadius: "1rem" }}>
                    <span className="material-icons-outlined text-[18px]">download</span>
                    Download PPTX
                  </a>
                  <a href={getDownloadSearchUrl(taskId, "pdf")} download
                    className="btn-ghost flex items-center justify-center gap-2 no-underline text-[14px]"
                    style={{ height: "48px", borderRadius: "1rem" }}>
                    <span className="material-icons-outlined text-[18px]">analytics</span>
                    Research PDF
                  </a>
                  <button type="button"
                    className="btn-ghost sm:col-span-2 text-[14px]"
                    style={{ height: "44px", borderRadius: "1rem" }}
                    onClick={resetPanel}>
                    <span className="material-icons-outlined text-[18px]">add_circle_outline</span>
                    Generate Another
                  </button>
                </div>
              )}

              {/* Error state */}
              {isFailed && (
                <div className="text-center pt-2">
                  <p className="text-[14px] mb-4" style={{ color: "#F87171" }}>{status?.message || error}</p>
                  <button type="button" className="btn-ghost" onClick={resetPanel}>
                    <span className="material-icons-outlined">refresh</span>
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes orbFloat    { 0%,100% { transform: translate(0,0) scale(1); }    50% { transform: translate(16px,-22px) scale(1.05); } }
        @keyframes panelEntrance { from { opacity:0; transform: translateY(28px) scale(0.96); } to { opacity:1; transform: translateY(0) scale(1); } }
        @keyframes panelFloat  { 0%,100% { transform: translateY(0); }              45% { transform: translateY(-10px); } }
        @keyframes progressPulse { 0%,100% { opacity:.6; } 50% { opacity:1; } }
        @keyframes shimmer     { 0% { transform:translateX(-100%); }               100% { transform:translateX(200%); } }
        @keyframes spin        { from { transform: rotate(0deg); }                  to  { transform: rotate(360deg); } }
      `}</style>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {status?.message || "Ready"}
      </div>
    </div>
  );
}
