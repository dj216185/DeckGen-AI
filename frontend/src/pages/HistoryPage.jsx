import { useEffect, useState } from "react";
import { deleteTask, getHistory, getDownloadUrl, getDownloadSearchUrl } from "../api";

function StatusPill({ status }) {
  const map = {
    completed:  { color: "#4ADE80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)",  icon: "check_circle", label: "Completed"  },
    processing: { color: "#FCD34D", bg: "rgba(252,211,77,0.12)",  border: "rgba(252,211,77,0.3)",  icon: "pending",      label: "Processing" },
    queued:     { color: "#60A5FA", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)",  icon: "schedule",     label: "Queued"     },
    error:      { color: "#F87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)", icon: "error",        label: "Failed"     },
  };
  const s = map[status] || map.error;
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      <span className="material-icons-outlined text-[13px]">{s.icon}</span>
      {s.label}
    </div>
  );
}

export default function HistoryPage() {
  const [rows,       setRows]       = useState([]);
  const [error,      setError]      = useState("");
  const [query,      setQuery]      = useState("");
  const [filter,     setFilter]     = useState("all");
  const [busyTaskId, setBusyTaskId] = useState("");

  useEffect(() => {
    getHistory().then(setRows).catch((e) => setError(e.message));
  }, []);

  const completed   = rows.filter((r) => r.status === "completed").length;
  const totalSlides = rows.reduce((acc, r) => acc + Number(r.slide_count || 0), 0);

  const visibleRows = rows.filter((r) => {
    const title = String(r.user_query || "").toLowerCase();
    const textOk = !query.trim() || title.includes(query.trim().toLowerCase());
    const s = r.status === "error" ? "failed" : (r.status || "");
    const statusOk = filter === "all" || s === filter || r.status === filter;
    return textOk && statusOk;
  });

  const removeTask = async (taskId) => {
    if (!window.confirm("Delete this task from history?")) return;
    try {
      setBusyTaskId(taskId);
      await deleteTask(taskId);
      setRows((prev) => prev.filter((r) => r.task_id !== taskId));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyTaskId("");
    }
  };

  const FILTERS = [
    { key: "all",        label: "All"        },
    { key: "completed",  label: "Completed"  },
    { key: "processing", label: "Processing" },
    { key: "failed",     label: "Failed"     },
  ];

  return (
    <div className="min-h-full" style={{ background: "var(--bg-app)" }}>

      {/* ── Header ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 50% 70% at 5% 40%, rgba(196,41,74,0.12) 0%, transparent 60%)" }} />
        <div className="relative max-w-5xl mx-auto px-6 pt-12 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase mb-5"
            style={{ background: "rgba(229,62,90,0.1)", border: "1px solid rgba(229,62,90,0.25)", color: "#E53E5A" }}>
            <span className="material-icons-outlined text-[13px]">history</span>
            Generation History
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "0.5rem" }}>
            Presentation <span style={{ color: "#E53E5A", fontStyle: "italic" }}>History</span>
          </h1>
          <p style={{ fontSize: "14.5px", color: "var(--text-secondary)" }}>Manage and download your generated presentations</p>

          {/* Stat chips */}
          <div className="flex flex-wrap gap-3 mt-6">
            {[
              { icon: "folder",      val: rows.length,   label: "Total"     },
              { icon: "check_circle",val: completed,     label: "Completed" },
              { icon: "slideshow",   val: totalSlides,   label: "Slides"    },
            ].map(({ icon, val, label }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="material-icons-outlined text-[16px]" style={{ color: "#E53E5A" }}>{icon}</span>
                <span className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>{val}</span>
                <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-16 space-y-6">

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl"
            style={{ background: "rgba(248,113,113,0.08)", border: "1.5px solid rgba(248,113,113,0.25)" }}>
            <span className="material-icons-outlined text-[20px]" style={{ color: "#F87171" }}>error</span>
            <p className="text-[13.5px]" style={{ color: "#F87171" }}>{error}</p>
          </div>
        )}

        {/* ── Search + Filters ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] pointer-events-none"
              style={{ color: "var(--text-muted)" }}>search</span>
            <input
              type="text"
              placeholder="Search presentations…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1.5 p-1 rounded-xl shrink-0"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {FILTERS.map((f) => (
              <button key={f.key} type="button"
                onClick={() => setFilter(f.key)}
                className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150"
                style={{
                  background: filter === f.key ? "rgba(229,62,90,0.15)" : "transparent",
                  color:      filter === f.key ? "#E53E5A"              : "var(--text-muted)",
                  border:     filter === f.key ? "1px solid rgba(229,62,90,0.3)" : "1px solid transparent",
                }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Empty ── */}
        {visibleRows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 rounded-3xl text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "rgba(229,62,90,0.1)" }}>
              <span className="material-icons-outlined text-[30px]" style={{ color: "#E53E5A" }}>
                {rows.length === 0 ? "history" : "search_off"}
              </span>
            </div>
            <h2 className="text-[16px] font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              {rows.length === 0 ? "No presentations yet" : "No matching results"}
            </h2>
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              {rows.length === 0 ? "Generate your first deck to see it here." : "Try adjusting your search or filter."}
            </p>
          </div>
        )}

        {/* ── History grid ── */}
        {visibleRows.length > 0 && (
          <div className="grid gap-3">
            {visibleRows.map((r) => (
              <div key={r.task_id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl transition-all duration-150"
                style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)" }}
                onMouseEnter={e => e.currentTarget.style.border = "1px solid rgba(229,62,90,0.2)"}
                onMouseLeave={e => e.currentTarget.style.border = "1px solid rgba(255,255,255,0.07)"}
              >
                {/* Left: info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={r.status} />
                  </div>
                  <h3 className="text-[14.5px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                    {r.user_query || "Untitled Presentation"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-[12px]" style={{ color: "var(--text-muted)" }}>
                    <div className="flex items-center gap-1">
                      <span className="material-icons-outlined text-[13px]">event</span>
                      {r.created_at ? String(r.created_at).slice(0, 10) : "—"}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-icons-outlined text-[13px]">slideshow</span>
                      {r.slide_count || 0} slides
                    </div>
                    {r.actual_time ? (
                      <div className="flex items-center gap-1">
                        <span className="material-icons-outlined text-[13px]">schedule</span>
                        {Number(r.actual_time).toFixed(0)}s
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Right: actions */}
                {r.status === "completed" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={getDownloadUrl(r.task_id)} download
                      className="btn-primary text-[13px] no-underline"
                      style={{ height: "36px", padding: "0 0.875rem", borderRadius: "0.625rem" }}>
                      <span className="material-icons-outlined text-[15px]">download</span>
                      PPTX
                    </a>
                    {r.has_search_file && (
                      <a href={getDownloadSearchUrl(r.task_id, "pdf")} download
                        className="btn-ghost text-[13px] no-underline"
                        style={{ height: "36px", padding: "0 0.875rem", borderRadius: "0.625rem" }}>
                        <span className="material-icons-outlined text-[15px]">description</span>
                        Research
                      </a>
                    )}
                    <button type="button"
                      onClick={() => removeTask(r.task_id)}
                      disabled={busyTaskId === r.task_id}
                      className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
                      style={{ color: "#F87171", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
                      <span className="material-icons-outlined text-[16px]">
                        {busyTaskId === r.task_id ? "hourglass_top" : "delete_outline"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
