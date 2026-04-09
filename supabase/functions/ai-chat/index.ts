import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in Supabase secrets.");
    }

    const { messages, dataContext, listId, userId } = await req.json();

    // ── System prompt ────────────────────────────────────────
    const systemPrompt = `You are a smart data assistant for GTM Unbound, a contact data admin tool.
You help users understand, analyze, and get insights from their contact list.

CURRENT LIST DATA:
${dataContext}

You can respond in two ways:

1. TEXT answer — for questions, analysis, or summaries:
{
  "type": "text",
  "response": "your markdown answer here"
}

2. ACTION — when the user wants to filter or navigate the data:
{
  "type": "action",
  "action": "filter",
  "field": "city" | "country" | "tag" | "search" | "has_email",
  "value": "the value to filter by"
}

Rules:
- Always return valid JSON (no markdown fences, no extra text).
- For filters, pick the most appropriate field.
- For text answers, use markdown formatting (bold, lists, tables).
- Be concise — under 300 words unless the user asks for detail.
- If data is insufficient to answer, say so honestly.`;

    // ── Build Gemini request ──────────────────────────────────
    // Gemini uses "contents" with role "user"/"model"
    const contents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: '{"type":"text","response":"Understood. I am ready to help you analyze your contact data."}' }] },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    ];

    const geminiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", geminiRes.status, errText);
      throw new Error(`Gemini API error ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // ── Parse the JSON response from Gemini ───────────────────
    let parsed: { type: string; response?: string; action?: string; field?: string; value?: string };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Gemini sometimes returns markdown-fenced JSON — strip it
      const cleaned = rawText.replace(/```json\n?|```\n?/g, "").trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // Fallback: treat as plain text answer
        parsed = { type: "text", response: rawText };
      }
    }

    // ── Save messages to chat_history ────────────────────────
    if (userId && listId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const lastUserMsg = messages[messages.length - 1];
      const toInsert = [
        ...(lastUserMsg ? [{ user_id: userId, list_id: listId, message: lastUserMsg.content, role: "user" }] : []),
        {
          user_id: userId,
          list_id: listId,
          message: parsed.type === "text" ? (parsed.response ?? rawText) : JSON.stringify(parsed),
          role: "assistant",
        },
      ];

      await supabase.from("chat_history").insert(toInsert);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({
        type: "text",
        response: `Sorry, something went wrong: ${e instanceof Error ? e.message : "Unknown error"}`,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
