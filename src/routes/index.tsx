import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpenCheck, MessagesSquare, Sparkles, UserPlus, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/Brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Welcome to Syllabex — sign in or register" },
      { name: "description", content: "Syllabex helps Indian college students revise their syllabus, past papers and ask an AI tutor. Sign in or create your account." },
      { property: "og:title", content: "Welcome to Syllabex" },
      { property: "og:description", content: "Revise your syllabus, past university papers and ask an AI tutor — made for Indian college students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-8">
      <Brand />
      <section className="flex flex-1 flex-col items-center justify-center py-12 text-center">
        <span className="animate-rise rounded-full bg-highlight px-3 py-1 text-xs font-semibold text-highlight-foreground">
          Exam season mode · Nov/Dec 2026
        </span>
        <h1 className="animate-rise mt-5 max-w-2xl text-4xl font-extrabold sm:text-5xl">
          Hi there! Do you <span className="marker-highlight">already have</span> a Syllabex account?
        </h1>
        <p className="animate-rise mt-4 max-w-xl text-muted-foreground">
          Sign in to pick up where you left off, or register in a minute and we'll set Syllabex up for your college,
          department and semester.
        </p>

        <div className="mt-10 grid w-full max-w-2xl gap-4 sm:grid-cols-2" aria-busy={checking}>
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="surface group flex flex-col items-start gap-3 p-6 text-left transition hover:-translate-y-0.5 hover:border-primary/40"
          >
            <div className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
              <LogIn className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Yes, I have an account</h2>
              <p className="text-sm text-muted-foreground">Sign in with your email or Google.</p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Sign in <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="group flex flex-col items-start gap-3 rounded-2xl bg-primary p-6 text-left text-primary-foreground shadow-card transition hover:-translate-y-0.5"
          >
            <div className="grid size-11 place-items-center rounded-xl bg-highlight text-highlight-foreground">
              <UserPlus className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">No, I'm new here</h2>
              <p className="text-sm opacity-85">Register free and tell us about your course.</p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold">
              Register <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        </div>

        <ul className="mt-14 grid w-full max-w-3xl gap-4 text-left sm:grid-cols-3">
          {[
            { icon: BookOpenCheck, title: "Syllabus dashboard", text: "Your courses, units and revision progress." },
            { icon: Sparkles, title: "Question bank", text: "Past university papers filtered by unit & marks." },
            { icon: MessagesSquare, title: "AI tutor", text: "Answers in your language, shaped for 2M or 16M." },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3 rounded-xl bg-card/60 p-4">
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
