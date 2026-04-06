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
  const slideStripRef = useRef(null);

  // Fetch review data
  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    setError("");
    getReviewData(taskId)
      .then((data) => {
        setSlides(data.slides || []);
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

  // Scroll active slide pill into view on mobile strip
  useEffect(() => {
    if (!slideStripRef.current) return;
    const active = slideStripRef.current.querySelector(`[data-slide-idx="${activeSlide}"]`);
    if (active) active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeSlide]);

  const selectImage = (slideIdx, imgIdx) => {
    setSelections((prev) => ({ ...prev, [slideIdx]: imgIdx }));
  };

  const handleFinalize = async () => {
    setSaving(true);
    setError("");
    try {
      await finalizePresentation(taskId, selections);
      if (onFinalized) onFinalized();
      window.location.href = getDownloadUrl(taskId);
      setTimeout(onClose, 600);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => setActiveSlide((p) => Math.min(p + 1, slides.length - 1));
  const goPrev = () => setActiveSlide((p) => Math.max(p - 1, 0));

  const currentSlide = slides[activeSlide];
  const hasImages = slides.some((s) => s.image_options?.length > 0);

  return (
    <div
      ref={overlayRef}
      onClick={onOverlayClick}
      className="rv-overlay"
    >
      <div className="rv-modal">

        {/* ── Header ── */}
        <div className="rv-header">
          <div className="rv-header-left">
            <div className="rv-badge">
              <span className="material-icons-outlined" style={{ fontSize: "13px" }}>rate_review</span>
              REVIEW & CUSTOMIZE
            </div>
            <h2 className="rv-header-title">Select Images for Your Slides</h2>
          </div>
          <button onClick={onClose} className="rv-close-btn"
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
          >
            <span className="material-icons-outlined" style={{ fontSize: "18px" }}>close</span>
          </button>
        </div>

        {/* ── Content ── */}
        <div className="rv-body">
          {loading ? (
            <div className="rv-center-msg">
              <span className="material-icons-outlined" style={{ fontSize: "32px", color: "#E53E5A", animation: "spin 1.5s linear infinite" }}>hourglass_top</span>
              <span style={{ color: "var(--text-secondary, #aaa)", fontSize: "14px" }}>Loading slides...</span>
            </div>
          ) : error && slides.length === 0 ? (
            <div className="rv-center-msg">
              <span className="material-icons-outlined" style={{ fontSize: "32px", color: "#F87171" }}>error</span>
              <span style={{ color: "#FCA5A5", fontSize: "14px", textAlign: "center" }}>{error}</span>
            </div>
          ) : (
            <div className="rv-content-layout">

              {/* ── Slide sidebar (desktop) / horizontal strip (mobile) ── */}
              <div className="rv-sidebar" ref={slideStripRef}>
                {slides.map((slide, i) => (
                  <button
                    key={i}
                    data-slide-idx={i}
                    onClick={() => setActiveSlide(i)}
                    className={`rv-slide-btn ${i === activeSlide ? "rv-slide-btn--active" : ""}`}
                  >
                    <div className="rv-slide-btn-top">
                      <span className="rv-slide-num" style={{ color: i === activeSlide ? "#E53E5A" : "rgba(229,62,90,0.4)" }}>{i + 1}</span>
                      <span className="material-icons-outlined rv-slide-icon" style={{ color: i === activeSlide ? "#E53E5A" : "var(--text-disabled, #555)" }}>
                        {TYPE_ICONS[slide.slide_type] || "slideshow"}
                      </span>
                    </div>
                    <p className="rv-slide-title" style={{ color: i === activeSlide ? "var(--text-primary, #F0E4E8)" : "var(--text-secondary, #aaa)" }}>
                      {slide.slide_title}
                    </p>
                    {slide.image_options?.length > 0 && (
                      <div className="rv-slide-dots">
                        {slide.image_options.map((_, imgI) => (
                          <div key={imgI} className="rv-dot" style={{ background: selections[i] === imgI ? "#E53E5A" : "rgba(255,255,255,0.15)" }} />
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* ── Main slide preview ── */}
              <div className="rv-main">
                {currentSlide && (
                  <div>
                    {/* Nav arrows (mobile) */}
                    <div className="rv-slide-nav">
                      <button onClick={goPrev} disabled={activeSlide === 0} className="rv-nav-btn">
                        <span className="material-icons-outlined">chevron_left</span>
                      </button>
                      <span className="rv-slide-counter">{activeSlide + 1} / {slides.length}</span>
                      <button onClick={goNext} disabled={activeSlide === slides.length - 1} className="rv-nav-btn">
                        <span className="material-icons-outlined">chevron_right</span>
                      </button>
                    </div>

                    {/* Slide header */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                      <span className="rv-section-label">{currentSlide.section}</span>
                      {currentSlide.has_chart && (
                        <span className="rv-chart-badge">
                          <span className="material-icons-outlined" style={{ fontSize: "11px" }}>bar_chart</span>
                          Chart
                        </span>
                      )}
                    </div>

                    <h3 className="rv-slide-heading">{currentSlide.slide_title}</h3>

                    {/* Content preview */}
                    <div className="rv-content-preview">
                      <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.7, color: "var(--text-secondary, #aaa)", whiteSpace: "pre-wrap" }}>
                        {currentSlide.slide_content || "No content preview available"}
                      </p>
                    </div>

                    {/* Image selection */}
                    {currentSlide.image_options?.length > 0 ? (
                      <div>
                        <div className="rv-img-header">
                          <span className="material-icons-outlined" style={{ fontSize: "16px", color: "#E53E5A" }}>image</span>
                          <span className="rv-img-header-text">Choose an image</span>
                          <span className="rv-img-count">{currentSlide.image_options.length} options</span>
                        </div>

                        <div className="rv-img-grid">
                          {currentSlide.image_options.map((filename, imgIdx) => {
                            const isSelected = selections[activeSlide] === imgIdx;
                            return (
                              <button
                                key={imgIdx}
                                onClick={() => selectImage(activeSlide, imgIdx)}
                                className={`rv-img-btn ${isSelected ? "rv-img-btn--selected" : ""}`}
                              >
                                <img
                                  src={getSlideImageUrl(taskId, filename)}
                                  alt={`Option ${imgIdx + 1}`}
                                  className="rv-img"
                                  loading="lazy"
                                />
                                <div className={`rv-img-badge ${isSelected ? "rv-img-badge--selected" : ""}`}>
                                  <span className="material-icons-outlined" style={{ fontSize: "16px", color: "#fff" }}>
                                    {isSelected ? "check" : `filter_${imgIdx + 1}`}
                                  </span>
                                </div>
                                <div className="rv-img-label">Option {imgIdx + 1}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="rv-no-img">
                        <span className="material-icons-outlined" style={{ fontSize: "24px", color: "var(--text-disabled, #555)", display: "block", marginBottom: "6px" }}>hide_image</span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted, #666)" }}>No images available for this slide</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="rv-footer">
          <div className="rv-footer-hint">
            {hasImages && (
              <span style={{ fontSize: "12px", color: "var(--text-muted, #666)" }}>
                <span className="material-icons-outlined" style={{ fontSize: "14px", verticalAlign: "middle", marginRight: "4px" }}>info</span>
                Tap images to change selection
              </span>
            )}
          </div>
          {error && <span className="rv-footer-error">{error}</span>}
          <div className="rv-footer-actions">
            <button onClick={onClose} className="btn-ghost rv-footer-btn-cancel">Cancel</button>
            <button
              onClick={handleFinalize}
              disabled={saving || loading}
              className="btn-primary rv-footer-btn-apply"
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
        /* ── Animations ── */
        @keyframes reviewFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes reviewSlideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes spin          { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* ── Overlay ── */
        .rv-overlay {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          padding: 16px;
          animation: reviewFadeIn 300ms ease;
        }

        /* ── Modal shell ── */
        .rv-modal {
          width: 100%; max-width: 960px; max-height: 96vh;
          display: flex; flex-direction: column;
          background: linear-gradient(135deg, rgba(18,12,20,0.97), rgba(12,8,16,0.95));
          border: 1px solid rgba(229,62,90,0.2);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 80px rgba(229,62,90,0.08), inset 0 1px 0 rgba(255,255,255,0.06);
          overflow: hidden;
          animation: reviewSlideUp 400ms cubic-bezier(0.22,1,0.36,1);
        }

        /* ── Header ── */
        .rv-header {
          padding: 16px 16px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0; gap: 12px;
        }
        .rv-header-left { min-width: 0; }
        .rv-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 3px 10px; border-radius: 999px;
          background: rgba(229,62,90,0.12); color: #E53E5A;
          font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
          margin-bottom: 6px;
        }
        .rv-header-title {
          margin: 0; font-size: 16px; font-weight: 700;
          color: var(--text-primary, #F0E4E8);
          font-family: 'DM Serif Display', serif;
        }
        .rv-close-btn {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; width: 36px; height: 36px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--text-muted, #888); transition: background 0.2s;
        }

        /* ── Body ── */
        .rv-body { flex: 1; overflow: hidden; display: flex; min-height: 0; }
        .rv-center-msg {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 12px; padding: 24px;
        }

        /* ── Content layout ── */
        .rv-content-layout { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

        /* ── Sidebar / horizontal strip ── */
        .rv-sidebar {
          display: flex; flex-direction: row; flex-shrink: 0;
          overflow-x: auto; overflow-y: hidden;
          gap: 6px; padding: 10px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .rv-sidebar::-webkit-scrollbar { display: none; }

        .rv-slide-btn {
          flex-shrink: 0; text-align: left;
          padding: 8px 12px; min-width: 110px; max-width: 140px;
          border-radius: 12px; border: none;
          background: transparent; cursor: pointer;
          transition: background 0.15s;
        }
        .rv-slide-btn--active { background: rgba(229,62,90,0.15); }
        .rv-slide-btn:not(.rv-slide-btn--active):hover { background: rgba(255,255,255,0.05); }

        .rv-slide-btn-top { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
        .rv-slide-num { font-size: 10px; font-weight: 800; min-width: 16px; }
        .rv-slide-icon { font-size: 14px; }
        .rv-slide-title {
          margin: 0; font-size: 11px; font-weight: 600; line-height: 1.3;
          overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .rv-slide-dots { display: flex; gap: 3px; margin-top: 5px; }
        .rv-dot { width: 7px; height: 7px; border-radius: 50%; transition: background 0.2s; }

        /* ── Main preview ── */
        .rv-main { flex: 1; overflow-y: auto; padding: 16px; -webkit-overflow-scrolling: touch; }

        /* ── Slide nav (prev/next) ── */
        .rv-slide-nav {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; margin-bottom: 12px;
        }
        .rv-nav-btn {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--text-secondary, #aaa); transition: all 0.15s;
        }
        .rv-nav-btn:disabled { opacity: 0.3; cursor: default; }
        .rv-nav-btn:not(:disabled):hover { background: rgba(229,62,90,0.15); color: #E53E5A; }
        .rv-slide-counter { font-size: 13px; font-weight: 700; color: var(--text-primary, #F0E4E8); min-width: 50px; text-align: center; }

        .rv-section-label {
          font-size: 10px; font-weight: 800; letter-spacing: 0.08em;
          color: #E53E5A; text-transform: uppercase;
        }
        .rv-chart-badge {
          display: inline-flex; align-items: center; gap: 3px;
          padding: 2px 8px; border-radius: 999px;
          background: rgba(34,211,238,0.12); color: #22D3EE;
          font-size: 10px; font-weight: 700;
        }
        .rv-slide-heading {
          margin: 0 0 12px; font-size: 18px; font-weight: 700;
          color: var(--text-primary, #F0E4E8);
          font-family: 'DM Serif Display', serif;
        }
        .rv-content-preview {
          padding: 12px; border-radius: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 16px;
        }

        /* ── Image grid ── */
        .rv-img-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
        .rv-img-header-text { font-size: 13px; font-weight: 700; color: var(--text-primary, #F0E4E8); }
        .rv-img-count { font-size: 11px; color: var(--text-muted, #666); margin-left: auto; }

        .rv-img-grid {
          display: grid; grid-template-columns: 1fr; gap: 10px;
        }

        .rv-img-btn {
          position: relative; background: none; border: none; padding: 0;
          cursor: pointer; border-radius: 14px; overflow: hidden;
          outline: 2px solid rgba(255,255,255,0.08); outline-offset: 0;
          transition: outline 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .rv-img-btn--selected {
          outline: 3px solid #E53E5A; outline-offset: 2px;
          transform: scale(1.01);
          box-shadow: 0 6px 20px rgba(229,62,90,0.3);
        }
        .rv-img-btn:not(.rv-img-btn--selected):active {
          outline: 2px solid rgba(229,62,90,0.4); transform: scale(0.98);
        }

        .rv-img {
          width: 100%; aspect-ratio: 16/10; object-fit: cover; display: block;
          background: rgba(255,255,255,0.03);
        }
        .rv-img-badge {
          position: absolute; top: 8px; right: 8px;
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.5); border: 2px solid rgba(255,255,255,0.3);
          transition: all 0.2s;
        }
        .rv-img-badge--selected { background: #E53E5A; border-color: #fff; }
        .rv-img-label {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 6px 10px;
          background: linear-gradient(transparent, rgba(0,0,0,0.7));
          font-size: 11px; font-weight: 600; color: #fff; text-align: center;
        }

        .rv-no-img {
          padding: 20px; border-radius: 14px;
          background: rgba(255,255,255,0.02);
          border: 1px dashed rgba(255,255,255,0.1);
          text-align: center;
        }

        /* ── Footer ── */
        .rv-footer {
          padding: 12px 16px;
          border-top: 1px solid rgba(255,255,255,0.07);
          display: flex; flex-direction: column;
          flex-shrink: 0; gap: 8px;
        }
        .rv-footer-hint { display: none; }
        .rv-footer-error { font-size: 12px; color: #F87171; text-align: center; }
        .rv-footer-actions {
          display: flex; gap: 8px;
        }
        .rv-footer-btn-cancel {
          height: 44px; border-radius: 12px; font-size: 13px; padding: 0 14px;
          flex: 1;
        }
        .rv-footer-btn-apply {
          height: 44px; border-radius: 12px; font-size: 13px;
          padding: 0 16px; display: flex; align-items: center; justify-content: center; gap: 6px;
          flex: 2;
        }

        /* ── Tablet (≥ 520px): 2-col image grid ── */
        @media (min-width: 520px) {
          .rv-img-grid { grid-template-columns: repeat(2, 1fr); }
        }

        /* ── Desktop (≥ 768px): sidebar layout ── */
        @media (min-width: 768px) {
          .rv-overlay { padding: 20px; }

          .rv-modal { max-height: 92vh; border-radius: 24px; }

          .rv-header { padding: 20px 24px 16px; }
          .rv-header-title { font-size: 18px; }

          .rv-content-layout { flex-direction: row; }

          .rv-sidebar {
            flex-direction: column; width: 220px;
            overflow-x: hidden; overflow-y: auto;
            border-bottom: none; border-right: 1px solid rgba(255,255,255,0.07);
            padding: 12px 8px;
          }
          .rv-slide-btn { min-width: unset; max-width: unset; width: 100%; margin-bottom: 2px; }

          .rv-main { padding: 20px 24px; }

          .rv-slide-nav { display: none; }
          .rv-slide-heading { font-size: 22px; }

          .rv-img-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; }

          .rv-footer {
            flex-direction: row; align-items: center; justify-content: space-between;
            padding: 16px 24px; gap: 12px;
          }
          .rv-footer-hint { display: flex; align-items: center; }
          .rv-footer-actions { flex: unset; }
          .rv-footer-btn-cancel { flex: unset; padding: 0 16px; height: 42px; }
          .rv-footer-btn-apply  { flex: unset; padding: 0 20px; height: 42px; }
        }

        /* ── Small mobile (≤ 400px): tighter spacing ── */
        @media (max-width: 400px) {
          .rv-overlay { padding: 0; }
          .rv-modal { max-height: 100vh; max-height: 100dvh; border-radius: 0; border: none; }
          .rv-header { padding: 12px 12px 10px; }
          .rv-header-title { font-size: 14px; }
          .rv-badge { font-size: 9px; padding: 2px 8px; }
          .rv-main { padding: 12px; }
          .rv-slide-heading { font-size: 16px; }
          .rv-content-preview { padding: 10px; }
          .rv-footer { padding: 10px 12px; }
          .rv-footer-btn-apply { font-size: 12px; }
          .rv-slide-btn { min-width: 95px; padding: 6px 10px; }
        }
      `}</style>
    </div>
  );
}
