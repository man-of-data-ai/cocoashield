import { computeParcelMetrics } from "@/lib/geo";
import {
  computeSeverityFromImages,
  type SeverityLevel,
  type SeverityThresholds,
} from "@/lib/severity";
import type { AnalysisImage, Mission, Parcel } from "@/types/parcel";

export type ZoneHistoryParcelSnapshot = {
  parcel: Parcel;
  images: AnalysisImage[];
  level: SeverityLevel;
  infectionRate: number;
  processedImages: number;
  infectedImages: number;
  estimatedInfectedAreaSquareMeters: number;
};

export type ZoneHistorySnapshot = {
  mission: Mission;
  parcels: ZoneHistoryParcelSnapshot[];
  images: Array<{ parcel: Parcel; image: AnalysisImage }>;
  processedImages: number;
  infectedImages: number;
  infectionRate: number;
  infectedAreaSquareMeters: number;
  observedAreaSquareMeters: number;
};

export function buildZoneHistorySnapshot(
  parcels: Parcel[],
  mission: Mission,
  thresholds: SeverityThresholds,
): ZoneHistorySnapshot {
  const parcelSnapshots: ZoneHistoryParcelSnapshot[] = [];
  const imageEntries: Array<{ parcel: Parcel; image: AnalysisImage }> = [];

  for (const parcel of parcels) {
    const missionAnalyses = (parcel.analyses ?? []).filter(
      (analysis) => analysis.missionId === mission.id,
    );
    if (missionAnalyses.length === 0) continue;

    const images = missionAnalyses.flatMap((analysis) => analysis.images ?? []);
    const severity = computeSeverityFromImages(images, thresholds);
    const area = computeParcelMetrics(parcel.boundary).areaSquareMeters;

    parcelSnapshots.push({
      parcel,
      images,
      level: severity.level,
      infectionRate: severity.infectionRate,
      processedImages: severity.processedImages,
      infectedImages: severity.infectedImages,
      estimatedInfectedAreaSquareMeters: area * severity.infectionRate,
    });

    for (const image of images) imageEntries.push({ parcel, image });
  }

  const processedImages = parcelSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.processedImages,
    0,
  );
  const infectedImages = parcelSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.infectedImages,
    0,
  );
  const infectionRate =
    processedImages > 0 ? infectedImages / processedImages : 0;
  const infectedAreaSquareMeters = parcelSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.estimatedInfectedAreaSquareMeters,
    0,
  );
  const observedAreaSquareMeters = parcelSnapshots.reduce(
    (sum, snapshot) =>
      sum + computeParcelMetrics(snapshot.parcel.boundary).areaSquareMeters,
    0,
  );

  return {
    mission,
    parcels: parcelSnapshots,
    images: imageEntries,
    processedImages,
    infectedImages,
    infectionRate,
    infectedAreaSquareMeters,
    observedAreaSquareMeters,
  };
}

export function parcelsForComparisonReference(
  parcels: Parcel[],
  missionIds: string[],
): Parcel[] {
  const selectedMissionIds = new Set(missionIds.filter(Boolean));
  if (selectedMissionIds.size === 0) return [];

  return parcels.filter((parcel) =>
    (parcel.analyses ?? []).some(
      (analysis) =>
        analysis.missionId && selectedMissionIds.has(analysis.missionId),
    ),
  );
}
