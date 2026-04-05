import { useEffect, useState } from "react";

function getInitial(name, fallback) {
  return window.localStorage.getItem(name) ?? fallback;
}

const DEFAULTS = {
  defaultTheme:  "modern_dark",
  defaultSlides: "12",
  autoDownload:  false,
  includeImages: true,
  reduceMotion:  false,
  highContrast:  false,
};

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 w-11 h-6 rounded-full transition-all duration-200"
      style={{
        background: checked ? "var(--crimson)" : "rgba(255,255,255,0.1)",
        boxShadow: checked ? "0 2px 8px rgba(229,62,90,0.4)" : "none",
      }}
    >
      <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200"
        style={{ left: checked ? "calc(100% - 20px)" : "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </button>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-3 px-6 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <span className="material-icons-outlined text-[20px]" style={{ color: "#E53E5A" }}>{icon}</span>
        <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );
}

function SettingRow({ icon, title, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="material-icons-outlined text-[18px] mt-0.5 shrink-0" style={{ color: "var(--text-muted)" }}>{icon}</span>
        <div>
          <p className="text-[13.5px] font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{title}</p>
          {desc && <p className="text-[12px] mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>{desc}</p>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function DarkSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="outline-none rounded-xl px-3 h-9 text-[13px] font-medium appearance-none"
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "1.5px solid rgba(255,255,255,0.1)",
        color: "var(--text-primary)",
        minWidth: "140px",
        cursor: "pointer",
      }}
    >
      {options.map(({ val, label }) => (
        <option key={val} value={val} style={{ background: "#110509" }}>{label}</option>
      ))}
    </select>
  );
}

export default function SettingsPage() {
  const [defaultTheme,  setDefaultTheme]  = useState(() => getInitial("deckgen-preferred-theme", "modern_dark"));
  const [defaultSlides, setDefaultSlides] = useState(() => getInitial("deckgen-default-slides", "12"));
  const [autoDownload,  setAutoDownload]  = useState(() => getInitial("deckgen-auto-download", "false") === "true");
  const [includeImages, setIncludeImages] = useState(() => getInitial("deckgen-include-images", "true") === "true");
  const [reduceMotion,  setReduceMotion]  = useState(() => getInitial("deckgen-motion", "full") === "reduced");
  const [highContrast,  setHighContrast]  = useState(() => getInitial("deckgen-contrast", "normal") === "high");
  const [liveMsg,       setLiveMsg]       = useState("");
  const [saved,         setSaved]         = useState(null);

  useEffect(() => { document.documentElement.setAttribute("data-contrast", highContrast ? "high" : "normal"); }, [highContrast]);
  useEffect(() => { document.documentElement.setAttribute("data-motion",   reduceMotion  ? "reduced" : "full"); }, [reduceMotion]);

  const snap = { defaultTheme, defaultSlides, autoDownload, includeImages, reduceMotion, highContrast };
  const dirty = JSON.stringify(snap) !== JSON.stringify(saved ?? snap);

  const saveSettings = () => {
    window.localStorage.setItem("deckgen-preferred-theme",  defaultTheme);
    window.localStorage.setItem("deckgen-default-slides",   defaultSlides);
    window.localStorage.setItem("deckgen-auto-download",    String(autoDownload));
    window.localStorage.setItem("deckgen-include-images",   String(includeImages));
    window.localStorage.setItem("deckgen-motion",           reduceMotion ? "reduced" : "full");
    window.localStorage.setItem("deckgen-contrast",         highContrast ? "high" : "normal");
    window.dispatchEvent(new CustomEvent("deckgen:preferred-theme", { detail: { theme: defaultTheme } }));
    setSaved(snap);
    setLiveMsg("Settings saved.");
    setTimeout(() => setLiveMsg(""), 2500);
  };

  const resetSettings = () => {
    setDefaultTheme(DEFAULTS.defaultTheme);  setDefaultSlides(DEFAULTS.defaultSlides);
    setAutoDownload(DEFAULTS.autoDownload);  setIncludeImages(DEFAULTS.includeImages);
    setReduceMotion(DEFAULTS.reduceMotion);  setHighContrast(DEFAULTS.highContrast);
    window.localStorage.setItem("deckgen-preferred-theme", DEFAULTS.defaultTheme);
    window.localStorage.setItem("deckgen-default-slides",  DEFAULTS.defaultSlides);
    window.localStorage.setItem("deckgen-auto-download",   "false");
    window.localStorage.setItem("deckgen-include-images",  "true");
    window.localStorage.setItem("deckgen-motion",          "full");
    window.localStorage.setItem("deckgen-contrast",        "normal");
    window.dispatchEvent(new CustomEvent("deckgen:preferred-theme", { detail: { theme: DEFAULTS.defaultTheme } }));
    setSaved(null);
    setLiveMsg("Defaults restored.");
    setTimeout(() => setLiveMsg(""), 2500);
  };

  return (
    <div className="min-h-full" style={{ background: "var(--bg-app)" }}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 50% 60% at 5% 40%, rgba(196,41,74,0.1) 0%, transparent 60%)" }} />
        <div className="relative max-w-2xl mx-auto px-6 pt-12 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase mb-5"
            style={{ background: "rgba(229,62,90,0.1)", border: "1px solid rgba(229,62,90,0.25)", color: "#E53E5A" }}>
            <span className="material-icons-outlined text-[13px]">tune</span>
            Preferences
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "0.5rem" }}>
            Settings
          </h1>
          <p style={{ fontSize: "14.5px", color: "var(--text-secondary)" }}>Customize your DeckGen AI experience</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-16 space-y-5">

        {liveMsg && (
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
            style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)" }}>
            <span className="material-icons-outlined text-[18px]" style={{ color: "#4ADE80" }}>check_circle</span>
            <span className="text-[13.5px] font-medium" style={{ color: "#4ADE80" }}>{liveMsg}</span>
          </div>
        )}

        <Section title="General Preferences" icon="tune">
          <SettingRow icon="palette" title="Default Theme" desc="Applied when starting a new deck">
            <DarkSelect value={defaultTheme} onChange={setDefaultTheme} options={[
              { val: "modern_dark",        label: "Modern Dark"   },
              { val: "modern_wine",        label: "Wine & Cream"  },
              { val: "ocean_breeze",       label: "Ocean Breeze"  },
              { val: "professional_light", label: "Professional"  },
            ]} />
          </SettingRow>
          <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
          <SettingRow icon="format_list_numbered" title="Default Slide Count" desc="Starting count for new decks">
            <DarkSelect value={defaultSlides} onChange={setDefaultSlides} options={[
              { val: "10", label: "10 slides" },
              { val: "12", label: "12 slides" },
              { val: "15", label: "15 slides" },
            ]} />
          </SettingRow>
          <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
          <SettingRow icon="download_done" title="Auto-download" desc="Download PPTX automatically when generation completes">
            <Toggle checked={autoDownload} onChange={setAutoDownload} />
          </SettingRow>
          <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
          <SettingRow icon="image_search" title="Include Images" desc="Fetch real images from the web for each slide">
            <Toggle checked={includeImages} onChange={setIncludeImages} />
          </SettingRow>
        </Section>

        <Section title="Accessibility" icon="accessibility">
          <SettingRow icon="motion_photos_off" title="Reduce Motion" desc="Minimise animations and transitions">
            <Toggle checked={reduceMotion} onChange={setReduceMotion} />
          </SettingRow>
          <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
          <SettingRow icon="contrast" title="High Contrast Mode" desc="Boost contrast for better readability">
            <Toggle checked={highContrast} onChange={setHighContrast} />
          </SettingRow>
        </Section>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button type="button" className="btn-ghost w-full sm:w-auto" onClick={resetSettings}>
            <span className="material-icons-outlined text-[16px]">restart_alt</span>
            Reset to Defaults
          </button>
          <button type="button" className="btn-primary flex-1 sm:flex-none rounded-2xl font-bold"
            style={{ height: "44px", fontSize: "14.5px" }}
            onClick={saveSettings} disabled={!dirty}>
            <span className="material-icons-outlined text-[18px]">save</span>
            Save Settings
          </button>
          {!dirty && !liveMsg && (
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>All settings up to date</span>
          )}
          {dirty && (
            <span className="text-[12px]" style={{ color: "#FCD34D" }}>Unsaved changes</span>
          )}
        </div>

        <p className="sr-only" aria-live="polite">{liveMsg}</p>
      </div>
    </div>
  );
}
