import { useEffect, useState } from "react";
import { deleteTask, getHistory } from "../api";

export default function HistoryPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [busyTaskId, setBusyTaskId] = useState("");

  useEffect(() => {
    getHistory().then(setRows).catch((e) => setError(e.message));
  }, []);

  const completed = rows.filter((r) => r.status === "completed").length;
  const totalSlides = rows.reduce((acc, r) => acc + Number(r.slide_count || 0), 0);

  const normalizeStatus = (status) => {
    if (status === "error") return "failed";
    return status || "unknown";
  };

  const visibleRows = rows.filter((r) => {
    const title = String(r.user_query || r.topic || "").toLowerCase();
    const textMatches = !query.trim() || title.includes(query.trim().toLowerCase());
    const normalized = normalizeStatus(r.status);
    const statusMatches = filter === "all" ? true : normalized === filter;
    return textMatches && statusMatches;
  });

  const statusMeta = (status) => {
    if (status === "completed") return { cls: "success", icon: "check_circle" };
    if (status === "processing") return { cls: "processing", icon: "pending" };
    if (status === "error" || status === "failed") return { cls: "failed", icon: "error" };
    return { cls: "unknown", icon: "help" };
  };

  const removeTask = async (taskId) => {
    const ok = window.confirm("Delete this task from history?");
    if (!ok) return;
    try {
      setBusyTaskId(taskId);
      await deleteTask(taskId);
      setRows((prev) => prev.filter((row) => row.task_id !== taskId));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyTaskId("");
    }
  };

  return (
    <>
      <section className="history-hero">
        <div className="hero-content">
          <h1 className="display-title">
            <span className="title-icon">📚</span>
            <span className="title-text gradient-text">Your Presentations</span>
          </h1>
          <p className="hero-subtitle">Manage and download your AI-generated presentations</p>
          <div className="history-stats">
            <div className="stat-card"><span className="stat-number">{rows.length}</span><span className="stat-label">Total</span></div>
            <div className="stat-card"><span className="stat-number">{completed}</span><span className="stat-label">Completed</span></div>
            <div className="stat-card"><span className="stat-number">{totalSlides}</span><span className="stat-label">Total Slides</span></div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="card error-card" style={{ display: "block", marginBottom: "20px" }}>
          <div className="error-icon">❌</div>
          <h3>Unable to load history</h3>
          <p>{error}</p>
        </div>
      ) : null}

      <section className="history-filters">
        <div className="filter-group">
          <div className="search-box">
            <span className="material-icons-outlined">search</span>
            <input
              type="text"
              placeholder="Search presentations..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="filter-buttons">
            <button type="button" className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All</button>
            <button type="button" className={`filter-btn ${filter === "completed" ? "active" : ""}`} onClick={() => setFilter("completed")}>Completed</button>
            <button type="button" className={`filter-btn ${filter === "processing" ? "active" : ""}`} onClick={() => setFilter("processing")}>Processing</button>
            <button type="button" className={`filter-btn ${filter === "failed" ? "active" : ""}`} onClick={() => setFilter("failed")}>Failed</button>
          </div>
        </div>
      </section>

      {visibleRows.length === 0 ? (
        <div className="empty-state-modern">
          <div className="empty-icon"><span className="material-icons-outlined">history</span></div>
          <h2>No matching presentations</h2>
          <p>Try changing search keywords or status filter.</p>
        </div>
      ) : (
        <section className="history-grid">
          {visibleRows.map((r) => {
            const meta = statusMeta(r.status);
            const normalized = normalizeStatus(r.status);
            return (
              <div key={r.task_id} className={`history-card ${normalized}`}>
                <div className="card-header">
                  <div className="card-status">
                    <div className={`status-indicator ${meta.cls}`}>
                      <span className="material-icons-outlined">{meta.icon}</span>
                    </div>
                  </div>
                </div>

                <div className="card-content">
                  <h3 className="card-title">{r.user_query || r.topic || "Untitled Presentation"}</h3>
                  <div className="card-meta">
                    <div className="meta-item">
                      <span className="material-icons-outlined">event</span>
                      <span>{r.created_at ? String(r.created_at).slice(0, 10) : "Unknown"}</span>
                    </div>
                    <div className="meta-item">
                      <span className="material-icons-outlined">slideshow</span>
                      <span>{r.slide_count || 0} slides</span>
                    </div>
                    <div className="meta-item">
                      <span className="material-icons-outlined">schedule</span>
                      <span>{r.actual_time ? `${Number(r.actual_time).toFixed(1)}s` : "-"}</span>
                    </div>
                  </div>

                  {r.filename ? (
                    <div className="card-filename">
                      <span className="material-icons-outlined">description</span>
                      <span>{r.filename}</span>
                    </div>
                  ) : null}
                </div>

                {r.status === "completed" ? (
                  <div className="card-actions">
                    <a href={`/download/${r.task_id}`} className="btn btn-primary">
                      <span className="material-icons-outlined">download</span>
                      Download
                    </a>
                    {r.has_search_file ? (
                      <a href={`/download_search/${r.task_id}/pdf`} className="btn btn-outline">
                        <span className="material-icons-outlined">file_download</span>
                        Research
                      </a>
                    ) : null}
                    <button type="button" className="btn btn-outline" onClick={() => removeTask(r.task_id)} disabled={busyTaskId === r.task_id}>
                      <span className="material-icons-outlined">delete</span>
                      {busyTaskId === r.task_id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}
