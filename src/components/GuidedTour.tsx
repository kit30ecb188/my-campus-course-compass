import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TourStep = { target: string; title: string; body: string };

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;
const CARD_W = 340;

export function GuidedTour({ steps, open, onClose }: { steps: TourStep[]; open: boolean; onClose: (finished: boolean) => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[index];

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step]);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();
    const t = window.setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step, measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, steps.length]);

  if (!open || !step || typeof document === "undefined") return null;

  const last = index === steps.length - 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(CARD_W, vw - 24);
  let cardStyle: React.CSSProperties;
  if (rect) {
    const below = rect.top + rect.height + 12;
    const placeBelow = below + 220 < vh || rect.top < 240;
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - cardW / 2), vw - cardW - 12);
    cardStyle = placeBelow
      ? { top: Math.min(below, vh - 230), left, width: cardW }
      : { top: Math.max(12, rect.top - 12 - 200), left, width: cardW };
  } else {
    cardStyle = { top: vh / 2 - 100, left: vw / 2 - cardW / 2, width: cardW };
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={step.title}>
      {rect ? (
        <div className="tour-spotlight pointer-events-none fixed" style={rect} />
      ) : (
        <div className="fixed inset-0 bg-[var(--overlay)]" />
      )}
      <div className="surface animate-rise fixed p-5" style={cardStyle} key={index}>
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full bg-highlight px-2 py-0.5 text-[11px] font-bold text-highlight-foreground">
            {index + 1} of {steps.length}
          </span>
          <button onClick={() => onClose(false)} aria-label="Skip tour" className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            <ArrowLeft /> Back
          </Button>
          <Button size="sm" onClick={() => (last ? onClose(true) : setIndex((i) => i + 1))}>
            {last ? "Got it!" : "Next"} {!last && <ArrowRight />}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
