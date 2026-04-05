import Anthropic from "@anthropic-ai/sdk";
import type { PracticeLookupResult } from "./types";

/**
 * Search for Australian radiology practices using Claude with web search.
 * Uses the direct Anthropic API (not Bedrock) since web_search is required.
 */
export async function searchPracticesWithAI(
  query: string
): Promise<{ results: PracticeLookupResult[]; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { results: [], error: "AI search is not configured" };
  }

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ],
      system: `You are a research assistant helping find Australian radiology practice contact details.
Search for the radiology practice specified by the user. Focus on finding:
- Full official name
- Street address
- Phone number
- Fax number
- Email address (especially referral/booking email)

Only search for practices in Australia. Search their official website and medical directories.

After searching, respond with ONLY a JSON array of matching practices. Each entry should have:
{"name": "...", "address": "...", "phone": "...", "fax": "...", "email": "..."}

Use null for any field you cannot find. Return up to 3 results, most relevant first.
Respond with ONLY the JSON array, no other text.`,
      messages: [
        {
          role: "user",
          content: `Find contact details for this Australian radiology practice: "${query}"`,
        },
      ],
    });

    // Extract the final text response (after tool use)
    let responseText = "";
    for (const block of response.content) {
      if (block.type === "text") {
        responseText = block.text;
      }
    }

    if (!responseText) {
      return { results: [], error: "No results found" };
    }

    // Parse JSON from the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { results: [], error: "Could not parse search results" };
    }

    let parsed: Array<{
      name?: string;
      address?: string;
      phone?: string;
      fax?: string;
      email?: string;
    }>;
    try {
      parsed = JSON.parse(jsonMatch[0]) as Array<{
      name?: string;
      address?: string;
      phone?: string;
      fax?: string;
      email?: string;
    }>;
    } catch {
      return { results: [], error: "Search returned invalid data — try a different search term" };
    }

    const results: PracticeLookupResult[] = parsed
      .filter((r) => r.name)
      .map((r) => ({
        name: r.name!,
        address: r.address || undefined,
        phone: r.phone || undefined,
        fax: r.fax || undefined,
        email: r.email || undefined,
        source: "ai_search" as const,
      }));

    return { results };
  } catch (error) {
    console.error("AI practice lookup failed:", error);
    return {
      results: [],
      error: error instanceof Error ? error.message : "Search failed",
    };
  }
}
