import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

// Initialize Firebase (reuse if already initialized)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export async function POST(req) {
  try {
    const { participantId } = await req.json();

    if (!participantId) {
      return NextResponse.json({ error: 'Missing participantId' }, { status: 400 });
    }

    // 1. Fetch participant data from Firestore
    const participantRef = doc(db, "participants", participantId);
    const participantSnap = await getDoc(participantRef);

    if (!participantSnap.exists()) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    const participant = participantSnap.data();

    if (!participant.code || !participant.problemId) {
      return NextResponse.json({ error: 'No code or problem assigned' }, { status: 400 });
    }

    // Skip if already evaluated
    if (participant.evaluation) {
      return NextResponse.json({ 
        message: 'Already evaluated', 
        evaluation: participant.evaluation 
      });
    }

    // 2. Fetch the problem data
    const problemRef = doc(db, "problems", participant.problemId);
    const problemSnap = await getDoc(problemRef);

    if (!problemSnap.exists()) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    const problem = problemSnap.data();

    // 3. Build Gemini prompt
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key is missing' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are an expert competitive programming judge for a "Blind Code" competition (participants are not allowed to compile there program and see output). 
Review the participant's code below and evaluate it rigidly against the following rubric.

### Problem Context:
Title: ${problem.title}
Description:
${problem.description}
Examples:
${problem.examples || "No examples provided."}

### Participant Submission:
Language: ${participant.language || "javascript"}
Code:
\`\`\`${participant.language || "javascript"}
${participant.code}
\`\`\`

### Grading Rubric (Total 100 Points):
1. **executionScore (out of 60 points)**: Simulate the code execution mentally against edge cases and the examples. If it perfectly solves the logic with zero flaws, award 60. If it partially works, deduct appropriately. If the logic fails entirely or throws crash-level fatal runtime errors everywhere, award 0.
2. **complexityScore (out of 10 points)**: Evaluate the Time and Space complexity of their attempt against the optimal approach. Rate out of 10.
3. **logicScore (out of 10 points)**: Evaluate the cleanliness, variable naming, and logical flow of the code. Rate out of 10.
4. **errorScore (out of 20 points)**: Start with 20 points. Identify syntax and runtime bugs. Deduct 1 point for low severity errors (e.g. missing semicolons, minor typos) and 5+ points for high severity errors (e.g. fatal infinite loops, massive memory leaks, undefined variables breaking the script). If the code is perfectly bug-free, award the full 20 points.

### Output Requirements:
You MUST output strictly in JSON using the exact schema below. Do NOT output any markdown blocks (like \`\`\`json). Just the raw JSON string.
{
  "executionScore": number,
  "complexityScore": number,
  "logicScore": number,
  "errorScore": number,
  "totalScore": number,
  "feedback": "A very brief 1-2 sentence feedback explaining the score reduction or praising perfect code."
}
    `;

    // ── Exponential backoff retry ─────────────────────────────────────────────
    //
    // When many participants submit simultaneously, Gemini may return 429
    // (rate limit). Each participant's evaluation is fully independent —
    // they run in parallel — but we retry individually on failure so no one
    // silently loses their score.
    //
    // Schedule:  attempt 1 → wait 2s+jitter
    //            attempt 2 → wait 4s+jitter
    //            attempt 3 → wait 8s+jitter
    //            attempt 4 → hard fail
    //
    // The ±500ms random jitter prevents a "thundering herd" where all
    // simultaneous retries hit Gemini again at exactly the same moment.
    // ─────────────────────────────────────────────────────────────────────────
    const MAX_RETRIES = 4;
    const BASE_DELAY_MS = 2000;

    let evaluationData = null;
    let lastError = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        evaluationData = JSON.parse(result.response.text());
        break; // ✓ success — exit retry loop

      } catch (err) {
        lastError = err;

        const isRateLimit =
          err?.status === 429 ||
          err?.message?.includes("429") ||
          err?.message?.toLowerCase().includes("quota") ||
          err?.message?.toLowerCase().includes("rate");

        if (isRateLimit && attempt < MAX_RETRIES - 1) {
          const jitter = Math.random() * 1000; // 0–1000 ms
          const delay = BASE_DELAY_MS * Math.pow(2, attempt) + jitter;
          console.warn(
            `[auto-evaluate] Rate limit for ${participantId}. ` +
            `Retry ${attempt + 1}/${MAX_RETRIES - 1} in ${Math.round(delay)}ms…`
          );
          await new Promise((res) => setTimeout(res, delay));
        } else {
          throw err; // non-rate-limit error or final attempt — bail out
        }
      }
    }

    if (!evaluationData) {
      throw lastError || new Error("Evaluation failed after all retries");
    }

    // 4. Persist evaluation to Firestore → leaderboard updates via onSnapshot
    await updateDoc(participantRef, { evaluation: evaluationData });

    return NextResponse.json({ message: 'Evaluation complete', evaluation: evaluationData });

  } catch (err) {
    console.error("Auto-evaluation error:", err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
