"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getParticipant } from "@/lib/participants";
import { listenToContestConfig } from "@/lib/contest";
import { Loader2 } from "lucide-react";

export default function LobbyGuard({ children }) {
  const router = useRouter();
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    let unsubConfig = null;

    const validateParticipant = async () => {
      try {
        const participantId = localStorage.getItem("participantId");
        if (!participantId) {
          router.replace("/join");
          return;
        }

        const participant = await getParticipant(participantId);
        if (!participant) {
          localStorage.removeItem("participantId");
          router.replace("/join");
          return;
        }

        unsubConfig = listenToContestConfig((config) => {
           if (config.phase === "idle") {
               router.replace("/join");
           } else if (config.phase === "active") {
               router.replace("/contest");
           } else if (config.phase === "ended") {
               router.replace("/join?ended=1");
           } else {
               // phase === "joining"
               setIsValidated(true);
           }
        });

      } catch (error) {
        console.error("Error verifying participant for lobby:", error);
        localStorage.removeItem("participantId");
        router.replace("/join");
      }
    };

    validateParticipant();

    return () => {
        if (unsubConfig) unsubConfig();
    };
  }, [router]);

  if (!isValidated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-[#71717a] animate-spin" />
        <p className="text-[#71717a] text-sm">Authenticating lobby...</p>
      </div>
    );
  }

  return <>{children}</>;
}
