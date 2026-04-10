"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import ParticipantGuard from "@/components/ParticipantGuard";
import { getParticipant, getProblem, listenToContest, updateCode } from "@/lib/participants";
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
    });
    
    return () => unsubscribe();
  }, []);

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
      <div className="h-[48px] bg-[#111] border-b border-[#222] flex items-center justify-between px-6 shrink-0 relative z-10">
        <div className="text-[#f97316] text-[14px] font-semibold">Blind Code</div>
        <div className="text-[#71717a] text-[13px]">{participant?.name}</div>
        <div className="text-[#71717a] text-[12px] tabular-nums">{formatLastSaved()}</div>
      </div>

      {/* Main Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-[40%] bg-[#0f0f0f] border-r border-[#222] flex flex-col">
          <div className="h-[40px] bg-[#111] border-b border-[#1a1a1a] flex">
            {["Description", "Examples", "Hints"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 text-[13px] h-full flex items-center justify-center border-b-2 transition-colors ${
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
          {/* Language Selector overlaying editor */}
          <div className="absolute top-2 right-4 z-10">
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-[#2d2d2d] text-[#d4d4d4] text-[12px] py-1 px-2 border border-[#3e3e42] rounded focus:outline-none focus:border-[#f97316]"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
            </select>
          </div>
          
          <div className="flex-1 pt-10">
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
                readOnly: contestStatus === "ended"
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
