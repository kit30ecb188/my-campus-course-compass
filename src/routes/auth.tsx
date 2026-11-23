import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, MailCheck } from "lucide-react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).catch("signin") });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in or register — Syllabex" },
      { name: "description", content: "Sign in to Syllabex or create your free student account." },
      { property: "og:title", content: "Sign in or register — Syllabex" },
      { property: "og:description", content: "Sign in to Syllabex or create your free student account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const credSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password needs at least 8 characters").max(72),
});

function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
  );
}

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = credSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setBusy(true);
    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        ...parsed.data,
        options: { emailRedirectTo: window.location.origin },
      });
      setBusy(false);
      if (error) return void toast.error(error.message);
      if (data.session) navigate({ to: "/onboarding" });
      else setSentTo(parsed.data.email);
    } else {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      setBusy(false);
      if (error) return void toast.error(error.message);
      navigate({ to: "/dashboard" });
    }
  }

  async function social(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) return void toast.error("Couldn't sign in. Please try again.");
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  async function forgot() {
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) return void toast.error("Type your email above first");
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Check your email for a reset link");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
      <div className="flex items-center justify-between">
        <Brand subtitle={false} />
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" /> Back
        </Link>
      </div>

      <div className="surface animate-rise mt-10 p-6 sm:p-8">
        {sentTo ? (
          <div className="text-center">
            <MailCheck className="mx-auto size-10 text-primary" />
            <h1 className="mt-4 text-2xl font-bold">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a confirmation link to <b>{sentTo}</b>. Open it to finish registering — then we'll ask a few
              quick questions about your course.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 rounded-xl bg-muted p-1 text-sm font-semibold">
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                className={`rounded-lg py-2 text-center ${!isSignup ? "bg-card text-primary shadow" : "text-muted-foreground"}`}
              >
                Sign in
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className={`rounded-lg py-2 text-center ${isSignup ? "bg-card text-primary shadow" : "text-muted-foreground"}`}
              >
                Register
              </Link>
            </div>
            <h1 className="text-2xl font-bold">{isSignup ? "Create your account" : "Welcome back"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSignup ? "New to Syllabex? It takes a minute." : "Sign in to see your courses and syllabus."}
            </p>

            <div className="mt-6 grid gap-2">
              <Button type="button" variant="outline" size="xl" className="w-full" onClick={() => social("google")}>
                <GoogleLogo /> Continue with Google
              </Button>
              <Button type="button" variant="outline" size="xl" className="w-full" onClick={() => social("lovable")}>
                <LovableMark /> Continue with Lovable
              </Button>
            </div>
            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {!isSignup && (
                    <button type="button" onClick={forgot} className="text-xs font-medium text-primary hover:underline">
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" size="xl" disabled={busy} className="w-full">
                {busy ? "Please wait…" : isSignup ? "Register" : "Sign in"}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
