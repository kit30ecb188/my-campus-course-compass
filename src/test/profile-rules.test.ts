import { describe, expect, it } from "vitest";
import {
  courseSchema,
  findDuplicateCourse,
  mergeUnits,
  parseUnits,
  profileSchema,
  semestersForYear,
  showCoursesSection,
} from "@/lib/profile";

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

describe("course units, editing and duplicates", () => {
  const base = { code: "CS3401", title: "Algorithms", department: "CSE", semester: 4 };

  it("keeps every unit line instead of cutting off after 12", () => {
    const text = Array.from({ length: 20 }, (_, i) => `Unit ${i + 1}`).join("\n");
    expect(parseUnits(text)).toHaveLength(20);
  });

  it("accepts up to 40 units and topics", () => {
    const units = Array.from({ length: 40 }, (_, i) => `Topic ${i + 1}`);
    expect(courseSchema.safeParse({ ...base, units }).success).toBe(true);
    expect(courseSchema.safeParse({ ...base, units: [...units, "Topic 41"] }).success).toBe(false);
  });

  const saved = [{ id: "a", code: "CS3401", title: "Algorithms" }];

  it("warns when the same course code is added again", () => {
    expect(findDuplicateCourse(saved, { code: "cs 3401", title: "Design of Algorithms" })?.id).toBe("a");
  });

  it("warns when the same course name is added again", () => {
    expect(findDuplicateCourse(saved, { code: "CS9999", title: "  algorithms " })?.id).toBe("a");
  });

  it("allows a different course", () => {
    expect(findDuplicateCourse(saved, { code: "MA3354", title: "Discrete Mathematics" })).toBeUndefined();
  });

  it("does not flag a course as a duplicate of itself while editing", () => {
    expect(findDuplicateCourse(saved, { code: "CS3401", title: "Algorithms" }, "a")).toBeUndefined();
  });

  it("keeps revised ticks on units whose title is unchanged after editing", () => {
    const previous = [
      { title: "Sorting", revised: true },
      { title: "Graphs", revised: false },
    ];
    expect(mergeUnits(["Sorting | 20 Marks", "Graphs", "Dynamic programming"], previous)).toEqual([
      { title: "Sorting", marks: "20 Marks", revised: true },
      { title: "Graphs", revised: false },
      { title: "Dynamic programming", revised: false },
    ]);
  });
});
