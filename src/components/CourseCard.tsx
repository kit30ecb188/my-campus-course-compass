import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpenCheck, Check, ChevronDown, FileText, PlayCircle, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { revisionProgress, type Course, type Unit } from "@/lib/profile";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { NotesDialog, VideosDialog } from "@/components/StudyDialogs";
import { cn } from "@/lib/utils";

export function CourseCard({ course, expanded, onToggle }: { course: Course; expanded: boolean; onToggle: () => void }) {
  const queryClient = useQueryClient();
  const [units, setUnits] = useState<Unit[]>(course.units);
  const progress = revisionProgress(units);
  const [videosOpen, setVideosOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  async function saveUnits(next: Unit[]) {
    setUnits(next);
    const { error } = await supabase.from("courses").update({ units: next }).eq("id", course.id);
    if (error) {
      toast.error("Couldn't save progress");
      setUnits(course.units);
    } else queryClient.invalidateQueries({ queryKey: ["courses"] });
  }

  async function remove() {
    if (!window.confirm(`Remove ${course.title}?`)) return;
    const { error } = await supabase.from("courses").delete().eq("id", course.id);
    if (error) return void toast.error("Couldn't remove the course");
    queryClient.invalidateQueries({ queryKey: ["courses"] });
  }

  return (
    <article className="surface overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center gap-4 p-5 text-left" aria-expanded={expanded}>
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary font-mono text-sm font-bold text-primary-foreground">
          {course.code.slice(0, 4)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono font-bold text-primary">{course.code}</span>
            {course.regulation && <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-primary">{course.regulation}</span>}
            {course.semester && <span className="text-muted-foreground">Sem {course.semester}</span>}
            <span className="rounded-md bg-success-soft px-1.5 py-0.5 font-medium text-success">{course.department}</span>
          </div>
          <h3 className="mt-1 truncate text-lg font-bold">{course.title}</h3>
          {course.university && <p className="truncate text-sm text-muted-foreground">{course.university}</p>}
        </div>
        <div className="hidden w-40 sm:block">
          <div className="flex justify-between text-xs text-muted-foreground">
            Revision progress <b className="text-primary">{progress}%</b>
          </div>
          <Progress value={progress} className="mt-2 h-1.5" />
        </div>
        <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition", expanded && "rotate-180")} />
      </button>
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
        <Button variant="soft" size="sm" onClick={() => setVideosOpen(true)}>
          <PlayCircle /> Videos
        </Button>
        <Button variant="soft" size="sm" onClick={() => setNotesOpen(true)}>
          <FileText /> Notes (PDF)
        </Button>
      </div>
      <VideosDialog course={course} open={videosOpen} onOpenChange={setVideosOpen} />
      <NotesDialog course={course} open={notesOpen} onOpenChange={setNotesOpen} />
      {expanded && (
        <div className="grid gap-2 border-t border-border bg-muted/40 p-4">
          {units.length === 0 && <p className="px-2 text-sm text-muted-foreground">No units added for this course.</p>}
          {units.map((u, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <span className="grid size-8 place-items-center rounded-full bg-primary-soft font-mono text-xs font-bold text-primary">
                U{i + 1}
              </span>
              <p className="flex-1 font-semibold">
                {u.title} {u.marks && <span className="text-xs font-normal text-muted-foreground">({u.marks})</span>}
              </p>
              <Link
                to="/tutor"
                search={{ q: `Explain ${u.title} from ${course.title} for my exam` }}
                className="hidden items-center gap-1 text-xs font-medium text-primary hover:underline sm:inline-flex"
              >
                <Sparkles className="size-3.5" /> Ask AI
              </Link>
              <button
                onClick={() => saveUnits(units.map((x, j) => (j === i ? { ...x, revised: !x.revised } : x)))}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                  u.revised ? "bg-success-soft text-success" : "text-primary hover:bg-primary-soft",
                )}
              >
                {u.revised ? <><Check className="size-3.5" /> Revised</> : "Mark revised"}
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between px-2 pt-1">
            <Link to="/question-bank" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              <BookOpenCheck className="size-4" /> See past questions
            </Link>
            <button onClick={remove} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5" /> Remove course
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
