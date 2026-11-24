import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { askTutor } from "@/lib/tutor.functions";

export type TutorMsg = { role: "user" | "assistant"; content: string };

/** The AI tutor conversation that lives under the dashboard search box. */
export function useTutorChat(language: string) {
  const ask = useServerFn(askTutor);
  const [messages, setMessages] = useState<TutorMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  async function send(text: string): Promise<boolean> {
    const question = text.trim();
    if (!question || busyRef.current) return false;
    const history = messages.slice(-10);
    busyRef.current = true;
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: question }]);
    try {
      const res = await ask({ data: { question, language, history } });
      if (res.error || !res.answer) {
        toast.error(res.error ?? "No answer");
        setMessages((m) => m.slice(0, -1));
        return false;
      }
      setMessages((m) => [...m, { role: "assistant", content: res.answer! }]);
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
