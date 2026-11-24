import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { BookOpenCheck, ChevronsUpDown, Library, MessagesSquare, Search, Sparkles, LayoutGrid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { coursesQuery, profileQuery } from "@/lib/queries";
import { showCoursesSection, suggestionsFor } from "@/lib/profile";
import { AddCourseDialog } from "@/components/AddCourseDialog";
import { TutorAnswers } from "@/components/TutorAnswers";
import { useTutorChat } from "@/hooks/use-tutor-chat";
import { useAnswerLanguage } from "@/hooks/use-answer-language";
import { CourseCard } from "@/components/CourseCard";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/_app/dashboard")({
  validateSearch: z.object({ tour: z.boolean().optional() }),
  head: () => ({
    meta: [
      { title: "My syllabus dashboard — Syllabex" },
      { name: "description", content: "Your courses, units and revision progress, set up for your semester." },
      { property: "og:title", content: "My syllabus dashboard — Syllabex" },
      { property: "og:description", content: "Your courses, units and revision progress, set up for your semester." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(coursesQuery),
  component: Dashboard,
});

const TOUR: TourStep[] = [
  { target: "nav-dashboard", title: "Syllabus Dashboard", body: "Your home. All your courses, units and revision progress live here." },
  { target: "nav-qbank", title: "Question Bank", body: "Past university papers. Filter by course, unit, exam session, college and marks." },
  { target: "profile-bar", title: "Your details", body: "Your college, department and semester. Switch the AI answer language between your languages here." },
  { target: "search", title: "Search & Ask AI", body: "This is your AI Tutor. Type a topic to find it in your courses, or press Ask AI — the answer appears right here, shaped for 2 marks or 16 marks." },
  { target: "add-course", title: "Add course", body: "Add each subject from your syllabus. We'll ask which department it belongs to." },
  { target: "courses", title: "My courses & syllabus", body: "Once you add a course it shows up here with its units. Tick units as you revise them." },
  { target: "account", title: "Your account", body: "Edit your details, replay this tour or sign out from here." },
];

function Dashboard() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: courses } = useSuspenseQuery(coursesQuery);
  const { tour } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [welcomeOpen, setWelcomeOpen] = useState(Boolean(tour) || !profile?.tour_completed);
  const [tourOpen, setTourOpen] = useState(false);

  const p = profile!;
  const [language] = useAnswerLanguage(p.languages, p.id);
  const chat = useTutorChat(language);
  const suggestions = suggestionsFor(p.department);
  const semesters = useMemo(
    () => [...new Set(courses.map((c) => c.semester).filter((s): s is number => s != null))].sort(),
    [courses],
  );
  const departments = useMemo(() => [...new Set(courses.map((c) => c.department))], [courses]);

  const visible = courses.filter((c) => {
    if (filter.startsWith("sem:") && String(c.semester) !== filter.slice(4)) return false;
    if (filter.startsWith("dept:") && c.department !== filter.slice(5)) return false;
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return (
      c.title.toLowerCase().includes(needle) ||
      c.code.toLowerCase().includes(needle) ||
      c.units.some((u) => u.title.toLowerCase().includes(needle))
    );
  });

  async function finishTour() {
    setTourOpen(false);
    setWelcomeOpen(false);
    if (tour) navigate({ to: "/dashboard", search: {}, replace: true });
    if (!p.tour_completed) {
      await supabase.from("profiles").update({ tour_completed: true }).eq("id", p.id);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  }

  function ask(text: string) {
    setQ("");
    void chat.send(text);
  }

  const allOpen = visible.length > 0 && visible.every((c) => expanded[c.id]);

  return (
    <div className="grid gap-10">
      <section className="animate-rise">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-highlight px-3 py-1 text-xs font-semibold text-highlight-foreground">
            Exam season mode · Nov/Dec 2026
          </span>
          <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            Year {p.year} · Semester {p.semester} · {p.department}
          </span>
        </div>
        <p className="mt-4 font-display text-lg text-muted-foreground">Hi {p.nickname} 👋</p>
        <h1 className="mt-1 max-w-2xl text-4xl font-extrabold sm:text-5xl">
          Find any topic, then <span className="marker-highlight">ask the AI</span> to explain it your way.
        </h1>
      </section>

      <section className="surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <form
            data-tour="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) ask(q.trim());
            }}
            className="flex flex-1 items-center gap-2 rounded-2xl border border-input bg-card py-1.5 pl-4 pr-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring"
          >
            <Search className="size-5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search courses, units or topics…"
              className="h-10 flex-1 bg-transparent text-sm outline-none"
              aria-label="Search courses, units or topics"
            />
            <Button type="submit" size="sm" className="h-9 rounded-xl" disabled={chat.busy}>
              <Sparkles /> Ask AI
            </Button>
          </form>
          <AddCourseDialog profile={p} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          Try asking:
          {suggestions.map((s) => (
            <Button key={s} variant="chip" size="chip" onClick={() => ask(s)}>
              {s}
            </Button>
          ))}
        </div>
        <TutorAnswers
          messages={chat.messages}
          busy={chat.busy}
          language={language}
          onSend={chat.send}
          onClear={chat.clear}
        />
        {showCoursesSection(courses) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            Filter:
            <Button variant={filter === "all" ? "chipActive" : "chip"} size="chip" onClick={() => setFilter("all")}>
              All courses
            </Button>
            {semesters.map((s) => (
              <Button key={s} variant={filter === `sem:${s}` ? "chipActive" : "chip"} size="chip" onClick={() => setFilter(`sem:${s}`)}>
                Semester {s}
                {s === p.semester ? " (mine)" : ""}
              </Button>
            ))}
            {departments.length > 1 &&
              departments.map((d) => (
                <Button key={d} variant={filter === `dept:${d}` ? "chipActive" : "chip"} size="chip" onClick={() => setFilter(`dept:${d}`)}>
                  {d}
                </Button>
              ))}
          </div>
        )}
      </section>

      <section data-tour="courses">
        {showCoursesSection(courses) ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-3 text-2xl font-bold">
                <Library className="size-6 text-primary" /> My courses & syllabus
                <span className="rounded-full bg-primary-soft px-2 py-0.5 font-sans text-xs font-semibold text-primary">
                  {courses.length} {courses.length === 1 ? "course" : "courses"}
                </span>
              </h2>
              <button
                onClick={() => setExpanded(Object.fromEntries(visible.map((c) => [c.id, !allOpen])))}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary"
              >
                <ChevronsUpDown className="size-4" /> {allOpen ? "Collapse all" : "Expand all"}
              </button>
            </div>
            <div className="grid gap-4">
              {visible.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  profileId={p.id}
                  expanded={Boolean(expanded[c.id])}
                  onToggle={() => setExpanded((e) => ({ ...e, [c.id]: !e[c.id] }))}
                />
              ))}
              {visible.length === 0 && <p className="text-sm text-muted-foreground">No courses match that search.</p>}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-primary/25 bg-card/60 p-10 text-center">
            <Library className="mx-auto size-10 text-primary" />
            <h2 className="mt-3 text-2xl font-bold">Start by adding your first course</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Press <b>Add course</b> above and pick a subject from your Semester {p.semester} syllabus. Its units and
              revision progress will appear here.
            </p>
          </div>
        )}
      </section>

      <Dialog open={welcomeOpen && !tourOpen} onOpenChange={(o) => (o ? setWelcomeOpen(true) : finishTour())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Welcome to Syllabex, {p.nickname}! 🎓</DialogTitle>
            <DialogDescription>
              Here's what Syllabex does for a {p.department} student in Semester {p.semester}.
            </DialogDescription>
          </DialogHeader>
          <ul className="grid gap-3">
            {[
              { icon: LayoutGrid, t: "Syllabus Dashboard", d: "Add your courses and track which units you've revised." },
              { icon: BookOpenCheck, t: "Question Bank", d: "Past university papers by unit, marks, session and college." },
              { icon: MessagesSquare, t: "AI Tutor (search box)", d: `Ask in the search box on this page. Answers in ${p.languages.join(" or ")}, shaped for 2M or 16M.` },
            ].map(({ icon: Icon, t, d }) => (
              <li key={t} className="flex gap-3 rounded-xl bg-muted p-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-sm text-muted-foreground">{d}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={finishTour}>
              Skip
            </Button>
            <Button onClick={() => setTourOpen(true)}>Show me where everything is</Button>
          </div>
        </DialogContent>
      </Dialog>
      <GuidedTour steps={TOUR} open={tourOpen} onClose={finishTour} />
    </div>
  );
}
