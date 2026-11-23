import { GraduationCap } from "lucide-react";

export function Brand({ subtitle = true }: { subtitle?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow">
        <GraduationCap className="size-5" />
      </div>
      <div className="leading-tight">
        <div className="flex items-center gap-2">
          <span className="font-display text-xl font-bold">Syllabex</span>
          <span className="rounded-md bg-highlight px-1.5 py-0.5 text-[10px] font-bold text-highlight-foreground">
            v2.5 Pro
          </span>
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">AI exam & syllabus hub for Indian college students</p>
        )}
      </div>
    </div>
  );
}
