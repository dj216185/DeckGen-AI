import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTemplates } from "../api";

const TEMPLATE_META = {
  corporate_modern: {
    icon: "business_center",
    color: "#1565C0",
    gradient: "linear-gradient(135deg, #1565C0, #0D47A1)",
    description: "Clean layouts with section dividers. Alternates text-image positions with data highlights. Ideal for quarterly reviews and board decks.",
    category: "business",
    tags: ["Business", "Professional", "Corporate"],
    defaultTopic: "Quarterly Business Review",
  },
  startup_pitch: {
    icon: "rocket_launch",
    color: "#E65100",
    gradient: "linear-gradient(135deg, #E65100, #BF360C)",
    description: "Bold number callouts and full-bleed visuals. Opens with impact metrics. Built for investor meetings and pitch competitions.",
    category: "startup",
    tags: ["Startup", "Investment", "Pitch"],
    defaultTopic: "Startup Investment Pitch",
  },
  academic_clean: {
    icon: "school",
    color: "#2E7D32",
    gradient: "linear-gradient(135deg, #2E7D32, #1B5E20)",
    description: "Structured sidebar navigation with dense two-column text. Section dividers organize research findings. Great for lectures and papers.",
    category: "education",
    tags: ["Education", "Research", "Academic"],
    defaultTopic: "Educational Technology Trends",
  },
  creative_bold: {
    icon: "palette",
    color: "#AD1457",
    gradient: "linear-gradient(135deg, #AD1457, #880E4F)",
    description: "Full-bleed image overlays with bold typography. Quote callouts and dramatic layouts. Perfect for brand campaigns and creative pitches.",
    category: "marketing",
    tags: ["Creative", "Marketing", "Bold"],
    defaultTopic: "Brand Campaign Strategy",
  },
  data_insights: {
    icon: "insights",
    color: "#00838F",
    gradient: "linear-gradient(135deg, #00838F, #006064)",
    description: "Heavy on big-number highlights and two-column comparisons. Multiple data callout slides. Built for analytics reports and dashboards.",
    category: "data",
    tags: ["Data", "Analytics", "Metrics"],
    defaultTopic: "Business Analytics Insights",
  },
  executive_summary: {
    icon: "diamond",
    color: "#4A148C",
    gradient: "linear-gradient(135deg, #4A148C, #311B92)",
    description: "Sidebar layouts with quote callouts for key decisions. Clean section flow. Designed for C-suite briefings and strategy decks.",
    category: "business",
    tags: ["Executive", "Strategy", "Leadership"],
    defaultTopic: "Executive Strategy Summary",
  },
  product_launch: {
    icon: "storefront",
    color: "#F57F17",
    gradient: "linear-gradient(135deg, #F57F17, #E65100)",
    description: "Full-bleed product imagery with bold CTA ending. Impact numbers and visual storytelling. Made for product reveals and go-to-market.",
    category: "startup",
    tags: ["Product", "Launch", "GTM"],
    defaultTopic: "Product Launch Plan",
  },
  workshop_training: {
    icon: "groups",
    color: "#0277BD",
    gradient: "linear-gradient(135deg, #0277BD, #01579B)",
    description: "Sidebar navigation with structured content flow. Quote callouts for key takeaways. Ideal for workshops and training sessions.",
    category: "education",
    tags: ["Training", "Workshop", "Interactive"],
    defaultTopic: "Workshop Training Program",
  },
  minimal_professional: {
    icon: "auto_awesome",
    color: "#37474F",
    gradient: "linear-gradient(135deg, #37474F, #263238)",
    description: "Clean alternating layouts without section dividers. Subtle sidebar accents. Best for versatile professional presentations.",
    category: "business",
    tags: ["Minimal", "Professional", "Clean"],
    defaultTopic: "Professional Overview",
  },
};

// Layout mini-preview icons for visual representation
const LAYOUT_ICONS = {
  text_left_image_right: { label: "Text + Image", icon: "view_sidebar" },
  text_right_image_left: { label: "Image + Text", icon: "flip" },
  full_bleed_image_overlay: { label: "Full Image", icon: "panorama" },
  full_text_two_column: { label: "Two Column", icon: "view_column" },
  big_number_highlight: { label: "Big Number", icon: "pin" },
  quote_callout: { label: "Quote", icon: "format_quote" },
  full_text_with_sidebar: { label: "Sidebar", icon: "view_compact" },
};

const categories = [
  { key: "all", icon: "apps", title: "All Templates" },
  { key: "business", icon: "business_center", title: "Business" },
  { key: "education", icon: "school", title: "Education" },
  { key: "startup", icon: "rocket_launch", title: "Startup" },
  { key: "data", icon: "insights", title: "Data & Analytics" },
  { key: "marketing", icon: "palette", title: "Marketing" },
];

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [templates, setTemplates] = useState([]);
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getTemplates()
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => {
        // Use fallback template keys
        setTemplates(Object.keys(TEMPLATE_META).map(id => ({ id, name: TEMPLATE_META[id]?.defaultTopic || id, layouts: [] })));
      });
  }, []);

  const enrichedTemplates = useMemo(() => {
    return templates.map((t) => ({
      ...t,
      meta: TEMPLATE_META[t.id] || {
        icon: "slideshow",
        color: "#666",
        gradient: "linear-gradient(135deg, #666, #444)",
        description: "Presentation template",
        category: "business",
        tags: ["General"],
        defaultTopic: t.name,
      },
    }));
  }, [templates]);

  const filtered = useMemo(() => {
    return enrichedTemplates.filter((t) => {
      const catOk = activeCategory === "all" || t.meta.category === activeCategory;
      const q = query.trim().toLowerCase();
      const text = `${t.name} ${t.meta.description} ${t.meta.tags.join(" ")}`.toLowerCase();
      const qOk = !q || text.includes(q);
      return catOk && qOk;
    });
  }, [enrichedTemplates, activeCategory, query]);

  const selectTemplate = (template) => {
    window.localStorage.setItem(
      "deckgen-selected-template",
      JSON.stringify({
        template: template.id,
        topic: template.meta.defaultTopic,
        timestamp: Date.now(),
      })
    );
    setNotice(`${template.name} selected. Opening generator.`);
    navigate("/");
  };

  // Get unique layouts used by a template
  const getUniqueLayouts = (layouts) => {
    if (!layouts || !layouts.length) return [];
    return [...new Set(layouts)];
  };

  return (
    <>
      {/* Hero */}
      <section className="templates-hero" data-reveal>
        <div className="templates-hero-bg">
          <div className="templates-hero-gradient" />
          <div className="templates-hero-pattern" />
        </div>
        <div className="templates-hero-content">
          <div className="templates-hero-badge">
            <span className="material-icons-outlined">design_services</span>
            <span>Professional Layout System</span>
          </div>
          <h1 className="templates-hero-title">
            Presentation <span className="templates-hero-highlight">Templates</span>
          </h1>
          <p className="templates-hero-description">
            Each template defines a unique sequence of slide layouts — image positions, text columns,
            data callouts, and visual flow. Pick one and let AI fill it with your content.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="templates-filter-bar" data-reveal>
        <div className="templates-search-wrapper">
          <span className="material-icons-outlined">search</span>
          <input
            type="text"
            placeholder="Search templates..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search templates"
          />
          {query && (
            <button className="templates-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
              <span className="material-icons-outlined">close</span>
            </button>
          )}
        </div>
        <div className="templates-category-pills">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              className={`templates-cat-pill ${activeCategory === cat.key ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              <span className="material-icons-outlined">{cat.icon}</span>
              <span>{cat.title}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Template Grid */}
      <section className="templates-grid-section" data-reveal>
        {filtered.length === 0 ? (
          <div className="templates-empty">
            <span className="material-icons-outlined">search_off</span>
            <h3>No templates match your search</h3>
            <p>Try different keywords or clear your filters.</p>
            <button className="templates-clear-btn" onClick={() => { setQuery(""); setActiveCategory("all"); }}>
              <span className="material-icons-outlined">filter_list_off</span>
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="templates-grid">
            {filtered.map((template) => {
              const uniqueLayouts = getUniqueLayouts(template.layouts);
              return (
                <div key={template.id} className="template-card-pro">
                  {/* Card Header with Gradient */}
                  <div className="template-card-header" style={{ background: template.meta.gradient }}>
                    <div className="template-card-icon-wrap">
                      <span className="material-icons-outlined">{template.meta.icon}</span>
                    </div>
                    <div className="template-card-layout-preview">
                      {/* Mini slide layout previews */}
                      {(template.layouts || []).slice(0, 4).map((layout, i) => (
                        <div key={i} className={`template-mini-slide layout-${layout}`} title={LAYOUT_ICONS[layout]?.label || layout}>
                          <div className="mini-slide-inner" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="template-card-body">
                    <h3 className="template-card-name">{template.name}</h3>
                    <p className="template-card-desc">{template.meta.description}</p>

                    {/* Layout chips */}
                    <div className="template-layout-chips">
                      {uniqueLayouts.slice(0, 5).map((layout) => (
                        <span key={layout} className="template-layout-chip">
                          <span className="material-icons-outlined">{LAYOUT_ICONS[layout]?.icon || "crop_landscape"}</span>
                          <span>{LAYOUT_ICONS[layout]?.label || layout}</span>
                        </span>
                      ))}
                      {uniqueLayouts.length > 5 && (
                        <span className="template-layout-chip template-layout-chip-more">
                          +{uniqueLayouts.length - 5} more
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="template-card-tags">
                      {template.meta.tags.map((tag) => (
                        <span key={tag} className="template-tag">{tag}</span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="template-card-actions">
                      <button
                        className="template-preview-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPreview(selectedPreview === template.id ? null : template.id);
                        }}
                      >
                        <span className="material-icons-outlined">
                          {selectedPreview === template.id ? "visibility_off" : "visibility"}
                        </span>
                        <span>{selectedPreview === template.id ? "Hide" : "Preview"}</span>
                      </button>
                      <button className="template-use-btn" onClick={() => selectTemplate(template)}>
                        <span className="material-icons-outlined">arrow_forward</span>
                        <span>Use Template</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Preview Panel */}
                  {selectedPreview === template.id && (
                    <div className="template-preview-panel">
                      <div className="template-preview-title">
                        <span className="material-icons-outlined">view_carousel</span>
                        <span>Slide Layout Sequence</span>
                      </div>
                      <div className="template-preview-sequence">
                        {/* Title slide */}
                        <div className="template-seq-slide template-seq-title">
                          <div className="seq-slide-label">Title</div>
                          <div className="seq-slide-preview seq-title-layout">
                            <div className="seq-title-bar" style={{ background: template.meta.color }} />
                            <div className="seq-title-text" />
                            <div className="seq-title-sub" />
                          </div>
                        </div>

                        {/* Content slides */}
                        {(template.layouts || []).map((layout, i) => (
                          <div key={i} className={`template-seq-slide`}>
                            <div className="seq-slide-label">Slide {i + 1}</div>
                            <div className={`seq-slide-preview seq-layout-${layout}`}>
                              <LayoutMiniPreview layout={layout} color={template.meta.color} />
                            </div>
                          </div>
                        ))}

                        {/* End slide */}
                        <div className="template-seq-slide template-seq-end">
                          <div className="seq-slide-label">End</div>
                          <div className="seq-slide-preview seq-end-layout">
                            <div className="seq-end-text" />
                            <div className="seq-end-bar" style={{ background: template.meta.color }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="sr-only" aria-live="polite">{notice}</p>
    </>
  );
}

// Mini layout preview component
function LayoutMiniPreview({ layout, color }) {
  switch (layout) {
    case "text_left_image_right":
      return (
        <>
          <div className="mini-text-block" style={{ width: "55%", left: "5%" }} />
          <div className="mini-text-line" style={{ width: "45%", left: "5%", top: "55%" }} />
          <div className="mini-image-block" style={{ width: "32%", right: "5%", background: color, opacity: 0.3 }} />
        </>
      );
    case "text_right_image_left":
      return (
        <>
          <div className="mini-image-block" style={{ width: "32%", left: "5%", background: color, opacity: 0.3 }} />
          <div className="mini-text-block" style={{ width: "52%", right: "5%" }} />
          <div className="mini-text-line" style={{ width: "42%", right: "5%", top: "55%" }} />
        </>
      );
    case "full_bleed_image_overlay":
      return (
        <>
          <div className="mini-full-bg" style={{ background: color, opacity: 0.15 }} />
          <div className="mini-overlay-bar" style={{ background: color, opacity: 0.2 }} />
          <div className="mini-text-block mini-text-overlay" style={{ width: "70%", left: "10%", top: "55%" }} />
        </>
      );
    case "full_text_two_column":
      return (
        <>
          <div className="mini-text-block" style={{ width: "42%", left: "5%" }} />
          <div className="mini-text-line" style={{ width: "35%", left: "5%", top: "55%" }} />
          <div className="mini-col-divider" />
          <div className="mini-text-block" style={{ width: "42%", right: "5%" }} />
          <div className="mini-text-line" style={{ width: "35%", right: "5%", top: "55%" }} />
        </>
      );
    case "big_number_highlight":
      return (
        <>
          <div className="mini-number-block" style={{ background: color, opacity: 0.2 }}>
            <span>42%</span>
          </div>
          <div className="mini-text-block" style={{ width: "45%", right: "5%" }} />
          <div className="mini-text-line" style={{ width: "38%", right: "5%", top: "55%" }} />
        </>
      );
    case "quote_callout":
      return (
        <>
          <div className="mini-quote-block" style={{ borderLeftColor: color }}>
            <span className="mini-quote-mark">"</span>
          </div>
          <div className="mini-text-block" style={{ width: "80%", left: "10%", top: "60%" }} />
        </>
      );
    case "full_text_with_sidebar":
      return (
        <>
          <div className="mini-sidebar" style={{ background: color, opacity: 0.25 }} />
          <div className="mini-text-block" style={{ width: "68%", right: "5%" }} />
          <div className="mini-text-line" style={{ width: "55%", right: "5%", top: "55%" }} />
        </>
      );
    default:
      return <div className="mini-text-block" style={{ width: "80%", left: "10%" }} />;
  }
}
