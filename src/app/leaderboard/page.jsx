"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { listenToParticipants, listenToContestConfig } from "@/lib/contest";
import { subscribeToProblems } from "@/lib/problems";
import { Loader2, ArrowLeft } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rankColor(rank) {
  if (rank === 1) return "#f97316";
  if (rank === 2) return "#888";
  if (rank === 3) return "#cd7f32";
  return "#444";
}

const CHEVRON_SVG =
  'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")';

// ─── Podium Card ──────────────────────────────────────────────────────────────

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

  return (
    <div
      style={{
        background: isFirst ? "#1a0e00" : "#111",
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        width: isFirst ? 200 : 160,
        padding: isFirst ? "24px 16px" : "16px 12px",
        textAlign: "center",
        flexShrink: 0,
        boxShadow: isFirst
          ? "0 8px 32px rgba(249,115,22,0.15)"
          : "0 4px 16px rgba(0,0,0,0.4)",
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
          fontSize: isFirst ? 16 : 14,
          fontWeight: isFirst ? 600 : 500,
          marginBottom: 4,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={participant.name}
      >
        {participant.name}
      </div>
      <div
        style={{
          color: scoreColor,
          fontSize: isFirst ? 22 : 18,
          fontWeight: isFirst ? 700 : 600,
          marginBottom: 4,
        }}
      >
        {score}
        <span style={{ color: "#333", fontSize: 12, fontWeight: 400 }}>/100</span>
      </div>
      <div
        style={{
          color: "#555",
          fontSize: 11,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={title}
      >
        {title.slice(0, 22)}
        {title.length > 22 ? "…" : ""}
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

// ─── Evaluating Badge ─────────────────────────────────────────────────────────

function EvaluatingBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        color: "#f97316",
        fontSize: 11,
        fontWeight: 500,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          border: "1.5px solid #f97316",
          borderTopColor: "transparent",
          display: "inline-block",
          animation: "spin-dot 0.7s linear infinite",
        }}
      />
      Evaluating…
    </span>
  );
}

// ─── Session Dropdown ─────────────────────────────────────────────────────────

function SessionDropdown({ value, onChange, sessions, liveSessionId }) {
  return (
    <div
      style={{
        position: "relative",
        border: "1px solid #222",
        borderRadius: 8,
        background: "#111",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "transparent",
          color: "#e4e4e7",
          fontSize: 13,
          fontWeight: 500,
          padding: "8px 40px 8px 14px",
          border: "none",
          outline: "none",
          appearance: "none",
          cursor: "pointer",
          backgroundImage: CHEVRON_SVG,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          minWidth: 220,
        }}
      >
        {/* Current session always first */}
        <option value={liveSessionId} style={{ background: "#2d2d2d", color: "#fff" }}>
          Current Session (Live)
        </option>

        {sessions
          .filter((s) => s !== liveSessionId)
          .map((s) => {
            const dateNum = parseInt(s);
            const label = isNaN(dateNum)
              ? s
              : new Date(dateNum).toLocaleString();
            return (
              <option key={s} value={s} style={{ background: "#2d2d2d", color: "#fff" }}>
                Past: {label}
              </option>
            );
          })}
      </select>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PublicLeaderboardPage() {
  const [participants, setParticipants] = useState([]);
  const [problemsMap, setProblemsMap] = useState({});
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null); // null = follow live

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

  const liveSessionId = config?.sessionId || "default";

  // Build sorted unique session list (newest first)
  const allSessions = useMemo(() => {
    const set = new Set();
    participants.forEach((p) => { if (p.sessionId) set.add(p.sessionId); });
    if (liveSessionId) set.add(liveSessionId);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [participants, liveSessionId]);

  // Which session is currently displayed
  const viewingSession = selectedSession ?? liveSessionId;
  const isViewingLive = viewingSession === liveSessionId;

  // Filter participants to the viewed session AND approved by admin
  const sessionParticipants = useMemo(() => {
    return participants.filter(
      (p) =>
        String(p.sessionId || "default") === String(viewingSession) &&
        p.leaderboardVisible === true
    );
  }, [participants, viewingSession]);

  // Sort: score desc, then submittedAt asc (tiebreaker)
  const ranked = useMemo(() => {
    return [...sessionParticipants].sort((a, b) => {
      const scoreA = a.evaluation?.totalScore ?? 0;
      const scoreB = b.evaluation?.totalScore ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const tA = a.submittedAt
        ? (a.submittedAt.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt)).getTime()
        : Infinity;
      const tB = b.submittedAt
        ? (b.submittedAt.toDate ? b.submittedAt.toDate() : new Date(b.submittedAt)).getTime()
        : Infinity;
      return tA - tB;
    });
  }, [sessionParticipants]);

  const topScorers = ranked.filter((p) => (p.evaluation?.totalScore ?? 0) > 0);
  const [first, second, third] = ranked;

  const isLiveAndActive = isViewingLive && config?.phase === "active";

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0a" }}>
        <Loader2 style={{ width: 24, height: 24, color: "#71717a" }} className="animate-spin" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin-dot {
          to { transform: rotate(360deg); }
        }
        .lb-row { animation: fade-in-up 0.25s ease both; }
        .lb-row:hover { background: #111 !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0a0a0a" }}>
        <div style={{ padding: "32px 40px", maxWidth: 960, margin: "0 auto" }}>

          {/* Back link */}
          <div style={{ marginBottom: 12 }}>
            <Link
              href="/"
              style={{
                color: "#71717a",
                fontSize: 13,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                borderRadius: 6,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "#1a1a1a"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#71717a"; e.currentTarget.style.background = "transparent"; }}
            >
              <ArrowLeft style={{ width: 16, height: 16 }} />
              Back to Home
            </Link>
          </div>

          {/* Header row */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 32,
            }}
          >
            <div>
              <h1
                style={{
                  color: "#fff",
                  fontSize: 28,
                  fontWeight: 700,
                  margin: 0,
                  letterSpacing: "-0.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                🏆 Leaderboard
                {isLiveAndActive && <LiveDot />}
              </h1>
              <p style={{ color: "#71717a", fontSize: 14, marginTop: 6 }}>
              {sessionParticipants.length} coder{sessionParticipants.length !== 1 ? "s" : ""}
                {" "}approved on this leaderboard
                {isLiveAndActive && " • Scores update live"}
                {!isViewingLive && (
                  <span style={{ color: "#555", marginLeft: 6 }}>
                    — Past session
                  </span>
                )}
              </p>
            </div>

            {/* Session picker */}
            {allSessions.length > 0 && (
              <SessionDropdown
                value={viewingSession}
                onChange={(val) => setSelectedSession(val)}
                sessions={allSessions}
                liveSessionId={liveSessionId}
              />
            )}
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
              <p style={{ color: "#71717a", fontSize: 15, margin: 0 }}>No approved scores yet.</p>
              <p style={{ color: "#444", fontSize: 13, marginTop: 6 }}>
                {isLiveAndActive
                  ? "Scores will appear here after the admin approves them."
                  : "No admin-approved submissions for this session."}
              </p>
            </div>
          )}

          {/* Podium */}
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
              <p
                style={{
                  color: "#333",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                  marginBottom: 24,
                  textAlign: "center",
                }}
              >
                Top Performers
              </p>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12 }}>
                <PodiumCard participant={second ?? null} rank={2} problemsMap={problemsMap} />
                <PodiumCard participant={first ?? null} rank={1} problemsMap={problemsMap} />
                <PodiumCard participant={third ?? null} rank={3} problemsMap={problemsMap} />
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
                  gridTemplateColumns: "52px 1fr 1fr 100px",
                  gap: "0 12px",
                  padding: "12px 20px",
                  borderBottom: "1px solid #1a1a1a",
                  background: "#111",
                }}
              >
                {["Rank", "Name", "Problem", "Score"].map((h) => (
                  <span
                    key={h}
                    style={{
                      color: "#444",
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      textAlign: h === "Score" ? "right" : "left",
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
                const isSubmitted = !!p.submittedAt;
                const isEvaluating = isSubmitted && !p.evaluation;
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
                      gridTemplateColumns: "52px 1fr 1fr 100px",
                      gap: "0 12px",
                      alignItems: "center",
                      padding: "13px 20px",
                      paddingLeft: isTop ? 18 : 20,
                      borderBottom: "1px solid #161616",
                      borderLeft: isTop ? `3px solid ${lbc}` : "3px solid transparent",
                      background:
                        rank === 1
                          ? "linear-gradient(90deg, rgba(249,115,22,0.08) 0%, transparent 100%)"
                          : rank === 2
                          ? "linear-gradient(90deg, rgba(136,136,136,0.05) 0%, transparent 100%)"
                          : "transparent",
                      opacity: score === 0 && !isEvaluating ? 0.45 : 1,
                      transition: "background 0.15s ease",
                      animationDelay: `${idx * 0.03}s`,
                    }}
                  >
                    {/* Rank */}
                    <span style={{ color: isTop ? lbc : "#444", fontWeight: isTop ? 700 : 400, fontSize: 13 }}>
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
                        fontWeight: isTop ? 700 : 400,
                        fontSize: 13,
                        textAlign: "right",
                        color: score > 0 ? "#fff" : "#333",
                      }}
                    >
                      {isEvaluating ? (
                        <EvaluatingBadge />
                      ) : score > 0 ? (
                        <>
                          {score}
                          <span style={{ color: "#333", fontSize: 11, fontWeight: 400 }}>/100</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                );
              })}

              {/* Footer */}
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
      </div>
    </>
  );
}
