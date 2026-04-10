"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { listenToContest, getParticipantByName, createParticipant } from "@/lib/participants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function JoinPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [contestStatus, setContestStatus] = useState("idle");
  const inputRef = useRef(null);

  useEffect(() => {
    // 1. Initial localstorage check
    const existingId = localStorage.getItem("participantId");
    
    // 2. Realtime listener for contest status
    const unsubscribe = listenToContest((data) => {
        setContestStatus(data.status);
        if (existingId && data.status === "active") {
          router.push("/contest");
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
    if (!name.trim()) return;

    if (contestStatus !== "active") {
      setErrorMsg("Contest is not active yet.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const existingParticipant = await getParticipantByName(name);
      
      if (existingParticipant) {
        localStorage.setItem("participantId", existingParticipant.id);
        router.push("/contest");
      } else {
        const newId = await createParticipant(name);
        localStorage.setItem("participantId", newId);
        router.push("/contest");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to join. Try again.");
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
    return (
      <div className="flex items-center justify-center space-x-2 mt-4 text-sm text-[#71717a]">
        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
        <span>Waiting for contest to start</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center font-sans">
      <h1 className="text-white text-4xl font-bold mb-8">Blind Code</h1>
      
      <div className="bg-[#111] border border-[#222] rounded-lg p-8 w-full max-w-[380px]">
        <h2 className="text-white text-base font-medium mb-1">Enter your name</h2>
        <p className="text-[#71717a] text-sm mb-6">You will be assigned a problem when you submit.</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <Input 
            ref={inputRef}
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Your name" 
            className="w-full bg-[#0a0a0a] border-[#222] text-white focus-visible:ring-1 focus-visible:ring-[#f97316] focus-visible:border-[#f97316] outline-none"
            disabled={loading}
            autoFocus
          />
          
          <Button 
            type="submit" 
            disabled={loading || !name.trim()}
            className="w-full bg-[#f97316] hover:bg-[#ea580c] text-black font-semibold transition-colors h-10"
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
