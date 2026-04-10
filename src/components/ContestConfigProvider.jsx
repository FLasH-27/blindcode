"use client";

import { useEffect } from "react";
import { ensureContestConfig } from "@/lib/contest";

/**
 * Client component that ensures the /contest/config doc exists on app startup.
 * Wraps children and renders them immediately — the seed runs in background.
 */
export default function ContestConfigProvider({ children }) {
  useEffect(() => {
    ensureContestConfig();
  }, []);

  return <>{children}</>;
}
