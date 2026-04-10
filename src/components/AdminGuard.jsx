"use client";

import { useState, useEffect } from "react";
import { checkAdminAuth, loginAdmin } from "@/lib/adminAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminGuard({ children }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsAuthed(checkAdminAuth());
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginAdmin(password)) {
      setIsAuthed(true);
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  if (!mounted) return null;

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-[#111] border border-[#222] rounded-lg p-8 w-full max-w-[380px]">
          <h1 className="text-white text-base font-semibold mb-1">Admin Access</h1>
          <p className="text-[#71717a] text-sm mb-6">Enter the admin password to continue</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus-visible:ring-[#f97316]"
                autoFocus
              />
              {error && <p className="text-red-500 text-xs">{error}</p>}
            </div>
            
            <Button 
              type="submit"
              className="w-full bg-[#f97316] hover:bg-[#c2410c] text-black font-semibold"
            >
              Enter
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return children;
}
