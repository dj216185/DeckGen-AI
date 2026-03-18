import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveCustomTheme } from "../api";

const collections = {
  professional: {
    primaryColor: "#1a237e",
    secondaryColor: "#3f51b5",
    accentColor: "#ff5722",
    backgroundColor: "#ffffff",
    textColor: "#212121"
  },
  modern: {
    primaryColor: "#263238",
    secondaryColor: "#37474f",
    accentColor: "#26a69a",
    backgroundColor: "#ffffff",
    textColor: "#1a1a1a"
  },
  vibrant: {
    primaryColor: "#e91e63",
    secondaryColor: "#ff5722",
    accentColor: "#ff9800",
    backgroundColor: "#fff8f2",
    textColor: "#3d1f2d"
  },
  nature: {
    primaryColor: "#2e7d32",
    secondaryColor: "#4caf50",
    accentColor: "#8bc34a",
    backgroundColor: "#f5fff5",
    textColor: "#13301a"
  },
  ocean: {
    primaryColor: "#006064",
    secondaryColor: "#00acc1",
    accentColor: "#26c6da",
    backgroundColor: "#f1feff",
    textColor: "#11363a"
  },
  sunset: {
    primaryColor: "#d84315",
    secondaryColor: "#ff9800",
    accentColor: "#ffcc80",
    backgroundColor: "#fff8ee",
    textColor: "#442410"
  }
};

const defaultState = {
  name: "",
  description: "",
  primaryColor: "#1a237e",
  secondaryColor: "#3f51b5",
  accentColor: "#ff5722",
  backgroundColor: "#ffffff",
  textColor: "#212121",
  pattern: "none",
  titleFont: "Inter",
  bodyFont: "Roboto",
  titleSize: 48,
  subtitleSize: 24,
  bodySize: 16
};

export default function ThemeCreatorPage() {
  const [theme, setTheme] = useState(defaultState);
  const [activeCollection, setActiveCollection] = useState("professional");
  const [previewMode, setPreviewMode] = useState("slide");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const applyCollection = (key) => {
    setActiveCollection(key);
    setTheme((prev) => ({ ...prev, ...collections[key] }));
  };

  const backgroundStyle = useMemo(() => {
    if (theme.pattern === "gradient") {
      return {
        background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor}, ${theme.accentColor})`
      };
    }

    const overlays = {
      geometric:
        "linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.13) 50%, transparent 60%), linear-gradient(-45deg, transparent 40%, rgba(255,255,255,0.13) 50%, transparent 60%)",
      dots: "radial-gradient(circle, rgba(255,255,255,0.22) 10%, transparent 10%)",
      lines:
        "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.13) 8px, rgba(255,255,255,0.13) 12px)",
      hexagon:
        "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.12) 20%, transparent 21%), radial-gradient(circle at 25% 25%, rgba(255,255,255,0.08) 15%, transparent 16%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.08) 15%, transparent 16%)"
    };

    return {
      backgroundColor: theme.primaryColor,
      backgroundImage: overlays[theme.pattern] || "none",
      backgroundSize: theme.pattern === "dots" ? "15px 15px" : theme.pattern === "hexagon" ? "30px 30px, 20px 20px, 20px 20px" : theme.pattern === "geometric" ? "20px 20px" : "auto"
    };
  }, [theme]);

  const saveTheme = async () => {
    if (!theme.name.trim()) {
      setMessage("Please provide a theme name before saving.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      await saveCustomTheme({
        name: theme.name.trim(),
        description: theme.description.trim(),
        pattern: theme.pattern,
        titleFont: theme.titleFont,
        bodyFont: theme.bodyFont,
        titleSize: Number(theme.titleSize),
        subtitleSize: Number(theme.subtitleSize),
        bodySize: Number(theme.bodySize),
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        accentColor: theme.accentColor,
        backgroundColor: theme.backgroundColor,
        textColor: theme.textColor
      });
      setMessage("Theme saved successfully. Redirecting to Themes...");
      setTimeout(() => navigate("/themes"), 900);
    } catch (e) {
      setMessage(e.message || "Unable to save theme.");
    } finally {
      setSaving(false);
    }
  };

  const setField = (key, value) => setTheme((prev) => ({ ...prev, [key]: value }));

  const resetTheme = () => {
    setTheme(defaultState);
    setActiveCollection("professional");
    setPreviewMode("slide");
    setMessage("Reset to defaults.");
  };

  return (
    <main className="theme-creator" data-reveal>
      <div className="theme-creator-container">
        <section className="creator-hero">
          <div className="hero-content">
            <h1 className="display-title">
              <span className="title-icon">🎨</span>
              <span className="title-text gradient-text">Custom Theme Creator</span>
            </h1>
            <p className="hero-subtitle">Design your own style system and preview it in real time</p>
          </div>
        </section>

        <div className="creator-layout">
          <section className="creator-controls">
            <div className="control-section">
              <h3 className="control-title"><span className="material-icons-outlined">info</span>Theme Information</h3>
              <div className="control-group">
                <label htmlFor="themeName">Theme Name</label>
                <input id="themeName" className="form-input" value={theme.name} onChange={(e) => setField("name", e.target.value)} placeholder="My Custom Theme" />
              </div>
              <div className="control-group">
                <label htmlFor="themeDescription">Description</label>
                <textarea id="themeDescription" className="form-textarea" rows={2} value={theme.description} onChange={(e) => setField("description", e.target.value)} placeholder="Describe your visual style" />
              </div>
            </div>

            <div className="control-section">
              <h3 className="control-title"><span className="material-icons-outlined">palette</span>Color Palette</h3>
              <div className="control-group">
                <label>Color Collections</label>
                <div className="color-collections">
                  {Object.keys(collections).map((key) => (
                    <button key={key} type="button" className={`color-collection ${activeCollection === key ? "active" : ""}`} onClick={() => applyCollection(key)}>
                      <div className="collection-colors">
                        <div className="color-swatch" style={{ background: collections[key].primaryColor }} />
                        <div className="color-swatch" style={{ background: collections[key].secondaryColor }} />
                        <div className="color-swatch" style={{ background: collections[key].accentColor }} />
                        <div className="color-swatch" style={{ background: collections[key].backgroundColor }} />
                      </div>
                      <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="color-controls">
                {[
                  ["primaryColor", "Primary Color"],
                  ["secondaryColor", "Secondary Color"],
                  ["accentColor", "Accent Color"],
                  ["backgroundColor", "Background"],
                  ["textColor", "Text Color"]
                ].map(([key, label]) => (
                  <div className="color-control" key={key}>
                    <label htmlFor={key}>{label}</label>
                    <input id={key} type="color" className="color-input" value={theme[key]} onChange={(e) => setField(key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="control-section">
              <h3 className="control-title"><span className="material-icons-outlined">texture</span>Background Pattern</h3>
              <div className="pattern-grid">
                {[
                  ["none", "Solid Color", "Clean gradient background", "🎨", "solid-bg"],
                  ["gradient", "Multi-Gradient", "Vibrant color transitions", "🌈", "gradient-bg"],
                  ["geometric", "Geometric", "Angular professional overlay", "◇", "geometric-bg"],
                  ["dots", "Polka Dots", "Elegant scattered circles", "⚪", "dots-bg"],
                  ["lines", "Diagonal Lines", "Modern striped design", "📐", "lines-bg"],
                  ["hexagon", "Hexagon Grid", "Sophisticated honeycomb", "⬡", "hexagon-bg"]
                ].map(([value, title, subtitle, icon, cls]) => (
                  <button key={value} type="button" className={`pattern-option ${theme.pattern === value ? "active" : ""}`} onClick={() => setField("pattern", value)}>
                    <div className={`pattern-preview ${cls}`}><div className="pattern-icon">{icon}</div></div>
                    <span>{title}</span>
                    <small>{subtitle}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="control-section">
              <h3 className="control-title"><span className="material-icons-outlined">font_download</span>Typography</h3>
              <div className="control-group">
                <label htmlFor="titleFont">Title Font</label>
                <select id="titleFont" className="form-select" value={theme.titleFont} onChange={(e) => setField("titleFont", e.target.value)}>
                  {["Inter", "Roboto", "Open Sans", "Montserrat", "Poppins", "Lato", "Source Sans Pro", "Nunito", "Georgia", "Times New Roman", "Arial", "Helvetica"].map((font) => <option key={font} value={font}>{font}</option>)}
                </select>
              </div>
              <div className="control-group">
                <label htmlFor="bodyFont">Body Font</label>
                <select id="bodyFont" className="form-select" value={theme.bodyFont} onChange={(e) => setField("bodyFont", e.target.value)}>
                  {["Inter", "Roboto", "Open Sans", "Montserrat", "Poppins", "Lato", "Source Sans Pro", "Nunito", "Georgia", "Times New Roman", "Arial", "Helvetica"].map((font) => <option key={font} value={font}>{font}</option>)}
                </select>
              </div>

              <div className="font-size-controls">
                {["titleSize", "subtitleSize", "bodySize"].map((key) => (
                  <div className="font-size-control" key={key}>
                    <label htmlFor={key}>{key.replace("Size", " Size")}</label>
                    <input
                      id={key}
                      className="range-input"
                      type="range"
                      min={key === "titleSize" ? 24 : 12}
                      max={key === "titleSize" ? 72 : key === "subtitleSize" ? 32 : 24}
                      value={theme[key]}
                      onChange={(e) => setField(key, Number(e.target.value))}
                    />
                    <span className="size-value">{theme[key]}px</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="control-section">
              <div className="action-buttons">
                <button type="button" className="btn btn-secondary" onClick={() => setPreviewMode((m) => (m === "slide" ? "card" : "slide"))}>
                  <span className="material-icons-outlined">preview</span>
                  Toggle Preview
                </button>
                <button type="button" className="btn btn-outline" onClick={resetTheme}>
                  <span className="material-icons-outlined">refresh</span>
                  Reset
                </button>
                <button type="button" className="btn btn-primary" onClick={saveTheme} disabled={saving}>
                  <span className="material-icons-outlined">save</span>
                  {saving ? "Saving..." : "Save Theme"}
                </button>
              </div>
              <p aria-live="polite" style={{ marginTop: "10px" }}>{message}</p>
            </div>
          </section>

          <section className="creator-preview" aria-live="polite">
            <div className="preview-header">
              <h3>Live Preview</h3>
              <div className="preview-controls">
                <button type="button" className={`preview-btn ${previewMode === "slide" ? "active" : ""}`} onClick={() => setPreviewMode("slide")}>
                  <span className="material-icons-outlined">slideshow</span>
                  Slide
                </button>
                <button type="button" className={`preview-btn ${previewMode === "card" ? "active" : ""}`} onClick={() => setPreviewMode("card")}>
                  <span className="material-icons-outlined">style</span>
                  Card
                </button>
              </div>
            </div>

            <div className={`preview-container ${previewMode === "slide" ? "" : "hidden"}`}>
              <div className="slide-preview">
                <div className="slide-background" style={backgroundStyle}>
                  <div className="slide-content" style={{ color: theme.textColor }}>
                    <h1 className="slide-title" style={{ fontFamily: theme.titleFont, fontSize: `${theme.titleSize}px` }}>Your Presentation Title</h1>
                    <h2 className="slide-subtitle" style={{ fontFamily: theme.bodyFont, fontSize: `${theme.subtitleSize}px` }}>Subtitle with your custom styling</h2>
                    <div className="slide-body" style={{ borderColor: theme.accentColor }}>
                      <p style={{ fontFamily: theme.bodyFont, fontSize: `${theme.bodySize}px` }}>This is how your body text will appear in presentations with this custom theme.</p>
                      <ul>
                        <li style={{ fontFamily: theme.bodyFont, fontSize: `${theme.bodySize}px` }}>Clarity-first slide structure</li>
                        <li style={{ fontFamily: theme.bodyFont, fontSize: `${theme.bodySize}px` }}>Balanced typography</li>
                        <li style={{ fontFamily: theme.bodyFont, fontSize: `${theme.bodySize}px` }}>Audience-ready visual hierarchy</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`preview-container ${previewMode === "card" ? "" : "hidden"}`}>
              <div className="card-preview">
                <div className="preview-card" style={{ borderColor: theme.accentColor }}>
                  <div className="card-header">
                    <h3 style={{ fontFamily: theme.titleFont }}>Sample Card Title</h3>
                  </div>
                  <div className="card-content">
                    <p style={{ fontFamily: theme.bodyFont, fontSize: `${theme.bodySize}px` }}>This preview shows how supporting UI blocks adopt your color and typography choices.</p>
                    <div className="card-actions">
                      <button type="button" className="btn-accent" style={{ background: theme.accentColor, color: theme.backgroundColor }}>Primary Action</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
