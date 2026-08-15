import type { Analysis, Parcel, ParcelBoundary } from "@/types/parcel";
import { computeParcelMetrics } from "@/lib/geo";
import { getRuntimeSeverityThresholds, type Severity } from "@/lib/severity";

export type RiskZone = {
  id: string;
  parcelId: string;
  parcelName: string;
  analysisId: string;
  latitude: number;
  longitude: number;
  severity: number;
  level: Severity;
  surfaceSquareMeters: number | null;
  geometry: ParcelBoundary | null;
};

export function severityFromZoneScore(score: number): Severity {
  const thresholds = getRuntimeSeverityThresholds();
  if (score >= thresholds.critique) return "critique";
  if (score >= thresholds.eleve) return "eleve";
  if (score >= thresholds.modere) return "modere";
  return "faible";
}

function analysisLevel(analysis: Analysis): Severity {
  if (analysis.severityLevel) return analysis.severityLevel;
  return severityFromZoneScore(Math.max(0, Math.min(1, (analysis.infectionPercentage ?? 0) / 100)));
}

export function riskZonesFromAnalysis(parcel: Parcel, analysis: Analysis, allowedImageIds?: Set<string>): RiskZone[] {
  const level = analysisLevel(analysis);
  const infectionWeight = Math.max(0.15, Math.min(1, (analysis.infectionPercentage ?? 0) / 100));

  const geometryZones = (analysis.affectedZones ?? [])
    .filter((zone) => zone.geometry && Number.isFinite(zone.latitude) && Number.isFinite(zone.longitude))
    .map((zone, index): RiskZone => ({
      id: `${analysis.id}:geometry:${index}`,
      parcelId: parcel.id,
      parcelName: parcel.name,
      analysisId: analysis.id,
      latitude: zone.latitude,
      longitude: zone.longitude,
      severity: Math.max(0, Math.min(1, zone.severity)),
      level: zone.severityLevel ?? level,
      surfaceSquareMeters: zone.surfaceSquareMeters ?? computeParcelMetrics(zone.geometry!).areaSquareMeters,
      geometry: zone.geometry!,
    }));

  if (geometryZones.length > 0) return geometryZones;

  return (analysis.images ?? [])
    .filter((image) => !allowedImageIds || allowedImageIds.has(image.id))
    .filter((image) => image.status === "processed" && image.result === "infected")
    .filter((image) => image.latitude !== null && image.longitude !== null && image.geolocationQuality !== "none")
    .map((image): RiskZone => ({
      id: `${analysis.id}:image:${image.id}`,
      parcelId: parcel.id,
      parcelName: parcel.name,
      analysisId: analysis.id,
      latitude: image.latitude!,
      longitude: image.longitude!,
      severity: infectionWeight,
      level,
      surfaceSquareMeters: null,
      geometry: null,
    }));
}

export function riskZonesFromParcels(parcels: Parcel[]): RiskZone[] {
  return parcels.flatMap((parcel) => (parcel.analyses ?? []).flatMap((analysis) => riskZonesFromAnalysis(parcel, analysis)));
}
