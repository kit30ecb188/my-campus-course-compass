import { z } from "zod";

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
  city: string | null;
  state: string | null;
  onboarded: boolean;
  tour_completed: boolean;
};

export type Unit = { title: string; marks?: string; revised: boolean };

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

export const courseSchema = z.object({
  code: z.string().trim().min(2, "Enter the course code").max(20),
  title: z.string().trim().min(2, "Enter the course name").max(120),
  department: z.enum(DEPARTMENTS, {
    errorMap: () => ({ message: "Tell us which department this course is for" }),
  }),
  semester: z.number().int().min(1).max(8),
  regulation: z.string().trim().max(40).optional(),
  university: z.string().trim().max(120).optional(),
  units: z.array(z.string().trim().min(1).max(120)).max(12),
});

export type CourseInput = z.infer<typeof courseSchema>;

/** Turns "Semiconductor Physics | 20 Marks" lines into units. */
export function parseUnits(lines: string): string[] {
  return lines
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function toUnit(line: string): Unit {
  const [title, marks] = line.split("|").map((p) => p.trim());
  return marks ? { title: title ?? line, marks, revised: false } : { title: title ?? line, revised: false };
}

/** New users with no courses don't see the "My courses & syllabus" section. */
export function showCoursesSection(courses: readonly unknown[]): boolean {
  return courses.length > 0;
}

export function revisionProgress(units: readonly Unit[]): number {
  if (units.length === 0) return 0;
  return Math.round((units.filter((u) => u.revised).length / units.length) * 100);
}

const DEPT_SUGGESTIONS: Record<string, string[]> = {
  CSE: ["Explain deadlock for 16 marks", "Most repeated DBMS Unit 2 questions", "TCP vs UDP in 2 marks"],
  IT: ["Explain normalization for 16 marks", "Most repeated OS questions", "HTTP vs HTTPS in 2 marks"],
  ECE: ["Explain Zener breakdown for 16 marks", "Most repeated Unit 2 questions", "MOSFET vs JFET in 2 marks"],
  EEE: ["Explain transformer working for 16 marks", "Most repeated machines questions", "AC vs DC motor in 2 marks"],
  MECH: ["Explain Otto cycle for 16 marks", "Most repeated thermodynamics questions", "Stress vs strain in 2 marks"],
  CIVIL: ["Explain soil compaction for 16 marks", "Most repeated surveying questions", "RCC vs PCC in 2 marks"],
};

export function suggestionsFor(department: string | null | undefined): string[] {
  return DEPT_SUGGESTIONS[department ?? ""] ?? [
    "Explain this topic for 16 marks",
    "Most repeated Unit 1 questions",
    "Make a 2-mark revision sheet",
  ];
}
