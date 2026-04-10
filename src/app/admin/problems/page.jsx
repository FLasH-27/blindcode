"use client";

import { useState, useEffect } from "react";
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
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    examples: "",
    hints: ""
  });

  // Subscribe to real-time events
  useEffect(() => {
    const unsubscribe = subscribeToProblems((data) => {
      setProblems(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Reset form when dialog closes/opens
  useEffect(() => {
    if (!isFormOpen && !editingProblem) {
        setFormData({ title: "", description: "", examples: "", hints: "" });
    }
  }, [isFormOpen, editingProblem]);

  const handleOpenAddForm = () => {
    setEditingProblem(null);
    setFormData({ title: "", description: "", examples: "", hints: "" });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (problem) => {
    setEditingProblem(problem);
    setFormData({
      title: problem.title || "",
      description: problem.description || "",
      examples: problem.examples || "",
      hints: problem.hints || ""
    });
    setIsFormOpen(true);
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

  const problemCountInfo = (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ml-3 border ${
        problems.length >= 20 
        ? "bg-green-500/10 text-green-500 border-green-500/20" 
        : "bg-orange-500/10 text-[#f97316] border-orange-500/20"
    }`}>
      {problems.length} / 20 Problems
    </span>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-white flex items-center">
          Problem Management
          {problemCountInfo}
        </h1>
        
        <Button onClick={handleOpenAddForm} className="bg-[#f97316] text-black hover:bg-[#ea580c] font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Add Problem
        </Button>
      </div>

      <div className="bg-[#111] rounded-lg border border-[#222] overflow-hidden">
        <div className="max-h-[700px] overflow-y-auto custom-scrollbar">
            <Table>
            <TableHeader className="sticky top-0 bg-[#111] z-10 border-b border-[#222]">
                <TableRow className="hover:bg-transparent border-b-[#222]">
                <TableHead className="w-[80px]">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-[#71717a] mx-auto" />
                        </TableCell>
                    </TableRow>
                ) : problems.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-[#71717a]">
                    No problems configured yet. Add your first problem.
                    </TableCell>
                </TableRow>
                ) : (
                problems.map((problem, idx) => (
                    <TableRow key={problem.id} className="border-b-[#1a1a1a] hover:bg-[#161616]">
                    <TableCell className="font-medium text-[#71717a] text-xs">
                        {idx + 1}
                    </TableCell>
                    <TableCell className="text-white font-medium">
                        {problem.title}
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
