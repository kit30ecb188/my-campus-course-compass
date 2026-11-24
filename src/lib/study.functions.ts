import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { notesSchema, type UnitNotes, type VideoSuggestion } from "@/lib/study";

const strArr = { type: "array", items: { type: "string" } } as const;

const NOTES_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["unit", "overview", "sections", "formulas", "twoMarkQuestions", "longAnswerTips", "summary"],
  properties: {
    unit: { type: "string" },
    overview: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "explanation", "points"],
        properties: { heading: { type: "string" }, explanation: { type: "string" }, points: strArr },
      },
    },
    formulas: strArr,
    twoMarkQuestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer"],
        properties: { question: { type: "string" }, answer: { type: "string" } },
      },
    },
    longAnswerTips: strArr,
    summary: strArr,
  },
} as const;

const VIDEOS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["videos"],
  properties: {
    videos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "why", "query"],
        properties: { title: { type: "string" }, why: { type: "string" }, query: { type: "string" } },
      },
    },
  },
} as const;

const topicInput = z.object({
  courseTitle: z.string().trim().min(1).max(120),
  courseCode: z.string().trim().max(20).optional(),
  topic: z.string().trim().min(1).max(160),
  marks: z.string().trim().max(40).optional(),
  subtopics: z.array(z.string().trim().min(1).max(200)).max(80).optional(),
});

async function studentLine(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data: p } = await context.supabase
    .from("profiles")
    .select("year, semester, department, college, state")
    .eq("id", context.userId)
    .maybeSingle();
  return p
    ? `The student is in Year ${p.year ?? "?"}, Semester ${p.semester ?? "?"}, ${p.department ?? ""} department at ${p.college ?? "an Indian college"}, ${p.state ?? ""}.`
    : "The student is at an Indian engineering college.";
}

async function askJson(instructions: string, prompt: string, name: string, schema: object): Promise<unknown> {
  const { generateResponse } = await import("@lovable.dev/ai-gateway");
  const res = await generateResponse({
    model: "openai/gpt-6.1-sol",
    instructions,
    input: [{ role: "user" as const, content: prompt }],
    text: { format: { type: "json_schema", name, schema: schema as Record<string, unknown>, strict: true } },
  });
  const parts: string[] = [];
  for (const item of res.output ?? []) {
    if (item.type === "message") {
      for (const c of item.content ?? []) if (c.type === "output_text") parts.push(c.text);
    }
  }
  return JSON.parse(parts.join("").trim());
}

async function friendlyError(err: unknown): Promise<string> {
  console.error("study ai error", err);
  const { GatewayError } = await import("@lovable.dev/ai-gateway");
  if (err instanceof GatewayError && err.httpStatus === 429) return "The AI is busy right now. Please try again in a minute.";
  if (err instanceof GatewayError && err.httpStatus === 402) return "AI credits have run out for this app.";
  return "Couldn't prepare this just now. Please try again.";
}

export const makeUnitNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => topicInput.parse(input))
  .handler(async ({ data, context }): Promise<{ notes: UnitNotes | null; error: string | null }> => {
    try {
      const who = await studentLine(context);
      const raw = await askJson(
        [
          "You write detailed, exam-ready study notes for Indian university students (Anna University style exams).",
          who,
          "Write in clear, simple English. Plain text only: no markdown symbols, no LaTeX. Write formulas in plain text like V = I x R.",
          "Cover every important sub-topic of the unit with 5 to 9 sections. Each explanation is a full paragraph of 80-150 words; give 3-6 key points per section.",
          "Describe diagrams in words where a diagram would be drawn in the exam.",
          "Give 6-8 two-mark questions with short model answers, and 4-6 tips for writing 13/16-mark answers.",
        ].join("\n"),
        `Course: ${data.courseTitle}${data.courseCode ? ` (${data.courseCode})` : ""}\nUnit / topic: ${data.topic}${data.marks ? `\nWeightage: ${data.marks}` : ""}${data.subtopics?.length ? `\nTopics listed in the student's syllabus for this unit (cover each of them, and nothing unrelated):\n- ${data.subtopics.join("\n- ")}` : ""}\nMake detailed notes for this unit.`,
        "unit_notes",
        NOTES_JSON_SCHEMA,
      );
      return { notes: notesSchema.parse(raw), error: null };
    } catch (err) {
      return { notes: null, error: await friendlyError(err) };
    }
  });

export const suggestVideos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => topicInput.parse(input))
  .handler(async ({ data, context }): Promise<{ videos: VideoSuggestion[]; error: string | null }> => {
    try {
      const who = await studentLine(context);
      const raw = await askJson(
        [
          "You help Indian college students find the best YouTube lectures for a syllabus topic.",
          who,
          "Split the topic into 5-7 focused sub-topics a student should watch, in a sensible learning order.",
          "For each, give a short title, one sentence on why to watch it, and a precise YouTube search query (include the course name and a well-known channel such as NPTEL, Neso Academy, Gate Smashers or Ekeeda when it fits).",
        ].join("\n"),
        `Course: ${data.courseTitle}\nTopic: ${data.topic}`,
        "video_plan",
        VIDEOS_JSON_SCHEMA,
      );
      const parsed = z
        .object({ videos: z.array(z.object({ title: z.string(), why: z.string(), query: z.string() })) })
        .parse(raw);
      return { videos: parsed.videos.slice(0, 8), error: null };
    } catch (err) {
      return { videos: [], error: await friendlyError(err) };
    }
  });
