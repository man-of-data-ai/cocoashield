import { computeParcelMetrics } from "@/lib/geo";
import { riskZonesFromAnalysis } from "@/lib/risk-zones";
import { SEVERITY_LABELS, type Severity } from "@/lib/severity";
import type { Analysis } from "@/types/parcel";

export type AnalysisReportData = {
  analysisId: string;
  parcelName: string;
  missionName: string;
  analysisDate: Date;
  reportDate: Date;
  infectionPercentage: number;
  severity: Severity | null;
  severityLabel: string;
  totalImages: number;
  processedImages: number;
  healthyImages: number;
  infectedImages: number;
  failedImages: number;
  preciseImages: number;
  locatedInfectedImages: number;
  affectedZoneCount: number;
  affectedAreaSquareMeters: number | null;
  parcelAreaSquareMeters: number | null;
  notes: string;
  zones: Array<{
    id: string;
    severity: Severity;
    severityLabel: string;
    latitude: number;
    longitude: number;
    surfaceSquareMeters: number | null;
  }>;
  insights: string[];
  recommendations: string[];
};

function percentageFor(analysis: Analysis, processedImages: number, infectedImages: number): number {
  if (typeof analysis.infectionPercentage === "number") return analysis.infectionPercentage;
  return processedImages > 0 ? (infectedImages / processedImages) * 100 : 0;
}

function recommendationsFor(severity: Severity | null, locatedZones: number): string[] {
  const recommendations: string[] = [];
  if (severity === "critique") {
    recommendations.push("Prioriser une vérification terrain des zones critiques et planifier une intervention rapide.");
  } else if (severity === "eleve") {
    recommendations.push("Programmer une vérification terrain rapprochée des zones à sévérité élevée.");
  } else if (severity === "modere") {
    recommendations.push("Maintenir une surveillance renforcée lors du prochain passage terrain.");
  } else if (severity === "faible") {
    recommendations.push("Poursuivre le suivi régulier afin de détecter rapidement toute évolution.");
  }
  if (locatedZones > 0) {
    recommendations.push("Utiliser les coordonnées des zones à risque pour cibler les observations et contrôles sur le terrain.");
  }
  recommendations.push("Comparer cette analyse au prochain passage afin de mesurer l’évolution des zones affectées.");
  return recommendations;
}

export function buildAnalysisReport(analysis: Analysis): AnalysisReportData {
  const processed = analysis.images.filter((image) => image.status === "processed" && image.result !== null);
  const healthy = processed.filter((image) => image.result === "healthy").length;
  const infected = processed.filter((image) => image.result === "infected").length;
  const failed = analysis.images.filter((image) => image.status === "failed").length;
  const precise = analysis.images.filter((image) => image.geolocationQuality === "precise").length;
  const locatedInfected = analysis.images.filter(
    (image) => image.status === "processed" && image.result === "infected" && image.latitude !== null && image.longitude !== null && image.geolocationQuality !== "none"
  ).length;
  const infectionPercentage = percentageFor(analysis, processed.length, infected);
  const severity = analysis.severityLevel;
  const zones = analysis.parcel ? riskZonesFromAnalysis(analysis.parcel, analysis) : [];
  const geometryZoneAreas = zones
    .map((zone) => zone.surfaceSquareMeters)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);
  const affectedAreaSquareMeters = geometryZoneAreas.length > 0 ? geometryZoneAreas.reduce((sum, value) => sum + value, 0) : null;
  const parcelAreaSquareMeters = analysis.parcel ? computeParcelMetrics(analysis.parcel.boundary).areaSquareMeters : null;

  const insights: string[] = [];
  if (processed.length > 0) insights.push(`${infected} image${infected > 1 ? "s" : ""} infectée${infected > 1 ? "s" : ""} sur ${processed.length} image${processed.length > 1 ? "s" : ""} traitée${processed.length > 1 ? "s" : ""}.`);
  else insights.push("Aucune image traitée n’est disponible pour cette analyse.");
  if (zones.length > 0) insights.push(`${zones.length} zone${zones.length > 1 ? "s" : ""} à risque géolocalisée${zones.length > 1 ? "s" : ""} dans la parcelle.`);
  else insights.push("Aucune zone à risque géolocalisée n’est disponible dans les données de cette analyse.");
  if (affectedAreaSquareMeters !== null) insights.push(`La surface cumulée des zones disposant d’une géométrie est estimée à ${(affectedAreaSquareMeters / 10_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ha.`);
  if (precise < analysis.images.length && analysis.images.length > 0) insights.push(`${precise} image${precise > 1 ? "s" : ""} sur ${analysis.images.length} dispose${precise > 1 ? "nt" : ""} d’une géolocalisation précise.`);

  return {
    analysisId: analysis.id,
    parcelName: analysis.parcel?.name ?? "Parcelle",
    missionName: analysis.mission?.name ?? "Sans mission associée",
    analysisDate: new Date(analysis.completedAt ?? analysis.createdAt),
    reportDate: new Date(analysis.reportGeneratedAt ?? analysis.completedAt ?? analysis.createdAt),
    infectionPercentage,
    severity,
    severityLabel: severity ? SEVERITY_LABELS[severity] : "En attente",
    totalImages: analysis.images.length,
    processedImages: processed.length,
    healthyImages: healthy,
    infectedImages: infected,
    failedImages: failed,
    preciseImages: precise,
    locatedInfectedImages: locatedInfected,
    affectedZoneCount: zones.length,
    affectedAreaSquareMeters,
    parcelAreaSquareMeters,
    notes: analysis.notes?.trim() ?? "",
    zones: zones.map((zone) => ({
      id: zone.id,
      severity: zone.level,
      severityLabel: SEVERITY_LABELS[zone.level],
      latitude: zone.latitude,
      longitude: zone.longitude,
      surfaceSquareMeters: zone.surfaceSquareMeters,
    })),
    insights,
    recommendations: recommendationsFor(severity, zones.length),
  };
}
