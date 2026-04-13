import { NextResponse } from 'next/server';
import TurndownService from 'turndown';

const LEETCODE_API_ENDPOINT = 'https://leetcode.com/graphql';

const QUERY = `
  query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      title
      content
      hints
    }
  }
`;

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Extract titleSlug from URL: https://leetcode.com/problems/two-sum/ -> two-sum
    const match = url.match(/leetcode\.com\/problems\/([^/]+)/);
    if (!match || !match[1]) {
      return NextResponse.json({ error: 'Invalid LeetCode URL' }, { status: 400 });
    }
    const titleSlug = match[1];

    const response = await fetch(LEETCODE_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { titleSlug },
      }),
    });

    const data = await response.json();
    if (!data?.data?.question) {
      return NextResponse.json({ error: 'Problem not found on LeetCode' }, { status: 404 });
    }

    const { title, content, hints } = data.data.question;

    const turndownService = new TurndownService({
        codeBlockStyle: 'fenced'
    });
    
    let rawText = turndownService.turndown(content || "");
    
    // Strip bolding asterisks and markdown escaped brackets which look ugly in plain text
    rawText = rawText.replace(/\*\*/g, '');
    rawText = rawText.replace(/\\\[/g, '[');
    rawText = rawText.replace(/\\\]/g, ']');
    rawText = rawText.replace(/\\_/g, '_');
    
    // Attempt to split description and examples
    let description = rawText;
    let examples = "";

    // Leetcode often uses Example 1:
    const exampleTags = ["Example 1:", "### Example 1:", "Example 1"];
    let splitIndex = -1;
    
    for (const tag of exampleTags) {
        const idx = rawText.indexOf(tag);
        if (idx !== -1) {
            splitIndex = idx;
            break;
        }
    }

    if (splitIndex !== -1) {
        description = rawText.substring(0, splitIndex).trim();
        examples = rawText.substring(splitIndex).trim();
    }

    const parsedHints = (hints || []).map(h => turndownService.turndown(h)).join("\n\n");

    return NextResponse.json({
        title: title || "",
        description: description,
        examples: examples,
        hints: parsedHints
    });

  } catch (err) {
    console.error("LeetCode fetch error:", err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
