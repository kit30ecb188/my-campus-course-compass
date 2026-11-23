import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DEPARTMENTS, courseSchema, parseUnits, toUnit, type Profile } from "@/lib/profile";
import { Field, NativeSelect } from "@/components/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AddCourseDialog({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const empty = {
    code: "",
    title: "",
    department: "",
    semester: profile.semester ?? 1,
    regulation: "Regulation 2021",
    university: profile.college ?? "",
    units: "",
  };
  const [form, setForm] = useState(empty);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = courseSchema.safeParse({ ...form, units: parseUnits(form.units) });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    const { units, regulation, university, ...rest } = parsed.data;
    const { error } = await supabase.from("courses").insert({
      ...rest,
      regulation: regulation || null,
      university: university || null,
      code: rest.code.toUpperCase(),
      user_id: profile.id,
      units: units.map(toUnit),
    });
    setBusy(false);
    if (error) return void toast.error("Couldn't add the course. Please try again.");
    await queryClient.invalidateQueries({ queryKey: ["courses"] });
    toast.success(`${parsed.data.title} added to ${parsed.data.department}`);
    setForm(empty);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" size="xl" data-tour="add-course">
          <Plus /> Add course
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add a course</DialogTitle>
          <DialogDescription>Add a subject from your syllabus to track its units.</DialogDescription>
        </DialogHeader>
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
          <Field label="Units (one per line)" htmlFor="c-units" hint='Optional marks after a bar, e.g. "Sorting | 20 Marks"'>
            <Textarea
              id="c-units"
              rows={5}
              value={form.units}
              onChange={(e) => set("units", e.target.value)}
              placeholder={"Introduction\nBrute force & divide and conquer\nDynamic programming"}
            />
          </Field>
          <Button type="submit" size="xl" disabled={busy}>
            {busy ? "Adding…" : "Add course"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
