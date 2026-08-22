import { jsPDF } from "jspdf";

export type ComparisonExportParcel = {
  name: string;
  leftRate: number | null;
  rightRate: number | null;
  leftLevel: string | null;
  rightLevel: string | null;
};

export type ComparisonExportData = {
  leftName: string;
  leftDate: string;
  rightName: string;
  rightDate: string;
  leftInfectionRate: number;
  rightInfectionRate: number;
  leftInfectedAreaSquareMeters: number;
  rightInfectedAreaSquareMeters: number;
  leftProcessedImages: number;
  rightProcessedImages: number;
  leftInfectedImages: number;
  rightInfectedImages: number;
  parcels: ComparisonExportParcel[];
};

function timestampForFilename(): string {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

function formatArea(squareMeters: number): string {
  return `${(squareMeters / 10_000).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha`;
}

function signed(value: number, suffix: string): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${suffix}`;
}

function drawMetric(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  helper: string,
) {
  doc.setFillColor(248, 250, 246);
  doc.setDrawColor(224, 231, 220);
  doc.roundedRect(x, y, width, 24, 3, 3, "FD");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(label.toUpperCase(), x + 4, y + 6);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(32, 59, 42);
  doc.text(value, x + 4, y + 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(helper, x + 4, y + 20);
}

function drawRateBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  rate: number,
  fill: [number, number, number],
) {
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(label, x, y);
  doc.text(formatPercent(rate), x + width, y, { align: "right" });
  doc.setFillColor(235, 239, 232);
  doc.roundedRect(x, y + 3, width, 5, 2.5, 2.5, "F");
  doc.setFillColor(...fill);
  doc.roundedRect(
    x,
    y + 3,
    Math.max(0.5, width * Math.min(1, Math.max(0, rate))),
    5,
    2.5,
    2.5,
    "F",
  );
}

export function exportComparisonPdf(data: ComparisonExportData): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 12;

  doc.setFillColor(32, 59, 42);
  doc.rect(0, 0, width, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Cocoashield", margin, 14);
  doc.setFontSize(12);
  doc.text("Comparatif de campagnes phytosanitaires", margin, 23);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(219, 233, 214);
  doc.text(
    `${data.leftName} (${data.leftDate})  →  ${data.rightName} (${data.rightDate})`,
    margin,
    30,
  );

  const rateDelta = (data.rightInfectionRate - data.leftInfectionRate) * 100;
  const areaDelta =
    (data.rightInfectedAreaSquareMeters - data.leftInfectedAreaSquareMeters) /
    10_000;
  const metricGap = 4;
  const metricWidth = (width - margin * 2 - metricGap * 3) / 4;
  let y = 44;
  drawMetric(
    doc,
    margin,
    y,
    metricWidth,
    "Infection référence",
    formatPercent(data.leftInfectionRate),
    data.leftName,
  );
  drawMetric(
    doc,
    margin + (metricWidth + metricGap),
    y,
    metricWidth,
    "Infection comparée",
    formatPercent(data.rightInfectionRate),
    data.rightName,
  );
  drawMetric(
    doc,
    margin + (metricWidth + metricGap) * 2,
    y,
    metricWidth,
    "Variation",
    signed(rateDelta, " pts"),
    "Évolution du taux",
  );
  drawMetric(
    doc,
    margin + (metricWidth + metricGap) * 3,
    y,
    metricWidth,
    "Évolution surface",
    signed(areaDelta, " ha"),
    "Zones affectées estimées",
  );

  y += 34;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(32, 59, 42);
  doc.text("Évolution du taux d’infection", margin, y);
  doc.setFont("helvetica", "normal");
  y += 7;
  const chartWidth = 118;
  drawRateBar(
    doc,
    margin,
    y,
    chartWidth,
    data.leftName,
    data.leftInfectionRate,
    [93, 130, 63],
  );
  drawRateBar(
    doc,
    margin,
    y + 15,
    chartWidth,
    data.rightName,
    data.rightInfectionRate,
    [184, 69, 51],
  );

  const summaryX = margin + 136;
  doc.setFillColor(248, 250, 246);
  doc.setDrawColor(224, 231, 220);
  doc.roundedRect(summaryX, y - 4, width - margin - summaryX, 34, 3, 3, "FD");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Images traitées : ${data.leftProcessedImages} → ${data.rightProcessedImages}`,
    summaryX + 5,
    y + 4,
  );
  doc.text(
    `Images infectées : ${data.leftInfectedImages} → ${data.rightInfectedImages}`,
    summaryX + 5,
    y + 11,
  );
  doc.text(
    `Surface infectée : ${formatArea(data.leftInfectedAreaSquareMeters)} → ${formatArea(data.rightInfectedAreaSquareMeters)}`,
    summaryX + 5,
    y + 18,
  );
  const evolution =
    rateDelta > 0.05
      ? "aggravation"
      : rateDelta < -0.05
        ? "amélioration"
        : "stabilité";
  doc.setFont("helvetica", "bold");
  doc.setTextColor(
    rateDelta > 0.05 ? 180 : rateDelta < -0.05 ? 45 : 71,
    rateDelta > 0.05 ? 69 : rateDelta < -0.05 ? 120 : 85,
    rateDelta > 0.05 ? 51 : rateDelta < -0.05 ? 74 : 105,
  );
  doc.text(`Tendance globale : ${evolution}`, summaryX + 5, y + 26);
  doc.setFont("helvetica", "normal");

  y += 43;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(32, 59, 42);
  doc.text("Détail par parcelle", margin, y);
  doc.setFont("helvetica", "normal");
  y += 6;

  const columns = [
    margin,
    margin + 74,
    margin + 113,
    margin + 151,
    margin + 190,
  ];
  doc.setFillColor(244, 247, 242);
  doc.roundedRect(margin, y, width - margin * 2, 8, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("PARCELLE", columns[0] + 3, y + 5);
  doc.text("RÉFÉRENCE", columns[1], y + 5);
  doc.text("COMPARÉE", columns[2], y + 5);
  doc.text("SÉV. RÉF.", columns[3], y + 5);
  doc.text("SÉV. COMP.", columns[4], y + 5);
  doc.setFont("helvetica", "normal");
  y += 12;

  const maxRowsOnFirstPage = 7;
  let rowsOnPage = 0;
  for (const parcel of data.parcels) {
    if (rowsOnPage >= maxRowsOnFirstPage || y > height - 20) {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Cocoashield — Comparatif", margin, height - 7);
      doc.addPage();
      y = 18;
      rowsOnPage = 0;
    }
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const parcelName = doc.splitTextToSize(parcel.name, 65) as string[];
    doc.text(parcelName.slice(0, 1), columns[0] + 3, y);
    doc.text(
      parcel.leftRate === null ? "—" : formatPercent(parcel.leftRate),
      columns[1],
      y,
    );
    doc.text(
      parcel.rightRate === null ? "—" : formatPercent(parcel.rightRate),
      columns[2],
      y,
    );
    doc.text(parcel.leftLevel ?? "—", columns[3], y);
    doc.text(parcel.rightLevel ?? "—", columns[4], y);
    doc.setDrawColor(235, 239, 232);
    doc.line(margin, y + 3.5, width - margin, y + 3.5);
    y += 8;
    rowsOnPage += 1;
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(224, 231, 220);
    doc.line(margin, height - 12, width - margin, height - 12);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Cocoashield — Comparatif de campagnes", margin, height - 7);
    doc.text(`Page ${page}/${pages}`, width - margin, height - 7, {
      align: "right",
    });
  }

  doc.save(`comparaison-cocoashield-${timestampForFilename()}.pdf`);
}
