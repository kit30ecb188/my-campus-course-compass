import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Compass, GraduationCap, Languages, LayoutGrid, LogOut, MapPin, BookOpen, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/profile";
import { useAnswerLanguage } from "@/hooks/use-answer-language";
import { Brand } from "@/components/Brand";
import { NativeSelect } from "@/components/Field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navClass =
  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-primary";
const activeNav = { className: `${navClass} bg-card text-primary shadow-sm` };

export function AppHeader({ profile }: { profile: Profile }) {
  const navigate = useNavigate();
  const { user } = useRouteContext({ from: "/_authenticated" });
  const queryClient = useQueryClient();
  const [language, setLanguage] = useAnswerLanguage(profile.languages, profile.id);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  const initials = (profile.nickname ?? profile.full_name ?? "?").slice(0, 1).toUpperCase();

  return (
    <>
    {/* Only the slim top bar stays pinned, and only on wider screens, so it never covers content on phones. */}
    <header className="z-30 border-b border-border bg-background/90 backdrop-blur md:sticky md:top-0">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <Link to="/dashboard">
          <Brand />
        </Link>
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 rounded-2xl border border-border bg-muted/60 p-1">
            <Link to="/dashboard" data-tour="nav-dashboard" className={navClass} activeProps={activeNav}>
              <LayoutGrid className="size-4" /> <span className="hidden sm:inline">Syllabus Dashboard</span>
            </Link>
            <Link to="/question-bank" data-tour="nav-qbank" className={navClass} activeProps={activeNav}>
              <BookOpen className="size-4" /> <span className="hidden sm:inline">Question Bank</span>
              <span className="hidden rounded-md bg-hot-soft px-1.5 py-0.5 text-[10px] font-bold text-hot md:inline">AU Hot</span>
            </Link>
          </nav>
          <DropdownMenu>
            <DropdownMenuTrigger
              data-tour="account"
              aria-label="Your account"
              className="grid size-10 place-items-center rounded-full bg-highlight font-display font-bold text-highlight-foreground shadow-pop"
            >
              {initials}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-semibold">{profile.full_name}</p>
                <p className="text-xs font-normal text-muted-foreground">@{profile.nickname}</p>
                {user.email && <p className="mt-1 truncate text-xs font-normal text-muted-foreground">Signed in as {user.email}</p>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate({ to: "/onboarding" })}>
                <UserRound /> Edit my details
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: "/dashboard", search: { tour: true } })}>
                <Compass /> Show me around again
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut}>
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
      <div className="border-b border-border/70 bg-primary-soft/40">
        <div
          data-tour="profile-bar"
          className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2 text-xs text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" /> {profile.city}, <b className="text-foreground">{profile.state}</b>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-3.5" /> <b className="text-foreground">{profile.college}</b>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap className="size-3.5" /> Dept: <b className="text-foreground">{profile.department}</b> · Year{" "}
            {profile.year} · Sem {profile.semester}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <Languages className="size-3.5" /> AI answer language:
            <NativeSelect
              aria-label="AI answer language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-7 w-auto py-0 text-xs"
            >
              {profile.languages.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </NativeSelect>
          </span>
        </div>
      </div>
    </>
  );
}
