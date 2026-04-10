"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  listenToContestConfig,
  listenToParticipants,
  startContest,
  endContest,
  resetContest,
} from "@/lib/contest";
import { subscribeToProblems } from "@/lib/problems";
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
import { Loader2 } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(timestamp) {
  if (!timestamp) return null;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const pad = (n) => n.toString().padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatTimeWithMs(timestamp) {
  if (!timestamp) return null;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const pad = (n) => n.toString().padStart(2, "0");
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`;
}

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#052e16] text-[#22c55e] border border-[#166534] text-sm font-semibold">
        <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse-dot" />
        Live
      </span>
    );
  }
  if (status === "ended") {
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

function ParticipantStatusBadge({ lastSavedAt }) {
  if (!lastSavedAt) {
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

// ─── View Code Drawer ───────────────────────────────────────────────────────

function ViewCodeDrawer({ participant, problem, isOpen, onClose }) {
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
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-[600px] max-w-[100vw] bg-[#0a0a0a] border-l border-[#222] drawer-enter flex flex-col">
        {/* Header */}
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

        {/* Monaco Editor */}
        <div className="flex-1 min-h-0">
          <MonacoEditor
            height="100%"
            theme="vs-dark"
            language={participant.language || "javascript"}
            value={participant.code || "// No code submitted yet"}
            options={{
              readOnly: true,
              lineNumbers: "off",
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              domReadOnly: true,
            }}
          />
        </div>

        {/* Problem Statement Collapsible */}
        <div className="border-t border-[#222] shrink-0">
          <button
            onClick={() => setShowProblem(!showProblem)}
            className="w-full px-5 py-3 flex items-center justify-between text-sm text-[#71717a] hover:text-white transition-colors"
          >
            <span>View Problem Statement</span>
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
            <div className="px-5 pb-4 max-h-[200px] overflow-y-auto">
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

  // Dialog states
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // Drawer state
  const [drawerParticipant, setDrawerParticipant] = useState(null);

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

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleStartContest = useCallback(async () => {
    setActionLoading(true);
    setActionError("");
    try {
      await startContest();
      setShowStartDialog(false);
    } catch (error) {
      setActionError("Failed to start contest. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }, []);

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

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-[#71717a] animate-spin" />
      </div>
    );
  }

  const status = config?.status || "idle";

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-xl font-semibold text-white mb-6">
        Contest Control
      </h1>

      {/* ─── Contest Status Card ─────────────────────────────────────────── */}
      <div className="bg-[#111] border border-[#222] rounded-lg p-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <StatusBadge status={status} />

            {status === "idle" && (
              <p className="text-[#71717a] text-sm mt-4">
                No contest is currently running.
              </p>
            )}

            {status === "active" && (
              <div className="mt-4 space-y-1">
                <p className="text-[#71717a] text-sm">
                  Started at:{" "}
                  <span className="text-white tabular-nums">
                    {config?.startedAt
                      ? formatTime(config.startedAt)
                      : "..."}
                  </span>
                </p>
                <p className="text-[#f97316] text-sm font-medium">
                  {participants.length} participant{participants.length !== 1 ? "s" : ""} joined
                </p>
              </div>
            )}

            {status === "ended" && (
              <div className="mt-4 space-y-1">
                <p className="text-[#71717a] text-sm">
                  Ended at:{" "}
                  <span className="text-white tabular-nums">
                    {config?.endedAt
                      ? formatTime(config.endedAt)
                      : "..."}
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-6">
            {/* Start Button */}
            <Button
              onClick={() => setShowStartDialog(true)}
              disabled={status !== "idle"}
              className={
                status === "idle"
                  ? "bg-[#f97316] text-black hover:bg-[#ea580c] font-semibold"
                  : "opacity-40 cursor-not-allowed"
              }
            >
              Start Contest
            </Button>

            {/* End Button */}
            <Button
              variant="destructive"
              onClick={() => setShowEndDialog(true)}
              disabled={status !== "active"}
              className={
                status !== "active" ? "opacity-40 cursor-not-allowed" : ""
              }
            >
              End Contest
            </Button>

            {/* Reset Button */}
            {status === "ended" && (
              <Button
                variant="outline"
                onClick={() => setShowResetDialog(true)}
                className="text-[#71717a] hover:text-white"
              >
                Reset Contest
              </Button>
            )}
          </div>
        </div>

        {actionError && (
          <p className="text-[#ef4444] text-sm mt-4">{actionError}</p>
        )}
      </div>

      {/* ─── Participants Table ──────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-medium text-white">Participants</h2>
        <span className="text-[#71717a] text-[13px]">
          {participants.length} participant{participants.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="bg-[#111] rounded-lg border border-[#222]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Problem Title</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Last Saved</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-[#71717a]"
                >
                  No participants yet. Share the contest link to get started.
                </TableCell>
              </TableRow>
            ) : (
              participants.map((p, idx) => (
                <TableRow key={p.id}>
                  <TableCell className="text-[#71717a] font-medium">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="text-white font-medium">
                    {p.name}
                  </TableCell>
                  <TableCell className="text-[#a1a1aa]">
                    {problemsMap[p.problemId]?.title || (
                      <span className="text-[#555]">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <LanguageBadge language={p.language} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {p.lastSavedAt ? (
                      <span className="text-[#a1a1aa] text-sm">
                        {formatTimeWithMs(p.lastSavedAt)}
                      </span>
                    ) : (
                      <span className="text-[#555] text-sm">Not saved</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ParticipantStatusBadge lastSavedAt={p.lastSavedAt} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDrawerParticipant(p)}
                      className="text-xs"
                    >
                      View Code
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ─── Confirm Dialogs ─────────────────────────────────────────────── */}

      {/* Start Contest Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Contest</DialogTitle>
            <DialogDescription>
              Are you sure you want to start the contest? All participants will
              be able to join immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStartDialog(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartContest}
              disabled={actionLoading}
              className="bg-[#f97316] text-black hover:bg-[#ea580c] font-semibold"
            >
              {actionLoading && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Contest Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Contest</DialogTitle>
            <DialogDescription>
              Are you sure? Participants will lose editor access immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEndDialog(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEndContest}
              disabled={actionLoading}
              className="bg-[#ef4444] text-white hover:bg-[#dc2626] border-0"
            >
              {actionLoading && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              End Contest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Contest Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Contest</DialogTitle>
            <DialogDescription>
              This will reset contest status to idle. Participant data will NOT
              be deleted. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetContest}
              disabled={actionLoading}
              className="bg-[#ef4444] text-white hover:bg-[#dc2626] border-0"
            >
              {actionLoading && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View Code Drawer ────────────────────────────────────────────── */}
      <ViewCodeDrawer
        participant={drawerParticipant}
        problem={
          drawerParticipant
            ? problemsMap[drawerParticipant.problemId]
            : null
        }
        isOpen={!!drawerParticipant}
        onClose={() => setDrawerParticipant(null)}
      />
    </div>
  );
}
