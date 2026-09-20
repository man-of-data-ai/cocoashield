import type { jsPDF } from "jspdf";

export const PDF_BRAND = {
  green: [32, 59, 42] as [number, number, number],
  pale: [247, 250, 244] as [number, number, number],
  border: [224, 231, 220] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  lightText: [220, 234, 215] as [number, number, number],
};

export function pdfSafeText(text: string): string {
  return text.replace(/\u202f/g, " ");
}

export function drawCocoaShieldHeader(
  doc: jsPDF,
  args: { title: string; subtitle?: string; context?: string; height?: number; margin?: number }
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const height = args.height ?? 42;
  const margin = args.margin ?? 14;
  doc.setFillColor(...PDF_BRAND.green);
  doc.rect(0, 0, pageWidth, height, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Cocoashield", margin, 16);
  doc.setFontSize(13);
  doc.text(pdfSafeText(args.title), margin, 25);
  if (args.subtitle || args.context) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_BRAND.lightText);
    const line = [args.subtitle, args.context].filter(Boolean).map((v) => pdfSafeText(String(v))).join(" · ");
    doc.text(line, margin, 33, { maxWidth: pageWidth - margin * 2 });
  }
  return height + 9;
}

export function drawCocoaShieldFooter(doc: jsPDF, label: string, page: number, total?: number, margin = 14): void {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...PDF_BRAND.border);
  doc.line(margin, height - 12, width - margin, height - 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_BRAND.muted);
  doc.text(`Cocoashield — ${pdfSafeText(label)}`, margin, height - 7);
  doc.text(total ? `Page ${page}/${total}` : `Page ${page}`, width - margin, height - 7, { align: "right" });
}
