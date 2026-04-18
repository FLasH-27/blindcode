"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  listenToContestConfig,
  listenToParticipants,
  startContest,
  endContest,
  resetContest,
  openJoiningWindow,
  extendJoiningWindow
} from "@/lib/contest";
import { subscribeToProblems } from "@/lib/problems";
import { saveEvaluation, deleteParticipant, addToLeaderboard } from "@/lib/participants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ArrowUpDown, Trash2, Pencil, Trophy } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(timestamp) {
  if (!timestamp) return null;
  const date = (timestamp.toDate ? timestamp.toDate() : (typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp)));
  const pad = (n) => n.toString().padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatTimeWithMs(timestamp) {
  if (!timestamp) return null;
  const date = (timestamp.toDate ? timestamp.toDate() : (typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp)));
  const pad = (n) => n.toString().padStart(2, "0");
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`;
}

function formatDuration(ms) {
    if (ms === null || ms < 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ phase }) {
  if (phase === "active") {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#052e16] text-[#22c55e] border border-[#166534] text-sm font-semibold">
        <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
        Live
      </span>
    );
  }
  if (phase === "joining") {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0a1628] text-[#3b82f6] border border-[#1e3a5f] text-sm font-semibold">
        <span className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
        Joining Open
      </span>
    );
  }
  if (phase === "ended") {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1c0a0a] text-[#ef4444] border border-[#7f1d1d] text-sm font-semibold">
        Ended
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a1a] text-[#71717a] border border-[#333] text-sm font-semibold">
      Not Started
    </span>
  );
}

// ─── Language Badge ─────────────────────────────────────────────────────────

function LanguageBadge({ language }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#1a1a1a] text-[#a1a1aa] border border-[#333] text-xs font-medium">
      {language || "javascript"}
    </span>
  );
}

// ─── Participant Status Badge ───────────────────────────────────────────────

function ParticipantStatusBadge({ participant }) {
  if (participant.submittedAt) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium">
        Submitted
      </span>
    );
  }
  if (!participant.lastSavedAt) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#1a1a1a] text-[#71717a] border border-[#333] text-xs font-medium">
        Joined
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#052e16] text-[#22c55e] border border-[#166534] text-xs font-medium">
      Active
    </span>
  );
}

// ─── Switch Badge ─────────────────────────────────────────────────────────

function SwitchBadge({ count }) {
  if (count === 0 || !count) return <span className="text-[#444]">0</span>;
  if (count < 3) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-xs font-bold">
      {count}
    </span>
  );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold">
      {count}
    </span>
  );
}

// ─── View Code Drawer ───────────────────────────────────────────────────────

function ViewCodeDrawer({ participant, problem, isOpen, onClose }) {
  const scrollRef = useRef(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState("");
  const [evalProvider, setEvalProvider] = useState("gemini"); // 'gemini' | 'groq'

  const handleEvaluate = async () => {
    if (!participant || !problem) return;
    setEvalLoading(true);
    setEvalError("");
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: participant.code,
          language: participant.language,
          problemTitle: problem.title,
          problemDescription: problem.description,
          examples: problem.examples,
          provider: evalProvider,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Evaluation failed");

      await saveEvaluation(participant.id, data);
    } catch (err) {
      setEvalError(err.message);
    } finally {
      setEvalLoading(false);
    }
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const [showProblem, setShowProblem] = useState(false);

  if (!isOpen || !participant) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed top-0 right-0 bottom-0 z-50 w-[600px] max-w-[100vw] bg-[#0a0a0a] border-l border-[#222] drawer-enter flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-[#222] shrink-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-white text-base font-semibold truncate">
              {participant.name}
            </h3>
            <p className="text-[#71717a] text-[13px] mt-0.5 truncate">
              {problem?.title || "Unknown Problem"}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <LanguageBadge language={participant.language} />
              {participant.lastSavedAt && (
                <span className="text-[#f97316] text-xs">
                  Last saved: {formatTimeWithMs(participant.lastSavedAt)}
                </span>
              )}
              {participant.submittedAt && (
                <span className="text-blue-400 text-xs">
                  Submitted at: {formatTimeWithMs(participant.submittedAt)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#71717a] hover:text-white transition-colors ml-4 shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar" ref={scrollRef}>
          <div className="h-[400px]">
            <MonacoEditor
                height="100%"
                theme="vs-dark"
                language={participant.language || "javascript"}
                value={participant.code || "// No code submitted yet"}
                options={{
                readOnly: true,
                lineNumbers: "on",
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                domReadOnly: true,
                }}
            />
          </div>

          <div className="p-5 border-t border-[#222]">
            <h4 className="text-white text-sm font-semibold mb-3">Tab Switch Log</h4>
            <div className="space-y-1">
                {(participant.tabSwitchCount || 0) === 0 ? (
                    <p className="text-[#22c55e]/70 text-xs italic">No tab switches detected</p>
                ) : (
                    <>
                        <p className="text-[#ef4444] text-[13px] font-medium mb-2">
                            Switched tabs {participant.tabSwitchCount} times
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {(participant.tabSwitchLog || []).map((ts, idx) => (
                                <span key={idx} className="text-[#71717a] text-[12px] tabular-nums">
                                    {formatTimeWithMs(ts)}
                                </span>
                            ))}
                        </div>
                    </>
                )}
            </div>
          </div>

          <div className="border-t border-[#222]">
            <button
              onClick={() => setShowProblem(!showProblem)}
              className="w-full px-5 py-3 flex items-center justify-between text-sm text-[#71717a] hover:text-white transition-colors"
            >
              <span>Problem Statement</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${showProblem ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showProblem && problem && (
              <div className="px-5 pb-4">
                <h4 className="text-white text-sm font-semibold mb-2">
                  {problem.title}
                </h4>
                <p className="text-[#a1a1aa] text-sm whitespace-pre-wrap leading-relaxed mb-3">
                  {problem.description}
                </p>
                {problem.examples && (
                  <>
                    <h5 className="text-white text-xs font-semibold uppercase tracking-wider mb-1">
                      Examples
                    </h5>
                    <p className="text-[#a1a1aa] text-sm whitespace-pre-wrap leading-relaxed">
                      {problem.examples}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="p-5 border-t border-[#222] bg-[#0f0f0f]">
            <h4 className="text-white text-sm font-semibold mb-3 border-b border-[#222] pb-2">AI Evaluation</h4>
            {participant.evaluation ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-[#161616] p-4 rounded-lg border border-[#222]">
                        <span className="text-[#a1a1aa] font-medium text-sm">Total Score</span>
                        <span className={`text-xl font-bold ${participant.evaluation.totalScore >= 80 ? 'text-[#22c55e]' : participant.evaluation.totalScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {participant.evaluation.totalScore}<span className="text-[#555] text-sm">/100</span>
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#111] p-3 rounded border border-[#222]">
                            <p className="text-[#71717a] text-[11px] uppercase tracking-wider mb-1">Execution</p>
                            <p className="text-white text-sm font-semibold">{participant.evaluation.executionScore}/60</p>
                        </div>
                        <div className="bg-[#111] p-3 rounded border border-[#222]">
                            <p className="text-[#71717a] text-[11px] uppercase tracking-wider mb-1">Complexity</p>
                            <p className="text-white text-sm font-semibold">{participant.evaluation.complexityScore}/10</p>
                        </div>
                        <div className="bg-[#111] p-3 rounded border border-[#222]">
                            <p className="text-[#71717a] text-[11px] uppercase tracking-wider mb-1">Logic</p>
                            <p className="text-white text-sm font-semibold">{participant.evaluation.logicScore}/10</p>
                        </div>
                        <div className="bg-[#111] p-3 rounded border border-[#222]">
                            <p className="text-[#71717a] text-[11px] uppercase tracking-wider mb-1">Errors</p>
                            <p className="text-white text-sm font-semibold">{participant.evaluation.errorScore}/20</p>
                        </div>
                    </div>
                    <div className="bg-[#1a1a1a] p-3 rounded border border-[#333]">
                        <p className="text-[#a1a1aa] text-[13px] italic leading-relaxed">
                            "{participant.evaluation.feedback}"
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-[#71717a] text-[13px]">No AI evaluation has been run for this submission yet.</p>
                    {evalError && <p className="text-red-500 text-xs">{evalError}</p>}
                    {/* Provider toggle */}
                    <div className="flex items-center gap-2 p-1 bg-[#161616] border border-[#222] rounded-lg">
                      <button
                        onClick={() => setEvalProvider("gemini")}
                        className={`flex-1 text-xs py-1.5 px-3 rounded-md font-semibold transition-all ${
                          evalProvider === "gemini"
                            ? "bg-[#f97316] text-black shadow"
                            : "text-[#71717a] hover:text-white"
                        }`}
                      >
                        ✦ Gemini
                      </button>
                      <button
                        onClick={() => setEvalProvider("groq")}
                        className={`flex-1 text-xs py-1.5 px-3 rounded-md font-semibold transition-all ${
                          evalProvider === "groq"
                            ? "bg-[#6366f1] text-white shadow"
                            : "text-[#71717a] hover:text-white"
                        }`}
                      >
                        ⚡ Groq
                      </button>
                    </div>
                    <Button 
                        onClick={handleEvaluate} 
                        disabled={evalLoading || !participant.code}
                        className={`w-full font-semibold ${
                          evalProvider === "groq"
                            ? "bg-[#6366f1] text-white hover:bg-[#4f46e5]"
                            : "bg-[#f97316] text-black hover:bg-[#ea580c]"
                        }`}
                    >
                        {evalLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Evaluate with {evalProvider === "groq" ? "Groq" : "Gemini"}
                    </Button>
                </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AdminContestPage() {
  const [config, setConfig] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [problemsMap, setProblemsMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSession, setSelectedSession] = useState("current");
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [timeLeft, setTimeLeft] = useState(null);

  // Dialog states
  const [showJoiningDialog, setShowJoiningDialog] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  
  const [joiningDuration, setJoiningDuration] = useState(10);
  const [extendMinutes, setExtendMinutes] = useState(5);
  const [duration, setDuration] = useState(60);
  const [selectedRound, setSelectedRound] = useState(1);

  // Drawer state
  const [drawerParticipant, setDrawerParticipant] = useState(null);

  // Edit Score state
  const [editScoreTarget, setEditScoreTarget] = useState(null); // participant
  const [editScoreValue, setEditScoreValue] = useState("");
  const [editFeedback, setEditFeedback] = useState("");
  const [editScoreLoading, setEditScoreLoading] = useState(false);
  const [editScoreError, setEditScoreError] = useState("");

  const openEditScore = (p) => {
    setEditScoreTarget(p);
    setEditScoreValue(String(p.evaluation?.totalScore ?? ""));
    setEditFeedback(p.evaluation?.feedback ?? "");
    setEditScoreError("");
  };

  const handleSaveScore = async () => {
    const total = parseInt(editScoreValue);
    if (isNaN(total) || total < 0 || total > 100) {
      setEditScoreError("Score must be a number between 0 and 100.");
      return;
    }
    setEditScoreLoading(true);
    setEditScoreError("");
    try {
      const existing = editScoreTarget.evaluation || {};
      await saveEvaluation(editScoreTarget.id, {
        executionScore: existing.executionScore ?? 0,
        complexityScore: existing.complexityScore ?? 0,
        logicScore: existing.logicScore ?? 0,
        errorScore: existing.errorScore ?? 0,
        ...existing,
        totalScore: total,
        feedback: editFeedback || existing.feedback || "Score manually set by admin.",
      });
      setEditScoreTarget(null);
    } catch (err) {
      setEditScoreError("Failed to save score. Please try again.");
    } finally {
      setEditScoreLoading(false);
    }
  };

  // Subscribe to contest config
  useEffect(() => {
    const unsubscribe = listenToContestConfig((data) => {
      setConfig(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to participants
  useEffect(() => {
    const unsubscribe = listenToParticipants((data) => {
      setParticipants(data);
    });
    return () => unsubscribe();
  }, []);

  // Fetch all problems once and build lookup map
  useEffect(() => {
    const unsubscribe = subscribeToProblems((problems) => {
      const map = {};
      problems.forEach((p) => {
        map[p.id] = p;
      });
      setProblemsMap(map);
    });
    return () => unsubscribe();
  }, []);

  // Timer logic
  useEffect(() => {
    if ((config?.phase !== "active" && config?.phase !== "joining")) {
      setTimeLeft(null);
      return;
    }
    
    const interval = setInterval(() => {
      const now = Date.now();
      let targetAt = null;
      
      if (config.phase === "active" && config.endsAt) {
          targetAt = typeof config.endsAt === 'number' ? config.endsAt : (config.endsAt.toDate ? config.endsAt.toDate().getTime() : new Date(config.endsAt).getTime());
      } else if (config.phase === "joining" && config.joiningEndsAt) {
          targetAt = typeof config.joiningEndsAt === 'number' ? config.joiningEndsAt : (config.joiningEndsAt.toDate ? config.joiningEndsAt.toDate().getTime() : new Date(config.joiningEndsAt).getTime());
      }

      if (!targetAt) return;

      const remaining = Math.max(0, targetAt - now);
      setTimeLeft(remaining);
      
      if (remaining <= 0 && config.phase === "active") {
        handleEndContest();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [config?.phase, config?.endsAt, config?.joiningEndsAt]);

  const handleOpenJoiningWindow = useCallback(async () => {
    setActionLoading(true);
    setActionError("");
    try {
      await openJoiningWindow(joiningDuration, selectedRound);
      setShowJoiningDialog(false);
    } catch (error) {
      setActionError("Failed to open joining window. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }, [joiningDuration, selectedRound]);

  const handleExtendJoiningWindow = useCallback(async () => {
    setActionLoading(true);
    setActionError("");
    try {
      await extendJoiningWindow(extendMinutes);
      setShowExtendDialog(false);
    } catch (error) {
      setActionError("Failed to extend joining window. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }, [extendMinutes]);

  const handleStartContest = useCallback(async () => {
    setActionLoading(true);
    setActionError("");
    try {
      await startContest(duration);
      setShowStartDialog(false);
    } catch (error) {
      setActionError("Failed to start contest. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }, [duration]);

  const handleEndContest = useCallback(async () => {
    setActionLoading(true);
    setActionError("");
    try {
      await endContest();
      setShowEndDialog(false);
    } catch (error) {
      setActionError("Failed to end contest. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }, []);

  const handleResetContest = useCallback(async () => {
    setActionLoading(true);
    setActionError("");
    try {
      await resetContest();
      setShowResetDialog(false);
    } catch (error) {
      setActionError("Failed to reset contest. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }, []);

  const uniqueSessions = useMemo(() => {
    const sessions = new Set();
    participants.forEach(p => {
        if (p.sessionId) sessions.add(p.sessionId);
    });
    return Array.from(sessions).sort((a,b) => b.localeCompare(a));
  }, [participants]);

  const filteredAndSortedParticipants = useMemo(() => {
    let result = participants.filter(p => {
        if (!p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        
        const currentId = config?.sessionId || "default";
        const sessionFilter = selectedSession === "current" ? currentId : selectedSession;
        
        if (String(p.sessionId || "default") !== String(sessionFilter)) return false;
        
        return true;
    });

    result.sort((a, b) => {
        const timeA = a.lastSavedAt ? (a.lastSavedAt.toDate ? a.lastSavedAt.toDate().getTime() : new Date(a.lastSavedAt).getTime()) : 0;
        const timeB = b.lastSavedAt ? (b.lastSavedAt.toDate ? b.lastSavedAt.toDate().getTime() : new Date(b.lastSavedAt).getTime()) : 0;
        
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [participants, searchQuery, sortOrder, selectedSession, config?.sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-[#71717a] animate-spin" />
      </div>
    );
  }

  const phase = config?.phase || "idle";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-6">
        Contest Control
      </h1>

      <div className="bg-[#111] border border-[#222] rounded-lg p-6 mb-8">
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <StatusBadge phase={phase} />

            {phase === "idle" && (
              <p className="text-[#71717a] text-sm">
                No contest or joining window is currently active.
              </p>
            )}

            {config?.round && (phase === "joining" || phase === "active") && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1a1a1a] border border-[#333] text-sm font-medium text-[#a1a1aa]">
                <span className={`w-1.5 h-1.5 rounded-full ${config.round === 1 ? 'bg-blue-400' : 'bg-purple-400'}`} />
                Round {config.round}
              </span>
            )}

            {phase === "joining" && (
              <div className="space-y-2">
                <div className="flex flex-col">
                    <span className="text-[#3b82f6] text-xs uppercase tracking-wider font-semibold mb-1">Joining Closes In</span>
                    <div className={`text-4xl font-mono font-bold tabular-nums ${timeLeft < 60000 ? 'text-red-500 animate-pulse' : timeLeft < 120000 ? 'text-[#f97316]' : 'text-white'}`}>
                        {formatDuration(timeLeft)}
                    </div>
                </div>
                <div className="space-y-1 pt-2">
                    <p className="text-[#3b82f6] text-sm font-medium">
                    {filteredAndSortedParticipants.length} participant{filteredAndSortedParticipants.length !== 1 ? "s" : ""} joined so far
                    </p>
                </div>
              </div>
            )}

            {phase === "active" && (
              <div className="space-y-2">
                <div className="flex flex-col">
                    <span className="text-[#71717a] text-xs uppercase tracking-wider font-semibold mb-1">Contest Time Remaining</span>
                    <div className={`text-4xl font-mono font-bold tabular-nums ${timeLeft < 60000 ? 'text-red-500 animate-pulse' : timeLeft < 300000 ? 'text-red-500' : 'text-white'}`}>
                        {formatDuration(timeLeft)}
                    </div>
                </div>
                <div className="space-y-1 pt-2">
                    <p className="text-[#71717a] text-sm">
                    Started at:{" "}
                    <span className="text-white tabular-nums">
                        {config?.startedAt ? formatTime(config.startedAt) : "..."}
                    </span>
                    </p>
                    <p className="text-[#f97316] text-sm font-medium">
                    {filteredAndSortedParticipants.length} participant{filteredAndSortedParticipants.length !== 1 ? "s" : ""} joined
                    </p>
                </div>
              </div>
            )}

            {phase === "ended" && (
              <div className="space-y-1">
                <p className="text-[#71717a] text-sm">
                  Ended at:{" "}
                  <span className="text-white tabular-nums">
                    {config?.endedAt ? formatTime(config.endedAt) : "..."}
                  </span>
                </p>
                <p className="text-[#71717a] text-sm italic">
                    Duration: {config?.durationMinutes || 60} minutes
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-3 shrink-0 ml-6">
            <div className="flex items-center gap-3">
              {phase === "idle" && (
                <Button
                  onClick={() => setShowJoiningDialog(true)}
                  className="bg-[#f97316] text-black hover:bg-[#ea580c] font-semibold"
                >
                  Open Joining Window
                </Button>
              )}

              {phase === "joining" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowExtendDialog(true)}
                    className="border-[#333] text-[#a1a1aa] hover:text-white"
                  >
                    Extend Joining Time
                  </Button>
                  <Button
                    onClick={() => setShowStartDialog(true)}
                    className="bg-[#f97316] text-black hover:bg-[#ea580c] font-semibold"
                  >
                    Start Contest
                  </Button>
                </>
              )}

              {phase === "active" && (
                <Button
                  variant="destructive"
                  onClick={() => setShowEndDialog(true)}
                >
                  End Contest
                </Button>
              )}

              {phase === "ended" && (
                <Button
                  variant="outline"
                  onClick={() => setShowResetDialog(true)}
                  className="text-[#71717a] hover:text-white border-[#333]"
                >
                  Reset Contest
                </Button>
              )}
            </div>

            {phase === "joining" && (
                <button 
                  onClick={() => {
                      if (window.confirm("This will close the joining window and reset the contest. Participant data will be kept. Continue?")) {
                          handleResetContest();
                      }
                  }}
                  className="text-red-500 hover:text-red-400 text-xs font-medium mt-1 mr-1 underline decoration-red-500/30 underline-offset-2"
                >
                    Cancel & Reset
                </button>
            )}
          </div>
        </div>

        {actionError && (
          <p className="text-[#ef4444] text-sm mt-4">{actionError}</p>
        )}
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-white">Participants</h2>
            <span className="text-[#71717a] text-[13px]">
                {filteredAndSortedParticipants.length} participant{filteredAndSortedParticipants.length !== 1 ? "s" : ""}
            </span>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
                <Input 
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#111] border-[#222] text-sm focus-visible:ring-[#f97316]"
                />
            </div>
            
            <div className="relative border border-[#222] rounded-md bg-[#111]">
                <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="bg-transparent text-[#a1a1aa] hover:text-white text-sm py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-[#f97316] appearance-none rounded-md"
                    style={{
                        backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 8px center'
                    }}
                >
                    <option value="current" className="bg-[#2d2d2d] text-white">Current Session (Live)</option>
                    {uniqueSessions.map(s => {
                        if (s === (config?.sessionId || "default")) return null;
                        const dateNum = parseInt(s);
                        const label = isNaN(dateNum) ? s : new Date(dateNum).toLocaleString();
                        return <option value={s} key={s} className="bg-[#2d2d2d] text-white">Past: {label}</option>
                    })}
                </select>
            </div>

            {/* Leaderboard button */}
            <Link
              href="/leaderboard"
              id="leaderboard-btn"
              style={{
                border: "1px solid #f97316",
                color: "#f97316",
                background: "transparent",
                borderRadius: "7px",
                padding: "7px 16px",
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "inherit",
                lineHeight: 1.4,
                textDecoration: "none",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(249,115,22,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Leaderboard
            </Link>
        </div>
      </div>

      <div className="bg-[#111] rounded-lg border border-[#222] overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-[#111] z-10 border-b border-[#222]">
                    <TableRow className="hover:bg-transparent border-b-[#222]">
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Problem Title</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>
                            <button 
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="flex items-center gap-1 hover:text-white transition-colors"
                            >
                                Last Saved
                                <ArrowUpDown className="w-3 h-3" />
                            </button>
                        </TableHead>

                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredAndSortedParticipants.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-[#71717a]">
                            No participants found matching your criteria.
                        </TableCell>
                    </TableRow>
                    ) : (
                    filteredAndSortedParticipants.map((p, idx) => (
                        <TableRow key={p.id} className="border-b-[#1a1a1a] hover:bg-[#161616]">
                        <TableCell className="text-[#71717a] font-medium text-xs">
                            {idx + 1}
                        </TableCell>
                        <TableCell className="text-white font-medium">
                            {p.name}
                        </TableCell>
                        <TableCell className="text-[#a1a1aa] text-sm">
                            {problemsMap[p.problemId]?.title || <span className="text-[#444]">None</span>}
                        </TableCell>
                        <TableCell>
                            <LanguageBadge language={p.language} />
                        </TableCell>
                        <TableCell className="tabular-nums">
                            {p.lastSavedAt ? (
                            <span className="text-[#a1a1aa] text-[13px]">
                                {formatTimeWithMs(p.lastSavedAt)}
                            </span>
                            ) : (
                            <span className="text-[#444] text-xs">Never</span>
                            )}
                        </TableCell>

                        <TableCell>
                            <ParticipantStatusBadge participant={p} />
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                            {p.evaluation ? (
                                <span className={`font-bold ${p.evaluation.totalScore >= 80 ? 'text-[#22c55e]' : p.evaluation.totalScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {p.evaluation.totalScore}<span className="text-[#555] font-normal text-xs">/100</span>
                                </span>
                            ) : (
                                <span className="text-[#444]">-</span>
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDrawerParticipant(p)}
                                className="text-xs h-8 border-[#333] hover:bg-[#222]"
                                >
                                View Code
                                </Button>
                                <Button
                                variant="outline"
                                size="icon"
                                title="Edit Score"
                                onClick={() => openEditScore(p)}
                                className="h-8 w-8 border-[#333] hover:bg-[#1a2a1a] hover:border-[#22c55e]/40 text-[#71717a] hover:text-[#22c55e]"
                                >
                                <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                {/* Add to / Remove from leaderboard */}
                                <Button
                                variant="outline"
                                size="icon"
                                disabled={!p.evaluation}
                                title={p.leaderboardVisible ? "Remove from Leaderboard" : "Add to Leaderboard"}
                                onClick={() => {
                                  const resolvedSession = selectedSession === "current"
                                    ? (config?.sessionId || "default")
                                    : selectedSession;
                                  addToLeaderboard(p.id, !p.leaderboardVisible, resolvedSession);
                                }}
                                className={`h-8 w-8 border-[#333] transition-colors ${
                                  p.leaderboardVisible
                                    ? "bg-[#f97316]/10 border-[#f97316]/40 text-[#f97316] hover:bg-red-900/20 hover:border-red-500/40 hover:text-red-400"
                                    : "text-[#71717a] hover:bg-[#f97316]/10 hover:border-[#f97316]/40 hover:text-[#f97316]"
                                } disabled:opacity-30 disabled:cursor-not-allowed`}
                                >
                                <Trophy className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                    if(window.confirm("Are you sure you want to permanently delete this participant?")) {
                                        deleteParticipant(p.id);
                                    }
                                }}
                                className="h-8 w-8 border-[#333] hover:bg-red-900/30 hover:border-red-900 text-[#71717a] hover:text-red-500"
                                >
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </TableCell>
                        </TableRow>
                    ))
                    )}
                </TableBody>
            </Table>
        </div>
      </div>

      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent className="bg-[#111] border-[#222]">
          <DialogHeader>
            <DialogTitle className="text-white">Start Contest</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              Set the duration and confirm to start. Participants will be able to join immediately.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium text-white flex items-center justify-between">
                    Contest Duration
                    <span className="text-[#f97316] font-bold text-lg">{duration} <span className="text-xs font-normal">minutes</span></span>
                </label>
                <div className="flex items-center gap-4">
                    <Input 
                        type="number"
                        min={1}
                        max={180}
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                        className="bg-[#0a0a0a] border-[#222] text-white focus-visible:ring-[#f97316]"
                    />
                </div>
                <p className="text-[11px] text-[#555]">Min: 1m, Max: 180m</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStartDialog(false)}
              disabled={actionLoading}
              className="border-[#222] text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartContest}
              disabled={actionLoading}
              className="bg-[#f97316] text-black hover:bg-[#ea580c] font-semibold"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirm Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="bg-[#111] border-[#222]">
          <DialogHeader>
            <DialogTitle className="text-white">End Contest</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              Are you sure? Participants will lose editor access immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEndDialog(false)}
              disabled={actionLoading}
              className="border-[#222] text-white"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEndContest}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              End Contest Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="bg-[#111] border-[#222]">
          <DialogHeader>
            <DialogTitle className="text-white">Reset Contest</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              This will reset contest status to idle. Participant data will NOT
              be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              disabled={actionLoading}
              className="border-[#222] text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetContest}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showJoiningDialog} onOpenChange={setShowJoiningDialog}>
        <DialogContent className="bg-[#111] border-[#222]">
          <DialogHeader>
            <DialogTitle className="text-white">Open Joining Window</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              Choose the round and set the wait duration before starting the contest.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-5">
            {/* ── Round Selector ──────────────────────────── */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-white">Select Round</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRound(1)}
                    className={`flex-1 py-2.5 rounded-md text-sm font-semibold border transition-all ${
                      selectedRound === 1
                        ? "bg-blue-500/15 text-blue-400 border-blue-500/30 shadow-sm shadow-blue-500/10"
                        : "bg-[#0a0a0a] text-[#71717a] border-[#222] hover:text-white hover:border-[#333]"
                    }`}
                  >
                    Round 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRound(2)}
                    className={`flex-1 py-2.5 rounded-md text-sm font-semibold border transition-all ${
                      selectedRound === 2
                        ? "bg-purple-500/15 text-purple-400 border-purple-500/30 shadow-sm shadow-purple-500/10"
                        : "bg-[#0a0a0a] text-[#71717a] border-[#222] hover:text-white hover:border-[#333]"
                    }`}
                  >
                    Round 2
                  </button>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-white flex items-center justify-between">
                    Wait Duration
                    <span className="text-[#3b82f6] font-bold text-lg">{joiningDuration} <span className="text-xs font-normal">minutes</span></span>
                </label>
                <div className="flex items-center gap-4">
                    <Input 
                        type="number"
                        min={1}
                        max={60}
                        value={joiningDuration}
                        onChange={(e) => setJoiningDuration(parseInt(e.target.value) || 1)}
                        className="bg-[#0a0a0a] border-[#222] text-white focus-visible:ring-[#3b82f6]"
                    />
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowJoiningDialog(false)}
              disabled={actionLoading}
              className="border-[#222] text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleOpenJoiningWindow}
              disabled={actionLoading}
              className="bg-[#3b82f6] text-white hover:bg-[#2563eb] font-semibold"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Open Window — Round {selectedRound}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent className="bg-[#111] border-[#222]">
          <DialogHeader>
            <DialogTitle className="text-white">Extend Joining Window</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              Add additional time to the current joining window countdown.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium text-white flex items-center justify-between">
                    Additional Minutes
                    <span className="text-[#3b82f6] font-bold text-lg">+{extendMinutes} <span className="text-xs font-normal">minutes</span></span>
                </label>
                <div className="flex items-center gap-4">
                    <Input 
                        type="number"
                        min={1}
                        max={30}
                        value={extendMinutes}
                        onChange={(e) => setExtendMinutes(parseInt(e.target.value) || 1)}
                        className="bg-[#0a0a0a] border-[#222] text-white focus-visible:ring-[#3b82f6]"
                    />
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExtendDialog(false)}
              disabled={actionLoading}
              className="border-[#222] text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExtendJoiningWindow}
              disabled={actionLoading}
              className="bg-[#3b82f6] text-white hover:bg-[#2563eb] font-semibold"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Extend Time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ViewCodeDrawer
        participant={drawerParticipant}
        problem={drawerParticipant ? problemsMap[drawerParticipant.problemId] : null}
        isOpen={!!drawerParticipant}
        onClose={() => setDrawerParticipant(null)}
      />

      {/* ── Edit Score Dialog ───────────────────────────────────── */}
      <Dialog open={!!editScoreTarget} onOpenChange={(open) => { if (!open) setEditScoreTarget(null); }}>
        <DialogContent className="bg-[#111] border-[#222]">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Score</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              Manually override the score for{" "}
              <span className="text-white font-medium">{editScoreTarget?.name}</span>.
              This will update the leaderboard immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-5">
            {/* Current score pill */}
            {editScoreTarget?.evaluation && (
              <div className="flex items-center gap-2 text-sm text-[#71717a]">
                Current score:
                <span className={`font-bold ${
                  editScoreTarget.evaluation.totalScore >= 80 ? "text-[#22c55e]"
                  : editScoreTarget.evaluation.totalScore >= 50 ? "text-yellow-500"
                  : "text-red-500"
                }`}>
                  {editScoreTarget.evaluation.totalScore}/100
                </span>
              </div>
            )}

            {/* Score input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white flex items-center justify-between">
                New Total Score
                <span className="text-[#f97316] font-bold text-lg">
                  {editScoreValue || "—"}
                  <span className="text-xs font-normal text-[#555]">/100</span>
                </span>
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={editScoreValue}
                onChange={(e) => setEditScoreValue(e.target.value)}
                placeholder="0 – 100"
                className="bg-[#0a0a0a] border-[#222] text-white focus-visible:ring-[#f97316] text-lg font-bold"
              />
            </div>

            {/* Feedback input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Feedback <span className="text-[#555] font-normal">(optional)</span></label>
              <textarea
                value={editFeedback}
                onChange={(e) => setEditFeedback(e.target.value)}
                placeholder="Leave a note about this score override…"
                rows={3}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-md text-[#a1a1aa] text-sm p-3 resize-none focus:outline-none focus:ring-1 focus:ring-[#f97316]"
              />
            </div>

            {editScoreError && (
              <p className="text-red-500 text-xs">{editScoreError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditScoreTarget(null)}
              disabled={editScoreLoading}
              className="border-[#222] text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveScore}
              disabled={editScoreLoading || editScoreValue === ""}
              className="bg-[#22c55e] text-black hover:bg-[#16a34a] font-semibold"
            >
              {editScoreLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
