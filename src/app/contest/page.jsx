"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import ParticipantGuard from "@/components/ParticipantGuard";
import { getParticipant, getProblem, listenToContest, updateCode, updateLanguage, logTabSwitch, submitContestEarly } from "@/lib/participants";
import { Loader2 } from "lucide-react";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

function ContestPage() {
  const [participant, setParticipant] = useState(null);
  const [problem, setProblem] = useState(null);
  const [contestStatus, setContestStatus] = useState("idle");
  const [activeTab, setActiveTab] = useState("Description");
  
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Tab switch logic
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);

  // Timer logic
  const [endsAt, setEndsAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  // Debouncing logic
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const pId = localStorage.getItem("participantId");
        if(!pId) return;

        const pData = await getParticipant(pId);
        if(pData) {
          setParticipant(pData);
          setCode(pData.code || "");
          setLanguage(pData.language || "javascript");
          if(pData.lastSavedAt) {
              setLastSaved(pData.lastSavedAt.toDate());
          }
          if(pData.submittedAt) {
              setIsSubmitted(true);
          }
          setTabSwitchCount(pData.tabSwitchCount || 0);
          
          const probData = await getProblem(pData.problemId);
          setProblem(probData);
          setIsReady(true);
        }
      } catch (error) {
        console.error("Error initializing contest page:", error);
      }
    };
    init();

    const unsubscribe = listenToContest((data) => {
        setContestStatus(data.status);
        if (data.endsAt) {
          setEndsAt(data.endsAt);
        } else {
          setEndsAt(null);
        }
    });
    
    return () => unsubscribe();
  }, []);

  // Timer Effect
  useEffect(() => {
    if (contestStatus !== "active" || !endsAt) {
      setTimeLeft(null);
      return;
    }
    
    const interval = setInterval(() => {
      const now = Date.now();
      const end = typeof endsAt === 'number' ? endsAt : (endsAt.toDate ? endsAt.toDate().getTime() : new Date(endsAt).getTime());
      const remaining = Math.max(0, end - now);
      
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        setContestStatus("ended"); // Optimistic update
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [contestStatus, endsAt]);

  // Tab Switch Effect
  useEffect(() => {
    if (contestStatus !== "active") return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const pId = localStorage.getItem("participantId");
        if (pId) logTabSwitch(pId);
        
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          setShowBanner(true);
          return newCount;
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [contestStatus]);

  // Banner fade out
  useEffect(() => {
    if (showBanner && tabSwitchCount < 3) {
      const t = setTimeout(() => setShowBanner(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showBanner, tabSwitchCount]);

  const handleEditorChange = (value) => {
    setCode(value);
    setIsSaving(true);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const pId = localStorage.getItem("participantId");
        await updateCode(pId, value);
        setLastSaved(new Date()); 
      } catch (err) {
        console.error("Save failed", err);
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  };

  const formatLastSaved = () => {
    if (isSaving) return "Saving...";
    if (!lastSaved) return "Not saved yet";
    
    // hh:mm:ss.ms
    const pad = (n) => n.toString().padStart(2, '0');
    const h = pad(lastSaved.getHours());
    const m = pad(lastSaved.getMinutes());
    const s = pad(lastSaved.getSeconds());
    const ms = lastSaved.getMilliseconds().toString().padStart(3, '0');
    return `Last saved: ${h}:${m}:${s}.${ms}`;
  };

  const formatTimer = (ms) => {
    if (ms === null || ms < 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSubmitEarly = async () => {
    if (window.confirm("Are you sure you want to submit? You won't be able to edit your code anymore.")) {
      try {
        const pId = localStorage.getItem("participantId");
        await submitContestEarly(pId);
        setIsSubmitted(true);
      } catch (err) {
        console.error("Submit failed", err);
      }
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-[#71717a] animate-spin" />
        <p className="text-[#71717a] text-sm">Loading problem...</p>
      </div>
    );
  }

  const renderTabContent = () => {
    if (!problem) return null;
    let content = "";
    if (activeTab === "Description") content = problem.description;
    if (activeTab === "Examples") content = problem.examples;
    if (activeTab === "Hints") content = problem.hints;

    return (
      <div className="whitespace-pre-wrap font-sans text-[#d4d4d4] text-[14px] leading-[1.7]">
        {content}
      </div>
    );
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0a0a0a]">
      {/* Topbar */}
      <div className="h-[48px] bg-[#111] border-b border-[#222] flex items-center justify-between px-6 shrink-0 relative z-10 w-full">
        <div className="flex items-center gap-4 w-1/3">
          <div className="text-[#f97316] text-[14px] font-semibold">Blind Code</div>
          <div className="text-[#71717a] text-[13px]">{participant?.name}</div>
        </div>
        
        <div className="w-1/3 flex justify-center">
          <div className="text-[#71717a] text-[12px] tabular-nums">{formatLastSaved()}</div>
        </div>
        
        <div className="w-1/3 flex justify-end items-center gap-4">
          {contestStatus === "active" && !isSubmitted && (
            <button
              onClick={handleSubmitEarly}
              className="px-4 py-1.5 bg-[#f97316] text-black text-[13px] font-semibold rounded hover:bg-[#ea580c] transition-colors focus:ring-1 focus:ring-orange-500 focus:outline-none"
            >
              Submit
            </button>
          )}
          {timeLeft !== null && contestStatus === "active" && (
            <div className={`tabular-nums font-mono text-[14px] font-semibold flex items-center 
                ${timeLeft <= 60000 ? 'text-red-500 animate-pulse' : timeLeft <= 300000 ? 'text-red-500' : 'text-white'}`}>
              {formatTimer(timeLeft)}
            </div>
          )}
        </div>
      </div>

      {/* Warning Banner */}
      {showBanner && (
        <div className="bg-[#1c0a0a] border-b border-[#7f1d1d] py-2 px-4 shadow-sm text-center shrink-0 z-10 animate-in slide-in-from-top-2">
          <p className="text-[#ef4444] text-[13px] font-medium">
            {tabSwitchCount >= 3 
              ? "⚠ Multiple tab switches detected. Your activity has been flagged."
              : "⚠ Tab switch detected. This has been logged."}
          </p>
        </div>
      )}

      {/* Main Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-[40%] bg-[#0f0f0f] border-r border-[#222] flex flex-col">
          <div className="h-[40px] bg-[#111] border-b border-[#1a1a1a] flex shrink-0">
            {["Description", "Examples", "Hints"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 text-[13px] h-full flex items-center justify-center border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500 focus-visible:-outline-offset-2 ${
                  activeTab === tab 
                    ? "text-white border-[#f97316]" 
                    : "text-[#71717a] border-transparent hover:text-[#a1a1aa]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === "Description" && <h2 className="text-white text-lg font-bold mb-4">{problem?.title}</h2>}
            {renderTabContent()}
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-[60%] flex flex-col bg-[#1e1e1e] relative">
          {/* Minimal Language Selector */}
          <div className="absolute top-2 right-4 z-10">
            <select 
              value={language}
              onChange={(e) => {
                const newLang = e.target.value;
                setLanguage(newLang);
                if (participant?.id) {
                  updateLanguage(participant.id, newLang).catch(console.error);
                }
              }}
              className="bg-transparent text-[#a1a1aa] hover:text-white text-[12px] py-1 pl-2 pr-6 border border-transparent rounded cursor-pointer transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#f97316] appearance-none"
              style={{
                backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a1a1aa%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 6px center'
              }}
            >
              <option value="python" className="bg-[#2d2d2d] text-[#d4d4d4]">Python</option>
              <option value="java" className="bg-[#2d2d2d] text-[#d4d4d4]">Java</option>
              <option value="cpp" className="bg-[#2d2d2d] text-[#d4d4d4]">C++</option>
            </select>
          </div>
          
          <div className="flex-1 min-h-0 relative h-full w-full pt-10">
            <Editor
              height="100%"
              theme="vs-dark"
              language={language}
              value={code}
              onChange={handleEditorChange}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                readOnly: contestStatus === "ended" || isSubmitted,
                quickSuggestions: false,
                suggestOnTriggerCharacters: false,
                acceptSuggestionOnEnter: "off",
                tabCompletion: "off",
                wordBasedSuggestions: "off",
                parameterHints: { enabled: false },
                hover: { enabled: false },
                lightbulb: { enabled: false },
                inlayHints: { enabled: false },
                renderValidationDecorations: "off"
              }}
            />
          </div>
        </div>
      </div>

      {/* Contest Ended Overlay */}
      {contestStatus === "ended" && (
        <div className="absolute inset-0 z-50 bg-[rgba(0,0,0,0.85)] flex flex-col items-center justify-center">
          <h2 className="text-white text-[24px] font-semibold mb-2">Contest Ended</h2>
          <p className="text-[#71717a] text-[14px] mb-4">Your code has been saved.</p>
          <p className="text-[#f97316] text-[13px]">{formatLastSaved()}</p>
        </div>
      )}
      {/* Submitted Early Overlay */}
      {isSubmitted && contestStatus !== "ended" && (
        <div className="absolute inset-0 z-50 bg-[rgba(0,0,0,0.85)] flex flex-col items-center justify-center">
          <h2 className="text-white text-[24px] font-semibold mb-2">Submitted Successfully</h2>
          <p className="text-[#71717a] text-[14px] mb-4">You have submitted your code early. Please wait for the contest to end.</p>
          <p className="text-[#f97316] text-[13px]">{formatLastSaved()}</p>
        </div>
      )}
    </div>
  );
}

export default function ContestPageWrapper() {
  return (
    <ParticipantGuard>
      <ContestPage />
    </ParticipantGuard>
  );
}
