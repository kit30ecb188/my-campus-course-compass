import type { Course } from "@/lib/profile";
import type { Confidence, Unit } from "@/lib/syllabus";

/** One query shape for courses → units → topics → this student's progress, used in the browser and on the server. */
export const COURSE_SELECT =
  "id, code, title, department, semester, regulation, university, created_at, units(id, position, title, marks, topics(id, position, title, topic_progress(revised, confidence)))";

type Row = {
  id: string;
  code: string;
  title: string;
  department: string;
  semester: number | null;
  regulation: string | null;
  university: string | null;
  units:
    | {
        id: string;
        position: number;
        title: string;
        marks: string | null;
        topics: { id: string; position: number; title: string; topic_progress: { revised: boolean; confidence: number }[] }[];
      }[]
    | null;
};

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

export function mapCourses(rows: readonly unknown[]): Course[] {
  return (rows as Row[]).map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    department: c.department,
    semester: c.semester,
    regulation: c.regulation,
    university: c.university,
    units: [...(c.units ?? [])].sort(byPosition).map(
      (u): Unit => ({
        id: u.id,
        title: u.title,
        marks: u.marks,
        topics: [...u.topics].sort(byPosition).map((t) => {
          const p = t.topic_progress[0];
          return { id: t.id, title: t.title, revised: p?.revised ?? false, confidence: (p?.confidence ?? 0) as Confidence };
        }),
      }),
    ),
  }));
}
