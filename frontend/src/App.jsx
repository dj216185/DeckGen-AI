import { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import HistoryPage from "./pages/HistoryPage";
import TemplatesPage from "./pages/TemplatesPage";
import ThemesPage from "./pages/ThemesPage";
import ThemeCreatorPage from "./pages/ThemeCreatorPage";
import SettingsPage from "./pages/SettingsPage";
import HelpPage from "./pages/HelpPage";
import AnalyticsPage from "./pages/AnalyticsPage";

const NAV = [
  {
    section: "Create",
    items: [
      { to: "/",           icon: "add_circle",         label: "New Deck"    },
      { to: "/history",    icon: "history",             label: "History"     },
      { to: "/templates",  icon: "dashboard_customize", label: "Templates"   },
    ],
  },
  {
    section: "Tools",
    items: [
      { to: "/themes",     icon: "palette",             label: "Themes"      },
      { to: "/analytics",  icon: "insights",            label: "Analytics"   },
    ],
  },
  {
    section: "Account",
    items: [
      { to: "/settings",   icon: "tune",                label: "Settings"    },
      { to: "/help",       icon: "help_outline",        label: "Help"        },
    ],
  },
];

const PAGE_TITLE = {
  "/":              "Create New Deck",
  "/history":       "History",
  "/templates":     "Templates",
  "/themes":        "Themes",
  "/theme-creator": "Theme Creator",
  "/analytics":     "Analytics",
  "/settings":      "Settings",
  "/help":          "Help & Support",
};

export default function App() {
  const [sidebarOpen, setSidebarOpen]         = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [darkMode, setDarkMode]               = useState(true); // always dark now
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    const contrast = localStorage.getItem("deckgen-contrast") === "high" ? "high" : "normal";
    document.documentElement.setAttribute("data-contrast", contrast);
    const motion = localStorage.getItem("deckgen-motion") === "reduced" ? "reduced" : "full";
    document.documentElement.setAttribute("data-motion", motion);
  }, []);

  useEffect(() => { setMobileSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!targets.length) return;
    targets.forEach((el, i) => {
      el.classList.remove("is-revealed");
      el.style.setProperty("--reveal-delay", `${Math.min(i * 60, 480)}ms`);
    });
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-revealed"); observer.unobserve(e.target); }
      }),
      { threshold: 0.1 }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileSidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileSidebarOpen]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setMobileSidebarOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pageTitle = useMemo(() => PAGE_TITLE[location.pathname] || "Dashboard", [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-app)", fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Skip link ─────────────────────────────────────── */}
      <a
        href="#mainContent"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-3 focus:left-3
                   focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold"
        style={{ background: "var(--crimson)", color: "#fff" }}
      >
        Skip to content
      </a>

      {/* ── Mobile overlay ────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col",
          "transition-all duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          sidebarOpen ? "lg:w-60" : "lg:w-[68px]",
          "w-72",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
        style={{
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border)",
          boxShadow: "4px 0 40px rgba(0,0,0,0.5)",
        }}
        id="sidebarNav"
        aria-label="Main navigation"
      >
        {/* Subtle top noise texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")", backgroundSize: "128px" }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 shrink-0 relative"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 relative"
            style={{ background: "linear-gradient(135deg, #E53E5A, #8B1A2E)", boxShadow: "0 4px 16px rgba(229,62,90,0.4)" }}>
            <span className="material-icons-outlined text-white text-[18px]">slideshow</span>
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <span className="block text-[15px] font-bold tracking-tight leading-tight whitespace-nowrap"
                style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}>
                DeckGen
                <span style={{ color: "var(--crimson)" }}> AI</span>
              </span>
              <span className="block text-[10px] uppercase tracking-widest leading-tight whitespace-nowrap"
                style={{ color: "var(--text-muted)" }}>Studio</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-5 px-2">
          {NAV.map(({ section, items }) => (
            <div key={section}>
              {sidebarOpen && (
                <p className="px-3 mb-2 text-[9px] font-black uppercase tracking-[0.18em]"
                  style={{ color: "var(--text-disabled)" }}>{section}</p>
              )}
              <div className="space-y-0.5">
                {items.map(({ to, icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    title={!sidebarOpen ? label : undefined}
                    className={({ isActive }) => [
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 relative",
                      isActive ? "nav-active" : "nav-inactive",
                    ].join(" ")}
                    style={({ isActive }) => isActive ? {
                      background: "linear-gradient(135deg, rgba(229,62,90,0.18) 0%, rgba(196,41,74,0.06) 100%)",
                      borderLeft: "2.5px solid #E53E5A",
                      color: "#E53E5A",
                      boxShadow: "inset 0 0 20px rgba(229,62,90,0.05)",
                    } : {
                      borderLeft: "2.5px solid transparent",
                      color: "var(--text-muted)",
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        <span className="material-icons-outlined text-[20px] shrink-0"
                          style={{ color: isActive ? "#E53E5A" : "var(--text-muted)" }}>
                          {icon}
                        </span>
                        {sidebarOpen && (
                          <span className="truncate" style={{ color: isActive ? "#E53E5A" : "var(--text-secondary)" }}>
                            {label}
                          </span>
                        )}
                        {isActive && (
                          <div className="absolute right-3 w-1.5 h-1.5 rounded-full"
                            style={{ background: "#E53E5A", boxShadow: "0 0 6px rgba(229,62,90,0.8)" }} />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="hidden lg:flex items-center justify-end px-3 py-3 shrink-0"
          style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(229,62,90,0.1)"; e.currentTarget.style.color = "var(--crimson)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "var(--text-muted)"; }}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <span className="material-icons-outlined text-[18px]">
              {sidebarOpen ? "chevron_left" : "chevron_right"}
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────── */}
      <div className={[
        "flex flex-col flex-1 min-w-0 transition-[margin] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        sidebarOpen ? "lg:ml-60" : "lg:ml-[68px]",
      ].join(" ")}>

        {/* Topbar */}
        <header className="flex items-center gap-3 h-16 px-4 lg:px-6 shrink-0 z-30 sticky top-0"
          style={{
            background: "rgba(7,3,10,0.92)",
            borderBottom: "1px solid var(--border)",
            backdropFilter: "blur(16px)",
          }}>
          {/* Hamburger */}
          <button
            className="flex lg:hidden items-center justify-center w-9 h-9 rounded-xl transition-colors"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setMobileSidebarOpen((v) => !v)}
            aria-label="Open navigation"
          >
            <span className="material-icons-outlined text-[22px]">menu</span>
          </button>

          {/* Page title */}
          <div className="flex items-center gap-2 text-sm min-w-0">
            <div className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: "var(--crimson)", boxShadow: "0 0 6px var(--crimson)" }} />
            <span className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{pageTitle}</span>
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            {[
              { to: "/settings", icon: "tune",         title: "Settings" },
              { to: "/help",     icon: "help_outline",  title: "Help"     },
            ].map(({ to, icon, title }) => (
              <NavLink key={to} to={to}
                className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
                style={{ color: "var(--text-muted)" }}
                title={title}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(229,62,90,0.1)"; e.currentTarget.style.color = "var(--crimson)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "var(--text-muted)"; }}
              >
                <span className="material-icons-outlined text-[20px]">{icon}</span>
              </NavLink>
            ))}
          </div>
        </header>

        {/* Page content */}
        <main id="mainContent" role="main" className="flex-1 overflow-y-auto">
          <Routes location={location}>
            <Route path="/"               element={<HomePage />} />
            <Route path="/history"        element={<HistoryPage />} />
            <Route path="/templates"      element={<TemplatesPage />} />
            <Route path="/themes"         element={<ThemesPage />} />
            <Route path="/theme-creator"  element={<ThemeCreatorPage />} />
            <Route path="/analytics"      element={<AnalyticsPage />} />
            <Route path="/settings"       element={<SettingsPage />} />
            <Route path="/help"           element={<HelpPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
