import { useState } from "react";

const FAQ = [
  {
    q: "How do I create my first presentation?",
    a: "Enter a topic, optionally add context, choose a template and theme, set slide count, then hit Generate. The progress panel updates in real-time until your deck is ready to download.",
  },
  {
    q: "Can I edit generated presentations?",
    a: "Yes. Downloaded PPTX files are fully editable in Microsoft PowerPoint, LibreOffice Impress, and Google Slides.",
  },
  {
    q: "How long does generation take?",
    a: "Most presentations complete in 2–4 minutes. Generation time depends on slide count, model availability, and whether research search is active.",
  },
  {
    q: "Why might the research download fail?",
    a: "If no Perplexity API key is set, or the search timed out, no research file will be generated. The PPTX deck itself is unaffected.",
  },
  {
    q: "What slide layouts does DeckGen use?",
    a: "Seven layout types: Text + Image (both orientations), Full Bleed Image Overlay, Two Column, Big Number Highlight, Quote Callout, and Text with Sidebar. Each template cycles layouts for visual variety.",
  },
];

const TUTORIALS = [
  { icon: "rocket_launch", title: "Getting Started",       desc: "First deck workflow: topic → template → generate → download." },
  { icon: "palette",       title: "Theme Selection",       desc: "Pick visual styles that fit your audience and context."       },
  { icon: "edit_note",     title: "Editing Best Practices",desc: "Refine generated decks for your voice and brand identity."    },
  { icon: "psychology",    title: "Advanced Prompting",    desc: "Use context for stronger outlines and richer slide content."  },
];

const CONTACT = [
  { icon: "email",         title: "Email Support",   sub: "support@deckgen.ai"        },
  { icon: "chat",          title: "Live Chat",       sub: "Weekdays, 9AM–6PM"         },
  { icon: "forum",         title: "Community",       sub: "Peer tips and workflows"   },
];

export default function HelpPage() {
  const [openIdx,          setOpenIdx]          = useState(0);
  const [feedbackType,     setFeedbackType]     = useState("suggestion");
  const [feedbackSubject,  setFeedbackSubject]  = useState("");
  const [feedbackMessage,  setFeedbackMessage]  = useState("");
  const [feedbackStatus,   setFeedbackStatus]   = useState("");

  const canSubmit = feedbackSubject.trim().length >= 3 && feedbackMessage.trim().length >= 10;

  const submitFeedback = (e) => {
    e.preventDefault();
    if (!canSubmit) { setFeedbackStatus("Please add a clear subject and a more detailed message."); return; }
    setFeedbackStatus("Thanks — feedback captured for this session.");
    setFeedbackType("suggestion"); setFeedbackSubject(""); setFeedbackMessage("");
  };

  return (
    <div className="min-h-full" style={{ background: "var(--bg-app)" }}>

      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 50% 60% at 5% 40%, rgba(96,165,250,0.1) 0%, transparent 60%)" }} />
        <div className="relative max-w-3xl mx-auto px-6 pt-12 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase mb-5"
            style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)", color: "#60A5FA" }}>
            <span className="material-icons-outlined text-[13px]">help_outline</span>
            Support
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "0.5rem" }}>
            Help & <span style={{ color: "#60A5FA", fontStyle: "italic" }}>Support</span>
          </h1>
          <p style={{ fontSize: "14.5px", color: "var(--text-secondary)" }}>Find answers and learn how to create better presentations</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-16 space-y-6">

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: "quiz",          label: "FAQ",       href: "#faq"       },
            { icon: "school",        label: "Tutorials", href: "#tutorials" },
            { icon: "support_agent", label: "Contact",   href: "#contact"   },
            { icon: "feedback",      label: "Feedback",  href: "#feedback"  },
          ].map(({ icon, label, href }) => (
            <a key={label} href={href}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center no-underline transition-all duration-150"
              style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)", color: "var(--text-secondary)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(229,62,90,0.3)"; e.currentTarget.style.color = "#E53E5A"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              <span className="material-icons-outlined text-[22px]">{icon}</span>
              <span className="text-[12.5px] font-semibold">{label}</span>
            </a>
          ))}
        </div>

        {/* FAQ */}
        <div id="faq" className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="material-icons-outlined text-[20px]" style={{ color: "#E53E5A" }}>quiz</span>
            <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>Frequently Asked Questions</h2>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {FAQ.map((item, i) => {
              const open = openIdx === i;
              return (
                <div key={item.q}>
                  <button type="button"
                    onClick={() => setOpenIdx(open ? -1 : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left transition-colors"
                    style={{ color: open ? "#E53E5A" : "var(--text-primary)" }}
                    aria-expanded={open}
                  >
                    <span className="text-[13.5px] font-semibold leading-snug">{item.q}</span>
                    <span className="material-icons-outlined text-[20px] shrink-0 transition-transform duration-200"
                      style={{ transform: open ? "rotate(180deg)" : "none" }}>expand_more</span>
                  </button>
                  {open && (
                    <div className="px-6 pb-5">
                      <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tutorials */}
        <div id="tutorials" className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="material-icons-outlined text-[20px]" style={{ color: "#FCD34D" }}>school</span>
            <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>Tutorials</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-px" style={{ background: "rgba(255,255,255,0.05)" }}>
            {TUTORIALS.map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 p-5"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                  style={{ background: "rgba(252,211,77,0.1)" }}>
                  <span className="material-icons-outlined text-[18px]" style={{ color: "#FCD34D" }}>{icon}</span>
                </div>
                <div>
                  <h4 className="text-[13px] font-bold mb-1" style={{ color: "var(--text-primary)" }}>{title}</h4>
                  <p className="text-[12.5px] leading-snug" style={{ color: "var(--text-muted)" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div id="contact" className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="material-icons-outlined text-[20px]" style={{ color: "#4ADE80" }}>support_agent</span>
            <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>Contact Support</h2>
          </div>
          <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {CONTACT.map(({ icon, title, sub }) => (
              <div key={title} className="flex items-center gap-4 px-6 py-5 flex-1">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                  style={{ background: "rgba(74,222,128,0.1)" }}>
                  <span className="material-icons-outlined text-[20px]" style={{ color: "#4ADE80" }}>{icon}</span>
                </div>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{title}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback form */}
        <div id="feedback" className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="material-icons-outlined text-[20px]" style={{ color: "#A78BFA" }}>feedback</span>
            <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>Send Feedback</h2>
          </div>
          <form className="px-6 py-6 space-y-5" onSubmit={submitFeedback}>
            <div>
              <label className="field-label"><span className="material-icons-outlined">category</span>Type</label>
              <select value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)}
                className="input-field"
                style={{ background: "rgba(255,255,255,0.06)", cursor: "pointer" }}>
                <option value="suggestion" style={{ background: "#110509" }}>Suggestion</option>
                <option value="bug"        style={{ background: "#110509" }}>Bug Report</option>
                <option value="feature"    style={{ background: "#110509" }}>Feature Request</option>
                <option value="general"    style={{ background: "#110509" }}>General Feedback</option>
              </select>
            </div>
            <div>
              <label htmlFor="fbSubject" className="field-label"><span className="material-icons-outlined">title</span>Subject</label>
              <input id="fbSubject" className="input-field" value={feedbackSubject}
                onChange={(e) => setFeedbackSubject(e.target.value)}
                placeholder="Briefly describe your feedback" required minLength={3} />
            </div>
            <div>
              <label htmlFor="fbMsg" className="field-label"><span className="material-icons-outlined">notes</span>Message</label>
              <textarea id="fbMsg" rows={5} className="textarea-field" value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Share details so we can improve faster" required minLength={10} />
              <p className="text-[11.5px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                {feedbackMessage.trim().length} / 10 minimum characters
              </p>
            </div>
            {feedbackStatus && (
              <p className="text-[13px] font-medium" style={{ color: "#4ADE80" }}>{feedbackStatus}</p>
            )}
            <button type="submit" className="btn-primary rounded-2xl" style={{ height: "44px" }} disabled={!canSubmit}>
              <span className="material-icons-outlined text-[18px]">send</span>
              Send Feedback
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
