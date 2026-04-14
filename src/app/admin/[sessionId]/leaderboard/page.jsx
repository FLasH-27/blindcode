"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { listenToParticipants } from "@/lib/contest";
import { subscribeToProblems } from "@/lib/problems";
import { listenToContestConfig } from "@/lib/contest";
import { Loader2, ArrowLeft } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(ts) {
  if (!ts) return "—";
  const date = ts.toDate
    ? ts.toDate()
    : typeof ts === "number"
    ? new Date(ts)
    : new Date(ts);
  const pad = (n) => n.toString().padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function shortId(id) {
  return id ? `#${id.slice(-6)}` : "—";
}

function rankColor(rank) {
  if (rank === 1) return "#f97316";
  if (rank === 2) return "#888";
  if (rank === 3) return "#cd7f32";
  return "#444";
}

// ─── Podium Card ─────────────────────────────────────────────────────────────

function PodiumCard({ participant, rank, problemsMap }) {
  if (!participant) return <div style={{ width: rank === 1 ? 200 : 160 }} />;

  const score = participant.evaluation?.totalScore ?? 0;
  const title = participant.problemId
    ? (problemsMap[participant.problemId]?.title ?? "Unknown")
    : "—";

  const isFirst = rank === 1;

  const medal = isFirst ? "♛" : rank === 2 ? "✦" : "③";
  const medalColor = isFirst ? "#f97316" : rank === 2 ? "#aaa" : "#cd7f32";
  const borderColor = isFirst ? "#f97316" : rank === 2 ? "#888" : "#6b4c2a";
  const scoreColor = isFirst ? "#f97316" : rank === 2 ? "#ccc" : "#cd7f32";
  const bg = isFirst ? "#1a0e00" : "#111";
  const width = isFirst ? 200 : 160;
  const padding = isFirst ? "24px 16px" : "16px 12px";
  const nameSize = isFirst ? 16 : 14;
  const scoreSize = isFirst ? 22 : 18;
  const nameFw = isFirst ? 600 : 500;
  const scoreFw = isFirst ? 700 : 600;

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        width,
        padding,
        textAlign: "center",
        flexShrink: 0,
        boxShadow: isFirst ? "0 8px 32px rgba(249,115,22,0.15)" : "0 4px 16px rgba(0,0,0,0.4)",
        position: "relative",
        transform: isFirst ? "translateY(-12px)" : "none",
        zIndex: isFirst ? 10 : 1,
      }}
    >
      <div style={{ color: medalColor, fontSize: isFirst ? 24 : 18, marginBottom: 8 }}>
        {medal}
      </div>
      <div
        style={{
          color: "#fff",
          fontSize: nameSize,
          fontWeight: nameFw,
          marginBottom: 4,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={participant.name}
      >
        {participant.name}
      </div>
      <div style={{ color: scoreColor, fontSize: scoreSize, fontWeight: scoreFw, marginBottom: 4 }}>
        {score}
        <span style={{ color: "#333", fontSize: 12, fontWeight: 400 }}>/100</span>
      </div>
      <div style={{ color: "#444", fontSize: 11, fontFamily: "monospace", marginBottom: 4 }}>
        {shortId(participant.id)}
      </div>
      <div
        style={{ color: "#555", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        title={title}
      >
        {title.slice(0, 22)}{title.length > 22 ? "…" : ""}
      </div>
    </div>
  );
}

// ─── Live Dot ─────────────────────────────────────────────────────────────────

function LiveDot() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#22c55e",
          display: "inline-block",
          animation: "pulse-dot 1.5s ease-in-out infinite",
        }}
      />
      <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 600 }}>Live</span>
    </span>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const router = useRouter();
  const params = useParams();
  const currentSessionId = params?.sessionId || "default";

  const [participants, setParticipants] = useState([]);
  const [problemsMap, setProblemsMap] = useState({});
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = listenToParticipants((data) => {
      setParticipants(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = listenToContestConfig((data) => setConfig(data));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeToProblems((problems) => {
      const map = {};
      problems.forEach((p) => (map[p.id] = p));
      setProblemsMap(map);
    });
    return () => unsub();
  }, []);

  // Unique sessions list for dropdown
  const uniqueSessions = useMemo(() => {
    const sessions = new Set();
    participants.forEach((p) => {
      if (p.sessionId) sessions.add(p.sessionId);
    });
    // Add current session to dropdown even if empty
    if (config?.sessionId) sessions.add(config.sessionId);
    return Array.from(sessions).sort((a, b) => b.localeCompare(a));
  }, [participants, config?.sessionId]);

  // Filter to currently selected session
  const sessionParticipants = useMemo(() => {
    return participants.filter(
      (p) => String(p.sessionId || "default") === String(currentSessionId)
    );
  }, [participants, currentSessionId]);

  // Sort by score desc, then lastSavedAt asc (tiebreaker)
  const ranked = useMemo(() => {
    return [...sessionParticipants].sort((a, b) => {
      const scoreA = a.evaluation?.totalScore ?? 0;
      const scoreB = b.evaluation?.totalScore ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const tA = a.lastSavedAt
        ? a.lastSavedAt.toDate
          ? a.lastSavedAt.toDate().getTime()
          : new Date(a.lastSavedAt).getTime()
        : Infinity;
      const tB = b.lastSavedAt
        ? b.lastSavedAt.toDate
          ? b.lastSavedAt.toDate().getTime()
          : new Date(b.lastSavedAt).getTime()
        : Infinity;
      return tA - tB;
    });
  }, [sessionParticipants]);

  const topScorers = ranked.filter((p) => (p.evaluation?.totalScore ?? 0) > 0);
  const first = ranked[0] ?? null;
  const second = ranked[1] ?? null;
  const third = ranked[2] ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-[#71717a] animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Pulse keyframe injected inline */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lb-row { animation: fade-in-up 0.25s ease both; }
      `}</style>

      <div style={{ padding: "32px 40px", maxWidth: 960, margin: "0 auto" }}>
        
        {/* Navigation / Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <button
                onClick={() => router.push("/admin/contest")}
                style={{
                    background: "none", border: "none", color: "#a1a1aa", display: "flex", alignItems: "center", fontSize: 13, cursor: "pointer", padding: "4px 8px", marginLeft: -8, borderRadius: 6
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "#1a1a1a"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "none"; }}
            >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Controls
            </button>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 12 }}>
              Leaderboard
              {currentSessionId === (config?.sessionId || "default") && config?.phase === "active" && <LiveDot />}
            </h1>
            <p style={{ color: "#71717a", fontSize: 14, marginTop: 6, margin: 0 }}>
              {sessionParticipants.length} coder{sessionParticipants.length !== 1 ? "s" : ""} in this session
            </p>
          </div>
          
          <div className="relative border border-[#222] rounded-md bg-[#111] shadow-sm">
              <select
                  value={currentSessionId}
                  onChange={(e) => {
                      router.push(`/admin/${e.target.value}/leaderboard`);
                  }}
                  className="bg-transparent text-[#e4e4e7] hover:text-white text-sm py-2.5 pl-4 pr-10 focus:outline-none focus:ring-1 focus:ring-[#f97316] appearance-none rounded-md cursor-pointer font-medium"
                  style={{
                      backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center'
                  }}
              >
                  <option value="default" className="bg-[#2d2d2d] text-white">Default Session</option>
                  {uniqueSessions.map(s => {
                      if (s === "default") return null;
                      const dateNum = parseInt(s);
                      const label = isNaN(dateNum) ? s : new Date(dateNum).toLocaleString();
                      const isLive = s === config?.sessionId && config?.phase === "active";
                      return <option value={s} key={s} className="bg-[#2d2d2d] text-white">{isLive ? "Live: " : "Past: "}{label}</option>
                  })}
              </select>
          </div>
        </div>

        {/* Empty state */}
        {topScorers.length === 0 && (
          <div
            style={{
              background: "#111",
              border: "1px solid #1a1a1a",
              borderRadius: 16,
              padding: "60px 32px",
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 16 }}>🏆</div>
            <p style={{ color: "#71717a", fontSize: 15, margin: 0 }}>No scores yet.</p>
            <p style={{ color: "#444", fontSize: 13, marginTop: 6 }}>
              Scores will appear here once participants are evaluated.
            </p>
          </div>
        )}

        {/* Podium — shown when at least 1 scorer */}
        {topScorers.length > 0 && (
          <div
            style={{
              background: "linear-gradient(180deg, rgba(20,20,20,1) 0%, rgba(10,10,10,1) 100%)",
              border: "1px solid #222",
              borderRadius: 20,
              padding: "48px 24px",
              marginBottom: 32,
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <p style={{ color: "#333", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 24, textAlign: "center" }}>
              Top Performers
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                gap: 12,
              }}
            >
              {/* 2nd place */}
              <PodiumCard participant={second} rank={2} problemsMap={problemsMap} />
              {/* 1st place */}
              <PodiumCard participant={first} rank={1} problemsMap={problemsMap} />
              {/* 3rd place */}
              <PodiumCard participant={third} rank={3} problemsMap={problemsMap} />
            </div>
          </div>
        )}

        {/* Full ranked table */}
        {ranked.length > 0 && (
          <div
            style={{
              background: "#0a0a0a",
              border: "1px solid #222",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "52px 1fr 80px 1fr 70px 80px",
                gap: "0 12px",
                padding: "12px 20px",
                borderBottom: "1px solid #1a1a1a",
                background: "#111",
              }}
            >
              {["Rank", "Name", "ID", "Problem", "Score", "Saved At"].map((h) => (
                <span
                  key={h}
                  style={{
                    color: "#444",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {ranked.map((p, idx) => {
              const rank = idx + 1;
              const score = p.evaluation?.totalScore ?? 0;
              const isZero = score === 0;
              const isTop = rank <= 3;
              const lbc = rankColor(rank);
              const problemTitle = p.problemId
                ? (problemsMap[p.problemId]?.title ?? "Unknown")
                : "—";

              return (
                <div
                  key={p.id}
                  className="lb-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "52px 1fr 80px 1fr 70px 80px",
                    gap: "0 12px",
                    alignItems: "center",
                    padding: "13px 20px",
                    paddingLeft: isTop ? 18 : 20,
                    borderBottom: "1px solid #161616",
                    borderLeft: isTop ? `3px solid ${lbc}` : "3px solid transparent",
                    background:
                      rank === 1
                        ? "linear-gradient(90deg, rgba(249,115,22,0.08) 0%, rgba(0,0,0,0) 100%)"
                        : rank === 2
                        ? "linear-gradient(90deg, rgba(136,136,136,0.05) 0%, rgba(0,0,0,0) 100%)"
                        : "transparent",
                    opacity: isZero ? 0.45 : 1,
                    transition: "all 0.2s ease",
                    animationDelay: `${idx * 0.03}s`,
                  }}
                  onMouseEnter={(e) => {
                      if (!isTop) e.currentTarget.style.background = "#111";
                  }}
                  onMouseLeave={(e) => {
                      if (!isTop) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Rank */}
                  <span
                    style={{
                      color: isTop ? lbc : "#444",
                      fontWeight: isTop ? 700 : 400,
                      fontSize: 13,
                    }}
                  >
                    #{rank}
                  </span>

                  {/* Name */}
                  <span
                    style={{
                      color: "#fff",
                      fontWeight: isTop ? 700 : 500,
                      fontSize: 13,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </span>

                  {/* ID */}
                  <span
                    style={{
                      color: "#333",
                      fontSize: 11,
                      fontFamily: "monospace",
                    }}
                  >
                    {shortId(p.id)}
                  </span>

                  {/* Problem */}
                  <span
                    style={{
                      color: "#555",
                      fontSize: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={problemTitle}
                  >
                    {problemTitle.slice(0, 24)}{problemTitle.length > 24 ? "…" : ""}
                  </span>

                  {/* Score */}
                  <span
                    style={{
                      color: score > 0 ? "#fff" : "#333",
                      fontWeight: isTop ? 700 : 400,
                      fontSize: 13,
                      textAlign: "right",
                    }}
                  >
                    {score > 0 ? (
                      <>
                        {score}
                        <span style={{ color: "#333", fontSize: 11, fontWeight: 400 }}>/100</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </span>

                  {/* Saved At */}
                  <span style={{ color: "#444", fontSize: 12, textAlign: "right" }}>
                    {fmtTime(p.lastSavedAt)}
                  </span>
                </div>
              );
            })}

            {/* Footer count */}
            <div
              style={{
                padding: "10px 20px",
                borderTop: "1px solid #111",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <span style={{ color: "#333", fontSize: 12 }}>
                {ranked.length} participant{ranked.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
