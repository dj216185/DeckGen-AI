import { useEffect, useMemo, useState } from "react";
import { getHistory } from "../api";

function fmt(seconds) {
  const n = Number(seconds || 0);
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n < 60) return `${n.toFixed(1)}s`;
  return `${(n / 60).toFixed(1)}m`;
}

export default function AnalyticsPage() {
  const [rows,  setRows]  = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getHistory().then(setRows).catch((e) => setError(e.message));
  }, []);

  const stats = useMemo(() => {
    const total      = rows.length;
    const done       = rows.filter((r) => r.status === "completed");
    const completed  = done.length;
    const failed     = rows.filter((r) => r.status === "error" || r.status === "failed").length;
    const successRate = total ? Math.round((completed / total) * 1000) / 10 : 0;
    const avgSec     = done.length ? done.reduce((a, r) => a + Number(r.actual_time || 0), 0) / done.length : 0;
    const totalSlides = rows.reduce((a, r) => a + Number(r.slide_count || 0), 0);
    return { total, completed, failed, successRate, avgSec, totalSlides };
  }, [rows]);

  const popularTopics = useMemo(() => {
    const counts = new Map();
    rows.forEach((r) => {
      const key = String(r.user_query || "Untitled").trim().slice(0, 48);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const arr = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = arr[0]?.[1] || 1;
    return arr.map(([topic, count]) => ({ topic, count, pct: Math.max(8, Math.round((count / max) * 100)) }));
  }, [rows]);

  const STAT_CARDS = [
    { icon: "slideshow",  val: stats.total,          label: "Total Presentations", sub: `${stats.completed} completed`,      color: "#60A5FA" },
    { icon: "speed",      val: fmt(stats.avgSec),     label: "Avg Generation Time", sub: "Based on completed runs",            color: "#FCD34D" },
    { icon: "verified",   val: `${stats.successRate}%`,label: "Success Rate",       sub: `${stats.failed} failed`,             color: "#4ADE80" },
    { icon: "layers",     val: stats.totalSlides,     label: "Total Slides Made",   sub: "Across all tasks",                   color: "#F472B6" },
  ];

  const INSIGHTS = [
    { icon: "bar_chart",  title: "Output Volume",    text: `${stats.totalSlides} slides generated across ${stats.total} tasks.` },
    { icon: "verified",   title: "Completion Rate",  text: `${stats.successRate}% of tasks completed successfully.`             },
    { icon: "speed",      title: "Speed Profile",    text: `Average generation time is ${fmt(stats.avgSec)}.`                  },
    { icon: "category",   title: "Topic Diversity",  text: `${popularTopics.length} distinct high-frequency topics found.`      },
  ];

  return (
    <div className="min-h-full" style={{ background: "var(--bg-app)" }}>

      {/* ── Header ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 55% 70% at 5% 40%, rgba(96,165,250,0.1) 0%, transparent 60%)" }} />
        <div className="relative max-w-5xl mx-auto px-6 pt-12 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase mb-5"
            style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)", color: "#60A5FA" }}>
            <span className="material-icons-outlined text-[13px]">insights</span>
            Analytics
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "0.5rem" }}>
            Usage <span style={{ color: "#60A5FA", fontStyle: "italic" }}>Analytics</span>
          </h1>
          <p style={{ fontSize: "14.5px", color: "var(--text-secondary)" }}>Track creation performance and usage patterns</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-16 space-y-8">

        {error && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl"
            style={{ background: "rgba(248,113,113,0.08)", border: "1.5px solid rgba(248,113,113,0.25)" }}>
            <span className="material-icons-outlined" style={{ color: "#F87171" }}>error</span>
            <p className="text-[13.5px]" style={{ color: "#F87171" }}>{error}</p>
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ icon, val, label, sub, color }) => (
            <div key={label} className="flex flex-col gap-3 p-5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl"
                style={{ background: `${color}18` }}>
                <span className="material-icons-outlined text-[20px]" style={{ color }}>{icon}</span>
              </div>
              <div>
                <div className="text-[24px] font-black leading-tight" style={{ color: "var(--text-primary)" }}>{val}</div>
                <div className="text-[12.5px] font-semibold mt-0.5" style={{ color: "var(--text-secondary)" }}>{label}</div>
                <div className="text-[11.5px] mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Popular topics ── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3 px-6 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="material-icons-outlined text-[20px]" style={{ color: "#E53E5A" }}>trending_up</span>
            <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>Popular Topics</h2>
          </div>
          <div className="px-6 py-5 space-y-3">
            {popularTopics.length === 0 ? (
              <p className="text-[13px] py-4 text-center" style={{ color: "var(--text-muted)" }}>
                No data yet. Generate a few decks to see trends.
              </p>
            ) : popularTopics.map(({ topic, count, pct }) => (
              <div key={topic} className="flex items-center gap-4">
                <span className="text-[13px] font-medium flex-1 min-w-0 truncate" style={{ color: "var(--text-secondary)" }}>{topic}</span>
                <div className="w-36 h-2 rounded-full overflow-hidden shrink-0" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: "linear-gradient(90deg,#E53E5A,#C4294A)" }} />
                </div>
                <span className="text-[12px] font-bold tabular-nums shrink-0 w-5 text-right" style={{ color: "#E53E5A" }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Insights ── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3 px-6 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="material-icons-outlined text-[20px]" style={{ color: "#FCD34D" }}>lightbulb</span>
            <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>Usage Insights</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-px" style={{ background: "rgba(255,255,255,0.05)" }}>
            {INSIGHTS.map(({ icon, title, text }) => (
              <div key={title} className="flex items-start gap-4 p-5"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                  style={{ background: "rgba(229,62,90,0.1)" }}>
                  <span className="material-icons-outlined text-[18px]" style={{ color: "#E53E5A" }}>{icon}</span>
                </div>
                <div>
                  <h4 className="text-[13px] font-bold mb-1" style={{ color: "var(--text-primary)" }}>{title}</h4>
                  <p className="text-[12.5px] leading-snug" style={{ color: "var(--text-muted)" }}>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
