import { describe, expect, it } from "vitest";
import { courseSchema, profileSchema, semestersForYear, showCoursesSection } from "@/lib/profile";

const valid = {
  full_name: "Priya Raman",
  nickname: "Priya",
  year: 2,
  semester: 3,
  languages: ["English", "Tamil"],
  department: "CSE",
  college: "PSG Tech",
  city: "Coimbatore",
  state: "Tamil Nadu",
};

describe("sign-up profile rules", () => {
  it("accepts a complete profile", () => {
    expect(profileSchema.safeParse(valid).success).toBe(true);
  });

  it("allows 1 language", () => {
    expect(profileSchema.safeParse({ ...valid, languages: ["English"] }).success).toBe(true);
  });

  it("rejects more than 2 languages", () => {
    expect(profileSchema.safeParse({ ...valid, languages: ["English", "Tamil", "Hindi"] }).success).toBe(false);
  });

  it("rejects zero languages", () => {
    expect(profileSchema.safeParse({ ...valid, languages: [] }).success).toBe(false);
  });

  it("requires a nickname", () => {
    expect(profileSchema.safeParse({ ...valid, nickname: " " }).success).toBe(false);
  });

  it("requires the semester to belong to the year", () => {
    expect(semestersForYear(2)).toEqual([3, 4]);
    expect(profileSchema.safeParse({ ...valid, year: 2, semester: 5 }).success).toBe(false);
  });
});

describe("course rules", () => {
  it("requires a department when adding a course", () => {
    const course = { code: "CS3401", title: "Algorithms", semester: 4, units: [] };
    expect(courseSchema.safeParse(course).success).toBe(false);
    expect(courseSchema.safeParse({ ...course, department: "CSE" }).success).toBe(true);
  });

  it("hides My courses & syllabus for a new user with no courses", () => {
    expect(showCoursesSection([])).toBe(false);
    expect(showCoursesSection([{ id: "1" }])).toBe(true);
  });
});
