import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { profileQuery } from "@/lib/queries";
import { COLLEGES, QUESTIONS, SAMPLE_COURSES, SESSIONS } from "@/lib/question-bank";
import { Field, NativeSelect } from "@/components/Field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/question-bank")({
  head: () => ({
    meta: [
      { title: "University question bank — Syllabex" },
      { name: "description", content: "Past papers from Anna University, PSG Tech, CIT and autonomous colleges, filtered by unit and marks." },
      { property: "og:title", content: "University question bank — Syllabex" },
      { property: "og:description", content: "Past papers filtered by course, unit, exam session, college and marks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuestionBank,
});

const MARKS = [
  { v: 0, l: "All marks" },
  { v: 2, l: "2 Marks (Part A)" },
  { v: 5, l: "5 Marks" },
  { v: 10, l: "10 Marks" },
  { v: 16, l: "16 Marks (Part B)" },
];

const markTone: Record<number, string> = {
  2: "bg-success-soft text-success",
  5: "bg-primary-soft text-primary",
  10: "bg-highlight/50 text-highlight-foreground",
  16: "bg-hot-soft text-hot",
};

function QuestionBank() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [course, setCourse] = useState("");
  const [unit, setUnit] = useState(0);
  const [session, setSession] = useState("");
  const [college, setCollege] = useState("");
  const [marks, setMarks] = useState(0);

  const list = QUESTIONS.filter(
    (x) =>
      (!course || x.course === course) &&
      (!unit || x.unit === unit) &&
      (!session || x.session === session) &&
      (!college || x.college === college) &&
      (!marks || x.marks === marks) &&
      (!q.trim() || x.text.toLowerCase().includes(q.toLowerCase())),
  );

  const ask = (text: string) => navigate({ to: "/tutor", search: { q: text } });

  return (
    <div className="grid gap-8">
      <section className="animate-rise">
        <span className="rounded-full bg-hot-soft px-3 py-1 text-xs font-semibold text-hot">AU Hot · updated for Nov/Dec 2026</span>
        <h1 className="mt-4 text-4xl font-extrabold">University question bank</h1>
        <p className="mt-2 text-muted-foreground">
          Past papers from Anna University, PSG Tech, CIT & autonomous colleges — picked for {profile?.nickname}'s exams.
        </p>
      </section>

      <section className="surface p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) ask(q.trim());
          }}
          className="flex items-center gap-2 rounded-2xl border border-input bg-card py-1.5 pl-4 pr-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring"
        >
          <Search className="size-5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search past questions (e.g. Hall effect, SCR, depletion region)…"
            className="h-10 flex-1 bg-transparent text-sm outline-none"
            aria-label="Search past questions"
          />
          <Button type="submit" size="sm" className="h-9 rounded-xl">
            <Sparkles /> Ask AI
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          Try asking:
          {["Which questions repeat the most?", "Make a 2-mark revision sheet for Unit 1", "How do I score full marks in a 16M answer?"].map((s) => (
            <Button key={s} variant="chip" size="chip" onClick={() => ask(s)}>
              {s}
            </Button>
          ))}
        </div>
        <div className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Course" htmlFor="f-course">
            <NativeSelect id="f-course" value={course} onChange={(e) => setCourse(e.target.value)}>
              <option value="">All courses</option>
              {SAMPLE_COURSES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} – {c.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Unit" htmlFor="f-unit">
            <NativeSelect id="f-unit" value={unit} onChange={(e) => setUnit(Number(e.target.value))}>
              <option value={0}>All units</option>
              {[1, 2, 3, 4, 5].map((u) => (
                <option key={u} value={u}>
                  Unit {u}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Exam session" htmlFor="f-session">
            <NativeSelect id="f-session" value={session} onChange={(e) => setSession(e.target.value)}>
              <option value="">All sessions</option>
              {SESSIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="University / college" htmlFor="f-college">
            <NativeSelect id="f-college" value={college} onChange={(e) => setCollege(e.target.value)}>
              <option value="">All colleges</option>
              {COLLEGES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          Marks:
          {MARKS.map((m) => (
            <Button key={m.v} variant={marks === m.v ? "chipActive" : "chip"} size="chip" onClick={() => setMarks(m.v)}>
              {m.l}
            </Button>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-3 text-sm text-muted-foreground">
          Showing <b className="text-foreground">{list.length}</b> questions
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((x, i) => (
            <article key={i} className="surface flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono font-bold text-primary">{x.course}</span>
                <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-primary">Unit {x.unit}</span>
                <span className={cn("rounded-md px-1.5 py-0.5 font-bold", markTone[x.marks])}>{x.marks}M</span>
                <span className="ml-auto text-muted-foreground">
                  {x.college} · {x.session}
                </span>
              </div>
              <p className="flex-1">{x.text}</p>
              <Button
                variant="soft"
                size="sm"
                className="self-start"
                onClick={() => ask(`Write a ${x.marks}-mark model answer for: ${x.text}`)}
              >
                <Sparkles /> AI model answer
              </Button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
