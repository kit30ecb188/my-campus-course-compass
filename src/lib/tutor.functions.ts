import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  language: z.string().trim().max(30).optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) }))
    .max(12)
    .default([]),
});

export const askTutor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    const { data: p } = await context.supabase
      .from("profiles")
      .select("nickname, year, semester, department, college, state, languages")
      .eq("id", context.userId)
      .maybeSingle();

    const language = data.language || p?.languages?.[0] || "English";
    const instructions = [
      "You are Syllabex, a friendly exam tutor for Indian engineering college students.",
      p
        ? `The student is ${p.nickname ?? "a student"}, Year ${p.year ?? "?"}, Semester ${p.semester ?? "?"}, ${p.department ?? ""} department at ${p.college ?? "their college"}, ${p.state ?? ""}.`
        : "",
      `Always answer in ${language}. Keep technical terms in English where students expect them.`,
      "Shape answers for university exams: for 2 marks be short and crisp; for 16 marks give headings, diagrams described in words, derivations and key points.",
      "Use markdown with headings and bullet points.",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await generateResponse({
        model: "openai/gpt-6.1-sol",
        instructions,
        input: [
          ...data.history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: data.question },
        ],
      });
      const parts: string[] = [];
      for (const item of res.output ?? []) {
        if (item.type === "message") {
          for (const c of item.content ?? []) {
            if (c.type === "output_text") parts.push(c.text);
          }
        }
      }
      return { answer: parts.join("\n").trim() || "Sorry, I couldn't come up with an answer.", error: null };
    } catch (err) {
      console.error("tutor error", err);
      if (err instanceof GatewayError && err.httpStatus === 429) {
        return { answer: null, error: "The tutor is busy right now. Please try again in a minute." };
      }
      if (err instanceof GatewayError && err.httpStatus === 402) {
        return { answer: null, error: "AI credits have run out for this app." };
      }
      return { answer: null, error: "The tutor couldn't answer just now. Please try again." };
    }
  });
