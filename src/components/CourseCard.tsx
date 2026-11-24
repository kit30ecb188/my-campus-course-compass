import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, FileText, Maximize2, Pencil, PlayCircle } from "lucide-react";
import type { Course } from "@/lib/profile";
import { countTopics, courseProgress } from "@/lib/syllabus";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { NotesDialog, VideosDialog } from "@/components/StudyDialogs";
import { EditCourseDialog } from "@/components/AddCourseDialog";
import { UnitList } from "@/components/UnitList";
import { cn } from "@/lib/utils";

export function CourseCard({ course, expanded, onToggle }: { course: Course; expanded: boolean; onToggle: () => void }) {
  const progress = courseProgress(course);
  const { revised, total } = countTopics(course.units);
  const [videosOpen, setVideosOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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
          <p className="truncate text-sm text-muted-foreground">
            {course.units.length} {course.units.length === 1 ? "unit" : "units"} · {revised}/{total} topics revised
          </p>
          <div className="mt-2 sm:hidden">
            <Progress value={progress} className="h-1.5" aria-label={`${course.title} progress`} />
          </div>
        </div>
        <div className="hidden w-40 sm:block">
          <div className="flex justify-between text-xs text-muted-foreground">
            Course progress <b className="text-primary">{progress}%</b>
          </div>
          <Progress value={progress} className="mt-2 h-1.5" aria-label={`${course.title} progress`} />
        </div>
        <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition", expanded && "rotate-180")} />
      </button>
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
        <Button asChild variant="default" size="sm">
          <Link to="/courses/$courseId" params={{ courseId: course.id }}>
            <Maximize2 /> Open course
          </Link>
        </Button>
        <Button variant="soft" size="sm" onClick={() => setVideosOpen(true)}>
          <PlayCircle /> Videos
        </Button>
        <Button variant="soft" size="sm" onClick={() => setNotesOpen(true)}>
          <FileText /> Notes (PDF)
        </Button>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setEditOpen(true)}>
          <Pencil /> Edit
        </Button>
      </div>
      <EditCourseDialog course={course} open={editOpen} onOpenChange={setEditOpen} />
      <VideosDialog course={course} open={videosOpen} onOpenChange={setVideosOpen} />
      <NotesDialog course={course} open={notesOpen} onOpenChange={setNotesOpen} />
      {expanded && (
        <div className="border-t border-border bg-muted/40 p-4">
          <UnitList units={course.units} showConfidence={false} />
        </div>
      )}
    </article>
  );
}
