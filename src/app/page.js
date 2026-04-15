"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
    <div className="h-[24px] text-[#71717a] text-[16px] font-normal transition-opacity duration-500 flex items-center justify-start gap-1" style={{ opacity: isDeleting ? 0 : 1 }}>
      <span>{text}</span>
      <span className="w-1.5 h-4 bg-[#71717a] opacity-70 animate-pulse block" />
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
            href="/leaderboard"
            className="px-4 py-2 text-sm text-[#71717a] hover:text-white transition-colors rounded-lg hover:bg-[#111]"
          >
            Leaderboard
          </Link>
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

      <main className="flex-1 flex flex-col items-center w-full">
        {/* 2-Column Hero Section */}
        <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-stretch justify-center min-h-[500px]">

          {/* LEFT HALF */}
          <div className="w-full lg:w-1/2 flex items-center justify-center relative py-12 lg:py-0">
            {/* Subtle radial-gradient orange glow behind the video circle */}
            <div className="absolute w-[400px] h-[400px] md:w-[700px] md:h-[700px] bg-[#f97316] opacity-10 blur-[80px] rounded-full pointer-events-none" />

            <div className="relative flex items-center justify-center w-[300px] h-[300px] md:w-[560px] md:h-[560px]">
              {/* Outer Dashed Ring */}
              <div
                className="absolute border border-dashed rounded-full pointer-events-none"
                style={{
                  width: 'calc(100% * 316 / 320)',
                  height: 'calc(100% * 316 / 320)',
                  maxWidth: '556px',
                  maxHeight: '556px',
                  borderColor: 'rgba(249,115,22,0.08)',
                  animation: 'spin-reverse 20s linear infinite'
                }}
              />
              {/* Inner Solid Ring */}
              <div
                className="absolute border rounded-full pointer-events-none"
                style={{
                  width: 'calc(100% * 296 / 320)',
                  height: 'calc(100% * 296 / 320)',
                  maxWidth: '536px',
                  maxHeight: '536px',
                  borderColor: 'rgba(249,115,22,0.2)',
                  animation: 'spin 12s linear infinite'
                }}
              />
              {/* Video */}
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-[280px] h-[280px] md:w-[520px] md:h-[520px] rounded-full object-contain z-10 bg-[#0f0f10]"
              >
                <source src="./Assets/stickman video.mp4" type="video/mp4" />
              </video>
            </div>
          </div>

          {/* RIGHT HALF */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center items-start py-[60px] px-[20px] md:px-[50px]">
            {/* Eyebrow Pill */}
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.4)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse-dot" />
              <span className="text-[#f97316] text-xs font-semibold tracking-widest uppercase">BLIND CODE COMPETITION</span>
            </div>

            {/* Tagline */}
            <h1 className="text-[80px] md:text-[80px] font-normal leading-[0.95] text-white font-climax">
              <span className="block" style={{ animation: "fadeUp 500ms ease-out 0ms backwards" }}>Think.</span>
              <span className="block" style={{ animation: "fadeUp 500ms ease-out 150ms backwards" }}>Code.</span>
              <span className="block text-[#f97316]" style={{ animation: "fadeUp 500ms ease-out 300ms backwards" }}>Pray.</span>
            </h1>

            {/* Subtitle Typewriter */}
            <div className="mt-6 mb-8 min-h-[30px] flex items-center justify-start w-full">
              <Typewriter />
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-4 flex-wrap">
              <Link
                href="/join"
                className="inline-flex flex-row items-center justify-center px-8 py-4 text-lg font-bold text-black bg-[#f97316] rounded-xl hover:bg-[#ea580c] transition-all duration-200 shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:shadow-[0_0_50px_rgba(249,115,22,0.5)]"
              >
                Join a Contest
                <span className="inline-block ml-2 transition-transform hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex flex-row items-center justify-center px-8 py-4 text-lg font-semibold text-[#f97316] border border-[rgba(249,115,22,0.4)] rounded-xl hover:bg-[rgba(249,115,22,0.08)] transition-all duration-200"
              >
                🏆 Leaderboard
              </Link>
            </div>
          </div>
        </div>

        {/* Organised By Bar */}
        <div className="w-full border-t border-[#111] bg-[#080808] py-0 flex flex-wrap items-center justify-center gap-5 px-6 md:px-0 mt-2 mb-16 ">
          <span className="text-[#444] text-[50px] font-medium tracking-wide">Organized By</span>
          <img src="./Assets/Nexus logo.webp" alt="Nexus" className="h-[120px] w-auto shrink-0" />
          <span className="text-[#444] text-[50px] font-medium tracking-wide">For</span>
          <img src="./Assets/avishkar logo.webp" alt="Avishkar" className="h-[200px] w-auto shrink-0" />
        </div>

        {/* Rules Section (Terminal) */}
        <div className="relative z-10 mb-20 px-6 w-full">
          <h2 className="text-white text-3xl font-bold mb-8 text-center tracking-tight">Contest Rules</h2>
          <div className="max-w-[640px] mx-auto bg-[#0d0d0d] border border-[#222] rounded-xl shadow-2xl overflow-hidden w-full">
            <div className="h-[36px] bg-[#161616] border-b border-[#1a1a1a] flex items-center justify-between min-w-[300px]">
              <div className="flex items-center gap-1.5 ml-4 shrink-0">
                <div className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]" />
                <div className="w-[10px] h-[10px] rounded-full bg-[#febc2e]" />
                <div className="w-[10px] h-[10px] rounded-full bg-[#28c840]" />
              </div>
              <div className="text-[#888] text-[12px] font-mono mr-4 tracking-wider shrink-0 overflow-hidden text-right">// contest_rules.js</div>
            </div>
            <div className="p-6 md:p-8 overflow-x-auto custom-scrollbar w-full">
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
                    <div key={idx} className="flex items-start hover:bg-[rgba(255,255,255,0.02)] transition-colors py-1.5 px-2 rounded-md whitespace-nowrap">
                      <div className="text-[#444] text-[14px] font-mono min-w-[32px] select-none">{(idx + 1).toString().padStart(2, '0')}</div>
                      <div className={`text-[14px] font-mono ${isWarning ? 'text-[#f97316]' : 'text-[#b0b0b0]'}`}>{rule}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#1a1a1a] px-6 lg:px-[48px] py-[24px] w-full shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[13px] text-[#71717a] gap-4">
          <div>Organized by Nexus For Avishkar 2026 </div>
          <div className="italic">Built for competitors.</div>
        </div>
      </footer>

    </div>
  );
}
