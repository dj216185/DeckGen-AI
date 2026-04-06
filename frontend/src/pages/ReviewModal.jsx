import { useCallback, useEffect, useRef, useState } from "react";
import { getReviewData, getSlideImageUrl, finalizePresentation, getDownloadUrl } from "../api";

// ─── Slide type icons ───────────────────────────────────────────────────────
const TYPE_ICONS = {
  bullets: "format_list_bulleted",
  para_bullets: "notes",
  paragraph: "subject",
  chart: "bar_chart",
};

// ─── Component ──────────────────────────────────────────────────────────────
export default function ReviewModal({ taskId, onClose, onFinalized }) {
  const [slides, setSlides] = useState([]);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeSlide, setActiveSlide] = useState(0);
  const overlayRef = useRef(null);

  // Fetch review data
  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    setError("");
    getReviewData(taskId)
      .then((data) => {
        setSlides(data.slides || []);
        // Initialize selections with defaults
        const defaults = {};
        (data.slides || []).forEach((s, i) => {
          defaults[i] = s.selected_image || 0;
        });
        setSelections(defaults);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [taskId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Close on overlay click
  const onOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const selectImage = (slideIdx, imgIdx) => {
    setSelections((prev) => ({ ...prev, [slideIdx]: imgIdx }));
  };

  const handleFinalize = async () => {
    setSaving(true);
    setError("");
    try {
      await finalizePresentation(taskId, selections);
      if (onFinalized) onFinalized();
      // Trigger download after rebuild
      window.location.href = getDownloadUrl(taskId);
      setTimeout(onClose, 600);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const currentSlide = slides[activeSlide];
  const hasImages = slides.some((s) => s.image_options?.length > 0);

  return (
    <div
      ref={overlayRef}
      onClick={onOverlayClick}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        padding: "20px",
        animation: "reviewFadeIn 300ms ease",
      }}
    >
      <div
        style={{
          width: "100%", maxWidth: "960px", maxHeight: "92vh",
          display: "flex", flexDirection: "column",
          background: "linear-gradient(135deg, rgba(18,12,20,0.95), rgba(12,8,16,0.92))",
          border: "1px solid rgba(229,62,90,0.2)",
          borderRadius: "24px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 80px rgba(229,62,90,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
          overflow: "hidden",
          animation: "reviewSlideUp 400ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "4px 12px", borderRadius: "999px",
              background: "rgba(229,62,90,0.12)", color: "#E53E5A",
              fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em",
              marginBottom: "8px",
            }}>
              <span className="material-icons-outlined" style={{ fontSize: "13px" }}>rate_review</span>
              REVIEW & CUSTOMIZE
            </div>
            <h2 style={{
              margin: 0, fontSize: "18px", fontWeight: 700,
              color: "var(--text-primary, #F0E4E8)",
              fontFamily: "'DM Serif Display', serif",
            }}>
              Select Images for Your Slides
            </h2>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px", width: "36px", height: "36px",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--text-muted, #888)",
            transition: "background 0.2s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
          >
            <span className="material-icons-outlined" style={{ fontSize: "18px" }}>close</span>
          </button>
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          {loading ? (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "12px",
            }}>
              <span className="material-icons-outlined" style={{
                fontSize: "32px", color: "#E53E5A",
                animation: "spin 1.5s linear infinite",
              }}>hourglass_top</span>
              <span style={{ color: "var(--text-secondary, #aaa)", fontSize: "14px" }}>Loading slides...</span>
            </div>
          ) : error && slides.length === 0 ? (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "8px", padding: "24px",
            }}>
              <span className="material-icons-outlined" style={{ fontSize: "32px", color: "#F87171" }}>error</span>
              <span style={{ color: "#FCA5A5", fontSize: "14px", textAlign: "center" }}>{error}</span>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

              {/* ── Slide list sidebar ── */}
              <div style={{
                width: "220px", flexShrink: 0,
                borderRight: "1px solid rgba(255,255,255,0.07)",
                overflowY: "auto", padding: "12px 8px",
              }}>
                {slides.map((slide, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: "10px 12px", marginBottom: "4px",
                      borderRadius: "12px", border: "none",
                      background: i === activeSlide
                        ? "rgba(229,62,90,0.15)"
                        : "transparent",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { if (i !== activeSlide) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                    onMouseLeave={(e) => { if (i !== activeSlide) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      marginBottom: "4px",
                    }}>
                      <span style={{
                        fontSize: "10px", fontWeight: 800,
                        color: i === activeSlide ? "#E53E5A" : "rgba(229,62,90,0.4)",
                        minWidth: "18px",
                      }}>{i + 1}</span>
                      <span className="material-icons-outlined" style={{
                        fontSize: "14px",
                        color: i === activeSlide ? "#E53E5A" : "var(--text-disabled, #555)",
                      }}>{TYPE_ICONS[slide.slide_type] || "slideshow"}</span>
                    </div>
                    <p style={{
                      margin: 0, fontSize: "12px", fontWeight: 600,
                      color: i === activeSlide ? "var(--text-primary, #F0E4E8)" : "var(--text-secondary, #aaa)",
                      lineHeight: 1.3,
                      overflow: "hidden", textOverflow: "ellipsis",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    }}>{slide.slide_title}</p>
                    {slide.image_options?.length > 0 && (
                      <div style={{
                        display: "flex", gap: "3px", marginTop: "6px",
                      }}>
                        {slide.image_options.map((_, imgI) => (
                          <div key={imgI} style={{
                            width: "8px", height: "8px", borderRadius: "50%",
                            background: selections[i] === imgI ? "#E53E5A" : "rgba(255,255,255,0.15)",
                            transition: "background 0.2s",
                          }} />
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* ── Main slide preview ── */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                {currentSlide && (
                  <div>
                    {/* Slide header */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      marginBottom: "6px",
                    }}>
                      <span style={{
                        fontSize: "10px", fontWeight: 800, letterSpacing: "0.08em",
                        color: "#E53E5A", textTransform: "uppercase",
                      }}>{currentSlide.section}</span>
                      {currentSlide.has_chart && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "3px",
                          padding: "2px 8px", borderRadius: "999px",
                          background: "rgba(34,211,238,0.12)", color: "#22D3EE",
                          fontSize: "10px", fontWeight: 700,
                        }}>
                          <span className="material-icons-outlined" style={{ fontSize: "11px" }}>bar_chart</span>
                          Chart
                        </span>
                      )}
                    </div>

                    <h3 style={{
                      margin: "0 0 16px", fontSize: "22px", fontWeight: 700,
                      color: "var(--text-primary, #F0E4E8)",
                      fontFamily: "'DM Serif Display', serif",
                    }}>{currentSlide.slide_title}</h3>

                    {/* Content preview */}
                    <div style={{
                      padding: "16px", borderRadius: "16px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      marginBottom: "20px",
                    }}>
                      <p style={{
                        margin: 0, fontSize: "13px", lineHeight: 1.7,
                        color: "var(--text-secondary, #aaa)",
                        whiteSpace: "pre-wrap",
                      }}>{currentSlide.slide_content || "No content preview available"}</p>
                    </div>

                    {/* Image selection */}
                    {currentSlide.image_options?.length > 0 ? (
                      <div>
                        <div style={{
                          display: "flex", alignItems: "center", gap: "8px",
                          marginBottom: "12px",
                        }}>
                          <span className="material-icons-outlined" style={{ fontSize: "16px", color: "#E53E5A" }}>image</span>
                          <span style={{
                            fontSize: "13px", fontWeight: 700,
                            color: "var(--text-primary, #F0E4E8)",
                          }}>Choose an image for this slide</span>
                          <span style={{
                            fontSize: "11px", color: "var(--text-muted, #666)",
                            marginLeft: "auto",
                          }}>{currentSlide.image_options.length} options</span>
                        </div>

                        <div style={{
                          display: "grid",
                          gridTemplateColumns: `repeat(${Math.min(currentSlide.image_options.length, 3)}, 1fr)`,
                          gap: "12px",
                        }}>
                          {currentSlide.image_options.map((filename, imgIdx) => {
                            const isSelected = selections[activeSlide] === imgIdx;
                            return (
                              <button
                                key={imgIdx}
                                onClick={() => selectImage(activeSlide, imgIdx)}
                                style={{
                                  position: "relative",
                                  background: "none", border: "none", padding: 0,
                                  cursor: "pointer", borderRadius: "16px",
                                  overflow: "hidden",
                                  outline: isSelected
                                    ? "3px solid #E53E5A"
                                    : "2px solid rgba(255,255,255,0.08)",
                                  outlineOffset: isSelected ? "2px" : "0px",
                                  transition: "outline 0.2s, transform 0.2s, box-shadow 0.2s",
                                  transform: isSelected ? "scale(1.02)" : "scale(1)",
                                  boxShadow: isSelected
                                    ? "0 8px 24px rgba(229,62,90,0.3)"
                                    : "0 2px 8px rgba(0,0,0,0.3)",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.outline = "2px solid rgba(229,62,90,0.4)";
                                    e.currentTarget.style.transform = "scale(1.01)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.outline = "2px solid rgba(255,255,255,0.08)";
                                    e.currentTarget.style.transform = "scale(1)";
                                  }
                                }}
                              >
                                <img
                                  src={getSlideImageUrl(taskId, filename)}
                                  alt={`Option ${imgIdx + 1} for ${currentSlide.slide_title}`}
                                  style={{
                                    width: "100%", aspectRatio: "16/10",
                                    objectFit: "cover", display: "block",
                                    background: "rgba(255,255,255,0.03)",
                                  }}
                                  loading="lazy"
                                />

                                {/* Selection badge */}
                                <div style={{
                                  position: "absolute", top: "8px", right: "8px",
                                  width: "28px", height: "28px", borderRadius: "50%",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  background: isSelected
                                    ? "#E53E5A"
                                    : "rgba(0,0,0,0.5)",
                                  border: isSelected
                                    ? "2px solid #fff"
                                    : "2px solid rgba(255,255,255,0.3)",
                                  transition: "all 0.2s",
                                }}>
                                  <span className="material-icons-outlined" style={{
                                    fontSize: "16px", color: "#fff",
                                  }}>{isSelected ? "check" : `filter_${imgIdx + 1}`}</span>
                                </div>

                                {/* Label */}
                                <div style={{
                                  position: "absolute", bottom: 0, left: 0, right: 0,
                                  padding: "6px 10px",
                                  background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                                  fontSize: "11px", fontWeight: 600, color: "#fff",
                                  textAlign: "center",
                                }}>
                                  Option {imgIdx + 1}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        padding: "20px", borderRadius: "16px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px dashed rgba(255,255,255,0.1)",
                        textAlign: "center",
                      }}>
                        <span className="material-icons-outlined" style={{
                          fontSize: "24px", color: "var(--text-disabled, #555)", marginBottom: "6px",
                          display: "block",
                        }}>hide_image</span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted, #666)" }}>
                          No images available for this slide
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0, gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {hasImages && (
              <span style={{ fontSize: "12px", color: "var(--text-muted, #666)" }}>
                <span className="material-icons-outlined" style={{ fontSize: "14px", verticalAlign: "middle", marginRight: "4px" }}>info</span>
                Click images above to change your selection
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {error && (
              <span style={{ fontSize: "12px", color: "#F87171", alignSelf: "center" }}>{error}</span>
            )}
            <button
              onClick={onClose}
              className="btn-ghost"
              style={{ height: "42px", borderRadius: "12px", fontSize: "13px", padding: "0 16px" }}
            >
              Cancel
            </button>
            <button
              onClick={handleFinalize}
              disabled={saving || loading}
              className="btn-primary"
              style={{
                height: "42px", borderRadius: "12px", fontSize: "13px",
                padding: "0 20px", display: "flex", alignItems: "center", gap: "6px",
              }}
            >
              <span className="material-icons-outlined" style={{ fontSize: "16px" }}>
                {saving ? "hourglass_top" : "download"}
              </span>
              {saving ? "Applying..." : "Apply & Download"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes reviewFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes reviewSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
