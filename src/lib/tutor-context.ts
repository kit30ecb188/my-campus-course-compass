import { z } from "zod";
import type { Course } from "@/lib/profile";

/** Exam answer modes the tutor supports. */
export const MARK_MODES = [2, 13, 16] as const;
export type MarkMode = (typeof MARK_MODES)[number];

export const MARKS_GUIDE: Record<MarkMode, string> = {
  2: "2-MARK ANSWER: 40-70 words. A crisp definition plus one or two key points (or a 2-row comparison). No headings, no long examples.",
  13: "13-MARK ANSWER: about 450-650 words. Structure: Introduction; 4-6 headed points each explained in 2-4 sentences; a 'Diagram' line saying what to draw and label; one worked example or application; a short conclusion.",
  16: "16-MARK ANSWER: about 750-1000 words. Structure: Introduction; detailed headed sections covering every sub-part; 'Diagram' guidance (what to draw, what to label); derivation, algorithm or step-by-step working where the topic has one; a worked example; advantages/limitations or applications; a comparison table if it helps; conclusion.",
};

export function languageGuide(language: string): string {
  if (language === "Tanglish")
    return "Write in Tanglish: Tamil sentences written in English (Latin) letters, mixed naturally with English technical terms, the way Tamil Nadu students talk. Do not use Tamil script.";
  if (language === "English") return "Write in clear, simple English.";
  return `Write in ${language} using its own script. Keep technical terms (and formulas) in English where students expect them.`;
}

export const tutorPickSchema = z.object({
  courseId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
});
export type TutorPick = z.infer<typeof tutorPickSchema>;

/** Where an answer comes from in the student's own syllabus. */
export type AnsweringFrom = {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  unitId: string | null;
  unitNo: number | null;
  unitTitle: string | null;
  topicId: string | null;
  topicTitle: string | null;
};

const MAX_OUTLINE_TOPICS = 600;

/**
 * Builds the syllabus outline sent to the AI. Each topic gets a short key (t1, t2…) the AI
 * returns so we can tell which saved topic it answered from. Only the picked course/unit is
 * included when the student narrowed it down.
 */
export function buildSyllabusOutline(courses: readonly Course[], pick: TutorPick) {
  const refs: Record<string, AnsweringFrom> = {};
  const scoped = pick.courseId ? courses.filter((c) => c.id === pick.courseId) : courses;
  const lines: string[] = [];
  let n = 0;
  for (const c of scoped) {
    lines.push(`Course ${c.code} — ${c.title}${c.semester ? ` (Semester ${c.semester})` : ""}`);
    c.units.forEach((u, ui) => {
      if (pick.unitId && u.id !== pick.unitId) return;
      lines.push(`  Unit ${ui + 1}: ${u.title}`);
      for (const t of u.topics) {
        if (pick.topicId && t.id !== pick.topicId) continue;
        if (n >= MAX_OUTLINE_TOPICS) return;
        n += 1;
        const key = `t${n}`;
        refs[key] = {
          courseId: c.id,
          courseCode: c.code,
          courseTitle: c.title,
          unitId: u.id,
          unitNo: ui + 1,
          unitTitle: u.title,
          topicId: t.id,
          topicTitle: t.title,
        };
        lines.push(`    [${key}] ${t.title}`);
      }
    });
  }
  return { text: lines.join("\n"), refs, picked: resolvePick(courses, pick) };
}

/** The student's own course/unit/topic choice, or null if it isn't one of their saved items. */
export function resolvePick(courses: readonly Course[], pick: TutorPick): AnsweringFrom | null {
  if (!pick.courseId) return null;
  const c = courses.find((x) => x.id === pick.courseId);
  if (!c) return null;
  const ui = pick.unitId ? c.units.findIndex((u) => u.id === pick.unitId) : -1;
  const u = ui >= 0 ? c.units[ui] : undefined;
  const t = u && pick.topicId ? u.topics.find((x) => x.id === pick.topicId) : undefined;
  return {
    courseId: c.id,
    courseCode: c.code,
    courseTitle: c.title,
    unitId: u?.id ?? null,
    unitNo: u ? ui + 1 : null,
    unitTitle: u?.title ?? null,
    topicId: t?.id ?? null,
    topicTitle: t?.title ?? null,
  };
}

/**
 * Decides the "Answering from" label. Off-syllabus answers never claim a syllabus source.
 * A topic the AI names counts only if it is one of the keys we sent.
 */
export function resolveAnsweringFrom(
  ai: { inSyllabus: boolean; topicKey: string },
  refs: Record<string, AnsweringFrom>,
  picked: AnsweringFrom | null,
): { answeringFrom: AnsweringFrom | null; offSyllabus: boolean } {
  if (!ai.inSyllabus) return { answeringFrom: null, offSyllabus: true };
  const matched = refs[ai.topicKey.trim()];
  if (matched) return { answeringFrom: matched, offSyllabus: false };
  if (picked) return { answeringFrom: picked, offSyllabus: false };
  return { answeringFrom: null, offSyllabus: true };
}

export function answeringFromLabel(a: AnsweringFrom): string {
  return [a.courseCode, a.unitNo ? `Unit ${a.unitNo}${a.unitTitle ? `: ${a.unitTitle}` : ""}` : null, a.topicTitle]
    .filter(Boolean)
    .join(" › ");
}
