import { useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { coursesQuery } from "@/lib/queries";
import {
  DEPARTMENTS,
  MAX_UNITS,
  courseSchema,
  findDuplicateCourse,
  mergeUnits,
  parseUnits,
  unitsToText,
  type Course,
  type Profile,
} from "@/lib/profile";
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
  units: string;
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
      <CourseDialogContent title="Add a course" description="Add a subject from your syllabus to track its units.">
        <CourseForm
          profileId={profile.id}
          initial={{
            code: "",
            title: "",
            department: "",
            semester: profile.semester ?? 1,
            regulation: "Regulation 2021",
            university: profile.college ?? "",
            units: "",
          }}
          onDone={() => setOpen(false)}
        />
      </CourseDialogContent>
    </Dialog>
  );
}

export function EditCourseDialog({
  course,
  profileId,
  open,
  onOpenChange,
}: {
  course: Course;
  profileId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <CourseDialogContent title="Edit course" description="Change the details or units of this course.">
        <CourseForm
          profileId={profileId}
          editing={course}
          initial={{
            code: course.code,
            title: course.title,
            department: course.department,
            semester: course.semester ?? 1,
            regulation: course.regulation ?? "",
            university: course.university ?? "",
            units: unitsToText(course.units),
          }}
          onDone={() => onOpenChange(false)}
        />
      </CourseDialogContent>
    </Dialog>
  );
}

function CourseDialogContent({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  );
}

function CourseForm({
  profileId,
  initial,
  editing,
  onDone,
}: {
  profileId: string;
  initial: FormState;
  editing?: Course;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: courses } = useSuspenseQuery(coursesQuery);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>(initial);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const unitCount = parseUnits(form.units).length;
  const duplicate = findDuplicateCourse(courses, { code: form.code, title: form.title }, editing?.id);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const lines = parseUnits(form.units);
    const parsed = courseSchema.safeParse({ ...form, units: lines });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    if (duplicate) {
      toast.warning(`You already added this course: ${duplicate.code} – ${duplicate.title}`);
      return;
    }
    setErrors({});
    setBusy(true);
    const { units, regulation, university, ...rest } = parsed.data;
    const row = {
      ...rest,
      regulation: regulation || null,
      university: university || null,
      code: rest.code.toUpperCase(),
      units: mergeUnits(units, editing?.units ?? []),
    };
    const { error } = editing
      ? await supabase.from("courses").update(row).eq("id", editing.id)
      : await supabase.from("courses").insert({ ...row, user_id: profileId });
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
      <div className="grid grid-cols-[1fr_2fr] gap-3">
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
          <Input id="c-reg" value={form.regulation} onChange={(e) => set("regulation", e.target.value)} />
        </Field>
      </div>
      <Field label="University / college" htmlFor="c-uni">
        <Input id="c-uni" value={form.university} onChange={(e) => set("university", e.target.value)} />
      </Field>
      <Field
        label={`Units & topics (one per line) · ${unitCount}/${MAX_UNITS}`}
        htmlFor="c-units"
        error={errors["units"]}
        hint='Optional marks after a bar, e.g. "Sorting | 20 Marks"'
      >
        <Textarea
          id="c-units"
          rows={8}
          value={form.units}
          onChange={(e) => set("units", e.target.value)}
          placeholder={"Introduction\nBrute force & divide and conquer\nDynamic programming"}
        />
      </Field>
      <Button type="submit" size="xl" disabled={busy || Boolean(duplicate)}>
        {busy ? (editing ? "Saving…" : "Adding…") : editing ? "Save changes" : "Add course"}
      </Button>
    </form>
  );
}
