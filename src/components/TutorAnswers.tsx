import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, Send, Sparkles, X } from "lucide-react";
import type { TutorMsg } from "@/hooks/use-tutor-chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** AI answers shown right under the dashboard search box, with a follow-up box. */
export function TutorAnswers({
  messages,
  busy,
  language,
  onSend,
  onClear,
}: {
  messages: TutorMsg[];
  busy: boolean;
  language: string;
  onSend: (text: string) => Promise<boolean>;
  onClear: () => void;
}) {
  const [input, setInput] = useState("");
  const lastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lastRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, busy]);

  if (messages.length === 0 && !busy) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input;
    setInput("");
    if (!(await onSend(text))) setInput(text);
  }

  return (
    <div data-tour="tutor-answers" className="mt-4 rounded-2xl border border-border bg-muted/40">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <p className="inline-flex items-center gap-2 text-sm font-semibold">
          <Bot className="size-4 text-primary" /> AI Tutor
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">Answers in {language}</span>
        </p>
        <Button variant="ghost" size="sm" onClick={onClear} disabled={busy} aria-label="Close the AI answers">
          <X /> Clear
        </Button>
      </div>
      <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            ref={i === messages.length - 1 && !busy ? lastRef : undefined}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[92%] rounded-2xl px-4 py-3 text-sm",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              {m.role === "assistant" ? (
                <div className="space-y-2 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_ul]:list-disc">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div ref={lastRef} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4 animate-pulse text-primary" /> Thinking…
          </div>
        )}
      </div>
      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={1}
          placeholder="Ask a follow-up…"
          className="min-h-0 resize-none bg-card"
          aria-label="Ask a follow-up question"
        />
        <Button type="submit" size="icon" className="size-10" disabled={busy || !input.trim()} aria-label="Send">
          <Send />
        </Button>
      </form>
    </div>
  );
}
