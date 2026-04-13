"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { listenToContest, createOrResumeParticipant } from "@/lib/participants";
import { validateCredential } from "@/lib/credentials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function JoinPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rollId, setRollId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [contestStatus, setContestStatus] = useState("idle");
  const inputRef = useRef(null);

  useEffect(() => {
    // Realtime listener for contest phase — reads localStorage fresh each time
    // so stale session IDs from previous contests are always detected and cleared.
    const unsubscribe = listenToContest((data) => {
        const phase = data.phase || "idle";
        setContestStatus(phase);
        const activeSessionId = data.sessionId || "default";

        const storedId = localStorage.getItem("participantId");

        if (storedId) {
          const belongsToCurrentSession = storedId.startsWith(activeSessionId + "_");

          if (phase === "active") {
            if (belongsToCurrentSession) {
              router.push("/contest");
            } else {
              // Old session ID — clear it so user logs in fresh
              localStorage.removeItem("participantId");
            }
          } else if (phase === "joining") {
            if (belongsToCurrentSession) {
              router.push("/lobby");
            } else {
              // Stale ID from a past session — wipe it, let them re-login
              localStorage.removeItem("participantId");
            }
          } else if (phase === "idle" || phase === "ended") {
            // Contest reset or ended — if their ID is from an old session, clear it
            if (!belongsToCurrentSession) {
              localStorage.removeItem("participantId");
            }
          }
        }
    });

    // Auto focus input
    if (inputRef.current) {
        inputRef.current.focus();
    }
    
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !rollId.trim() || !password.trim()) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    if (contestStatus === "idle") {
      setErrorMsg("Contest has not started yet.");
      return;
    }

    if (contestStatus === "ended") {
      setErrorMsg("Contest has ended.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const isValid = await validateCredential(rollId.trim(), password.trim());
      if (!isValid) {
        throw new Error("Invalid Participant ID or Password.");
      }

      const newId = await createOrResumeParticipant(rollId.trim(), name.trim());
      localStorage.setItem("participantId", newId);
      
      if (contestStatus === "joining") {
          router.push("/lobby");
      } else {
          router.push("/contest");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to join. Try again.");
      setLoading(false);
    }
  };

  const getStatusDisplay = () => {
    if (contestStatus === "active") {
      return (
        <div className="flex items-center justify-center space-x-2 mt-4 text-sm text-[#71717a]">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-green-500/80">Contest is live</span>
        </div>
      );
    }
    if (contestStatus === "ended") {
      return (
        <div className="flex items-center justify-center space-x-2 mt-4 text-sm text-[#71717a]">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span>Contest has ended</span>
        </div>
      );
    }
    if (contestStatus === "joining") {
      return (
        <div className="flex items-center justify-center space-x-2 mt-4 text-sm text-[#71717a]">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <span className="text-blue-500/80">Joining window is open</span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center space-x-2 mt-4 text-sm text-[#71717a]">
        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
        <span>Waiting for window to open</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center font-sans">
      <h1 className="text-white text-4xl font-bold mb-8">Blind Code</h1>
      
      <div className="bg-[#111] border border-[#222] rounded-lg p-8 w-full max-w-[380px]">
        <h2 className="text-white text-base font-medium mb-1">Contest Login</h2>
        <p className="text-[#71717a] text-sm mb-6">Enter your credential strictly to join the session.</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <Input 
            ref={inputRef}
            value={rollId} 
            onChange={(e) => setRollId(e.target.value)} 
            placeholder="Participant ID (e.g. A3XZ9)" 
            className="w-full bg-[#0a0a0a] border-[#222] text-white focus-visible:ring-1 focus-visible:ring-[#f97316] outline-none"
            disabled={loading}
            autoFocus
          />
          <Input 
            type="password"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Password" 
            className="w-full bg-[#0a0a0a] border-[#222] text-white focus-visible:ring-1 focus-visible:ring-[#f97316] outline-none"
            disabled={loading}
          />
          <Input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Your Display Name" 
            className="w-full bg-[#0a0a0a] border-[#222] text-white focus-visible:ring-1 focus-visible:ring-[#f97316] outline-none"
            disabled={loading}
          />
          
          <Button 
            type="submit" 
            disabled={loading || !name.trim() || !rollId.trim() || !password.trim()}
            className="w-full bg-[#f97316] hover:bg-[#ea580c] text-black font-semibold transition-colors h-10 mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Join Contest
          </Button>

          {errorMsg && (
            <p className="text-red-500 text-sm text-center animate-in fade-in slide-in-from-top-1">{errorMsg}</p>
          )}

          {getStatusDisplay()}
        </form>
      </div>
    </div>
  );
}
