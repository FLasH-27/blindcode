import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const { code, language, problemTitle, problemDescription, examples } = await req.json();

    if (!code || !problemTitle || !problemDescription) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key is missing in environment variables' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Using gemini-2.5-flash to avoid 429 quota limits on the Pro tier
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are an expert competitive programming judge for a "Blind Code" competition (participants are not allowed to compile there program and see output). 
Review the participant's code below and evaluate it rigidly against the following rubric.

### Problem Context:
Title: ${problemTitle}
Description:
${problemDescription}
Examples:
${examples || "No examples provided."}

### Participant Submission:
Language: ${language || "javascript"}
Code:
\`\`\`${language || "javascript"}
${code}
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
  "totalScore": number, // This must be exactly: executionScore + complexityScore + logicScore + errorScore
  "feedback": "A very brief 1-2 sentence feedback explaining the score reduction or praising perfect code."
}
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    const responseText = result.response.text();
    let evaluationData;

    try {
      evaluationData = JSON.parse(responseText);
    } catch (e) {
      throw new Error("Failed to parse Gemini output as JSON: " + responseText);
    }

    return NextResponse.json(evaluationData);

  } catch (err) {
    console.error("Evaluation error:", err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
