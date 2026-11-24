import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Download, ExternalLink, FileText, Loader2, PlayCircle, RotateCcw } from "lucide-react";
import { profileQuery } from "@/lib/queries";
import type { Course } from "@/lib/profile";
import { MAX_NOTE_UNITS, noteSelectionSchema, notesFileName, youtubeSearchUrl, type UnitNotes, type VideoSuggestion } from "@/lib/study";
import { makeUnitNotes, suggestVideos } from "@/lib/study.functions";
import { buildNotesPdf, deliverFile } from "@/lib/notes-pdf";
import { useAnswerLanguage } from "@/hooks/use-answer-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Topic = { title: string; marks?: string };

function topicsOf(course: Course): Topic[] {
  return course.units.map((u) => (u.marks ? { title: u.title, marks: u.marks } : { title: u.title }));
}

function TopicOption({ label, sub, selected, onClick, multi }: { label: string; sub?: string | undefined; selected: boolean; onClick: () => void; multi?: boolean }) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
        selected ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/40",
      )}
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center border-2",
          multi ? "rounded-md" : "rounded-full",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
        )}
      >
        {selected && <Check className="size-3" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
      </span>
    </button>
  );
}

function CustomTopic({ onAdd }: { onAdd: (t: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) {
          onAdd(value.trim());
          setValue("");
        }
      }}
      className="flex gap-2"
    >
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Or type a topic, e.g. Zener breakdown" maxLength={160} aria-label="Type a topic" />
      <Button type="submit" variant="outline" disabled={!value.trim()}>
        Add
      </Button>
    </form>
  );
}

export function VideosDialog({ course, open, onOpenChange }: { course: Course; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const [language] = useAnswerLanguage(profile?.languages ?? [], profile?.id);
  const fetchVideos = useServerFn(suggestVideos);
  const [extra, setExtra] = useState<Topic[]>([]);
  const [topic, setTopic] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [videos, setVideos] = useState<VideoSuggestion[] | null>(null);

  const topics = [...topicsOf(course), ...extra];

  async function find() {
    if (!topic) return;
    setBusy(true);
    setVideos(null);
    try {
      const res = await fetchVideos({ data: { courseTitle: course.title, courseCode: course.code, topic } });
      if (res.error) toast.error(res.error);
      setVideos(res.videos);
    } catch {
      toast.error("Couldn't find videos just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setVideos(null);
          setTopic(null);
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl">
            <PlayCircle className="size-6 text-primary" /> Videos · {course.title}
          </DialogTitle>
          <DialogDescription>
            {videos ? `Lectures for "${topic}". They open on YouTube.` : "Which topic do you want videos for?"}
          </DialogDescription>
        </DialogHeader>

        {!videos ? (
          <div className="grid gap-2">
            {topics.length === 0 && <p className="text-sm text-muted-foreground">This course has no units yet — type a topic below.</p>}
            <div role="radiogroup" aria-label="Topics" className="grid gap-2">
              {topics.map((t, i) => (
                <TopicOption key={`${t.title}-${i}`} label={t.title} sub={t.marks} selected={topic === t.title} onClick={() => setTopic(t.title)} />
              ))}
            </div>
            <CustomTopic
              onAdd={(t) => {
                setExtra((x) => [...x, { title: t }]);
                setTopic(t);
              }}
            />
            <div className="mt-2 flex justify-end">
              <Button onClick={find} disabled={!topic || busy}>
                {busy ? <><Loader2 className="animate-spin" /> Finding the best lectures…</> : <><PlayCircle /> Show videos</>}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {videos.map((v, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft font-mono text-xs font-bold text-primary">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{v.title}</p>
                  <p className="text-sm text-muted-foreground">{v.why}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="soft">
                      <a href={youtubeSearchUrl(v.query)} target="_blank" rel="noreferrer">
                        <ExternalLink /> Watch on YouTube
                      </a>
                    </Button>
                    {language !== "English" && (
                      <Button asChild size="sm" variant="outline">
                        <a href={youtubeSearchUrl(v.query, language)} target="_blank" rel="noreferrer">
                          In {language}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <Button asChild variant="link" className="justify-start px-0">
              <a href={youtubeSearchUrl(`${topic} ${course.title} full lecture`)} target="_blank" rel="noreferrer">
                <ExternalLink /> Search the whole topic on YouTube
              </a>
            </Button>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setVideos(null)}>
                <RotateCcw /> Pick another topic
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function NotesDialog({ course, open, onOpenChange }: { course: Course; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const makeNotes = useServerFn(makeUnitNotes);
  const [extra, setExtra] = useState<Topic[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ blob: Blob; name: string; notes: UnitNotes[] } | null>(null);

  const topics = [...topicsOf(course), ...extra];
  const busy = progress !== null;

  function toggle(title: string) {
    setPicked((p) => {
      if (p.includes(title)) return p.filter((x) => x !== title);
      if (p.length >= MAX_NOTE_UNITS) {
        toast.message(`You can pick up to ${MAX_NOTE_UNITS} units at a time`);
        return p;
      }
      return [...p, title];
    });
  }

  async function generate() {
    const check = noteSelectionSchema.safeParse(picked);
    if (!check.success) return void toast.error(check.error.issues[0]?.message ?? "Pick a unit");
    setResult(null);
    setProgress({ done: 0, total: picked.length });
    try {
      const results = await Promise.all(
        picked.map(async (title) => {
          const marks = topics.find((t) => t.title === title)?.marks;
          const res = await makeNotes({
            data: { courseTitle: course.title, courseCode: course.code, topic: title, ...(marks ? { marks } : {}) },
          });
          setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
          if (!res.notes) throw new Error(res.error ?? "failed");
          return res.notes;
        }),
      );
      const blob = await buildNotesPdf({
        courseTitle: course.title,
        courseCode: course.code,
        studentName: profile?.full_name ?? profile?.nickname ?? "you",
        notes: results,
      });
      setResult({ blob, name: notesFileName(course.code, picked), notes: results });
    } catch (err) {
      toast.error(err instanceof Error && err.message !== "failed" ? err.message : "Couldn't make the notes. Please try again.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        onOpenChange(o);
        if (!o) setResult(null);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl">
            <FileText className="size-6 text-primary" /> Notes · {course.title}
          </DialogTitle>
          <DialogDescription>
            {result
              ? "Your detailed notes are ready."
              : `Which units or topics should the notes cover? Pick up to ${MAX_NOTE_UNITS}.`}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="grid gap-2">
            {topics.length === 0 && <p className="text-sm text-muted-foreground">This course has no units yet — type a topic below.</p>}
            <div className="grid gap-2" aria-label="Units and topics">
              {topics.map((t, i) => (
                <TopicOption
                  key={`${t.title}-${i}`}
                  multi
                  label={t.title}
                  sub={t.marks}
                  selected={picked.includes(t.title)}
                  onClick={() => !busy && toggle(t.title)}
                />
              ))}
            </div>
            <CustomTopic
              onAdd={(t) => {
                setExtra((x) => [...x, { title: t }]);
                if (picked.length < MAX_NOTE_UNITS) setPicked((p) => [...p, t]);
              }}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Notes are written in English. Takes about a minute.</p>
              <Button onClick={generate} disabled={picked.length === 0 || busy}>
                {busy ? (
                  <><Loader2 className="animate-spin" /> Writing notes… {progress.done}/{progress.total}</>
                ) : (
                  <><FileText /> Make notes PDF</>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {result.notes.map((n, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <p className="font-semibold">Unit {i + 1}: {n.unit}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {n.sections.length} sections · {n.twoMarkQuestions.length} two-mark Q&As · {n.formulas.length} key formulas
                </p>
                <p className="mt-2 line-clamp-2 text-sm">{n.sections.map((s) => s.heading).join(" · ")}</p>
              </div>
            ))}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setResult(null)}>
                <RotateCcw /> Other units
              </Button>
              <Button size="lg" onClick={() => void deliverFile(result.blob, result.name)}>
                <Download /> Download PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
