import { z } from "zod";

/** Notes PDFs cover 1 to 3 units at a time so each unit can be explained in detail. */
export const MAX_NOTE_UNITS = 3;

export const noteSelectionSchema = z
  .array(z.string().trim().min(1))
  .min(1, "Pick at least 1 unit or topic")
  .max(MAX_NOTE_UNITS, `Pick up to ${MAX_NOTE_UNITS} units at a time`);

export const notesSchema = z.object({
  unit: z.string(),
  overview: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      explanation: z.string(),
      points: z.array(z.string()),
    }),
  ),
  formulas: z.array(z.string()),
  twoMarkQuestions: z.array(z.object({ question: z.string(), answer: z.string() })),
  longAnswerTips: z.array(z.string()),
  summary: z.array(z.string()),
});
export type UnitNotes = z.infer<typeof notesSchema>;

export type VideoSuggestion = { title: string; why: string; query: string };

/** A YouTube search link for a topic, optionally in the student's language. */
export function youtubeSearchUrl(query: string, language?: string): string {
  const q = language && language !== "English" ? `${query} in ${language}` : query;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q.trim())}`;
}

/** The page's cached data must be dropped whenever a different account signs in or out. */
export function accountChanged(previousUserId: string | null | undefined, nextUserId: string | null | undefined): boolean {
  return (previousUserId ?? null) !== (nextUserId ?? null);
}

export function notesFileName(courseCode: string, units: readonly string[]): string {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const part = units.length === 1 ? slug(units[0] ?? "notes") : `${units.length}-units`;
  return `${slug(courseCode) || "course"}-${part || "notes"}-notes.pdf`;
}
