"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";

import { subscribeToProblems, addProblem, updateProblem, deleteProblem } from "@/lib/problems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lcUrl, setLcUrl] = useState("");
  const [fetchingLc, setFetchingLc] = useState(false);

  // Round tab state
  const [activeRound, setActiveRound] = useState(1);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    examples: "",
    hints: "",
    round: 1
  });

  // Subscribe to real-time events
  useEffect(() => {
    const unsubscribe = subscribeToProblems((data) => {
      setProblems(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter problems by active round
  const filteredProblems = useMemo(() => {
    return problems.filter(p => (p.round || 1) === activeRound);
  }, [problems, activeRound]);

  // Per-round counts
  const round1Count = useMemo(() => problems.filter(p => (p.round || 1) === 1).length, [problems]);
  const round2Count = useMemo(() => problems.filter(p => (p.round || 1) === 2).length, [problems]);

  // Reset form when dialog closes/opens
  useEffect(() => {
    if (!isFormOpen && !editingProblem) {
        setFormData({ title: "", description: "", examples: "", hints: "", round: activeRound });
    }
  }, [isFormOpen, editingProblem, activeRound]);

  const handleOpenAddForm = () => {
    setEditingProblem(null);
    setFormData({ title: "", description: "", examples: "", hints: "", round: activeRound });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (problem) => {
    setEditingProblem(problem);
    
    // Auto-clean any lingering markdown artifacts from old records
    const cleanText = (text) => {
        if (!text) return "";
        return text.replace(/\*\*/g, '').replace(/\\\[/g, '[').replace(/\\\]/g, ']').replace(/\\_/g, '_');
    };

    setFormData({
      title: problem.title || "",
      description: cleanText(problem.description),
      examples: cleanText(problem.examples),
      hints: cleanText(problem.hints),
      round: problem.round || 1
    });
    setIsFormOpen(true);
  };

  const handleFetchLeetCode = async () => {
    if (!lcUrl) return;
    setFetchingLc(true);
    try {
      const res = await fetch('/api/leetcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: lcUrl })
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || "Failed to fetch LeetCode problem");
        return;
      }

      setFormData({
        title: data.title || formData.title,
        description: data.description || formData.description,
        examples: data.examples || formData.examples,
        hints: data.hints || formData.hints,
        round: formData.round
      });
      setLcUrl("");
    } catch (err) {
      console.error(err);
      alert("Error fetching LeetCode problem");
    } finally {
      setFetchingLc(false);
    }
  };

  const handleSaveProblem = async () => {
    if (!formData.title || !formData.description) return;
    
    try {
      if (editingProblem) {
        await updateProblem(editingProblem.id, formData);
      } else {
        await addProblem(formData);
      }
      setIsFormOpen(false);
    } catch (e) {
      console.error("Save error:", e);
      alert("Failed to save problem");
    }
  };

  const handleDeleteProblem = async (problem) => {
    const confirmed = window.confirm(`Delete '${problem.title}'? This cannot be undone.`);
    if (confirmed) {
      try {
        await deleteProblem(problem.id);
      } catch (e) {
        console.error("Delete error:", e);
        alert("Failed to delete problem");
      }
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">
          Problem Management
        </h1>
        
        <Button onClick={handleOpenAddForm} className="bg-[#f97316] text-black hover:bg-[#ea580c] font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Add Problem
        </Button>
      </div>

      {/* ── Round Tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-6 bg-[#111] rounded-lg border border-[#222] p-1 w-fit">
        <button
          onClick={() => setActiveRound(1)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeRound === 1
              ? "bg-[#f97316] text-black shadow-sm"
              : "text-[#71717a] hover:text-white hover:bg-[#1a1a1a]"
          }`}
        >
          Round 1
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
            activeRound === 1 
              ? "bg-black/20 text-black" 
              : "bg-[#222] text-[#71717a]"
          }`}>
            {round1Count}
          </span>
        </button>
        <button
          onClick={() => setActiveRound(2)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeRound === 2
              ? "bg-[#f97316] text-black shadow-sm"
              : "text-[#71717a] hover:text-white hover:bg-[#1a1a1a]"
          }`}
        >
          Round 2
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
            activeRound === 2 
              ? "bg-black/20 text-black" 
              : "bg-[#222] text-[#71717a]"
          }`}>
            {round2Count}
          </span>
        </button>
      </div>

      <div className="bg-[#111] rounded-lg border border-[#222] overflow-hidden">
        <div className="max-h-[700px] overflow-y-auto custom-scrollbar">
            <Table>
            <TableHeader className="sticky top-0 bg-[#111] z-10 border-b border-[#222]">
                <TableRow className="hover:bg-transparent border-b-[#222]">
                <TableHead className="w-[80px]">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Round</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-[#71717a] mx-auto" />
                        </TableCell>
                    </TableRow>
                ) : filteredProblems.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-[#71717a]">
                    No problems for Round {activeRound} yet. Add your first problem.
                    </TableCell>
                </TableRow>
                ) : (
                filteredProblems.map((problem, idx) => (
                    <TableRow key={problem.id} className="border-b-[#1a1a1a] hover:bg-[#161616]">
                    <TableCell className="font-medium text-[#71717a] text-xs">
                        {idx + 1}
                    </TableCell>
                    <TableCell className="text-white font-medium">
                        {problem.title}
                    </TableCell>
                    <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          (problem.round || 1) === 1
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        }`}>
                          R{problem.round || 1}
                        </span>
                    </TableCell>
                    <TableCell className="text-[#71717a] text-sm tabular-nums">
                        {problem.createdAt ? format(problem.createdAt.toDate(), "MMM d, yyyy") : 'Just now'}
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditForm(problem)} className="text-[#71717a] hover:text-white hover:bg-[#222]">
                            <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-[#ef4444]/70 hover:text-[#ef4444] hover:bg-[#ef4444]/10" onClick={() => handleDeleteProblem(problem)}>
                            <Trash2 className="w-4 h-4" />
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-[#111] border-[#222] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">{editingProblem ? "Edit Problem" : "Add New Problem"}</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              {editingProblem ? "Update the problem details below." : "Fill in the details to create a new problem."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {!editingProblem && (
                <div className="flex items-center gap-3 bg-[#161616] p-3 rounded-md border border-[#222]">
                  <Input 
                    placeholder="https://leetcode.com/problems/two-sum/"
                    value={lcUrl}
                    onChange={(e) => setLcUrl(e.target.value)}
                    className="bg-[#0a0a0a] border-[#333] text-sm h-9 focus-visible:ring-[#f97316]"
                  />
                  <Button 
                    onClick={handleFetchLeetCode} 
                    disabled={fetchingLc || !lcUrl}
                    variant="outline"
                    className="h-9 whitespace-nowrap bg-[#1a1a1a] text-[#d4d4d4] border-[#333] hover:text-white hover:bg-[#222]"
                  >
                    {fetchingLc ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Auto-Fill
                  </Button>
                </div>
            )}

            {/* ── Round Selector ───────────────────────────────────── */}
            <div className="grid gap-2">
              <label className="text-xs uppercase text-[#71717a] font-bold tracking-wider">
                Round
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, round: 1 })}
                  className={`flex-1 py-2 rounded-md text-sm font-medium border transition-all ${
                    formData.round === 1
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                      : "bg-[#0a0a0a] text-[#71717a] border-[#222] hover:text-white hover:border-[#333]"
                  }`}
                >
                  Round 1
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, round: 2 })}
                  className={`flex-1 py-2 rounded-md text-sm font-medium border transition-all ${
                    formData.round === 2
                      ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                      : "bg-[#0a0a0a] text-[#71717a] border-[#222] hover:text-white hover:border-[#333]"
                  }`}
                >
                  Round 2
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="title" className="text-xs uppercase text-[#71717a] font-bold tracking-wider">
                Problem Title
              </label>
              <Input
                id="title"
                placeholder="e.g. Two Sum"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-[#0a0a0a] border-[#222] text-white focus-visible:ring-[#f97316]"
                autoFocus
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="description" className="text-xs uppercase text-[#71717a] font-bold tracking-wider">
                Problem Statement
              </label>
              <Textarea
                id="description"
                placeholder="Describe the problem..."
                className="h-[120px] bg-[#0a0a0a] border-[#222] text-white focus-visible:ring-[#f97316] resize-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <label htmlFor="examples" className="text-xs uppercase text-[#71717a] font-bold tracking-wider">
                        Examples
                    </label>
                    <Textarea
                        id="examples"
                        placeholder="Input: ... Output: ..."
                        className="h-[100px] bg-[#0a0a0a] border-[#222] text-white focus-visible:ring-[#f97316] resize-none"
                        value={formData.examples}
                        onChange={(e) => setFormData({ ...formData, examples: e.target.value })}
                    />
                </div>

                <div className="grid gap-2">
                    <label htmlFor="hints" className="text-xs uppercase text-[#71717a] font-bold tracking-wider">
                        Hints
                    </label>
                    <Textarea
                        id="hints"
                        placeholder="Hint to show participants..."
                        className="h-[100px] bg-[#0a0a0a] border-[#222] text-white focus-visible:ring-[#f97316] resize-none"
                        value={formData.hints}
                        onChange={(e) => setFormData({ ...formData, hints: e.target.value })}
                    />
                </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} className="border-[#222] text-white">
              Cancel
            </Button>
            <Button onClick={handleSaveProblem} className="bg-[#f97316] text-black hover:bg-[#ea580c] font-semibold">
              {editingProblem ? "Save Changes" : "Create Problem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
