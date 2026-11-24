import { describe, expect, it } from "vitest";
import { accountChanged, noteSelectionSchema, notesFileName, youtubeSearchUrl } from "@/lib/study";

describe("study rules", () => {
  it("notes need at least one unit", () => {
    expect(noteSelectionSchema.safeParse([]).success).toBe(false);
  });

  it("notes allow up to 3 units but not 4", () => {
    expect(noteSelectionSchema.safeParse(["U1", "U2", "U3"]).success).toBe(true);
    expect(noteSelectionSchema.safeParse(["U1", "U2", "U3", "U4"]).success).toBe(false);
  });

  it("video links search YouTube in the student's language", () => {
    expect(youtubeSearchUrl("Zener diode", "Tamil")).toBe(
      "https://www.youtube.com/results?search_query=Zener%20diode%20in%20Tamil",
    );
    expect(youtubeSearchUrl("Zener diode", "English")).toBe(
      "https://www.youtube.com/results?search_query=Zener%20diode",
    );
  });

  it("switching to another account clears the old account's data", () => {
    expect(accountChanged("user-a", "user-b")).toBe(true);
    expect(accountChanged("user-a", null)).toBe(true);
    expect(accountChanged("user-a", "user-a")).toBe(false);
  });

  it("names the PDF after the course and unit", () => {
    expect(notesFileName("EC3301", ["Semiconductor Physics"])).toBe("ec3301-semiconductor-physics-notes.pdf");
  });
});
