import { useEffect, useMemo, useState } from "react";
import { getHistory } from "../api";

function formatDuration(seconds) {
  const n = Number(seconds || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  if (n < 60) return `${n.toFixed(1)}s`;
  return `${(n / 60).toFixed(1)}m`;
}

export default function AnalyticsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getHistory().then(setRows).catch((e) => setError(e.message));
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const completedRows = rows.filter((r) => r.status === "completed");
    const completed = completedRows.length;
    const failed = rows.filter((r) => r.status === "error" || r.status === "failed").length;
    const successRate = total ? Math.round((completed / total) * 1000) / 10 : 0;

    const averageSec = completedRows.length
      ? completedRows.reduce((acc, row) => acc + Number(row.actual_time || 0), 0) / completedRows.length
      : 0;

    const totalSlides = rows.reduce((acc, row) => acc + Number(row.slide_count || 0), 0);
    const totalDownloads = completedRows.filter((r) => r.filename).length;

    return {
      total,
      completed,
      failed,
      successRate,
      averageSec,
      totalSlides,
      totalDownloads
    };
  }, [rows]);

  const popularTopics = useMemo(() => {
    const counts = new Map();
    rows.forEach((r) => {
      const raw = String(r.user_query || "Untitled").trim();
      const key = raw.length > 48 ? `${raw.slice(0, 48)}...` : raw;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const arr = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([topic, count]) => ({ topic, count }));

    const max = arr[0]?.count || 1;
    return arr.map((item) => ({ ...item, pct: Math.max(12, Math.round((item.count / max) * 100)) }));
  }, [rows]);

  return (
    <>
      <section className="hero-section" data-reveal>
        <div className="hero-content">
          <h1 className="display-title">
            <span className="title-icon">📊</span>
            <span className="title-text gradient-text">Analytics Dashboard</span>
          </h1>
          <p className="hero-subtitle">Track creation performance, usage behavior, and output quality signals</p>
        </div>
      </section>

      {error ? (
        <div className="card error-card" style={{ display: "block", marginBottom: "20px" }}>
          <div className="error-icon">❌</div>
          <h3>Unable to load analytics</h3>
          <p>{error}</p>
        </div>
      ) : null}

      <section className="analytics-grid" data-reveal>
        <div className="analytics-card">
          <div className="analytics-icon">🎯</div>
          <div className="analytics-value">{stats.total}</div>
          <div className="analytics-label">Total Presentations</div>
          <div className="analytics-change positive">{stats.completed} completed</div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">⏱️</div>
          <div className="analytics-value">{formatDuration(stats.averageSec)}</div>
          <div className="analytics-label">Avg Generation Time</div>
          <div className="analytics-change positive">Based on completed runs</div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">✅</div>
          <div className="analytics-value">{stats.successRate}%</div>
          <div className="analytics-label">Success Rate</div>
          <div className={`analytics-change ${stats.failed ? "negative" : "positive"}`}>{stats.failed} failed</div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">📥</div>
          <div className="analytics-value">{stats.totalDownloads}</div>
          <div className="analytics-label">Deck Files Ready</div>
          <div className="analytics-change positive">{stats.totalSlides} slides total</div>
        </div>
      </section>

      <section className="card" data-reveal>
        <h2>🔥 Most Popular Topics</h2>
        <div className="topic-list">
          {popularTopics.length === 0 ? (
            <p>No data yet. Generate a few decks to see trend insights.</p>
          ) : (
            popularTopics.map((topic) => (
              <div className="topic-item" key={topic.topic}>
                <span className="topic-name">{topic.topic}</span>
                <div className="topic-bar">
                  <div className="topic-progress" style={{ width: `${topic.pct}%` }} />
                </div>
                <span className="topic-count">{topic.count} presentations</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card" data-reveal>
        <h2>💡 Usage Insights</h2>
        <div className="insights-grid">
          <div className="insight-item">
            <div className="insight-icon">📈</div>
            <div className="insight-content">
              <h4>Output Volume</h4>
              <p>{stats.totalSlides} slides generated across all tasks.</p>
            </div>
          </div>

          <div className="insight-item">
            <div className="insight-icon">🎯</div>
            <div className="insight-content">
              <h4>Completion Reliability</h4>
              <p>{stats.successRate}% of tasks reached completed status.</p>
            </div>
          </div>

          <div className="insight-item">
            <div className="insight-icon">⚡</div>
            <div className="insight-content">
              <h4>Speed Profile</h4>
              <p>Average generation time is {formatDuration(stats.averageSec)}.</p>
            </div>
          </div>

          <div className="insight-item">
            <div className="insight-icon">🧠</div>
            <div className="insight-content">
              <h4>Topic Diversity</h4>
              <p>{popularTopics.length} high-frequency topics identified in your usage.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
