import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactRecord } from "@/types";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isAction?: boolean;
  exportData?: {
    filename: string;
    csvContent: string;
  };
}

interface AiChatProps {
  records: ContactRecord[];
  listName: string;
  listId: string;
  onFilter: (field: string, value: string) => void;
}

export function AiChat({ records, listName, listId, onFilter }: AiChatProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const buildDataContext = () => {
    const summary = {
      listName,
      totalRecords: records.length,
      topCompanies: Object.entries(
        records.reduce((acc, r) => ({ ...acc, [r.company]: (acc[r.company] || 0) + 1 }), {} as Record<string, number>)
      ).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => `${name} (${count})`),
      topCities: Object.entries(
        records.reduce((acc, r) => ({ ...acc, [r.city]: (acc[r.city] || 0) + 1 }), {} as Record<string, number>)
      ).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => `${name} (${count})`),
      sampleRecords: records.slice(0, 1000).map((r) => ({
        name: r.full_name,
        email: r.email,
        company: r.company,
        title: r.title,
        city: r.city,
        country: r.country,
        tags: r.tags.join(", "),
        ...(typeof r.custom_fields === 'object' && r.custom_fields !== null ? r.custom_fields : {})
      })),
    };
    return JSON.stringify(summary, null, 2);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!GEMINI_API_KEY) {
      toast.error("Gemini API Key is missing in .env");
      setMessages(prev => [...prev, { role: "assistant", content: "Error: Gemini API Key not configured." }]);
      return;
    }
    
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const dataContext = buildDataContext();
      const systemPrompt = `You are a smart data assistant for GTM Unbound.
You help users analyze their contact list.

CURRENT LIST DATA:
${dataContext}

You can respond in three ways (ALWAYS JSON):

1. TEXT answer:
{
  "type": "text",
  "response": "your markdown answer here"
}

2. ACTION:
{
  "type": "action",
  "action": "filter",
  "field": "city" | "country" | "tag" | "search" | "has_email",
  "value": "the value"
}

3. EXPORT DATASET:
If the user specifically asks for a dataset for their use case (e.g. CSV of IT Directors in NY), output a structured CSV format aligned perfectly with their request:
{
  "type": "action",
  "action": "export_csv",
  "filename": "suggested_file_name.csv",
  "csv_data": "Column1,Column2\\nValue1,Value2"
}

Rules:
- Always return valid JSON. Do not wrap in markdown fences.
- Be concise.
- If data is missing, say so.`;

      const contents = [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: '{"type":"text","response":"Understood. How can I help?"}' }] },
        ...updatedMessages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      ];

      let res;
      let retries = 3;
      while (retries > 0) {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              generationConfig: { 
                temperature: 0.3, 
                response_mime_type: "application/json" 
              },
            }),
          }
        );
        
        if (res.ok) break; // Success
        if (res.status === 503) {
          retries--;
          if (retries > 0) {
            await new Promise(r => setTimeout(r, 1500)); // wait 1.5s before retry
            continue;
          }
        }
        
        // If it's not a 503 or we ran out of retries, throw the error
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Gemini API error ${res.status}`);
      }

      if (!res || !res.ok) throw new Error("Failed to get a valid response from Gemini");
      const geminiData = await res.json();
      const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      const parsed = JSON.parse(rawText);

      let assistantContent = "";
      let isAction = false;
      let exportData;

      if (parsed.type === "action" && parsed.action === "filter") {
        onFilter(parsed.field, parsed.value);
        assistantContent = `✓ Applied filter: **${parsed.field}** = *${parsed.value}*`;
        isAction = true;
      } else if (parsed.type === "action" && parsed.action === "export_csv") {
        assistantContent = `✓ Data generated and ready for download: **${parsed.filename}**`;
        exportData = { filename: parsed.filename, csvContent: parsed.csv_data };
        isAction = true;
      } else {
        assistantContent = parsed.response || "No response received.";
      }

      setMessages((prev) => [...prev, { role: "assistant", content: assistantContent, isAction, exportData }]);

      // Save to history in background
      if (user?.id) {
        (supabase.from("chat_history") as any).insert([
          { user_id: user.id, list_id: listId, message: text, role: "user" },
          { user_id: user.id, list_id: listId, message: assistantContent, role: "assistant" },
        ]).then(() => {});
      }

    } catch (err: any) {
      console.error("AI Assistant Error:", err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I had trouble connecting to my brain. Please check your internet or API key." }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = ["Summarize this list", "Top companies?", "Filter by Bangalore"];

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-all flex items-center justify-center sm:h-12 sm:w-12"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed inset-x-4 bottom-24 sm:inset-auto sm:bottom-20 sm:right-6 z-40 sm:w-80 h-[480px] max-h-[70vh] sm:max-h-none bg-background border rounded-xl shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
          <div className="px-4 py-3 border-b bg-accent/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Assistant</h3>
            </div>
            <button onClick={() => setOpen(false)} className="sm:hidden">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">How can I help you today?</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => setInput(s)} className="text-xs text-left p-2 rounded-lg border hover:bg-secondary transition-colors truncate">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] px-3 py-2 rounded-xl text-sm ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
                }`}>
                  {msg.isAction && <div className="flex items-center gap-1 text-[10px] opacity-60 mb-1"><Filter className="h-3 w-3" /> Action</div>}
                  <div className="prose prose-sm max-w-none prose-invert"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                  {msg.exportData && (
                    <Button 
                      className="mt-3 h-7 text-[11px] w-full bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary-foreground" 
                      onClick={() => {
                        const blob = new Blob([msg.exportData!.csvContent], { type: "text/csv" });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = msg.exportData!.filename;
                        a.click();
                        window.URL.revokeObjectURL(url);
                      }}
                    >
                      Download {msg.exportData.filename}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {loading && <div className="flex justify-start"><div className="bg-secondary px-3 py-2 rounded-xl"><Loader2 className="h-4 w-4 animate-spin opacity-50" /></div></div>}
          </div>
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask me..."
                className="flex-1 h-8 px-3 rounded-md border bg-secondary/50 text-xs outline-none focus:ring-1 focus:ring-primary/20"
              />
              <Button size="icon" className="h-8 w-8" onClick={send} disabled={!input || loading}><Send className="h-3 w-3" /></Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
