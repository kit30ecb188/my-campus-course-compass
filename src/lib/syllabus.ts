/**
 * Syllabus model: a course has units, a unit has topics, and each topic carries the
 * student's own progress (revised tick + confidence). All readiness numbers come from here.
 */

export type Confidence = 0 | 1 | 2 | 3;
export const CONFIDENCE_LABELS: Record<Exclude<Confidence, 0>, string> = { 1: "Low", 2: "Medium", 3: "High" };

export type Topic = { id: string; title: string; revised: boolean; confidence: Confidence };
export type Unit = { id: string; title: string; marks: string | null; topics: Topic[] };

export const MAX_UNITS = 40;
export const MAX_TOPICS_PER_UNIT = 80;
export const MAX_TITLE_LENGTH = 150;

// ---------- progress ----------

export function percent(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function countTopics(units: readonly Unit[]): { revised: number; total: number } {
  let revised = 0;
  let total = 0;
  for (const u of units) {
    for (const t of u.topics) {
      total += 1;
      if (t.revised) revised += 1;
    }
  }
  return { revised, total };
}

/** Share of a unit's topics ticked as revised. */
export function unitProgress(unit: Pick<Unit, "topics">): number {
  return percent(unit.topics.filter((t) => t.revised).length, unit.topics.length);
}

/** Share of all topics in the course ticked as revised (every topic counts equally). */
export function courseProgress(course: { units: readonly Unit[] }): number {
  const { revised, total } = countTopics(course.units);
  return percent(revised, total);
}

export type Readiness = { percent: number; revised: number; total: number; courseCount: number; scope: "semester" | "all" };

/**
 * Semester readiness = revised topics / all topics across the courses of the student's semester.
 * If no course is tagged with that semester yet, all courses count.
 */
export function semesterReadiness(
  courses: readonly { semester: number | null; units: readonly Unit[] }[],
  semester: number | null,
): Readiness {
  const inSem = courses.filter((c) => semester != null && c.semester === semester);
  const scope = inSem.length > 0 ? "semester" : "all";
  const list = scope === "semester" ? inSem : courses;
  const counts = countTopics(list.flatMap((c) => c.units));
  return { ...counts, percent: percent(counts.revised, counts.total), courseCount: list.length, scope };
}

/** Topics the student rated as low confidence. */
export function lowConfidenceTopics<C extends { id: string; code: string; units: readonly Unit[] }>(courses: readonly C[]) {
  return courses.flatMap((c) =>
    c.units.flatMap((u) => u.topics.filter((t) => t.confidence === 1).map((t) => ({ course: c, unit: u, topic: t }))),
  );
}

// ---------- pasted syllabus parsing ----------

const UNIT_RE = /^(?:unit|module)\s*[-–—:.]?\s*([ivxl]+|\d{1,2})(?![a-z])\.?\s*[-–—:.)]?\s*(.*)$/i;
const STOP_RE = /^(?:total\s*[:\-–]?\s*\d+|course\s+outcomes?|outcomes?\b|text\s*books?|references?\b|reference\s+books?)/i;
const SPLIT_RE = /\s[–—-]\s|[–—]|;|•|·|\u2022/;

function squash(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function cleanItem(s: string): string {
  return squash(s)
    .replace(/^(?:[-*•·]+|\d{1,2}[.)])\s*/, "")
    .replace(/[\s.:,;–—-]+$/, "")
    .slice(0, MAX_TITLE_LENGTH)
    .trim();
}

function cleanUnitTitle(raw: string): { title: string; marks: string } {
  const [head = "", marks = ""] = raw.split("|");
  // Drop trailing hour counts like "INTRODUCTION 9" or "Basics (9 hours)".
  let title = squash(head).replace(/\s*\(?\s*\d{1,2}\s*(?:hours?|hrs?|periods?|l)?\s*\)?\s*$/i, "");
  title = cleanItem(title);
  return { title, marks: squash(marks) };
}

const sameText = (a: string, b: string) => squash(a).toLowerCase() === squash(b).toLowerCase();

function uniqueItems(items: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of items) {
    const item = cleanItem(raw);
    if (item.length < 2 || out.some((o) => sameText(o, item))) continue;
    out.push(item);
    if (out.length >= MAX_TOPICS_PER_UNIT) break;
  }
  return out;
}

/** Topics from a unit's body text: dash/semicolon separated text is split (wrapped lines are joined first); otherwise one per line. */
export function splitTopics(lines: readonly string[]): string[] {
  const body = lines.map(squash).filter(Boolean);
  if (body.some((l) => SPLIT_RE.test(` ${l} `))) return uniqueItems(body.join(" ").split(SPLIT_RE));
  return uniqueItems(body);
}

export type ParsedUnit = { title: string; marks: string; topics: string[] };

/**
 * Reads pasted syllabus text (Anna University style "UNIT I INTRODUCTION 9" headers followed by
 * "topic – topic – topic" text) into units and topics. Text without unit headers becomes one unit.
 */
export function parseSyllabus(text: string): ParsedUnit[] {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\t/g, " ").trim()).filter(Boolean);
  const hasHeaders = lines.some((l) => UNIT_RE.test(l));
  if (!hasHeaders) {
    const topics = splitTopics(lines);
    return topics.length ? [{ title: "Unit 1", marks: "", topics }] : [];
  }
  const units: { title: string; marks: string; body: string[] }[] = [];
  for (const line of lines) {
    const m = UNIT_RE.exec(line);
    if (m) {
      if (units.length >= MAX_UNITS) break;
      const { title, marks } = cleanUnitTitle(m[2] ?? "");
      units.push({ title: title || `Unit ${m[1]?.toUpperCase()}`, marks, body: [] });
      continue;
    }
    const current = units[units.length - 1];
    if (!current) continue; // course objectives etc. before the first unit
    if (STOP_RE.test(line)) break;
    current.body.push(line);
  }
  return units.map((u) => ({ title: u.title, marks: u.marks, topics: splitTopics(u.body) }));
}

// ---------- course editor ----------

/** One unit as shown in the add/edit course form. Topics are edited one per line. */
export type DraftUnit = { key: string; id?: string; title: string; marks: string; topicsText: string };
export type SaveTopic = { id?: string; title: string };
export type SaveUnit = { id?: string; title: string; marks: string; topics: SaveTopic[] };

let draftSeq = 0;
const nextKey = () => `d${++draftSeq}`;

export function emptyDraft(): DraftUnit {
  return { key: nextKey(), title: "", marks: "", topicsText: "" };
}

export function draftsFromUnits(units: readonly Unit[]): DraftUnit[] {
  return units.map((u) => ({
    key: nextKey(),
    id: u.id,
    title: u.title,
    marks: u.marks ?? "",
    topicsText: u.topics.map((t) => t.title).join("\n"),
  }));
}

export function draftsFromParsed(parsed: readonly ParsedUnit[]): DraftUnit[] {
  return parsed.map((p) => ({ key: nextKey(), title: p.title, marks: p.marks, topicsText: p.topics.join("\n") }));
}

export function topicLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(cleanItem)
    .filter((l) => l.length > 0);
}

/**
 * Turns the form's units into what gets saved. Topics whose name is unchanged keep their id,
 * so their revised tick and confidence survive editing. A unit with no topics gets one topic
 * named after the unit, so it can still be ticked off.
 */
export function toSavePayload(drafts: readonly DraftUnit[], previous: readonly Unit[]): SaveUnit[] {
  const prev = previous.flatMap((u) => u.topics.map((t) => ({ id: t.id, title: t.title, unitId: u.id })));
  const used = new Set<string>();
  const out: SaveUnit[] = [];
  drafts.forEach((d) => {
    const lines = topicLines(d.topicsText);
    const typedTitle = cleanItem(d.title);
    if (!typedTitle && lines.length === 0) return;
    const title = typedTitle || `Unit ${out.length + 1}`;
    const names = lines.length > 0 ? lines : [title];
    const topics = names.map((name): SaveTopic => {
      const match =
        prev.find((t) => !used.has(t.id) && t.unitId === d.id && sameText(t.title, name)) ??
        prev.find((t) => !used.has(t.id) && sameText(t.title, name));
      if (!match) return { title: name };
      used.add(match.id);
      return { id: match.id, title: name };
    });
    out.push({ ...(d.id ? { id: d.id } : {}), title, marks: d.marks.trim(), topics });
  });
  return out;
}
