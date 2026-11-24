import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { z } from "zod";
import { toast } from "sonner";
import { Bot, Send, Sparkles } from "lucide-react";
import { profileQuery } from "@/lib/queries";
import { suggestionsFor } from "@/lib/profile";
import { askTutor } from "@/lib/tutor.functions";
import { useAnswerLanguage } from "@/hooks/use-answer-language";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/tutor")({
  validateSearch: z.object({ q: z.string().max(2000).optional() }),
  head: () => ({
    meta: [
      { title: "AI Tutor — Syllabex" },
      { name: "description", content: "Ask the Syllabex AI tutor to explain any topic in your language, shaped for exam answers." },
      { property: "og:title", content: "AI Tutor — Syllabex" },
      { property: "og:description", content: "Explanations in your language, shaped for 2-mark and 16-mark answers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Tutor,
});

type Msg = { role: "user" | "assistant"; content: string };

function Tutor() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { q } = Route.useSearch();
  const ask = useServerFn(askTutor);
  const [language] = useAnswerLanguage(profile?.languages ?? [], profile?.id);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sentInitial = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const history = messages.slice(-10);
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setBusy(true);
    try {
      const res = await ask({ data: { question, language, history } });
      if (res.error || !res.answer) {
        toast.error(res.error ?? "No answer");
        setMessages((m) => m.slice(0, -1));
        setInput(question);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: res.answer! }]);
      }
    } catch {
      toast.error("The tutor couldn't answer just now.");
      setMessages((m) => m.slice(0, -1));
      setInput(question);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (q && !sentInitial.current) {
      sentInitial.current = true;
      void send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <section className="animate-rise">
        <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">Answers in {language}</span>
        <h1 className="mt-4 text-4xl font-extrabold">AI Tutor</h1>
        <p className="mt-2 text-muted-foreground">
          Ask anything from your {profile?.department} syllabus. Say "for 2 marks" or "for 16 marks" to shape the answer.
        </p>
      </section>

      <section className="surface flex min-h-[420px] flex-col">
        <div className="flex-1 space-y-4 p-5">
          {messages.length === 0 && !busy && (
            <div className="py-10 text-center">
              <Bot className="mx-auto size-10 text-primary" />
              <p className="mt-3 font-semibold">Hi {profile?.nickname}! What should we revise today?</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {suggestionsFor(profile?.department).map((s) => (
                  <Button key={s} variant="chip" size="chip" onClick={() => send(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[88%] rounded-2xl px-4 py-3 text-sm",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {m.role === "assistant" ? (
                  <div className="prose-tutor space-y-2 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_ul]:list-disc">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4 animate-pulse text-primary" /> Thinking…
            </div>
          )}
          <div ref={endRef} />
        </div>
        <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-border p-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={2}
            placeholder="Ask about any topic…"
            className="min-h-0 resize-none"
            aria-label="Your question"
          />
          <Button type="submit" size="icon" className="size-11" disabled={busy || !input.trim()} aria-label="Send">
            <Send />
          </Button>
        </form>
      </section>
    </div>
  );
}
