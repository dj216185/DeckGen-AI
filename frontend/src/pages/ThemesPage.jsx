import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteCustomTheme, loadCustomThemes } from "../api";

const BUILTIN_THEMES = [
  {
    id: "modern_wine",
    name: "Wine & Cream",
    desc: "Elegant wine-red with warm cream — distinctive and prestigious",
    from: "#D4426E", to: "#6B1E3A",
    badge: "Premium",
  },
  {
    id: "modern_dark",
    name: "Modern Dark",
    desc: "Midnight base with violet accents — high contrast and modern",
    from: "#7C3AED", to: "#1A1040",
    badge: "Default",
  },
  {
    id: "ocean_breeze",
    name: "Ocean Breeze",
    desc: "Deep teal gradients with aqua highlights — calm and focused",
    from: "#0EA5A5", to: "#0A4F4F",
    badge: "Available",
  },
  {
    id: "professional_light",
    name: "Professional",
    desc: "Corporate blue on white — clean, trustworthy, boardroom-ready",
    from: "#2980B9", to: "#1B3A5C",
    badge: "Available",
  },
];

const BADGE_STYLE = {
  Premium:   { background: "rgba(229,62,90,0.15)",  color: "#E53E5A",  border: "1px solid rgba(229,62,90,0.3)"  },
  Default:   { background: "rgba(167,139,250,0.15)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.3)" },
  Available: { background: "rgba(255,255,255,0.06)", color: "#B08090", border: "1px solid rgba(255,255,255,0.1)" },
};

function TabBtn({ label, active, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="px-5 py-2.5 text-[13px] font-semibold rounded-xl transition-all duration-150 whitespace-nowrap"
      style={{
        background: active ? "rgba(229,62,90,0.15)" : "transparent",
        color:      active ? "#E53E5A"              : "var(--text-muted)",
        border:     active ? "1px solid rgba(229,62,90,0.35)" : "1px solid transparent",
        boxShadow:  active ? "0 4px 16px rgba(229,62,90,0.15)" : "none",
      }}
    >
      {label}
    </button>
  );
}

export default function ThemesPage() {
  const [activeTab,    setActiveTab]    = useState("builtin");
  const [customThemes, setCustomThemes] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [notice,       setNotice]       = useState("");
  const navigate = useNavigate();

  const preferredTheme = window.localStorage.getItem("deckgen-preferred-theme") || "modern_dark";

  const reloadCustomThemes = async () => {
    try {
      setLoading(true);
      const data = await loadCustomThemes();
      setCustomThemes(Array.isArray(data) ? data : []);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reloadCustomThemes(); }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 2800);
    return () => clearTimeout(t);
  }, [notice]);

  const galleryCount = useMemo(() => customThemes.length, [customThemes.length]);

  const setPreferredTheme = (name) => {
    window.localStorage.setItem("deckgen-preferred-theme", name);
    window.dispatchEvent(new CustomEvent("deckgen:preferred-theme", { detail: { theme: name } }));
    setNotice(`"${name.replace(/_/g, " ")}" set as default theme.`);
  };

  const onDeleteTheme = async (id) => {
    if (!window.confirm("Delete this custom theme? This cannot be undone.")) return;
    try {
      await deleteCustomTheme(id);
      await reloadCustomThemes();
      setNotice("Custom theme deleted.");
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-full" style={{ background: "var(--bg-app)" }}>

      {/* ── Header ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 80% at 5% 40%, rgba(196,41,74,0.15) 0%, transparent 60%)" }} />
        <div className="relative max-w-4xl mx-auto px-6 pt-12 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase mb-5"
            style={{ background: "rgba(229,62,90,0.1)", border: "1px solid rgba(229,62,90,0.25)", color: "#E53E5A" }}>
            <span className="material-icons-outlined text-[13px]">palette</span>
            Theme Gallery
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "0.6rem" }}>
            Presentation <span style={{ color: "#E53E5A", fontStyle: "italic" }}>Themes</span>
          </h1>
          <p style={{ fontSize: "15px", color: "var(--text-secondary)", maxWidth: "500px" }}>
            Choose a built-in theme, build a custom one, or manage your saved gallery.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-16 space-y-8">

        {/* ── Tabs ── */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl w-fit"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <TabBtn label="Built-in Themes"       active={activeTab === "builtin"} onClick={() => setActiveTab("builtin")} />
          <TabBtn label={`My Gallery (${galleryCount})`} active={activeTab === "gallery"} onClick={() => setActiveTab("gallery")} />
          <TabBtn label="Create Custom"          active={activeTab === "custom"}  onClick={() => setActiveTab("custom")}  />
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-3 px-5 py-4 rounded-2xl"
            style={{ background: "rgba(248,113,113,0.08)", border: "1.5px solid rgba(248,113,113,0.25)" }}>
            <span className="material-icons-outlined text-[20px] mt-0.5" style={{ color: "#F87171" }}>error</span>
            <div>
              <p className="text-[14px] font-semibold mb-0.5" style={{ color: "#F87171" }}>Error</p>
              <p className="text-[13px]" style={{ color: "#FCA5A5" }}>{error}</p>
            </div>
          </div>
        )}

        {/* ── Notice toast ── */}
        {notice && (
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
            style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)" }}>
            <span className="material-icons-outlined text-[18px]" style={{ color: "#4ADE80" }}>check_circle</span>
            <span className="text-[13.5px] font-medium" style={{ color: "#4ADE80" }}>{notice}</span>
          </div>
        )}

        {/* ══ BUILT-IN THEMES ═══════════════════════════════════════════════ */}
        {activeTab === "builtin" && (
          <div>
            <p className="text-[12px] font-bold uppercase tracking-widest mb-5" style={{ color: "var(--text-muted)" }}>
              {BUILTIN_THEMES.length} Professional Themes
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {BUILTIN_THEMES.map((t) => {
                const sel = preferredTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPreferredTheme(t.id)}
                    className="flex flex-col gap-4 p-5 rounded-3xl text-left transition-all duration-200 group"
                    style={{
                      background: sel
                        ? `linear-gradient(145deg, ${t.from}18, rgba(255,255,255,0.03))`
                        : "rgba(255,255,255,0.03)",
                      border: sel
                        ? `1.5px solid ${t.from}`
                        : "1.5px solid rgba(255,255,255,0.07)",
                      boxShadow: sel
                        ? `0 0 0 3px ${t.from}22, 0 12px 40px ${t.from}28`
                        : "0 1px 0 rgba(255,255,255,0.03)",
                      transform: sel ? "scale(1.02) translateY(-2px)" : "scale(1)",
                    }}
                  >
                    {/* Gradient preview bar */}
                    <div className="relative w-full h-20 rounded-2xl overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}>
                      {/* Fake slide chrome */}
                      <div className="absolute inset-3 rounded-xl opacity-20"
                        style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" }} />
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 space-y-1.5">
                        <div className="h-2 w-20 rounded-full" style={{ background: "rgba(255,255,255,0.7)" }} />
                        <div className="h-1.5 w-14 rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
                        <div className="h-1.5 w-16 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }} />
                      </div>
                      {sel && (
                        <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.95)", boxShadow: `0 2px 8px ${t.from}55` }}>
                          <span className="material-icons-outlined text-[14px]" style={{ color: t.from }}>check</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[14px] font-bold leading-tight"
                            style={{ color: sel ? t.from : "var(--text-primary)" }}>{t.name}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={BADGE_STYLE[t.badge] || BADGE_STYLE.Available}>{t.badge}</span>
                        </div>
                        <p className="text-[12px] leading-snug" style={{ color: "var(--text-muted)" }}>{t.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                      <span className="text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color: sel ? t.from : "var(--text-disabled)" }}>
                        {sel ? "Currently Selected" : "Click to Select"}
                      </span>
                      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ GALLERY ═══════════════════════════════════════════════════════ */}
        {activeTab === "gallery" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[17px] font-bold" style={{ color: "var(--text-primary)" }}>Your Custom Themes</h2>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>Themes you created with the theme creator</p>
              </div>
              <button type="button" className="btn-ghost text-[13px]" onClick={() => navigate("/theme-creator")}
                style={{ height: "38px", padding: "0 1rem" }}>
                <span className="material-icons-outlined text-[16px]">add</span>
                New Theme
              </button>
            </div>

            {loading ? (
              <div className="flex items-center gap-3 px-5 py-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="material-icons-outlined text-[18px]" style={{ color: "#E53E5A", animation: "spin 1.5s linear infinite" }}>hourglass_top</span>
                <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Loading your gallery…</span>
              </div>
            ) : customThemes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 rounded-3xl text-center"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "rgba(229,62,90,0.1)" }}>
                  <span className="material-icons-outlined text-[32px]" style={{ color: "#E53E5A" }}>palette</span>
                </div>
                <h3 className="text-[16px] font-bold mb-2" style={{ color: "var(--text-primary)" }}>No custom themes yet</h3>
                <p className="text-[13px] mb-6 max-w-xs" style={{ color: "var(--text-muted)" }}>
                  Build a theme that matches your brand perfectly using the creator.
                </p>
                <button type="button" className="btn-primary" style={{ borderRadius: "0.875rem" }}
                  onClick={() => navigate("/theme-creator")}>
                  <span className="material-icons-outlined text-[18px]">add_circle_outline</span>
                  Create First Theme
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {customThemes.map((item) => {
                  const cd = item.custom_data || {};
                  const name = cd.name || "Custom Theme";
                  const id = cd.theme_id;
                  const from = cd.primaryColor || "#C4294A";
                  const to   = cd.secondaryColor || "#6B1E3A";
                  return (
                    <div key={id || name} className="flex flex-col gap-4 p-5 rounded-3xl"
                      style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="w-full h-16 rounded-xl"
                        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} />
                      <div>
                        <h3 className="text-[14px] font-bold mb-0.5" style={{ color: "var(--text-primary)" }}>{name}</h3>
                        <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{cd.description || "Custom theme"}</p>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="button" className="btn-ghost flex-1 text-[12.5px]"
                          style={{ height: "36px", padding: "0 0.875rem" }}
                          onClick={() => setPreferredTheme(`custom_${id}`)}>
                          <span className="material-icons-outlined text-[15px]">check_circle</span>
                          Use Theme
                        </button>
                        {id && (
                          <button type="button"
                            className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
                            style={{ color: "#F87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
                            onClick={() => onDeleteTheme(id)}>
                            <span className="material-icons-outlined text-[16px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ CREATE CUSTOM ═══════════════════════════════════════════════════ */}
        {activeTab === "custom" && (
          <div className="rounded-3xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="p-8 lg:p-10">
              <div className="flex items-start gap-5 mb-8">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl shrink-0"
                  style={{ background: "rgba(229,62,90,0.12)", border: "1px solid rgba(229,62,90,0.2)" }}>
                  <span className="material-icons-outlined text-[28px]" style={{ color: "#E53E5A" }}>auto_awesome</span>
                </div>
                <div>
                  <h2 className="text-[20px] font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "'DM Serif Display', serif" }}>
                    Create Your Perfect Theme
                  </h2>
                  <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    Design exactly what you need — custom colors, fonts, accent styles, and gradients — then save it for instant reuse.
                  </p>
                </div>
              </div>

              {/* Feature bullets */}
              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                {[
                  { icon: "color_lens",      text: "Custom primary & accent colors"       },
                  { icon: "text_fields",     text: "Choose title and body fonts"          },
                  { icon: "gradient",        text: "Solid, gradient, or pattern fills"    },
                  { icon: "save",            text: "Save and reuse across decks"          },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{ background: "rgba(229,62,90,0.06)", border: "1px solid rgba(229,62,90,0.12)" }}>
                    <span className="material-icons-outlined text-[18px] shrink-0" style={{ color: "#E53E5A" }}>{icon}</span>
                    <span className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>{text}</span>
                  </div>
                ))}
              </div>

              <button type="button" className="btn-primary w-full rounded-2xl font-bold"
                style={{ height: "52px", fontSize: "15px" }}
                onClick={() => navigate("/theme-creator")}>
                <span className="material-icons-outlined text-[20px]">add_circle_outline</span>
                Open Theme Creator
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <p className="sr-only" aria-live="polite">{notice}</p>
    </div>
  );
}
