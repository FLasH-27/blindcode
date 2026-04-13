"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Typewriter Component
function Typewriter() {
  const phrases = [
    "60 minutes. One problem. No excuses.",
    "Write it. Trust it. Submit it.",
    "No compiler. No search. No mercy.",
  ];
  const [text, setText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer;
    const currentPhrase = phrases[phraseIndex];
    
    if (isDeleting) {
      // Fade out effect: clear entirely after a small delay, then move to next
      timer = setTimeout(() => {
        setText("");
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      }, 500);
    } else {
      if (text.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setText(currentPhrase.substring(0, text.length + 1));
        }, 40); // 40ms per char
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2500); // Wait 2.5 seconds before fading out
      }
    }

    return () => clearTimeout(timer);
  }, [text, isDeleting, phraseIndex]);

  return (
    <div className="h-[24px] text-[#71717a] text-[16px] font-normal transition-opacity duration-500 flex items-center gap-1" style={{ opacity: isDeleting ? 0 : 1 }}>
      <span>{text}</span>
      <span className="w-1.5 h-4 bg-[#71717a] opacity-70 animate-pulse block" />
    </div>
  );
}

// LiveStats Component
function LiveStats() {
  const [participants, setParticipants] = useState(0);
  const [status, setStatus] = useState("idle");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    try {
      const unsubConfig = onSnapshot(
        doc(db, "contest", "config"),
        (docSnap) => {
          if (docSnap.exists() && docSnap.data().phase) {
            setStatus(docSnap.data().phase);
          }
        },
        () => setHasError(true)
      );

      const unsubParticipants = onSnapshot(
        collection(db, "participants"),
        (snap) => {
          setParticipants(snap.docs.length);
        },
        () => setHasError(true)
      );

      return () => {
        unsubConfig();
        unsubParticipants();
      };
    } catch {
      setHasError(true);
    }
  }, []);

  if (hasError) return null;

  const dotColor = status === "active" ? "#22c55e" : status === "ended" ? "#ef4444" : "#eab308";

  return (
    <div className="mt-6 flex items-center justify-center gap-3 text-[13px] text-[#71717a]">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-[#f97316] animate-pulse-dot" />
        <span>{participants} participants registered</span>
      </div>
      <span>&middot;</span>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
        <span className="capitalize">Contest: {status}</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden font-sans flex flex-col">
      {/* Existing Glows - Tweaked radial gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse 60% 40% at 50% 60%, rgba(249,115,22,0.18) 0%, transparent 70%)' }} />

      {/* Navigation - UNTOUCHED */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-2 md:py-4 max-w-6xl mx-auto w-full animate-fade-in-up shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">
            BlindCode
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="px-4 py-2 text-sm text-[#71717a] hover:text-white transition-colors rounded-lg hover:bg-[#111]"
          >
            Admin
          </Link>
          <Link
            href="/join"
            className="px-5 py-2 text-sm font-medium text-black bg-[#f97316] hover:bg-[#ea580c] transition-colors rounded-lg"
          >
            Join Contest
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center">
        {/* Hero Section */}
        <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-[10px] md:pt-[20px] pb-6 max-w-6xl mx-auto w-full">
            
            {/* Corner Logos (Desktop Only) */}
            <div className="hidden md:block absolute top-10 left-6 z-20">
                <img src="/Nexus logo .png" alt="Nexus" className="max-h-[160px] max-w-[280px] w-auto h-auto object-contain opacity-85 hover:opacity-100 transition-opacity duration-200" />
            </div>
            <div className="hidden md:block absolute top-10 right-6 z-20">
                <img src="/avishkar logo .png" alt="Event" className="max-h-[160px] max-w-[280px] w-auto h-auto object-contain opacity-85 hover:opacity-100 transition-opacity duration-200" />
            </div>

            {/* Central Tagline Block */}
            <div className="flex flex-col items-center justify-center w-full mt-4 md:mt-0 mb-8 relative">
                <div className="relative shrink-0 flex flex-col items-center text-center">
                    {/* Background Video GIF */}
                    <video 
                        autoPlay 
                        loop 
                        muted 
                        playsInline 
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] max-w-[90vw] rounded-full object-cover opacity-[0.3] z-0 pointer-events-none"
                    >
                        <source src="/stickman video .mp4" type="video/mp4" />
                    </video>

                    {/* Eyebrow Pill */}
                    <div className="relative z-10 mb-6 inline-flex items-center gap-2 px-[14px] py-[4px] rounded-full bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.4)]">
                        <span className="w-1 h-1 rounded-full bg-[#f97316] animate-pulse-dot" />
                        <span className="text-[#f97316] text-[11px] font-semibold tracking-[0.12em] uppercase">BLIND CODE COMPETITION</span>
                    </div>

                    {/* Tagline */}
                    <h1 className="relative z-10 text-[56px] md:text-[96px] font-[900] leading-[1.0] text-white">
                        <div style={{ animation: "fadeUp 500ms ease-out 0ms backwards" }}>Think.</div>
                        <div style={{ animation: "fadeUp 500ms ease-out 150ms backwards" }}>Code.</div>
                        <div style={{ animation: "fadeUp 500ms ease-out 300ms backwards" }} className="text-[#f97316]">Pray.</div>
                    </h1>

                    {/* Subtitle Typewriter */}
                    <div className="relative z-10 mt-4 md:mt-6 min-h-[30px] flex items-center justify-center">
                        <Typewriter />
                    </div>
                </div>
            </div>

            {/* CTA Buttons */}
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 w-full sm:w-auto">
            <Link
                href="/join"
                className="group relative px-8 py-3.5 text-base font-semibold text-black bg-[#f97316] rounded-xl hover:bg-[#ea580c] transition-all duration-200 shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:shadow-[0_0_50px_rgba(249,115,22,0.5)] w-full sm:w-auto text-center"
            >
                Join a Contest
                <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
            </Link>
            </div>

            {/* Live Stats */}
            <div className="relative z-10">
                <LiveStats />
            </div>
        </div>

        {/* Rules Section (Terminal) */}
        <div className="relative z-10 md:py-[80px] py-[40px] px-6 md:px-[48px] w-full">
            <div className="max-w-[720px] mx-auto">
                <h2 className="text-white text-2xl font-bold mb-1">Contest Rules</h2>
                <p className="text-[#71717a] text-sm mb-6">Read before you join.</p>

                <div className="bg-[#0d0d0d] border border-[#222] rounded-xl overflow-hidden w-full">
                    <div className="h-[36px] bg-[#161616] border-b border-[#1a1a1a] flex items-center justify-between min-w-[300px]">
                        <div className="flex items-center gap-[6px] ml-[14px] shrink-0">
                            <div className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]" />
                            <div className="w-[10px] h-[10px] rounded-full bg-[#febc2e]" />
                            <div className="w-[10px] h-[10px] rounded-full bg-[#28c840]" />
                        </div>
                        <div className="text-[#444] text-[12px] font-mono mr-[14px] shrink-0">// contest_rules.js</div>
                    </div>
                    <div className="p-[20px] md:p-[24px] overflow-x-auto custom-scrollbar w-full">
                        <div className="min-w-[400px]">
                            {[
                                "Duration is strictly 60 minutes.",
                                "You will be assigned one random problem.",
                                "Code is written in the browser editor.",
                                "No code execution — logic only.",
                                "Tab switching is logged and flagged.",
                                "Window switching counts as a violation.",
                                "No external tools, search, or AI assistance.",
                                "Last saved code is your final submission.",
                                "Judge's decision is final."
                            ].map((rule, idx) => {
                                const isWarning = idx === 4 || idx === 5;
                                return (
                                <div key={idx} className="flex items-start hover:bg-[rgba(255,255,255,0.02)] transition-colors py-[3px] px-[6px] rounded-[4px] whitespace-nowrap">
                                    <div className="text-[#444] text-[13px] font-mono min-w-[28px] select-none">{(idx + 1).toString().padStart(2, '0')}</div>
                                    <div className={`text-[13px] font-mono ${isWarning ? 'text-[#f97316]' : 'text-[#d4d4d4]'}`}>{rule}</div>
                                </div>
                            )})}
                        </div>
                    </div>
                </div>
            </div>
        </div>


      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#1a1a1a] px-6 lg:px-[48px] py-[24px] w-full shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[13px] text-[#71717a] gap-4">
            <div>&copy; 2025 BlindCode &middot; Organized by Nexus</div>
            <div className="italic">Built for competitors.</div>
        </div>
      </footer>
      
    </div>
  );
}
