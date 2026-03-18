import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteCustomTheme, loadCustomThemes } from "../api";

const builtInThemes = [
  { id: "modern_dark", name: "Modern Dark", status: "Default", cls: "modern-dark", desc: "Professional dark theme with elegant typography" },
  { id: "modern_light", name: "Modern Light", status: "Available", cls: "modern-light", desc: "Clean light theme for business presentations" },
  { id: "corporate", name: "Corporate Blue", status: "Available", cls: "corporate", desc: "Traditional corporate style with blue accents" },
  { id: "creative", name: "Creative Orange", status: "Available", cls: "creative", desc: "Vibrant theme for creative presentations" },
  { id: "academic", name: "Academic Green", status: "Available", cls: "academic", desc: "Scholarly theme for educational content" },
  { id: "modern_wine", name: "Wine & Cream", status: "Premium", cls: "wine-cream", desc: "Elegant wine and cream visual style" }
];

export default function ThemesPage() {
  const [activeTab, setActiveTab] = useState("custom");
  const [customThemes, setCustomThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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

  useEffect(() => {
    reloadCustomThemes();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const galleryCount = useMemo(() => customThemes.length, [customThemes.length]);

  const setPreferredTheme = (themeName) => {
    window.localStorage.setItem("deckgen-preferred-theme", themeName);
    window.dispatchEvent(new CustomEvent("deckgen:preferred-theme", { detail: { theme: themeName } }));
    setNotice(`Theme ${themeName.replace("_", " ")} selected as default.`);
  };

  const onDeleteTheme = async (themeId) => {
    try {
      if (!window.confirm("Delete this custom theme? This cannot be undone.")) return;
      await deleteCustomTheme(themeId);
      await reloadCustomThemes();
      setNotice("Custom theme deleted.");
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <section className="hero-section" data-reveal>
        <div className="hero-content">
          <h1 className="display-title">
            <span className="title-icon">🎨</span>
            <span className="title-text gradient-text">Presentation Themes</span>
          </h1>
          <p className="hero-subtitle">Create custom themes or choose from our professional collection</p>
        </div>
      </section>

      <div className="theme-tabs" data-reveal>
        <div className="tab-nav" role="tablist" aria-label="Theme tabs">
          <button type="button" role="tab" aria-selected={activeTab === "custom"} className={`tab-btn ${activeTab === "custom" ? "active" : ""}`} onClick={() => setActiveTab("custom")}>Custom Themes</button>
          <button type="button" role="tab" aria-selected={activeTab === "gallery"} className={`tab-btn ${activeTab === "gallery" ? "active" : ""}`} onClick={() => setActiveTab("gallery")}>Your Gallery ({galleryCount})</button>
          <button type="button" role="tab" aria-selected={activeTab === "builtin"} className={`tab-btn ${activeTab === "builtin" ? "active" : ""}`} onClick={() => setActiveTab("builtin")}>Built-in Themes</button>
        </div>
      </div>

      {error ? (
        <div className="card error-card" style={{ display: "block" }} data-reveal>
          <div className="error-icon">❌</div>
          <h3>Theme operation failed</h3>
          <p>{error}</p>
        </div>
      ) : null}

      {activeTab === "custom" ? (
        <div className="featured-card" data-reveal>
          <div className="featured-header">
            <div className="featured-icon"><span className="material-icons-outlined">auto_awesome</span></div>
            <div className="featured-text">
              <h2>Create Your Perfect Theme</h2>
              <p>Design exactly what you need with the advanced custom theme creator.</p>
            </div>
          </div>
          <div className="featured-actions">
            <button type="button" className="btn-featured" onClick={() => navigate("/theme-creator")}>
              <span className="material-icons-outlined">add_circle_outline</span>
              <span>Start Creating</span>
            </button>
          </div>
        </div>
      ) : null}

      {activeTab === "gallery" ? (
        <div className="card" data-reveal>
          <div className="section-header">
            <h2>Your Custom Themes</h2>
            <p>Themes you created with the custom theme creator</p>
          </div>

          {loading ? <p className="muted-text">Loading your theme gallery...</p> : null}

          {!loading && customThemes.length === 0 ? (
            <div className="empty-state empty-state-modern">
              <div className="empty-icon"><span className="material-icons-outlined">palette</span></div>
              <h3>No custom themes yet</h3>
              <p>Start with the creator and save a style that matches your brand.</p>
              <button type="button" className="btn btn-primary" onClick={() => navigate("/theme-creator")}>Create First Theme</button>
            </div>
          ) : null}

          <div className="themes-grid">
            {customThemes.map((item) => {
              const data = item.custom_data || {};
              const name = data.name || "Custom Theme";
              const id = data.theme_id;
              return (
                <div className="theme-card custom-theme-card" key={id || name}>
                  <div className="theme-preview custom-preview" style={{ background: `linear-gradient(135deg, ${data.primaryColor || "#662222"}, ${data.secondaryColor || "#A3485A"})` }} />
                  <h3>{name}</h3>
                  <p>{data.description || "Custom theme created by you"}</p>
                  <div className="theme-actions">
                    <button type="button" className="btn btn-outline" onClick={() => setPreferredTheme(`custom_${id}`)}>Use Theme</button>
                    {id ? <button type="button" className="btn btn-outline" onClick={() => onDeleteTheme(id)}>Delete Theme</button> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {activeTab === "builtin" ? (
        <div className="card" data-reveal>
          <div className="section-header">
            <h2>Built-in Themes</h2>
            <p>Professional themes ready to use in your presentations</p>
          </div>
          <div className="themes-grid">
            {builtInThemes.map((theme) => (
              <button key={theme.id} type="button" className={`theme-card ${preferredTheme === theme.id ? "active" : ""}`} onClick={() => setPreferredTheme(theme.id)}>
                <div className={`theme-preview ${theme.cls}`} />
                <h3>{theme.name}</h3>
                <p>{theme.desc}</p>
                <div className="theme-status">{preferredTheme === theme.id ? "Selected" : theme.status}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {notice ? <p className="inline-notice" role="status">{notice}</p> : null}
      <p className="sr-only" aria-live="polite">{notice}</p>
    </>
  );
}
