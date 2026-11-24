import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, BookmarkPlus, Bot, Check, CheckCircle2, MapPin, Send, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { coursesQuery } from "@/lib/queries";
import { answeringFromLabel } from "@/lib/tutor-context";
import type { TutorMsg } from "@/hooks/use-tutor-chat";
import { useTopicProgress } from "@/hooks/use-topic-progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type AssistantMsg = Extract<TutorMsg, { role: "assistant" }>;

function AnswerActions({ msg, onSend, busy }: { msg: AssistantMsg; onSend: (t: string) => Promise<boolean>; busy: boolean }) {
  const queryClient = useQueryClient();
  const { data: courses } = useSuspenseQuery(coursesQuery);
  const update = useTopicProgress();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const from = msg.answeringFrom;
  const topic = from?.topicId
    ? courses.flatMap((c) => c.units.flatMap((u) => u.topics)).find((t) => t.id === from.topicId)
    : undefined;

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("saved_answers").insert({
      question: msg.question,
      answer: msg.content,
      marks: msg.marks,
      language: msg.language,
      course_id: from?.courseId ?? null,
      unit_id: from?.unitId ?? null,
      topic_id: from?.topicId ?? null,
    });
    setSaving(false);
    if (error) return void toast.error("Couldn't save this answer. Please try again.");
    setSaved(true);
    queryClient.invalidateQueries({ queryKey: ["saved_answers"] });
    toast.success(from ? `Saved to your notes for ${from.courseCode}` : "Saved to your notes");
  }

  return (
    <div className="mt-3 grid gap-2 border-t border-border pt-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="soft" onClick={save} disabled={saved || saving}>
          {saved ? <><Check /> Saved to notes</> : <><BookmarkPlus /> Save to notes</>}
        </Button>
        {topic && (
          <Button size="sm" variant="outline" disabled={topic.revised} onClick={() => void update(topic.id, { revised: true }).then((ok) => ok && toast.success(`Marked "${topic.title}" as revised`))}>
            <CheckCircle2 /> {topic.revised ? "Topic revised" : "Mark topic as revised"}
          </Button>
        )}
      </div>
      {msg.followUps.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          Ask next:
          {msg.followUps.map((f) => (
            <Button key={f} variant="chip" size="chip" className="h-auto min-h-7 whitespace-normal py-1 text-left" disabled={busy} onClick={() => void onSend(f)}>
              {f}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

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
        <p className="inline-flex flex-wrap items-center gap-2 text-sm font-semibold">
          <Bot className="size-4 text-primary" /> AI Tutor
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">Answers in {language}</span>
        </p>
        <Button variant="ghost" size="sm" onClick={onClear} disabled={busy} aria-label="Close the AI answers">
          <X /> Clear
        </Button>
      </div>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-3 sm:p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            ref={i === messages.length - 1 && !busy ? lastRef : undefined}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[96%] rounded-2xl px-4 py-3 text-sm sm:max-w-[92%]",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              {m.role === "assistant" ? (
                <>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md bg-hot-soft px-1.5 py-0.5 font-bold text-hot">{m.marks} marks</span>
                    {m.answeringFrom ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-success-soft px-1.5 py-0.5 font-medium text-success">
                        <MapPin className="size-3" /> Answering from: {answeringFromLabel(m.answeringFrom)}
                      </span>
                    ) : (
                      <span role="alert" className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive">
                        <AlertTriangle className="size-3" /> Not in your saved syllabus — general answer
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-1 [&_th]:border [&_th]:border-border [&_th]:p-1 [&_ul]:list-disc">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                  <AnswerActions msg={m} onSend={onSend} busy={busy} />
                </>
              ) : (
                <>
                  {m.content}
                  <span className="ml-2 text-xs opacity-75">· {m.marks}M</span>
                </>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div ref={lastRef} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4 animate-pulse text-primary" /> Checking your syllabus and writing the answer…
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
