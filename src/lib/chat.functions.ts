import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ACTIVITIES, nextDate } from "./data";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
});

function libraryContext() {
  return ACTIVITIES.map((a) => {
    const n = nextDate(a);
    return {
      id: a.id,
      title: a.title,
      venue: a.venue,
      neighborhood: a.neighborhood,
      borough: a.borough,
      category: a.category,
      priceTier: a.priceTier,
      status: a.status,
      tags: a.tags,
      nextDate: n?.startsAt ?? null,
      kind: a.kind,
    };
  });
}

export const askConcierge = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        text: "Concierge isn't configured yet — missing Anthropic API key.",
        cards: [] as string[],
        error: "missing_key",
      };
    }

    const today = new Date().toISOString();
    const library = libraryContext();

    const systemPrompt = `You are a painterly NYC activity concierge for a personal "things to do" library.
The user has bookmarked the activities listed below in JSON. Help them pick what to do based on mood, weather, budget, neighborhood, dates, or vibe.

Rules:
- Only recommend activities that exist in the LIBRARY below. Never invent new ones.
- Pick up to 3 activities that best fit the request. Fewer is fine.
- Reply in 1-2 short, warm sentences. No bullet lists, no markdown. The UI will render the picks as cards beneath your reply.
- If nothing fits, say so plainly and suggest a related angle they could try.
- Use the "recommend" tool to return your picks. Always call the tool, even when picks is empty.

TODAY: ${today}

LIBRARY (JSON):
${JSON.stringify(library)}`;

    const validIds = new Set(library.map((a) => a.id));

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 600,
          system: systemPrompt,
          tools: [
            {
              name: "recommend",
              description: "Return a short reply to the user along with the activity IDs to surface as cards.",
              input_schema: {
                type: "object",
                properties: {
                  reply: {
                    type: "string",
                    description: "1-2 sentence warm reply. No markdown, no lists.",
                  },
                  picks: {
                    type: "array",
                    description: "Up to 3 activity IDs from the LIBRARY.",
                    items: { type: "string" },
                    maxItems: 3,
                  },
                },
                required: ["reply", "picks"],
              },
            },
          ],
          tool_choice: { type: "tool", name: "recommend" },
          messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error("Anthropic API error", res.status, body);
        return {
          text:
            res.status === 429
              ? "The concierge is a little overwhelmed — try again in a moment."
              : "The concierge couldn't think straight just now. Try again?",
          cards: [] as string[],
          error: `http_${res.status}`,
        };
      }

      const json = (await res.json()) as {
        content?: Array<
          | { type: "text"; text: string }
          | { type: "tool_use"; name: string; input: { reply?: string; picks?: string[] } }
        >;
      };

      const toolBlock = json.content?.find(
        (b): b is { type: "tool_use"; name: string; input: { reply?: string; picks?: string[] } } =>
          b.type === "tool_use" && b.name === "recommend",
      );

      const reply =
        toolBlock?.input.reply?.trim() ||
        json.content?.find((b): b is { type: "text"; text: string } => b.type === "text")?.text?.trim() ||
        "Here's what I came up with.";

      const picks = (toolBlock?.input.picks ?? []).filter((id) => validIds.has(id)).slice(0, 3);

      return { text: reply, cards: picks, error: null as string | null };
    } catch (err) {
      console.error("askConcierge failed", err);
      return {
        text: "Something went wrong reaching the concierge. Try again in a sec.",
        cards: [] as string[],
        error: "exception",
      };
    }
  });