import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { COURSE_SELECT, mapCourses } from "@/lib/course-data";
import {
  MARKS_GUIDE,
  MARK_MODES,
  buildSyllabusOutline,
  languageGuide,
  resolveAnsweringFrom,
  tutorPickSchema,
  type AnsweringFrom,
  type MarkMode,
} from "@/lib/tutor-context";

const inputSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  language: z.string().trim().max(30).optional(),
  marks: z.union([z.literal(2), z.literal(13), z.literal(16)]).default(2),
  pick: tutorPickSchema.default({}),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .max(12)
    .default([]),
});

const ANSWER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["in_syllabus", "topic_key", "answer", "follow_ups"],
  properties: {
    in_syllabus: { type: "boolean" },
    topic_key: { type: "string" },
    answer: { type: "string" },
    follow_ups: { type: "array", items: { type: "string" } },
  },
} as const;

const aiAnswer = z.object({
  in_syllabus: z.boolean(),
  topic_key: z.string(),
  answer: z.string(),
  follow_ups: z.array(z.string()),
});

export type TutorReply = {
  answer: string | null;
  answeringFrom: AnsweringFrom | null;
  offSyllabus: boolean;
  followUps: string[];
  marks: MarkMode;
  error: string | null;
};

export const askTutor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }): Promise<TutorReply> => {
    const marks = (MARK_MODES as readonly number[]).includes(data.marks) ? (data.marks as MarkMode) : 2;
    const empty = { answer: null, answeringFrom: null, offSyllabus: false, followUps: [], marks };
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");

    const [{ data: p }, { data: rows, error: coursesError }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("nickname, year, semester, department, college, university, regulation, state, languages")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase.from("courses").select(COURSE_SELECT).order("created_at", { ascending: true }),
    ]);
    if (coursesError) return { ...empty, error: "Couldn't read your syllabus. Please try again." };

    const courses = mapCourses(rows ?? []);
    const outline = buildSyllabusOutline(courses, data.pick);
    if (data.pick.courseId && !outline.picked) return { ...empty, error: "That course isn't in your syllabus any more." };

    const language = data.language || p?.languages?.[0] || "English";
    const scopeLine = outline.picked
      ? `The student chose to study: ${[outline.picked.courseCode + " " + outline.picked.courseTitle, outline.picked.unitTitle && `Unit ${outline.picked.unitNo}: ${outline.picked.unitTitle}`, outline.picked.topicTitle].filter(Boolean).join(" > ")}.`
      : "The student did not pick a course; find the best matching topic in their syllabus.";

    const instructions = [
      "You are Syllabex, an exam tutor for Indian college students (Anna University style university exams).",
      p
        ? `Student: ${p.nickname ?? "a student"}, Year ${p.year ?? "?"}, Semester ${p.semester ?? "?"}, ${p.department ?? ""} at ${p.college ?? "their college"}${p.university ? ` (${p.university})` : ""}${p.regulation ? `, regulation ${p.regulation}` : ""}, ${p.state ?? ""}.`
        : "",
      "",
      "THE STUDENT'S SAVED SYLLABUS (topic keys in brackets):",
      outline.text || "(The student has not added any courses yet.)",
      "",
      scopeLine,
      "RULES:",
      "- Decide whether the question is covered by a topic in the syllabus above. If yes: in_syllabus=true and topic_key = the bracket key of the best matching topic (e.g. t3). If it is not covered: in_syllabus=false, topic_key=\"\", and begin the answer with one sentence saying this is not in their saved syllabus, then give a short general answer.",
      "- Never pretend a topic is in their syllabus when it is not. Never claim a question appeared in a specific past exam, year or paper, and never invent past-paper references or statistics.",
      `- ${MARKS_GUIDE[marks]}`,
      "- Use relevant Indian-context examples where they help. For 13 and 16 marks always include a line starting with 'Diagram:' describing what to draw and label (unless the topic truly has no diagram).",
      `- ${languageGuide(language)}`,
      "- Format the answer in markdown with headings and bullet points (2-mark answers: plain short text).",
      "- follow_ups: 3 short follow-up questions the student could ask next about this topic, in the same language.",
    ]
      .filter((l) => l !== null)
      .join("\n");

    try {
      const res = await generateResponse({
        model: "openai/gpt-6.1-sol",
        instructions,
        input: [
          ...data.history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: `${data.question}\n\n(Answer mode: ${marks} marks)` },
        ],
        text: { format: { type: "json_schema", name: "tutor_answer", schema: ANSWER_SCHEMA as unknown as Record<string, unknown>, strict: true } },
      });
      const parts: string[] = [];
      for (const item of res.output ?? []) {
        if (item.type === "message") {
          for (const c of item.content ?? []) if (c.type === "output_text") parts.push(c.text);
        }
      }
      const ai = aiAnswer.parse(JSON.parse(parts.join("").trim()));
      const { answeringFrom, offSyllabus } = resolveAnsweringFrom(
        { inSyllabus: ai.in_syllabus, topicKey: ai.topic_key },
        outline.refs,
        outline.picked,
      );
      return {
        answer: ai.answer.trim() || "Sorry, I couldn't come up with an answer.",
        answeringFrom,
        offSyllabus,
        followUps: ai.follow_ups.map((f) => f.trim()).filter(Boolean).slice(0, 3),
        marks,
        error: null,
      };
    } catch (err) {
      console.error("tutor error", err);
      if (err instanceof GatewayError && err.httpStatus === 429) return { ...empty, error: "The tutor is busy right now. Please try again in a minute." };
      if (err instanceof GatewayError && err.httpStatus === 402) return { ...empty, error: "AI credits have run out for this app." };
      return { ...empty, error: "The tutor couldn't answer just now. Please try again." };
    }
  });
