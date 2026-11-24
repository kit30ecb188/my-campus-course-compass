import { useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ClipboardPaste, Plus, Trash2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { coursesQuery } from "@/lib/queries";
import { DEPARTMENTS, courseSchema, findDuplicateCourse, type Course, type Profile } from "@/lib/profile";
import {
  MAX_UNITS,
  draftsFromParsed,
  draftsFromUnits,
  emptyDraft,
  parseSyllabus,
  toSavePayload,
  topicLines,
  type DraftUnit,
} from "@/lib/syllabus";
import { Field, NativeSelect } from "@/components/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type FormState = {
  code: string;
  title: string;
  department: string;
  semester: number;
  regulation: string;
  university: string;
};

export function AddCourseDialog({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" size="xl" data-tour="add-course">
          <Plus /> Add course
        </Button>
      </DialogTrigger>
      <CourseDialogContent title="Add a course" description="Paste your syllabus or type the units and topics yourself.">
        {open && (
          <CourseForm
            initial={{
              code: "",
              title: "",
              department: "",
              semester: profile.semester ?? 1,
              regulation: profile.regulation ?? "",
              university: profile.university ?? profile.college ?? "",
            }}
            initialUnits={[emptyDraft()]}
            onDone={() => setOpen(false)}
          />
        )}
      </CourseDialogContent>
    </Dialog>
  );
}

export function EditCourseDialog({ course, open, onOpenChange }: { course: Course; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <CourseDialogContent title="Edit course" description="Change the details, units or topics. Ticks stay on topics you don't rename.">
        {open && (
          <CourseForm
            editing={course}
            initial={{
              code: course.code,
              title: course.title,
              department: course.department,
              semester: course.semester ?? 1,
              regulation: course.regulation ?? "",
              university: course.university ?? "",
            }}
            initialUnits={course.units.length ? draftsFromUnits(course.units) : [emptyDraft()]}
            onDone={() => onOpenChange(false)}
          />
        )}
      </CourseDialogContent>
    </Dialog>
  );
}

function CourseDialogContent({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  );
}

function CourseForm({
  initial,
  initialUnits,
  editing,
  onDone,
}: {
  initial: FormState;
  initialUnits: DraftUnit[];
  editing?: Course;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: courses } = useSuspenseQuery(coursesQuery);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>(initial);
  const [units, setUnits] = useState<DraftUnit[]>(initialUnits);
  const [paste, setPaste] = useState("");
  const [pasteOpen, setPasteOpen] = useState(!editing);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setUnit = (key: string, patch: Partial<DraftUnit>) => setUnits((us) => us.map((u) => (u.key === key ? { ...u, ...patch } : u)));

  const duplicate = findDuplicateCourse(courses, { code: form.code, title: form.title }, editing?.id);
  const topicTotal = units.reduce((n, u) => n + topicLines(u.topicsText).length, 0);

  function readPaste() {
    const parsed = parseSyllabus(paste);
    if (parsed.length === 0) return void toast.error("Couldn't find any units or topics in that text.");
    const hasTyped = units.some((u) => u.title.trim() || u.topicsText.trim());
    if (hasTyped && !window.confirm("Replace the units below with the ones from your pasted syllabus?")) return;
    setUnits(draftsFromParsed(parsed));
    setPasteOpen(false);
    toast.success(`Found ${parsed.length} ${parsed.length === 1 ? "unit" : "units"} and ${parsed.reduce((n, u) => n + u.topics.length, 0)} topics. Check them below.`);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = toSavePayload(units, editing?.units ?? []);
    const parsed = courseSchema.safeParse({ ...form, units: payload });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    if (duplicate) return void toast.warning(`You already added this course: ${duplicate.code} – ${duplicate.title}`);
    setErrors({});
    setBusy(true);
    const { code, title, department, semester, regulation, university } = parsed.data;
    const course = { code, title, department, semester, regulation, university };
    const { error } = await supabase.rpc("save_course", {
      p_course_id: (editing?.id ?? null) as unknown as string,
      p_course: course as unknown as Json,
      p_units: payload as unknown as Json,
    });
    setBusy(false);
    if (error) return void toast.error(editing ? "Couldn't save the course. Please try again." : "Couldn't add the course. Please try again.");
    await queryClient.invalidateQueries({ queryKey: ["courses"] });
    toast.success(editing ? `${parsed.data.title} updated` : `${parsed.data.title} added to ${parsed.data.department}`);
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="rounded-xl border border-highlight bg-highlight/20 p-4">
        <Field label="Which department is this course for?" htmlFor="c-dept" error={errors["department"]}>
          <NativeSelect id="c-dept" value={form.department} onChange={(e) => set("department", e.target.value)}>
            <option value="">Choose a department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <Field label="Course code" htmlFor="c-code" error={errors["code"]}>
          <Input id="c-code" value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="CS3401" />
        </Field>
        <Field label="Course name" htmlFor="c-title" error={errors["title"]}>
          <Input id="c-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Algorithms" />
        </Field>
      </div>
      {duplicate && (
        <div role="alert" className="flex gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            You already added this course: <b>{duplicate.code}</b> – {duplicate.title}. Change the code or name, or edit the
            saved course instead.
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Semester" htmlFor="c-sem">
          <NativeSelect id="c-sem" value={form.semester} onChange={(e) => set("semester", Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Regulation" htmlFor="c-reg">
          <Input id="c-reg" value={form.regulation} onChange={(e) => set("regulation", e.target.value)} placeholder="R2021" />
        </Field>
      </div>
      <Field label="University" htmlFor="c-uni">
        <Input id="c-uni" value={form.university} onChange={(e) => set("university", e.target.value)} />
      </Field>

      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <button type="button" onClick={() => setPasteOpen((o) => !o)} className="flex w-full items-center gap-2 text-left text-sm font-semibold">
          <ClipboardPaste className="size-4 text-primary" /> Paste syllabus text {pasteOpen ? "" : "(optional)"}
        </button>
        {pasteOpen && (
          <div className="mt-3 grid gap-2">
            <Textarea
              rows={6}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              aria-label="Paste syllabus text"
              placeholder={"UNIT I INTRODUCTION 9\nNotion of an Algorithm – Fundamentals of Algorithmic Problem Solving – Important Problem Types\nUNIT II BRUTE FORCE AND DIVIDE AND CONQUER 9\nSelection sort – Bubble sort – Merge sort – Quick sort"}
            />
            <p className="text-xs text-muted-foreground">
              Copy the units straight from your syllabus. Lines starting with "UNIT" become units; the text under them becomes topics.
            </p>
            <Button type="button" variant="soft" onClick={readPaste} disabled={!paste.trim()} className="justify-self-start">
              <Wand2 /> Read units & topics
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">
            Units & topics · {units.length}/{MAX_UNITS} units · {topicTotal} topics
          </p>
        </div>
        {errors["units"] && <p className="text-xs font-medium text-destructive">{errors["units"]}</p>}
        {units.map((u, i) => (
          <div key={u.key} className="grid gap-2 rounded-xl border border-border bg-card p-3">
            <div className="flex items-end gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-[2fr_1fr]">
                <Input
                  value={u.title}
                  onChange={(e) => setUnit(u.key, { title: e.target.value })}
                  placeholder={`Unit ${i + 1} name, e.g. Introduction`}
                  aria-label={`Unit ${i + 1} name`}
                />
                <Input
                  value={u.marks}
                  onChange={(e) => setUnit(u.key, { marks: e.target.value })}
                  placeholder="Marks (optional)"
                  aria-label={`Unit ${i + 1} marks`}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove unit ${i + 1}`}
                onClick={() => setUnits((us) => (us.length > 1 ? us.filter((x) => x.key !== u.key) : [emptyDraft()]))}
              >
                <Trash2 />
              </Button>
            </div>
            <Textarea
              rows={3}
              value={u.topicsText}
              onChange={(e) => setUnit(u.key, { topicsText: e.target.value })}
              placeholder={"Topics, one per line\nAsymptotic notations\nRecurrence relations"}
              aria-label={`Unit ${i + 1} topics`}
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => setUnits((us) => [...us, emptyDraft()])}
          disabled={units.length >= MAX_UNITS}
          className="justify-self-start"
        >
          <Plus /> Add unit
        </Button>
      </div>

      <Button type="submit" size="xl" disabled={busy || Boolean(duplicate)}>
        {busy ? (editing ? "Saving…" : "Adding…") : editing ? "Save changes" : "Add course"}
      </Button>
    </form>
  );
}
