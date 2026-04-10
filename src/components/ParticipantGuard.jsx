"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getParticipant } from "@/lib/participants";
import { Loader2 } from "lucide-react";

export default function ParticipantGuard({ children }) {
  const router = useRouter();
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    const validateParticipant = async () => {
      try {
        const participantId = localStorage.getItem("participantId");
        if (!participantId) {
          router.replace("/join");
          return;
        }

        const participant = await getParticipant(participantId);
        if (!participant) {
          // Corrupted state, participant doc missing
          localStorage.removeItem("participantId");
          router.replace("/join");
          return;
        }

        // All good
        setIsValidated(true);
      } catch (error) {
        console.error("Error verifying participant:", error);
        localStorage.removeItem("participantId");
        router.replace("/join");
      }
    };

    validateParticipant();
  }, [router]);

  if (!isValidated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-[#71717a] animate-spin" />
        <p className="text-[#71717a] text-sm">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
