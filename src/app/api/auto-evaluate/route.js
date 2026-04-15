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

    // 3. Setup API Keys for Rotation
    const geminiKeysRaw = process.env.GEMINI_API_KEYS || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
    const geminiKeys = geminiKeysRaw.split(",").map(k => k.trim()).filter(Boolean);

    const groqKeysRaw = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
    const groqKeys = groqKeysRaw.split(",").map(k => k.trim()).filter(Boolean);

    if (geminiKeys.length === 0 && groqKeys.length === 0) {
      return NextResponse.json({ error: 'No API Keys configured in environment variables' }, { status: 500 });
    }

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

    // ── Key Rotation Fallback ──────────────────────────────────────────────
    // Creates a combined sequence of API keys to attempt one by one.
    // If one hits a rate limit, it seamlessly moves to the next key.
    // ─────────────────────────────────────────────────────────────────────────
    const allEndpoints = [
      ...geminiKeys.map(key => ({ provider: 'gemini', key })),
      ...groqKeys.map(key => ({ provider: 'groq', key }))
    ];

    let evaluationData = null;
    let lastError = null;

    for (let i = 0; i < allEndpoints.length; i++) {
        const { provider, key } = allEndpoints[i];
        try {
            if (provider === 'gemini') {
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const result = await model.generateContent({
                  contents: [{ role: "user", parts: [{ text: prompt }] }],
                  generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.1,
                  },
                });
                evaluationData = JSON.parse(result.response.text());
            } else {
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    model: "llama3-8b-8192", 
                    response_format: { type: "json_object" }, 
                    temperature: 0.1,
                  })
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`Groq API error: ${response.status} - ${errorText}`);
                }

                const data = await response.json();
                evaluationData = JSON.parse(data.choices[0].message.content);
            }
            
            console.log(`[auto-evaluate] Success with ${provider} key #${i + 1} for ${participantId}`);
            break; // ✓ success

        } catch (err) {
            lastError = err;
            const isRateLimit = 
              err?.status === 429 || 
              err?.message?.includes("429") || 
              err?.message?.includes("403") || 
              err?.message?.toLowerCase().includes("quota") || 
              err?.message?.toLowerCase().includes("rate");

            if (isRateLimit) {
                console.warn(`[auto-evaluate] Rate limit on ${provider} key #${i + 1}. Switching to next...`);
                continue; // try next key inline instantly
            } else {
                console.error(`[auto-evaluate] Fatal error with ${provider} key #${i + 1}:`, err.message);
                throw err; // non-ratelimit error, we should crash out and expose the syntax/parsing issue
            }
        }
    }

    if (!evaluationData) {
      throw lastError || new Error("Evaluation failed across all provided API keys!");
    }

    // 4. Persist evaluation to Firestore → leaderboard updates via onSnapshot
    await updateDoc(participantRef, { evaluation: evaluationData });

    return NextResponse.json({ message: 'Evaluation complete', evaluation: evaluationData });

  } catch (err) {
    console.error("Auto-evaluation error:", err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

