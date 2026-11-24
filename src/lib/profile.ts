import { z } from "zod";
import { MAX_TITLE_LENGTH, MAX_TOPICS_PER_UNIT, MAX_UNITS, type Unit } from "@/lib/syllabus";

export { MAX_UNITS };
export type { Unit };

export const DEPARTMENTS = [
  "CSE",
  "IT",
  "ECE",
  "EEE",
  "MECH",
  "CIVIL",
  "AI & DS",
  "AI & ML",
  "CSBS",
  "Biotech",
  "Chemical",
  "Aeronautical",
  "Automobile",
  "Other",
] as const;

export const LANGUAGES = [
  "English",
  "Tamil",
  "Tanglish",
  "Hindi",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Punjabi",
  "Odia",
  "Urdu",
] as const;

export const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu & Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
] as const;

export const YEARS = [1, 2, 3, 4] as const;

export const MAX_LANGUAGES = 2;

/** A year covers two semesters: year 1 → sem 1-2, year 2 → sem 3-4, and so on. */
export function semestersForYear(year: number): number[] {
  return [year * 2 - 1, year * 2];
}

const text = (label: string, max = 80) =>
  z.string().trim().min(1, `Please enter your ${label}`).max(max, `${label} is too long`);

export const profileSchema = z
  .object({
    full_name: text("name"),
    nickname: text("nickname", 30),
    year: z.number().int().min(1).max(4),
    semester: z.number().int().min(1).max(8),
    languages: z
      .array(z.enum(LANGUAGES))
      .min(1, "Pick at least 1 language")
      .max(MAX_LANGUAGES, `Pick only 1 or 2 languages`),
    department: z.enum(DEPARTMENTS, { errorMap: () => ({ message: "Choose your department" }) }),
    college: text("college", 120),
    university: text("university", 120),
    regulation: text("regulation", 40),
    city: text("city"),
    state: z.enum(STATES, { errorMap: () => ({ message: "Choose your state" }) }),
  })
  .refine((p) => semestersForYear(p.year).includes(p.semester), {
    message: "This semester doesn't match your year",
    path: ["semester"],
  });

export type ProfileInput = z.infer<typeof profileSchema>;

export type Profile = {
  id: string;
  full_name: string | null;
  nickname: string | null;
  year: number | null;
  semester: number | null;
  languages: string[];
  department: string | null;
  college: string | null;
  university: string | null;
  regulation: string | null;
  city: string | null;
  state: string | null;
  onboarded: boolean;
  tour_completed: boolean;
};

export type Course = {
  id: string;
  code: string;
  title: string;
  department: string;
  semester: number | null;
  regulation: string | null;
  university: string | null;
  units: Unit[];
};

const unitInput = z.object({
  title: z.string().trim().min(1, "Give every unit a name").max(MAX_TITLE_LENGTH, `Keep unit names under ${MAX_TITLE_LENGTH} characters`),
  marks: z.string().trim().max(40),
  topics: z
    .array(z.object({ title: z.string().trim().min(1).max(MAX_TITLE_LENGTH, `Keep each topic under ${MAX_TITLE_LENGTH} characters`) }))
    .max(MAX_TOPICS_PER_UNIT, `A unit can have up to ${MAX_TOPICS_PER_UNIT} topics`),
});

export const courseSchema = z.object({
  code: z.string().trim().min(2, "Enter the course code").max(20),
  title: z.string().trim().min(2, "Enter the course name").max(120),
  department: z.enum(DEPARTMENTS, {
    errorMap: () => ({ message: "Tell us which department this course is for" }),
  }),
  semester: z.number().int().min(1).max(8),
  regulation: z.string().trim().max(40).optional(),
  university: z.string().trim().max(120).optional(),
  units: z.array(unitInput).max(MAX_UNITS, `Add up to ${MAX_UNITS} units`),
});

export type CourseInput = z.infer<typeof courseSchema>;

const sameText = (a: string, b: string) =>
  a.trim().toLowerCase().replace(/\s+/g, " ") === b.trim().toLowerCase().replace(/\s+/g, " ");
const sameCode = (a: string, b: string) => a.replace(/\s+/g, "").toUpperCase() === b.replace(/\s+/g, "").toUpperCase();

/** A course counts as already added when its code or its name matches one the student has. */
export function findDuplicateCourse<T extends Pick<Course, "id" | "code" | "title">>(
  courses: readonly T[],
  input: { code: string; title: string },
  ignoreId?: string,
): T | undefined {
  const code = input.code.trim();
  const title = input.title.trim();
  return courses.find(
    (c) => c.id !== ignoreId && ((code !== "" && sameCode(c.code, code)) || (title !== "" && sameText(c.title, title))),
  );
}

/** New users with no courses don't see the "My courses & syllabus" section. */
export function showCoursesSection(courses: readonly unknown[]): boolean {
  return courses.length > 0;
}

const DEPT_SUGGESTIONS: Record<string, string[]> = {
  CSE: ["Explain deadlock", "TCP vs UDP"],
  IT: ["Explain normalization", "HTTP vs HTTPS"],
  ECE: ["Explain Zener breakdown", "MOSFET vs JFET"],
  EEE: ["Explain transformer working", "AC vs DC motor"],
  MECH: ["Explain Otto cycle", "Stress vs strain"],
  CIVIL: ["Explain soil compaction", "RCC vs PCC"],
};

/**
 * "Try asking" ideas: topics from the student's own syllabus they haven't revised yet,
 * topped up with department examples. Never suggests past-paper claims.
 */
export function suggestionsFor(department: string | null | undefined, courses: readonly Pick<Course, "units">[] = []): string[] {
  const fromSyllabus = courses
    .flatMap((c) => c.units.flatMap((u) => u.topics))
    .filter((t) => !t.revised)
    .slice(0, 3)
    .map((t) => `Explain ${t.title}`);
  const extra = DEPT_SUGGESTIONS[department ?? ""] ?? ["Explain this topic simply", "Make a revision sheet"];
  return [...fromSyllabus, ...extra].slice(0, 3);
}
