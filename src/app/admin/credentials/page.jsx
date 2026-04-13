"use client";

import { useState, useEffect } from "react";
import { Copy, Trash2, Plus, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  generateCredentials,
  listenToCredentials,
  deleteCredential,
  clearAllCredentials
} from "@/lib/credentials";

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const unsubscribe = listenToCredentials((data) => {
      setCredentials(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateCredentials(10); // generate batch of 10
    } catch (error) {
      console.error(error);
      alert("Failed to generate credentials");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this credential? Any participant logged into this ID will lose access if they refresh.")) {
      try {
        await deleteCredential(id);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("CRITICAL WARNING: This will delete ALL credentials and unlink potential existing participants who refresh! Are you absolutely sure?")) {
      try {
        await clearAllCredentials();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#71717a] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-2">Participant Credentials</h1>
      <p className="text-[#71717a] text-sm mb-8">
        Generate strict ID and Password combinations here. Provide these credentials to your students safely. A Participant ID binds to a single coding session.
      </p>

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-4">
            <Button
                onClick={handleGenerate}
                disabled={generating}
                className="bg-[#f97316] hover:bg-[#ea580c] text-black font-semibold"
            >
                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Generate 10 Credentials
            </Button>
            {credentials.length > 0 && (
                <Button
                    onClick={handleClearAll}
                    variant="outline"
                    className="border-red-900/50 hover:bg-red-900/20 text-red-500 hover:text-red-400"
                >
                    Clear All Credentials
                </Button>
            )}
        </div>
        <div className="text-[#71717a] text-sm">
            Total Valid IDs: <span className="text-white font-medium">{credentials.length}</span>
        </div>
      </div>

      <div className="bg-[#111] rounded-lg border border-[#222] overflow-hidden">
        <Table>
            <TableHeader className="bg-[#111]">
                <TableRow className="border-b-[#222]">
                    <TableHead className="w-[80px]">#</TableHead>
                    <TableHead>Participant ID</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {credentials.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-[#71717a]">
                            No credentials generated yet. Click "Generate" to start.
                        </TableCell>
                    </TableRow>
                ) : (
                    credentials.map((cred, idx) => (
                        <TableRow key={cred.id} className="border-b-[#1a1a1a] hover:bg-[#161616]">
                            <TableCell className="text-[#a1a1aa] text-xs">
                                {idx + 1}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-white text-sm bg-[#1a1a1a] px-2 py-1 rounded border border-[#333]">
                                        {cred.id}
                                    </span>
                                    <button 
                                        onClick={() => copyToClipboard(cred.id)}
                                        className="text-[#71717a] hover:text-[#f97316] transition-colors"
                                        title="Copy ID"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-[#a1a1aa] text-sm bg-[#1a1a1a] px-2 py-1 rounded border border-[#333]">
                                        {cred.password}
                                    </span>
                                    <button 
                                        onClick={() => copyToClipboard(cred.password)}
                                        className="text-[#71717a] hover:text-[#f97316] transition-colors"
                                        title="Copy Password"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDelete(cred.id)}
                                    className="h-8 w-8 border-[#333] hover:bg-red-900/30 hover:border-red-900 text-[#71717a] hover:text-red-500"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
      </div>

    </div>
  );
}
