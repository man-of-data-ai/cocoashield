import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

function timestampForFilename(): string {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
}

export async function exportComparisonPdf(
  node: HTMLElement,
  title: string
): Promise<void> {
  const canvas = await html2canvas(node, {
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#f4f1ea",
    scale: Math.min(window.devicePixelRatio || 1, 1.35),
    logging: false,
    ignoreElements: (element) => element.classList?.contains("leaflet-tile") ?? false,
  });

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const headerHeight = 17;
  const footerHeight = 12;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2 - headerHeight - footerHeight;
  const ratio = canvas.width / canvas.height;

  let drawWidth = availableWidth;
  let drawHeight = drawWidth / ratio;
  if (drawHeight > availableHeight) {
    drawHeight = availableHeight;
    drawWidth = drawHeight * ratio;
  }

  doc.setTextColor(19, 42, 29);
  doc.setFontSize(15);
  doc.text("CocoaShield — Comparaison de campagnes", margin, margin + 5);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8.5);
  doc.text(title, margin, margin + 11);

  const imageX = margin + (availableWidth - drawWidth) / 2;
  const imageY = margin + headerHeight;
  doc.addImage(canvas.toDataURL("image/png"), "PNG", imageX, imageY, drawWidth, drawHeight);

  const footerY = pageHeight - margin - 5;
  doc.setTextColor(138, 122, 58);
  doc.setFontSize(8.5);
  doc.text("Mention obligatoire : non-garantie diagnostique", margin, footerY);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    pageWidth - margin,
    footerY,
    { align: "right" }
  );

  doc.save(`comparaison-cocoashield-${timestampForFilename()}.pdf`);
}
