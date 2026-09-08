import { jsPDF } from "jspdf";
import { drawCocoaShieldFooter, drawCocoaShieldHeader } from "@/lib/pdf-brand";
import type { Analysis, Parcel } from "@/types/parcel";
import { riskZonesFromAnalysis } from "@/lib/risk-zones";

export type PeriodicReportEntry = { parcel: Parcel; analysis: Analysis; date: Date };

const SEVERITY_RGB: Record<string, [number, number, number]> = {
  faible: [92, 148, 76],
  modere: [231, 174, 47],
  eleve: [226, 114, 44],
  critique: [194, 57, 52],
};

function finiteBounds(entries: PeriodicReportEntry[]) {
  const points: Array<[number, number]> = [];
  for (const { parcel, analysis } of entries) {
    for (const ring of parcel.boundary?.coordinates ?? []) for (const [lng, lat] of ring) if (Number.isFinite(lat) && Number.isFinite(lng)) points.push([lng, lat]);
    for (const zone of riskZonesFromAnalysis(parcel, analysis)) if (Number.isFinite(zone.latitude) && Number.isFinite(zone.longitude)) points.push([zone.longitude, zone.latitude]);
  }
  if (!points.length) return null;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

export function exportPeriodicSummaryPdf(args: {
  current: PeriodicReportEntry[];
  previous: PeriodicReportEntry[];
  periodLabel: string;
  generatedAt?: Date;
}) {
  const { current, previous, periodLabel } = args;
  const generatedAt = args.generatedAt ?? new Date();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const zones = current.flatMap(({ parcel, analysis }) => riskZonesFromAnalysis(parcel, analysis));
  const previousZones = previous.flatMap(({ parcel, analysis }) => riskZonesFromAnalysis(parcel, analysis));
  const activeZones = zones.filter((z) => z.zoneStatus !== "regression").length;
  const surfaceM2 = zones.reduce((sum, z) => sum + (z.surfaceSquareMeters ?? 0), 0);
  const previousSurfaceM2 = previousZones.reduce((sum, z) => sum + (z.surfaceSquareMeters ?? 0), 0);
  const evolution = previousSurfaceM2 > 0 ? ((surfaceM2 - previousSurfaceM2) / previousSurfaceM2) * 100 : null;
  const diagnostics = current.reduce((sum, row) => sum + (row.analysis.images?.filter((i) => i.status === "processed").length ?? 0), 0);

  drawCocoaShieldHeader(doc, {
    title: "Rapport de synthèse cartographique",
    subtitle: periodLabel,
    context: `Généré le ${generatedAt.toLocaleString("fr-FR")}`,
    height: 34,
    margin: 15,
  });

  doc.setTextColor(71, 85, 105);
  const cards = [
    ["Campagnes", String(current.length)],
    ["Zones actives", String(activeZones)],
    ["Surface infectée estimée", surfaceM2 > 0 ? `${(surfaceM2 / 10000).toFixed(2)} ha` : "Non estimée"],
    ["Évolution vs période précédente", evolution === null ? "N/D" : `${evolution >= 0 ? "+" : ""}${evolution.toFixed(1)} %`],
  ];
  cards.forEach(([label, value], index) => {
    const x = 15 + index * 46;
    doc.setFillColor(248, 250, 246);
    doc.setDrawColor(224, 231, 220);
    doc.roundedRect(x, 43, 42, 22, 2, 2, "FD");
    doc.setFontSize(7);
    doc.text(label, x + 3, 49, { maxWidth: 36 });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(value, x + 3, 59);
    doc.setFont("helvetica", "normal");
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(32, 59, 42);
  doc.text("Carte de synthèse des zones prioritaires", 15, 76);
  const mapX = 15, mapY = 81, mapW = 180, mapH = 80;
  doc.setDrawColor(205, 214, 205);
  doc.setFillColor(247, 249, 245);
  doc.roundedRect(mapX, mapY, mapW, mapH, 2, 2, "FD");
  const bounds = finiteBounds(current);
  if (bounds) {
    const dx = Math.max(bounds.maxX - bounds.minX, 0.00001);
    const dy = Math.max(bounds.maxY - bounds.minY, 0.00001);
    const project = (lng: number, lat: number): [number, number] => [mapX + 5 + ((lng - bounds.minX) / dx) * (mapW - 10), mapY + mapH - 5 - ((lat - bounds.minY) / dy) * (mapH - 10)];
    for (const { parcel } of current) {
      const ring = parcel.boundary?.coordinates?.[0];
      if (!ring?.length) continue;
      doc.setDrawColor(42, 78, 54);
      doc.setLineWidth(0.35);
      for (let i = 1; i < ring.length; i++) {
        const a = project(ring[i - 1][0], ring[i - 1][1]);
        const b = project(ring[i][0], ring[i][1]);
        doc.line(a[0], a[1], b[0], b[1]);
      }
    }
    for (const zone of zones) {
      const [x, y] = project(zone.longitude, zone.latitude);
      const [r, g, b] = SEVERITY_RGB[zone.level] ?? [140, 140, 140];
      doc.setFillColor(r, g, b);
      doc.setDrawColor(r, g, b);
      const radius = Math.max(1.7, Math.min(5.5, 1.8 + zone.severity * 4));
      doc.circle(x, y, radius, "F");
    }
  } else {
    doc.setFontSize(9);
    doc.text("Aucune géométrie disponible pour la période.", 20, 90);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(32, 59, 42);
  doc.text("Zones prioritaires", 15, 172);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  let y = 180;
  const prioritized = [...zones].sort((a, b) => b.severity - a.severity).slice(0, 8);
  if (!prioritized.length) doc.text("Aucune zone infectée cartographiée sur la période.", 15, y);
  else for (const zone of prioritized) {
    const label = `${zone.parcelName} — ${zone.level.toUpperCase()} — ${(zone.infectionRate * 100).toFixed(0)} % — ${zone.diagnosticCount} diagnostic(s)`;
    doc.text(label, 15, y, { maxWidth: 180 });
    y += 7;
  }

  y = Math.max(y + 4, 242);
  doc.setFontSize(8);
  doc.text(`Diagnostics analysés : ${diagnostics.toLocaleString("fr-FR")}. Les surfaces sont des estimations issues des zones agrégées disponibles.`, 15, y, { maxWidth: 180 });
  doc.setFontSize(7.5);
  doc.setTextColor(86, 112, 70);
  doc.text("Outil d’aide à la décision — validation agronomique requise avant intervention.", 15, Math.min(y + 10, 273), { maxWidth: 180 });
  drawCocoaShieldFooter(doc, "Rapport de synthèse cartographique", 1, 1, 15);
  doc.save(`cocoashield-synthese-${generatedAt.toISOString().slice(0, 10)}.pdf`);
}
