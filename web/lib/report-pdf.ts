import { jsPDF } from "jspdf";
import type { AnalysisReportData } from "@/lib/analysis-report";

const PAGE = { width: 210, height: 297, margin: 14 };

function timestampForFilename(): string {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
}

function formatDate(date: Date): string {
  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatArea(squareMeters: number | null): string {
  if (squareMeters === null) return "—";
  if (squareMeters >= 10_000)
    return `${(squareMeters / 10_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ha`;
  return `${Math.round(squareMeters).toLocaleString("fr-FR")} m²`;
}

function safeText(text: string): string {
  return text.replace(/\u202f/g, " ");
}

function addFooter(doc: jsPDF, pageNumber: number) {
  doc.setDrawColor(224, 231, 220);
  doc.line(
    PAGE.margin,
    PAGE.height - 12,
    PAGE.width - PAGE.margin,
    PAGE.height - 12,
  );
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Cocoashield — Rapport d’analyse phytosanitaire",
    PAGE.margin,
    PAGE.height - 7,
  );
  doc.text(`Page ${pageNumber}`, PAGE.width - PAGE.margin, PAGE.height - 7, {
    align: "right",
  });
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(12);
  doc.setTextColor(32, 59, 42);
  doc.setFont("helvetica", "bold");
  doc.text(title, PAGE.margin, y);
  doc.setDrawColor(222, 232, 216);
  doc.line(PAGE.margin, y + 2, PAGE.width - PAGE.margin, y + 2);
  doc.setFont("helvetica", "normal");
  return y + 8;
}

function ensureSpace(
  doc: jsPDF,
  y: number,
  required: number,
  pageNumberRef: { value: number },
): number {
  if (y + required <= PAGE.height - 18) return y;
  addFooter(doc, pageNumberRef.value);
  doc.addPage();
  pageNumberRef.value += 1;
  return 18;
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  y: number,
  pageNumberRef: { value: number },
  options?: { bullet?: boolean; maxWidth?: number; lineHeight?: number },
): number {
  const maxWidth =
    options?.maxWidth ??
    PAGE.width - PAGE.margin * 2 - (options?.bullet ? 6 : 0);
  const lineHeight = options?.lineHeight ?? 5;
  const lines = doc.splitTextToSize(safeText(text), maxWidth) as string[];
  y = ensureSpace(
    doc,
    y,
    Math.max(8, lines.length * lineHeight),
    pageNumberRef,
  );
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  if (options?.bullet) {
    doc.setFillColor(95, 135, 64);
    doc.circle(PAGE.margin + 1.5, y - 1.2, 0.8, "F");
    doc.text(lines, PAGE.margin + 6, y);
  } else {
    doc.text(lines, PAGE.margin, y);
  }
  return y + lines.length * lineHeight + 2;
}

function drawKpi(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
) {
  doc.setFillColor(248, 250, 246);
  doc.setDrawColor(226, 233, 222);
  doc.roundedRect(x, y, width, 22, 3, 3, "FD");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(label.toUpperCase(), x + 4, y + 7);
  doc.setFontSize(14);
  doc.setTextColor(32, 59, 42);
  doc.setFont("helvetica", "bold");
  doc.text(value, x + 4, y + 16);
  doc.setFont("helvetica", "normal");
}

function drawObservationChart(
  doc: jsPDF,
  data: AnalysisReportData,
  y: number,
): number {
  const total = Math.max(1, data.processedImages);
  const healthyRatio = data.healthyImages / total;
  const infectedRatio = data.infectedImages / total;
  const width = PAGE.width - PAGE.margin * 2;
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Saines  ${data.healthyImages}`, PAGE.margin, y);
  doc.setFillColor(233, 240, 229);
  doc.roundedRect(PAGE.margin + 32, y - 4, width - 32, 4, 2, 2, "F");
  doc.setFillColor(63, 121, 78);
  doc.roundedRect(
    PAGE.margin + 32,
    y - 4,
    (width - 32) * healthyRatio,
    4,
    2,
    2,
    "F",
  );
  y += 9;
  doc.text(`Infectées  ${data.infectedImages}`, PAGE.margin, y);
  doc.setFillColor(245, 235, 231);
  doc.roundedRect(PAGE.margin + 32, y - 4, width - 32, 4, 2, 2, "F");
  doc.setFillColor(184, 69, 51);
  doc.roundedRect(
    PAGE.margin + 32,
    y - 4,
    (width - 32) * infectedRatio,
    4,
    2,
    2,
    "F",
  );
  return y + 8;
}

export function exportAnalysisReportPdf(data: AnalysisReportData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageNumber = { value: 1 };

  doc.setFillColor(32, 59, 42);
  doc.rect(0, 0, PAGE.width, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Cocoashield", PAGE.margin, 16);
  doc.setFontSize(13);
  doc.text("Rapport d’analyse phytosanitaire", PAGE.margin, 25);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 234, 215);
  doc.text(
    `${safeText(data.parcelName)} · ${safeText(data.missionName)}`,
    PAGE.margin,
    33,
  );

  let y = 51;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Analyse : ${formatDate(data.analysisDate)}`, PAGE.margin, y);
  doc.text(
    `Rapport : ${formatDate(data.reportDate)}`,
    PAGE.width - PAGE.margin,
    y,
    { align: "right" },
  );
  y += 8;

  const gap = 3;
  const kpiWidth = (PAGE.width - PAGE.margin * 2 - gap * 3) / 4;
  drawKpi(
    doc,
    PAGE.margin,
    y,
    kpiWidth,
    "Infection",
    `${data.infectionPercentage.toFixed(1)} %`,
  );
  drawKpi(
    doc,
    PAGE.margin + (kpiWidth + gap),
    y,
    kpiWidth,
    "Sévérité",
    data.severityLabel,
  );
  drawKpi(
    doc,
    PAGE.margin + (kpiWidth + gap) * 2,
    y,
    kpiWidth,
    "Images",
    String(data.totalImages),
  );
  drawKpi(
    doc,
    PAGE.margin + (kpiWidth + gap) * 3,
    y,
    kpiWidth,
    "Zones",
    String(data.affectedZoneCount),
  );
  y += 31;

  y = sectionTitle(doc, "Résumé de l’analyse", y);
  const summary =
    data.processedImages > 0
      ? `L’analyse de ${data.parcelName} a traité ${data.processedImages} image${data.processedImages > 1 ? "s" : ""}. Le taux d’infection observé est de ${data.infectionPercentage.toFixed(1)} %, avec un niveau de sévérité ${data.severityLabel.toLowerCase()}.`
      : `L’analyse de ${data.parcelName} ne contient pas encore de résultat d’image exploitable.`;
  y = addWrappedText(doc, summary, y, pageNumber);
  if (data.notes) {
    y = addWrappedText(
      doc,
      `Observation terrain : ${data.notes}`,
      y,
      pageNumber,
    );
  }

  y = ensureSpace(doc, y + 3, 35, pageNumber);
  y = sectionTitle(doc, "Répartition des observations", y);
  y = drawObservationChart(doc, data, y + 2);
  y = addWrappedText(
    doc,
    `${data.preciseImages} image${data.preciseImages > 1 ? "s" : ""} dispose${data.preciseImages > 1 ? "nt" : ""} d’une géolocalisation précise. ${data.locatedInfectedImages} observation${data.locatedInfectedImages > 1 ? "s" : ""} infectée${data.locatedInfectedImages > 1 ? "s" : ""} est/sont localisable${data.locatedInfectedImages > 1 ? "s" : ""}.`,
    y,
    pageNumber,
  );

  y = ensureSpace(doc, y + 3, 28, pageNumber);
  y = sectionTitle(doc, "Indicateurs géographiques", y);
  const areaLines = [
    `Surface de la parcelle : ${formatArea(data.parcelAreaSquareMeters)}`,
    `Surface cumulée des zones géométriques identifiées : ${formatArea(data.affectedAreaSquareMeters)}`,
    `Zones à risque localisées : ${data.affectedZoneCount}`,
  ];
  for (const line of areaLines)
    y = addWrappedText(doc, line, y, pageNumber, { bullet: true });

  if (data.zones.length > 0) {
    y = ensureSpace(doc, y + 3, 30, pageNumber);
    y = sectionTitle(doc, "Zones à risque", y);
    doc.setFillColor(244, 247, 242);
    doc.roundedRect(
      PAGE.margin,
      y - 2,
      PAGE.width - PAGE.margin * 2,
      8,
      2,
      2,
      "F",
    );
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    doc.text("Sévérité", PAGE.margin + 3, y + 3);
    doc.text("Latitude", PAGE.margin + 38, y + 3);
    doc.text("Longitude", PAGE.margin + 75, y + 3);
    doc.text("Surface", PAGE.margin + 118, y + 3);
    doc.setFont("helvetica", "normal");
    y += 10;
    for (const zone of data.zones) {
      y = ensureSpace(doc, y, 8, pageNumber);
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(zone.severityLabel, PAGE.margin + 3, y);
      doc.text(zone.latitude.toFixed(6), PAGE.margin + 38, y);
      doc.text(zone.longitude.toFixed(6), PAGE.margin + 75, y);
      doc.text(formatArea(zone.surfaceSquareMeters), PAGE.margin + 118, y);
      y += 7;
    }
  }

  y = ensureSpace(doc, y + 3, 28, pageNumber);
  y = sectionTitle(doc, "Points importants", y);
  for (const insight of data.insights)
    y = addWrappedText(doc, insight, y, pageNumber, { bullet: true });

  y = ensureSpace(doc, y + 3, 28, pageNumber);
  y = sectionTitle(doc, "Recommandations de suivi", y);
  for (const recommendation of data.recommendations)
    y = addWrappedText(doc, recommendation, y, pageNumber, { bullet: true });

  y = ensureSpace(doc, y + 4, 20, pageNumber);
  doc.setFillColor(247, 250, 244);
  doc.setDrawColor(220, 232, 214);
  doc.roundedRect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 16, 3, 3, "FD");
  doc.setFontSize(8.5);
  doc.setTextColor(86, 112, 70);
  const notice = doc.splitTextToSize(
    "Ce rapport constitue un outil d’aide à la surveillance phytosanitaire. Les décisions d’intervention doivent être confirmées par une observation terrain lorsque cela est nécessaire.",
    PAGE.width - PAGE.margin * 2 - 8,
  ) as string[];
  doc.text(notice, PAGE.margin + 4, y + 6);

  addFooter(doc, pageNumber.value);
  doc.save(
    `rapport-cocoashield-${
      data.parcelName
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "") || "analyse"
    }-${timestampForFilename()}.pdf`,
  );
}
