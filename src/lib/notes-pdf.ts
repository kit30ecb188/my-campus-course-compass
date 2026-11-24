import type { UnitNotes } from "@/lib/study";

const BLUE: [number, number, number] = [31, 99, 224];
const INK: [number, number, number] = [28, 37, 56];
const MUTED: [number, number, number] = [96, 108, 128];
const YELLOW: [number, number, number] = [245, 208, 70];

/** jsPDF's built-in fonts only cover basic Latin, so swap common symbols for safe text. */
function clean(s: string): string {
  return s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00D7/g, "x")
    .replace(/\u2192/g, "->")
    .replace(/\u2264/g, "<=")
    .replace(/\u2265/g, ">=")
    .replace(/\u2260/g, "!=")
    .replace(/\u221A/g, "sqrt")
    .replace(/\u03C0/g, "pi")
    .replace(/[^\x20-\x7E\n\u00A0-\u00FF]/g, "");
}

export async function buildNotesPdf(opts: {
  courseTitle: string;
  courseCode: string;
  studentName: string;
  notes: UnitNotes[];
}): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18;
  const maxW = W - M * 2;
  let y = M;

  const ensure = (h: number) => {
    if (y + h > H - 16) {
      doc.addPage();
      y = M;
    }
  };
  const para = (text: string, size = 10.5, color = INK, style: "normal" | "bold" = "normal", indent = 0) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(clean(text), maxW - indent) as string[];
    const lh = size * 0.45;
    for (const line of lines) {
      ensure(lh);
      doc.text(line, M + indent, y);
      y += lh;
    }
  };
  const bullets = (items: string[], marker = "-") => {
    for (const it of items) {
      ensure(6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...BLUE);
      doc.text(marker, M + 2, y);
      para(it, 10.5, INK, "normal", 7);
      y += 1;
    }
  };
  const heading = (text: string, size = 13) => {
    ensure(14);
    y += 3;
    para(text, size, BLUE, "bold");
    y += 1.5;
  };

  // Cover band
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 42, "F");
  doc.setFillColor(...YELLOW);
  doc.rect(0, 42, W, 2.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SYLLABEX STUDY NOTES", M, 14);
  doc.setFontSize(20);
  doc.text(doc.splitTextToSize(clean(opts.courseTitle), maxW).slice(0, 1) as string[], M, 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(clean(`${opts.courseCode}  |  Prepared for ${opts.studentName}  |  ${new Date().toLocaleDateString("en-IN")}`), M, 35);
  y = 56;

  opts.notes.forEach((n, idx) => {
    if (idx > 0) {
      doc.addPage();
      y = M;
    }
    ensure(20);
    doc.setFillColor(232, 240, 253);
    doc.roundedRect(M - 3, y - 6, maxW + 6, 12, 2, 2, "F");
    para(`Unit ${idx + 1}: ${n.unit}`, 15, BLUE, "bold");
    y += 4;
    para(n.overview, 10.5, MUTED);
    y += 2;

    for (const s of n.sections) {
      heading(s.heading, 12);
      para(s.explanation);
      y += 1.5;
      if (s.points.length) bullets(s.points);
    }
    if (n.formulas.length) {
      heading("Key formulas & definitions");
      bullets(n.formulas, ">");
    }
    if (n.twoMarkQuestions.length) {
      heading("Two-mark questions");
      n.twoMarkQuestions.forEach((qa, i) => {
        para(`Q${i + 1}. ${qa.question}`, 10.5, INK, "bold");
        para(qa.answer, 10.5, INK, "normal", 4);
        y += 2;
      });
    }
    if (n.longAnswerTips.length) {
      heading("Writing 13 / 16-mark answers");
      bullets(n.longAnswerTips);
    }
    if (n.summary.length) {
      heading("Quick revision");
      bullets(n.summary);
    }
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(clean(`${opts.courseCode} - ${opts.courseTitle}`), M, H - 8);
    doc.text(`Page ${i} of ${pages}`, W - M, H - 8, { align: "right" });
  }
  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function deliverFile(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  const touch = matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return;
    }
  }
  downloadBlob(blob, filename);
}
