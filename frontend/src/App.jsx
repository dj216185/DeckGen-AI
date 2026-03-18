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

export default function App() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(true);
  const [theme, setTheme] = useState("light");
  const location = useLocation();

  useEffect(() => {
    const saved = window.localStorage.getItem("deckgen-theme");
    const initial = saved === "dark" ? "dark" : "light";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);

    const contrast = window.localStorage.getItem("deckgen-contrast") === "high" ? "high" : "normal";
    document.documentElement.setAttribute("data-contrast", contrast);

    const motion = window.localStorage.getItem("deckgen-motion") === "reduced" ? "reduced" : "full";
    document.documentElement.setAttribute("data-motion", motion);
  }, []);

  const breadcrumbLabel = useMemo(() => {
    const byPath = {
      "/": "Create Presentation",
      "/history": "History",
      "/templates": "Templates",
      "/themes": "Themes",
      "/theme-creator": "Theme Creator",
      "/analytics": "Analytics",
      "/settings": "Settings",
      "/help": "Help & Support"
    };
    return byPath[location.pathname] || "Dashboard";
  }, [location.pathname]);

  const toggleSidebar = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setDesktopSidebarExpanded((v) => !v);
      return;
    }
    setMobileSidebarOpen((v) => !v);
  };

  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!targets.length) return;

    targets.forEach((el, index) => {
      el.classList.remove("is-revealed");
      el.style.setProperty("--reveal-delay", `${Math.min(index * 70, 560)}ms`);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (!isDesktop && mobileSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileSidebarOpen]);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const syncLayoutMode = (event) => {
      if (event.matches) {
        setMobileSidebarOpen(false);
      }
    };

    syncLayoutMode(mql);
    mql.addEventListener("change", syncLayoutMode);
    return () => mql.removeEventListener("change", syncLayoutMode);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("deckgen-theme", next);
  };

  const sidebarClass = `sidebar ${mobileSidebarOpen ? "open" : ""} ${desktopSidebarExpanded ? "expanded" : ""}`.trim();
  const mainClass = `main-content ${mobileSidebarOpen ? "sidebar-open" : ""} ${desktopSidebarExpanded ? "sidebar-expanded" : ""}`.trim();

  return (
    <div className="app-container">
      <a className="skip-link" href="#mainContent">Skip to main content</a>
      <header className="taskbar">
        <div className="taskbar-left">
          <button
            className="hamburger-btn"
            aria-label="Toggle navigation"
            aria-expanded={window.matchMedia("(min-width: 1024px)").matches ? desktopSidebarExpanded : mobileSidebarOpen}
            aria-controls="sidebarNav"
            onClick={toggleSidebar}
          >
            <span className="material-icons-outlined">menu</span>
          </button>
          <NavLink to="/" className="app-logo" onClick={closeMobileSidebar}>
            <div className="app-logo-icon">
              <span className="material-icons-outlined">slideshow</span>
            </div>
            <span>DeckGen AI</span>
          </NavLink>
        </div>

        <div className="taskbar-center">
          <nav className="breadcrumb-nav">
            <div className="breadcrumb-item">
              <NavLink to="/" className="breadcrumb-link">Home</NavLink>
              <span className="breadcrumb-separator material-icons-outlined">chevron_right</span>
            </div>
            <div className="breadcrumb-item">
              <span>{breadcrumbLabel}</span>
            </div>
          </nav>
        </div>

        <div className="taskbar-right">
          <button className="theme-toggle-btn" title="Toggle dark mode" onClick={toggleTheme}>
            <span className="material-icons-outlined theme-icon">{theme === "dark" ? "light_mode" : "dark_mode"}</span>
          </button>
          <NavLink to="/settings" className="taskbar-action" title="Settings" onClick={closeMobileSidebar}>
            <span className="material-icons-outlined">settings</span>
          </NavLink>
          <NavLink to="/help" className="taskbar-action" title="Help" onClick={closeMobileSidebar}>
            <span className="material-icons-outlined">help_outline</span>
          </NavLink>
        </div>
      </header>

      <nav className={sidebarClass} id="sidebarNav" aria-label="Main navigation">
        <div className="sidebar-header">
          <h2 className="sidebar-title">Navigation</h2>
          <p className="sidebar-subtitle">DeckGen AI Studio</p>
        </div>

        <div className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-header">Main</div>
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={closeMobileSidebar}>
              <span className="nav-item-icon material-icons-outlined">add_circle_outline</span>
              <span className="nav-item-text">Create New</span>
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={closeMobileSidebar}>
              <span className="nav-item-icon material-icons-outlined">history</span>
              <span className="nav-item-text">History</span>
            </NavLink>
            <NavLink to="/templates" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={closeMobileSidebar}>
              <span className="nav-item-icon material-icons-outlined">design_services</span>
              <span className="nav-item-text">Templates</span>
            </NavLink>
          </div>

          <div className="nav-section">
            <div className="nav-section-header">Tools</div>
            <NavLink to="/themes" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={closeMobileSidebar}>
              <span className="nav-item-icon material-icons-outlined">palette</span>
              <span className="nav-item-text">Themes</span>
            </NavLink>
            <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={closeMobileSidebar}>
              <span className="nav-item-icon material-icons-outlined">analytics</span>
              <span className="nav-item-text">Analytics</span>
            </NavLink>
          </div>

          <div className="nav-section">
            <div className="nav-section-header">Account</div>
            <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={closeMobileSidebar}>
              <span className="nav-item-icon material-icons-outlined">settings</span>
              <span className="nav-item-text">Settings</span>
            </NavLink>
            <NavLink to="/help" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={closeMobileSidebar}>
              <span className="nav-item-icon material-icons-outlined">help_outline</span>
              <span className="nav-item-text">Help & Support</span>
            </NavLink>
          </div>
        </div>
      </nav>

      <div
        className={`overlay ${mobileSidebarOpen ? "active" : ""}`}
        onClick={closeMobileSidebar}
        role="button"
        tabIndex={mobileSidebarOpen ? 0 : -1}
        aria-label="Close navigation"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            closeMobileSidebar();
          }
        }}
      />

      <main className={mainClass} id="mainContent" role="main" aria-live="polite">
        <div className="content-container">
          <div className="route-stage" key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/themes" element={<ThemesPage />} />
              <Route path="/theme-creator" element={<ThemeCreatorPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/help" element={<HelpPage />} />
            </Routes>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>Powered by AI & Material Design 3 | Node + React Experience</p>
        </div>
      </footer>
    </div>
  );
}
