import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const categories = [
  { key: "business", icon: "💼", title: "Business", count: 24 },
  { key: "education", icon: "🎓", title: "Education", count: 18 },
  { key: "startup", icon: "🚀", title: "Startup", count: 15 },
  { key: "data", icon: "📊", title: "Data & Analytics", count: 12 },
  { key: "marketing", icon: "🎯", title: "Marketing", count: 21 },
  { key: "research", icon: "🔬", title: "Research", count: 9 }
];

const templates = [
  { id: "corporate-modern", name: "Corporate Modern", category: "business", subtitle: "Professional Business Presentation", tags: ["Business", "Professional"], topic: "Quarterly Business Review" },
  { id: "startup-pitch", name: "Startup Pitch", category: "startup", subtitle: "Investor Ready Deck", tags: ["Startup", "Investment"], topic: "Startup Investment Pitch" },
  { id: "academic-clean", name: "Academic Clean", category: "education", subtitle: "Educational Content", tags: ["Education", "Research"], topic: "Educational Technology Trends" },
  { id: "creative-bold", name: "Creative Bold", category: "marketing", subtitle: "Marketing Campaign", tags: ["Marketing", "Creative"], topic: "Brand Campaign Strategy" },
  { id: "data-insights", name: "Data Insights", category: "data", subtitle: "Analytics Dashboard", tags: ["Data", "Analytics"], topic: "Business Analytics Insights" },
  { id: "executive-summary", name: "Executive Summary", category: "business", subtitle: "Board Meeting Ready", tags: ["Executive", "Corporate"], topic: "Executive Strategy Summary" },
  { id: "product-launch", name: "Product Launch", category: "startup", subtitle: "New Product Reveal", tags: ["Product", "Launch"], topic: "Product Launch Plan" },
  { id: "workshop-training", name: "Workshop Training", category: "education", subtitle: "Interactive Learning", tags: ["Training", "Workshop"], topic: "Workshop Training Program" }
];

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    return templates.filter((template) => {
      const categoryOk = activeCategory === "all" ? true : template.category === activeCategory;
      const q = query.trim().toLowerCase();
      const text = `${template.name} ${template.subtitle} ${template.tags.join(" ")}`.toLowerCase();
      const queryOk = !q || text.includes(q);
      return categoryOk && queryOk;
    });
  }, [activeCategory, query]);

  const selectTemplate = (template) => {
    window.localStorage.setItem("deckgen-selected-template", JSON.stringify({
      template: template.id,
      topic: template.topic,
      timestamp: Date.now()
    }));
    setNotice(`${template.name} selected. Opening generator.`);
    navigate("/");
  };

  return (
    <>
      <section className="hero-section" data-reveal>
        <div className="hero-content">
          <h1 className="display-title">
            <span className="title-icon">🎨</span>
            <span className="title-text gradient-text">Presentation Templates</span>
          </h1>
          <p className="hero-subtitle">Choose from professional templates designed to make your presentation stand out</p>
        </div>
      </section>

      <section className="history-filters" data-reveal>
        <div className="filter-group">
          <div className="search-box">
            <span className="material-icons-outlined">search</span>
            <input
              type="text"
              placeholder="Search templates..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search templates"
            />
          </div>
          <div className="filter-buttons">
            <button type="button" className={`filter-btn ${activeCategory === "all" ? "active" : ""}`} onClick={() => setActiveCategory("all")}>All</button>
            {categories.map((category) => (
              <button
                key={category.key}
                type="button"
                className={`filter-btn ${activeCategory === category.key ? "active" : ""}`}
                onClick={() => setActiveCategory(category.key)}
              >
                {category.title}
              </button>
            ))}
            <button
              type="button"
              className="filter-btn"
              onClick={() => {
                setQuery("");
                setActiveCategory("all");
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </section>

      <div className="template-categories" data-reveal>
        {categories.map((category) => (
          <button
            key={category.key}
            type="button"
            className={`category-card ${activeCategory === category.key ? "active" : ""}`}
            onClick={() => setActiveCategory(category.key)}
          >
            <div className="category-icon">{category.icon}</div>
            <h3>{category.title}</h3>
            <p>Curated templates for {category.title.toLowerCase()} presentations</p>
            <div className="template-count">{category.count} templates</div>
          </button>
        ))}
      </div>

      <section className="templates-grid" data-reveal>
        <h2 className="section-title">Featured Templates</h2>
        {filtered.length === 0 ? (
          <div className="empty-state-modern">
            <div className="empty-icon"><span className="material-icons-outlined">search_off</span></div>
            <h2>No templates match your filters</h2>
            <p>Try another keyword or clear filters to explore all categories.</p>
          </div>
        ) : (
          <div className="template-cards">
            {filtered.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`template-card ${template.category}`}
                onClick={() => selectTemplate(template)}
                aria-label={`Use ${template.name} template`}
              >
                <div className="template-preview">
                  <div className="preview-slide">
                    <div className="slide-header">
                      <div className="slide-title">{template.name}</div>
                      <div className="slide-subtitle">{template.subtitle}</div>
                    </div>
                    <div className="slide-content">
                      <div className="content-block" />
                      <div className="content-block small" />
                    </div>
                  </div>
                </div>
                <div className="template-info">
                  <h3>{template.name}</h3>
                  <p>{template.subtitle}</p>
                  <div className="template-tags">
                    {template.tags.map((tag) => (
                      <span key={`${template.id}-${tag}`} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <p className="sr-only" aria-live="polite">{notice}</p>
    </>
  );
}
