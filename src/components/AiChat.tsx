import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactRecord } from "@/types";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiChatProps {
  records: ContactRecord[];
  listName: string;
}

export function AiChat({ records, listName }: AiChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      uniqueCompanies: [...new Set(records.map((r) => r.company))].length,
      uniqueCities: [...new Set(records.map((r) => r.city))].length,
      uniqueCountries: [...new Set(records.map((r) => r.country))].length,
      topCompanies: Object.entries(
        records.reduce((acc, r) => ({ ...acc, [r.company]: (acc[r.company] || 0) + 1 }), {} as Record<string, number>)
      ).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => `${name} (${count})`),
      topCities: Object.entries(
        records.reduce((acc, r) => ({ ...acc, [r.city]: (acc[r.city] || 0) + 1 }), {} as Record<string, number>)
      ).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => `${name} (${count})`),
      allTags: [...new Set(records.flatMap((r) => r.tags))],
      sources: Object.entries(
        records.reduce((acc, r) => ({ ...acc, [r.source]: (acc[r.source] || 0) + 1 }), {} as Record<string, number>)
      ).map(([name, count]) => `${name} (${count})`),
      sampleRecords: records.slice(0, 20).map((r) => ({
        name: r.full_name,
        email: r.email,
        company: r.company,
        title: r.title,
        city: r.city,
        country: r.country,
        source: r.source,
        tags: r.tags.join(", "),
      })),
    };
    return JSON.stringify(summary, null, 2);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const response = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: updatedMessages,
          dataContext: buildDataContext(),
        },
      });

      if (response.error) throw new Error(response.error.message);

      const assistantContent = response.data?.content || "Sorry, I couldn't process that.";
      setMessages((prev) => [...prev, { role: "assistant", content: assistantContent }]);
    } catch (err: any) {
      console.error("AI chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Summarize this list",
    "Which companies appear most?",
    "Any data quality issues?",
    "Breakdown by country",
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-96 h-[520px] bg-background border rounded-2xl shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3.5 border-b bg-gradient-to-r from-primary/5 to-accent/30 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Data Assistant</h3>
              <p className="text-[11px] text-muted-foreground">{records.length} records loaded</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center py-2">
                  Ask me anything about your data
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); }}
                      className="text-xs text-left p-2.5 rounded-lg border hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-secondary-foreground rounded-bl-md"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none [&>p]:m-0 [&>ul]:mt-1 [&>ol]:mt-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-secondary px-4 py-3 rounded-2xl rounded-bl-md">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask about your data..."
                className="flex-1 h-9 px-3.5 rounded-lg border bg-secondary/30 text-sm outline-none focus:ring-1 focus:ring-primary/30 transition-shadow placeholder:text-muted-foreground"
              />
              <Button
                size="icon"
                className="h-9 w-9 rounded-lg shrink-0"
                onClick={send}
                disabled={!input.trim() || loading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
