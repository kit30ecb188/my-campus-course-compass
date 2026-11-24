import { Check } from "lucide-react";
import { CONFIDENCE_LABELS, unitProgress, type Confidence, type Unit } from "@/lib/syllabus";
import { useTopicProgress } from "@/hooks/use-topic-progress";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const CONF_TONE: Record<Exclude<Confidence, 0>, string> = {
  1: "bg-hot-soft text-hot border-hot/40",
  2: "bg-highlight/40 text-highlight-foreground border-highlight",
  3: "bg-success-soft text-success border-success/40",
};

/** Units with their topics: tick a topic as revised and rate how confident you feel. */
export function UnitList({ units, showConfidence = true }: { units: readonly Unit[]; showConfidence?: boolean }) {
  const update = useTopicProgress();

  if (units.length === 0) return <p className="px-2 text-sm text-muted-foreground">No units added for this course yet. Press Edit to add them.</p>;

  return (
    <div className="grid gap-3">
      {units.map((u, i) => {
        const pct = unitProgress(u);
        const done = u.topics.filter((t) => t.revised).length;
        return (
          <section key={u.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft font-mono text-xs font-bold text-primary">
                U{i + 1}
              </span>
              <h4 className="min-w-0 flex-1 font-semibold">
                {u.title} {u.marks && <span className="text-xs font-normal text-muted-foreground">({u.marks})</span>}
              </h4>
              <div className="w-full sm:w-44">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {done}/{u.topics.length} topics
                  </span>
                  <b className="text-primary">{pct}%</b>
                </div>
                <Progress value={pct} className="mt-1 h-1.5" aria-label={`${u.title} progress`} />
              </div>
            </div>
            <ul className="mt-3 grid gap-1.5">
              {u.topics.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted/60">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={t.revised}
                    onClick={() => void update(t.id, { revised: !t.revised })}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left text-sm"
                  >
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-md border-2",
                        t.revised ? "border-success bg-success text-primary-foreground" : "border-input bg-card",
                      )}
                    >
                      {t.revised && <Check className="size-3" />}
                    </span>
                    <span className={cn("min-w-0", t.revised && "text-muted-foreground line-through decoration-success/60")}>{t.title}</span>
                  </button>
                  {showConfidence && (
                    <div className="flex gap-1" role="radiogroup" aria-label={`How confident are you about ${t.title}?`}>
                      {([1, 2, 3] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          role="radio"
                          aria-checked={t.confidence === level}
                          onClick={() => void update(t.id, { confidence: t.confidence === level ? 0 : level })}
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px] font-semibold transition",
                            t.confidence === level ? CONF_TONE[level] : "border-border text-muted-foreground hover:border-primary/40",
                          )}
                        >
                          {CONFIDENCE_LABELS[level]}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
