import { useEffect, useState } from "react";

function getInitial(name, fallback) {
  return window.localStorage.getItem(name) ?? fallback;
}

const DEFAULTS = {
  defaultTheme: "modern_dark",
  defaultSlides: "12",
  autoDownload: false,
  includeImages: true,
  reduceMotion: false,
  highContrast: false
};

export default function SettingsPage() {
  const [defaultTheme, setDefaultTheme] = useState(() => getInitial("deckgen-preferred-theme", "modern_dark"));
  const [defaultSlides, setDefaultSlides] = useState(() => getInitial("deckgen-default-slides", "12"));
  const [autoDownload, setAutoDownload] = useState(() => getInitial("deckgen-auto-download", "false") === "true");
  const [includeImages, setIncludeImages] = useState(() => getInitial("deckgen-include-images", "true") === "true");
  const [reduceMotion, setReduceMotion] = useState(() => getInitial("deckgen-motion", "full") === "reduced");
  const [highContrast, setHighContrast] = useState(() => getInitial("deckgen-contrast", "normal") === "high");
  const [liveMessage, setLiveMessage] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState(() => ({
    defaultTheme: getInitial("deckgen-preferred-theme", "modern_dark"),
    defaultSlides: getInitial("deckgen-default-slides", "12"),
    autoDownload: getInitial("deckgen-auto-download", "false") === "true",
    includeImages: getInitial("deckgen-include-images", "true") === "true",
    reduceMotion: getInitial("deckgen-motion", "full") === "reduced",
    highContrast: getInitial("deckgen-contrast", "normal") === "high"
  }));

  useEffect(() => {
    document.documentElement.setAttribute("data-contrast", highContrast ? "high" : "normal");
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.setAttribute("data-motion", reduceMotion ? "reduced" : "full");
  }, [reduceMotion]);

  const currentSnapshot = {
    defaultTheme,
    defaultSlides,
    autoDownload,
    includeImages,
    reduceMotion,
    highContrast
  };

  const hasUnsavedChanges = JSON.stringify(currentSnapshot) !== JSON.stringify(savedSnapshot);

  const saveSettings = () => {
    window.localStorage.setItem("deckgen-preferred-theme", defaultTheme);
    window.localStorage.setItem("deckgen-default-slides", defaultSlides);
    window.localStorage.setItem("deckgen-auto-download", String(autoDownload));
    window.localStorage.setItem("deckgen-include-images", String(includeImages));
    window.localStorage.setItem("deckgen-motion", reduceMotion ? "reduced" : "full");
    window.localStorage.setItem("deckgen-contrast", highContrast ? "high" : "normal");
    window.dispatchEvent(new CustomEvent("deckgen:preferred-theme", { detail: { theme: defaultTheme } }));
    setSavedSnapshot(currentSnapshot);
    setLiveMessage("Settings saved.");
  };

  const resetSettings = () => {
    setDefaultTheme(DEFAULTS.defaultTheme);
    setDefaultSlides(DEFAULTS.defaultSlides);
    setAutoDownload(DEFAULTS.autoDownload);
    setIncludeImages(DEFAULTS.includeImages);
    setReduceMotion(DEFAULTS.reduceMotion);
    setHighContrast(DEFAULTS.highContrast);

    window.localStorage.setItem("deckgen-preferred-theme", DEFAULTS.defaultTheme);
    window.localStorage.setItem("deckgen-default-slides", DEFAULTS.defaultSlides);
    window.localStorage.setItem("deckgen-auto-download", String(DEFAULTS.autoDownload));
    window.localStorage.setItem("deckgen-include-images", String(DEFAULTS.includeImages));
    window.localStorage.setItem("deckgen-motion", "full");
    window.localStorage.setItem("deckgen-contrast", "normal");
    window.dispatchEvent(new CustomEvent("deckgen:preferred-theme", { detail: { theme: DEFAULTS.defaultTheme } }));

    setSavedSnapshot({ ...DEFAULTS });
    setLiveMessage("Defaults restored and saved.");
  };

  return (
    <>
      <section className="hero-section" data-reveal>
        <div className="hero-content">
          <h1 className="display-title">
            <span className="title-icon">⚙️</span>
            <span className="title-text gradient-text">Settings</span>
          </h1>
          <p className="hero-subtitle">Customize your DeckGen AI experience and accessibility preferences</p>
        </div>
      </section>

      <div className="card" data-reveal>
        <h2>General Preferences</h2>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="defaultTheme">Default Theme</label>
            <select id="defaultTheme" value={defaultTheme} onChange={(e) => setDefaultTheme(e.target.value)}>
              <option value="modern_dark">Modern Dark</option>
              <option value="modern_wine">Wine & Cream</option>
              <option value="modern_light">Modern Light</option>
              <option value="ocean_breeze">Ocean Breeze</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="defaultSlides">Default Slide Count</label>
            <select id="defaultSlides" value={defaultSlides} onChange={(e) => setDefaultSlides(e.target.value)}>
              <option value="10">10 slides</option>
              <option value="12">12 slides</option>
              <option value="15">15 slides</option>
            </select>
          </div>

          <div className="form-group full-width">
            <label><input type="checkbox" checked={autoDownload} onChange={(e) => setAutoDownload(e.target.checked)} /> Auto-download presentations when ready</label>
          </div>

          <div className="form-group full-width">
            <label><input type="checkbox" checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)} /> Include images in presentations</label>
          </div>
        </div>
      </div>

      <div className="card" data-reveal>
        <h2>Accessibility</h2>
        <div className="privacy-settings">
          <div className="privacy-item">
            <div className="privacy-info">
              <h4>Reduced Motion</h4>
              <p>Reduces animations and transition effects for motion sensitivity.</p>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="privacy-item">
            <div className="privacy-info">
              <h4>High Contrast Mode</h4>
              <p>Increases contrast levels to improve readability and focus visibility.</p>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      <div className="card" data-reveal>
        <div className="account-actions">
          <button type="button" className="btn btn-outline" onClick={resetSettings}>Reset to Defaults</button>
          <button type="button" className="btn btn-primary btn-large" onClick={saveSettings} disabled={!hasUnsavedChanges}>Save Settings</button>
        </div>
        <p className="muted-text" style={{ marginTop: "10px" }}>{hasUnsavedChanges ? "You have unsaved changes." : "All settings are up to date."}</p>
        <p aria-live="polite" style={{ marginTop: "12px" }}>{liveMessage}</p>
      </div>
    </>
  );
}
