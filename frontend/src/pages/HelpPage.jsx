import { useState } from "react";

const faqItems = [
  {
    q: "How do I create my first presentation?",
    a: "Enter a topic, optionally add context, choose theme and slide count, then generate. The status panel will keep updating until your deck is ready."
  },
  {
    q: "Can I edit generated presentations?",
    a: "Yes. Downloaded PPTX files are fully editable in Microsoft PowerPoint and compatible tools."
  },
  {
    q: "How long does generation take?",
    a: "Most presentations are generated in 2 to 4 minutes depending on complexity, model speed, and search availability."
  },
  {
    q: "Why might research download fail?",
    a: "If no research file was generated for the task or API limits were reached, the research download endpoint can return unavailable."
  }
];

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState(0);
  const [feedbackType, setFeedbackType] = useState("suggestion");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");

  const canSubmitFeedback = feedbackSubject.trim().length >= 3 && feedbackMessage.trim().length >= 10;

  const submitFeedback = (e) => {
    e.preventDefault();
    if (!canSubmitFeedback) {
      setFeedbackStatus("Please add a clear subject and a more detailed message.");
      return;
    }
    setFeedbackStatus("Thanks. Your feedback has been captured locally for this session.");
    setFeedbackType("suggestion");
    setFeedbackSubject("");
    setFeedbackMessage("");
  };

  return (
    <>
      <section className="hero-section" data-reveal>
        <div className="hero-content">
          <h1 className="display-title">
            <span className="title-icon">💡</span>
            <span className="title-text gradient-text">Help & Support</span>
          </h1>
          <p className="hero-subtitle">Find answers quickly and learn how to create better presentations</p>
        </div>
      </section>

      <div className="help-actions" data-reveal>
        <a href="#faq" className="help-action-card"><span className="material-icons-outlined">quiz</span><h3>FAQ</h3><p>Common questions</p></a>
        <a href="#tutorials" className="help-action-card"><span className="material-icons-outlined">school</span><h3>Tutorials</h3><p>Guided learning</p></a>
        <a href="#contact" className="help-action-card"><span className="material-icons-outlined">support_agent</span><h3>Contact</h3><p>Support channels</p></a>
        <a href="#feedback" className="help-action-card"><span className="material-icons-outlined">feedback</span><h3>Feedback</h3><p>Share ideas</p></a>
      </div>

      <section className="card" id="faq" data-reveal>
        <h2>Frequently Asked Questions</h2>
        <div className="faq-list" role="list">
          {faqItems.map((item, index) => {
            const expanded = openIndex === index;
            return (
              <div className="faq-item" key={item.q}>
                <button
                  type="button"
                  className="faq-question-btn"
                  aria-expanded={expanded}
                  aria-controls={`faq-panel-${index}`}
                  id={`faq-trigger-${index}`}
                  onClick={() => setOpenIndex(expanded ? -1 : index)}
                >
                  <h4>{item.q}</h4>
                  <span className="material-icons-outlined">{expanded ? "expand_less" : "expand_more"}</span>
                </button>
                <div
                  id={`faq-panel-${index}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${index}`}
                  hidden={!expanded}
                >
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card" id="tutorials" data-reveal>
        <h2>Tutorials</h2>
        <div className="tutorial-grid">
          <div className="tutorial-card"><h4>Getting Started</h4><p>First deck workflow from topic to download.</p></div>
          <div className="tutorial-card"><h4>Theme Selection</h4><p>Pick visual styles that fit audience and context.</p></div>
          <div className="tutorial-card"><h4>Editing Best Practices</h4><p>Refine generated decks for your voice and brand.</p></div>
          <div className="tutorial-card"><h4>Advanced Prompting</h4><p>Use context for stronger outlines and slide quality.</p></div>
        </div>
      </section>

      <section className="card" id="contact" data-reveal>
        <h2>Contact Support</h2>
        <div className="contact-options">
          <div className="contact-option"><span className="material-icons-outlined">email</span><div><h4>Email Support</h4><p>support@deckgen.ai</p></div></div>
          <div className="contact-option"><span className="material-icons-outlined">chat</span><div><h4>Live Chat</h4><p>Weekdays, 9AM to 6PM</p></div></div>
          <div className="contact-option"><span className="material-icons-outlined">forum</span><div><h4>Community Forum</h4><p>Peer tips and workflows</p></div></div>
        </div>
      </section>

      <section className="card" id="feedback" data-reveal>
        <h2>Send Feedback</h2>
        <form
          className="feedback-form"
          onSubmit={submitFeedback}
        >
          <div className="form-group">
            <label htmlFor="feedbackType">Feedback Type</label>
            <select id="feedbackType" required value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)}>
              <option value="suggestion">Suggestion</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="general">General Feedback</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="feedbackSubject">Subject</label>
            <input id="feedbackSubject" value={feedbackSubject} onChange={(e) => setFeedbackSubject(e.target.value)} required minLength={3} placeholder="Briefly describe your feedback" />
          </div>
          <div className="form-group">
            <label htmlFor="feedbackMessage">Message</label>
            <textarea id="feedbackMessage" rows={5} required minLength={10} value={feedbackMessage} onChange={(e) => setFeedbackMessage(e.target.value)} placeholder="Share details so we can improve faster" />
            <p className="muted-text" style={{ marginTop: "8px" }}>
              {feedbackMessage.trim().length} / 10 minimum characters
            </p>
          </div>
          <button type="submit" className="btn btn-primary" disabled={!canSubmitFeedback}>Send Feedback</button>
          <p aria-live="polite">{feedbackStatus}</p>
        </form>
      </section>
    </>
  );
}
