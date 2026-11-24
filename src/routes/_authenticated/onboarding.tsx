import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/queries";
import {
  DEPARTMENTS,
  LANGUAGES,
  MAX_LANGUAGES,
  STATES,
  YEARS,
  profileSchema,
  semestersForYear,
} from "@/lib/profile";
import { Brand } from "@/components/Brand";
import { Field, NativeSelect } from "@/components/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Tell us about you — Syllabex" },
      { name: "description", content: "Set up Syllabex for your year, semester, department and college." },
      { property: "og:title", content: "Tell us about you — Syllabex" },
      { property: "og:description", content: "Set up Syllabex for your year, semester, department and college." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    const cached = await context.queryClient.ensureQueryData(profileQuery);
    if (!cached || cached.id !== context.user.id) await context.queryClient.fetchQuery({ ...profileQuery, staleTime: 0 });
  },
  component: Onboarding,
});

function Onboarding() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const editing = Boolean(profile?.onboarded);
  const { user } = Route.useRouteContext();

  async function switchAccount() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    nickname: profile?.nickname ?? "",
    year: profile?.year ?? 1,
    semester: profile?.semester ?? 1,
    languages: (profile?.languages ?? []) as string[],
    department: profile?.department ?? "",
    college: profile?.college ?? "",
    city: profile?.city ?? "",
    state: profile?.state ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function toggleLanguage(lang: string) {
    setForm((f) => {
      if (f.languages.includes(lang)) return { ...f, languages: f.languages.filter((l) => l !== lang) };
      if (f.languages.length >= MAX_LANGUAGES) {
        toast.message(`You can pick only ${MAX_LANGUAGES} languages`);
        return f;
      }
      return { ...f, languages: [...f.languages, lang] };
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? "form");
        errs[k] ??= issue.message;
      }
      setErrors(errs);
      toast.error("Please fill in the highlighted details");
      return;
    }
    setErrors({});
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ ...parsed.data, onboarded: true })
      .eq("id", profile!.id);
    setBusy(false);
    if (error) return void toast.error("Couldn't save your details. Please try again.");
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success(editing ? "Profile updated" : `Welcome to Syllabex, ${parsed.data.nickname}!`);
    navigate({ to: "/dashboard" });
  }

  const sems = semestersForYear(form.year);

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Brand />
      <form onSubmit={onSubmit} className="surface animate-rise mt-8 p-6 sm:p-8">
        <span className="rounded-full bg-highlight px-3 py-1 text-xs font-semibold text-highlight-foreground">
          {editing ? "Edit your profile" : "Step 2 of 2 · Almost done"}
        </span>
        <h1 className="mt-4 text-3xl font-extrabold">{editing ? "Your details" : "Tell us about you"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We use this to show your syllabus, past papers and AI answers for your college and semester.
        </p>
        {!editing && (
          <div className="mt-4 rounded-xl border border-highlight bg-highlight/20 p-4 text-sm">
            <p>
              You're setting up a <b>new account</b> for <b>{user.email}</b>.
            </p>
            <p className="mt-1 text-muted-foreground">
              Already filled in your details before? You probably used a different email or Google account.
            </p>
            <Button type="button" variant="link" className="h-auto px-0 py-1" onClick={switchAccount}>
              Sign in with my other account
            </Button>
          </div>
        )}

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <Field label="Your name" htmlFor="full_name" error={errors["full_name"]}>
            <Input id="full_name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Priya Raman" />
          </Field>
          <Field label="Nickname" htmlFor="nickname" hint="What should we call you?" error={errors["nickname"]}>
            <Input id="nickname" value={form.nickname} onChange={(e) => set("nickname", e.target.value)} placeholder="Priya" />
          </Field>
          <Field label="Year" htmlFor="year" error={errors["year"]}>
            <NativeSelect
              id="year"
              value={form.year}
              onChange={(e) => {
                const y = Number(e.target.value);
                setForm((f) => ({ ...f, year: y, semester: semestersForYear(y)[0] ?? 1 }));
              }}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Semester" htmlFor="semester" error={errors["semester"]}>
            <NativeSelect id="semester" value={form.semester} onChange={(e) => set("semester", Number(e.target.value))}>
              {sems.map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Department" htmlFor="department" error={errors["department"]}>
            <NativeSelect id="department" value={form.department} onChange={(e) => set("department", e.target.value)}>
              <option value="">Choose department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="College" htmlFor="college" error={errors["college"]}>
            <Input id="college" value={form.college} onChange={(e) => set("college", e.target.value)} placeholder="PSG College of Technology" />
          </Field>
          <Field label="City" htmlFor="city" error={errors["city"]}>
            <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Coimbatore" />
          </Field>
          <Field label="State" htmlFor="state" error={errors["state"]}>
            <NativeSelect id="state" value={form.state} onChange={(e) => set("state", e.target.value)}>
              <option value="">Choose state</option>
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <div className="mt-6">
          <Field
            label={`Language (pick 1 or 2) · ${form.languages.length}/${MAX_LANGUAGES}`}
            hint="The AI tutor will answer in these languages."
            error={errors["languages"]}
          >
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => {
                const on = form.languages.includes(lang);
                return (
                  <button
                    type="button"
                    key={lang}
                    onClick={() => toggleLanguage(lang)}
                    aria-pressed={on}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40",
                    )}
                  >
                    {on && <Check className="size-3.5" />} {lang}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <div className="mt-8 flex justify-end gap-2">
          {editing && (
            <Button type="button" variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="xl" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Continue to Syllabex"}
          </Button>
        </div>
      </form>
    </main>
  );
}
