import { jsPDF } from "jspdf";
import { drawCocoaShieldFooter, drawCocoaShieldHeader } from "@/lib/pdf-brand";
import type { ParcelSummary } from "@/services/parcel-service";

export function exportDirectionSummaryPdf(summary: ParcelSummary, organizationName: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  drawCocoaShieldHeader(doc, { title: "Synthèse institutionnelle", subtitle: organizationName, context: "Instance On-Premise · Vue agrégée", height: 31, margin: 15 });
  const cards = [
    ["Parcelles suivies", String(summary.parcelCount)],
    ["Analyses terminées", String(summary.completedAnalysisCount)],
    ["Prévalence moyenne", `${summary.averageInfectionPercentage.toFixed(1)} %`],
    ["Foyers actifs", String(summary.activeZones)],
    ["Foyers critiques", String(summary.criticalZones)],
    ["Surface infectée estimée", `${(summary.affectedSurfaceSquareMeters / 10000).toFixed(2)} ha`],
  ];
  let y = 48;
  cards.forEach(([label, value], index) => {
    const col = index % 2;
    if (index > 0 && col === 0) y += 28;
    const x = 15 + col * 91;
    doc.setFillColor(247, 249, 245); doc.roundedRect(x, y, 84, 22, 3, 3, "F");
    doc.setTextColor(94, 122, 76); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.text(label.toUpperCase(), x + 5, y + 7);
    doc.setTextColor(32, 59, 42); doc.setFontSize(15); doc.text(value, x + 5, y + 16);
  });
  y += 39;
  doc.setTextColor(32, 59, 42); doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("Lecture décisionnelle", 15, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80, 90, 84);
  const text = "Cette synthèse présente uniquement des indicateurs agrégés. Elle n’expose ni le nom des planteurs, ni les coordonnées précises, ni les contours nominatifs des parcelles. Elle sert au pilotage phytosanitaire et à l’observation de l’évolution globale.";
  doc.text(doc.splitTextToSize(text, 180), 15, y + 7);
  drawCocoaShieldFooter(doc, "Synthèse institutionnelle On-Premise", 1, 1, 15);
  doc.save(`cocoashield-synthese-direction-${new Date().toISOString().slice(0,10)}.pdf`);
}
