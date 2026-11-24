import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { askTutor } from "@/lib/tutor.functions";
import type { AnsweringFrom, MarkMode, TutorPick } from "@/lib/tutor-context";

export type TutorMsg =
  | { role: "user"; content: string; marks: MarkMode }
  | {
      role: "assistant";
      content: string;
      question: string;
      marks: MarkMode;
      language: string;
      answeringFrom: AnsweringFrom | null;
      offSyllabus: boolean;
      followUps: string[];
    };

/** The AI tutor conversation that lives under the dashboard search box. */
export function useTutorChat(language: string) {
  const ask = useServerFn(askTutor);
  const [messages, setMessages] = useState<TutorMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  async function send(text: string, marks: MarkMode, pick: TutorPick): Promise<boolean> {
    const question = text.trim();
    if (!question || busyRef.current) return false;
    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));
    busyRef.current = true;
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: question, marks }]);
    try {
      const res = await ask({ data: { question, language, marks, pick, history } });
      if (res.error || !res.answer) {
        toast.error(res.error ?? "No answer");
        setMessages((m) => m.slice(0, -1));
        return false;
      }
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.answer!,
          question,
          marks: res.marks,
          language,
          answeringFrom: res.answeringFrom,
          offSyllabus: res.offSyllabus,
          followUps: res.followUps,
        },
      ]);
      return true;
    } catch {
      toast.error("The AI couldn't answer just now.");
      setMessages((m) => m.slice(0, -1));
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return { messages, busy, send, clear: () => setMessages([]) };
}
