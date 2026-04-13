"use client";

import { useState, useEffect } from "react";
import LobbyGuard from "@/components/LobbyGuard";
import { listenToContestConfig, listenToParticipants } from "@/lib/contest";
import { getParticipant } from "@/lib/participants";

export default function LobbyPage() {
  const [timeLeft, setTimeLeft] = useState(null);
  const [participantName, setParticipantName] = useState("");
  const [allParticipants, setAllParticipants] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [ambientMessage, setAmbientMessage] = useState("");
  const [messageOpacity, setMessageOpacity] = useState(1);
  const [isExpired, setIsExpired] = useState(false);

  // Reactively compute count: only participants from the current session
  const participantCount = currentSessionId
    ? allParticipants.filter(p => p.sessionId === currentSessionId).length
    : allParticipants.length;

  const ambientMessages = [
    "Sharpen your logic. The clock starts soon.",
    "No Google. No hints. Just you and the problem.",
    "Think before you type.",
    "Your code, your mind, your shot.",
    "60 minutes. One chance. Make it count."
  ];

  useEffect(() => {
    // Participant Data Fetch
    const pId = localStorage.getItem("participantId");
    if (pId) {
      getParticipant(pId).then(p => {
        if (p) setParticipantName(p.name);
      });
    }

    let sessionIdRef = null;

    // Participants Listener — stores full list, filtering happens reactively via state
    const unsubParticipants = listenToParticipants((list) => {
      setAllParticipants(list);
    });

    let configEndsAt = null;

    // Config Listener for Timer + sessionId
    const unsubConfig = listenToContestConfig((config) => {
       if (config.joiningEndsAt) {
           configEndsAt = typeof config.joiningEndsAt === 'number'
             ? config.joiningEndsAt
             : (config.joiningEndsAt.toDate ? config.joiningEndsAt.toDate().getTime() : new Date(config.joiningEndsAt).getTime());
       }
       if (config.sessionId) {
           sessionIdRef = config.sessionId;
           setCurrentSessionId(config.sessionId);
       }
    });

    // Timer Tick
    const timerInterval = setInterval(() => {
        if (!configEndsAt) return;
        const now = Date.now();
        const diff = configEndsAt - now;
        
        if (diff <= 0) {
            setTimeLeft(0);
            setIsExpired(true);
        } else {
            setTimeLeft(diff);
            setIsExpired(false);
        }
    }, 1000);

    // Ambient Messages Cycler
    let msgIndex = 0;
    setAmbientMessage(ambientMessages[0]);
    const messageInterval = setInterval(() => {
        setMessageOpacity(0);
        setTimeout(() => {
            msgIndex = (msgIndex + 1) % ambientMessages.length;
            setAmbientMessage(ambientMessages[msgIndex]);
            setMessageOpacity(1);
        }, 500); // Wait for fade out
    }, 5000);

    return () => {
        unsubParticipants();
        if (unsubConfig) unsubConfig();
        clearInterval(timerInterval);
        clearInterval(messageInterval);
    };
  }, []);

  const formatTime = (ms) => {
      if (ms === null) return "00:00";
      const totalSeconds = Math.floor(ms / 1000);
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isWarning = timeLeft !== null && timeLeft <= 120000;
  const isPulsing = timeLeft !== null && timeLeft <= 30000;

  return (
    <LobbyGuard>
      <div 
        className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center relative overflow-hidden font-sans"
        style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)"
        }}
      >
        
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(249,115,22,0.05) 0%, transparent 70%)' }} />

        {/* TOP ZONE */}
        <div className="relative z-10 flex flex-col items-center justify-center mb-12">
            <h1 className="text-white text-[20px] font-bold tracking-tight mb-4">BlindCode</h1>
            <div className="inline-flex items-center gap-2 px-[14px] py-[4px] rounded-full bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.4)] shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse-dot" />
                <span className="text-[#f97316] text-[11px] font-semibold tracking-[0.12em] uppercase">WAITING LOBBY</span>
            </div>
        </div>

        {/* MIDDLE ZONE */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-[600px] w-full px-6 mb-16">
            <div 
                className={`font-[800] text-[64px] md:text-[80px] leading-none mb-6 tabular-nums transition-colors duration-300 ${
                    isWarning && !isExpired ? "text-[#f97316]" : "text-white"
                } ${isPulsing && !isExpired ? "animate-pulse" : ""}`}
            >
                {formatTime(timeLeft)}
            </div>

            <div className="text-[#71717a] text-[15px] mb-8 font-medium h-[24px]">
                {isExpired 
                    ? "Joining window closed — waiting for the organiser to start the contest"
                    : "Joining window is open — get your teammates in now"
                }
            </div>

            <div className="bg-[#111] border border-[#222] rounded-lg px-5 py-3 inline-flex items-center justify-center gap-3">
                <span className="text-[#d4d4d4] text-[13px] font-medium flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#888]">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    {participantName}
                </span>
                <span className="text-[#444] text-[10px]">●</span>
                <span className="text-[#d4d4d4] text-[13px]">Spot secured ✓</span>
            </div>
        </div>

        {/* BOTTOM ZONE */}
        <div className="relative z-10 absolute bottom-[8vmin] flex flex-col items-center text-center">
            <div 
                className="text-[#444] text-[13px] mb-2 h-[20px] transition-opacity duration-500 ease-in-out"
                style={{ opacity: messageOpacity }}
            >
                {ambientMessage}
            </div>
            <div className="text-[#333] text-[12px] font-medium">
                {participantCount} {participantCount === 1 ? 'coder' : 'coders'} in the lobby
            </div>
        </div>
        
      </div>
    </LobbyGuard>
  );
}
