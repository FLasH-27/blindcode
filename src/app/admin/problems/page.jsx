"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Pencil, Trash2, Plus } from "lucide-react";

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
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export default function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  
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
    });
    return () => unsubscribe();
  }, []);

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

  const handleDeleteProblem = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this problem?");
    if (confirmed) {
      try {
        await deleteProblem(id);
      } catch (e) {
        console.error("Delete error:", e);
        alert("Failed to delete problem");
      }
    }
  };

  const problemCountInfo = problems.length === 20 ? (
    <span className="bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-xs font-semibold ml-3 border border-green-500/30">
      20 / 20 Set Ready
    </span>
  ) : (
    <span className="bg-red-500/20 text-[#ef4444] px-3 py-1 rounded-full text-xs font-semibold ml-3 border border-red-500/30">
      {problems.length} / 20 Total Warning
    </span>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-white flex items-center">
          Problem Management
          {problemCountInfo}
        </h1>
        
        <Button onClick={handleOpenAddForm}>
          <Plus className="w-4 h-4 mr-2" />
          Add Problem
        </Button>
      </div>

      <div className="bg-[#111] rounded-md border border-[#222]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">#</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {problems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted">
                  No problems configured yet. Add your first problem.
                </TableCell>
              </TableRow>
            ) : (
              problems.map((problem, idx) => (
                <TableRow key={problem.id}>
                  <TableCell className="font-medium text-muted">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="text-white font-medium">
                    {problem.title}
                  </TableCell>
                  <TableCell className="text-muted">
                    {problem.createdAt ? format(problem.createdAt.toDate(), "MMM d, yyyy") : 'Just now'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditForm(problem)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-[#ef4444] hover:text-[#ef4444] hover:bg-[#ef4444]/10" onClick={() => handleDeleteProblem(problem.id)}>
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProblem ? "Edit Problem" : "Add New Problem"}</DialogTitle>
            <DialogDescription>
              {editingProblem ? "Update the problem details below." : "Fill in the details to create a new problem."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-xs uppercase text-[#71717a] font-medium tracking-wider">
                Problem Title
              </label>
              <Input
                id="title"
                placeholder="e.g. Two Sum"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="description" className="text-xs uppercase text-[#71717a] font-medium tracking-wider">
                Problem Statement
              </label>
              <Textarea
                id="description"
                placeholder="Describe the problem..."
                className="h-[120px]"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="examples" className="text-xs uppercase text-[#71717a] font-medium tracking-wider">
                Examples
              </label>
              <Textarea
                id="examples"
                placeholder="Input: ... Output: ..."
                value={formData.examples}
                onChange={(e) => setFormData({ ...formData, examples: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="hints" className="text-xs uppercase text-[#71717a] font-medium tracking-wider">
                Hints
              </label>
              <Textarea
                id="hints"
                placeholder="Hint to show participants..."
                value={formData.hints}
                onChange={(e) => setFormData({ ...formData, hints: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProblem}>
              {editingProblem ? "Save Changes" : "Create Problem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
