import type {
  Analysis,
  AnalysisImage,
  AnalysisImageSource,
  GeolocationQuality,
  Parcel,
} from "@/types/parcel";
import {
  computeSeverityFromImages,
  type SeverityThresholds,
  type SeverityLevel,
} from "@/lib/severity";

export type PeriodPreset = "7d" | "30d" | "90d" | "all" | "custom";

export type MapFiltersState = {
  search: string;
  activeLevels: SeverityLevel[];
  missionIds: string[];
  parcelIds: string[];
  vectors: AnalysisImageSource[];
  droneProfileIds: string[];
  geolocQualities: GeolocationQuality[];
  period: PeriodPreset;
  customStart: string | null;
  customEnd: string | null;
};

export const ALL_SEVERITY_LEVELS: SeverityLevel[] = [
  "critique",
  "eleve",
  "modere",
  "faible",
];

export const ALL_VECTORS: AnalysisImageSource[] = ["mobile", "upload"];

export const ALL_GEOLOC_QUALITIES: GeolocationQuality[] = [
  "precise",
  "approximate",
  "none",
];

export const DEFAULT_MAP_FILTERS: MapFiltersState = {
  search: "",
  activeLevels: ALL_SEVERITY_LEVELS,
  missionIds: [],
  parcelIds: [],
  vectors: ALL_VECTORS,
  droneProfileIds: [],
  geolocQualities: ALL_GEOLOC_QUALITIES,
  period: "all",
  customStart: null,
  customEnd: null,
};

export type ImageEntry = {
  parcel: Parcel;
  analysis: Analysis;
  image: AnalysisImage;
};

export function collectImageEntries(parcels: Parcel[]): ImageEntry[] {
  const entries: ImageEntry[] = [];
  for (const parcel of parcels) {
    for (const analysis of parcel.analyses ?? []) {
      for (const image of analysis.images ?? []) {
        entries.push({ parcel, analysis, image });
      }
    }
  }
  return entries;
}

function periodStartDate(period: PeriodPreset, now: Date): Date | null {
  const days =
    period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : null;
  if (days === null) return null;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start;
}

export function applyDataFilters(
  entries: ImageEntry[],
  filters: MapFiltersState,
): ImageEntry[] {
  const now = new Date();
  const presetStart = periodStartDate(filters.period, now);
  const customStart = filters.customStart
    ? new Date(filters.customStart)
    : null;
  const customEnd = filters.customEnd ? new Date(filters.customEnd) : null;

  const missionFilterActive = filters.missionIds.length > 0;
  const vectorFilterActive = filters.vectors.length < ALL_VECTORS.length;
  const geolocFilterActive =
    filters.geolocQualities.length < ALL_GEOLOC_QUALITIES.length;
  const droneFilterActive = filters.droneProfileIds.length > 0;

  return entries.filter(({ analysis, image }) => {
    if (vectorFilterActive && !filters.vectors.includes(image.source)) {
      return false;
    }
    if (
      geolocFilterActive &&
      !filters.geolocQualities.includes(image.geolocationQuality)
    ) {
      return false;
    }
    if (
      droneFilterActive &&
      (!analysis.profileId ||
        !filters.droneProfileIds.includes(analysis.profileId))
    ) {
      return false;
    }
    if (missionFilterActive) {
      if (
        !analysis.missionId ||
        !filters.missionIds.includes(analysis.missionId)
      ) {
        return false;
      }
    }

    const capturedAt = new Date(image.createdAt);
    if (filters.period === "custom") {
      if (customStart && capturedAt < customStart) return false;
      if (customEnd && capturedAt > customEnd) return false;
    } else if (presetStart && capturedAt < presetStart) {
      return false;
    }

    return true;
  });
}

export type ParcelAggregate = {
  parcel: Parcel;
  entries: ImageEntry[];
  level: SeverityLevel;
  infectionRate: number;
  processedImages: number;
  infectedImages: number;
};

export function aggregateByParcel(
  entries: ImageEntry[],
  thresholds: SeverityThresholds,
): ParcelAggregate[] {
  const byParcel = new Map<string, ImageEntry[]>();
  for (const entry of entries) {
    const list = byParcel.get(entry.parcel.id) ?? [];
    list.push(entry);
    byParcel.set(entry.parcel.id, list);
  }

  const aggregates: ParcelAggregate[] = [];
  for (const [, parcelEntries] of byParcel) {
    const parcel = parcelEntries[0].parcel;
    const severity = computeSeverityFromImages(
      parcelEntries.map((entry) => entry.image),
      thresholds,
    );
    aggregates.push({
      parcel,
      entries: parcelEntries,
      level: severity.level,
      infectionRate: severity.infectionRate,
      processedImages: severity.processedImages,
      infectedImages: severity.infectedImages,
    });
  }
  return aggregates;
}

export function applySeverityAndSearchFilters(
  aggregates: ParcelAggregate[],
  filters: Pick<MapFiltersState, "activeLevels" | "search" | "parcelIds">,
): ParcelAggregate[] {
  const query = filters.search.trim().toLowerCase();
  return aggregates
    .filter(
      (aggregate) =>
        filters.parcelIds.length === 0 ||
        filters.parcelIds.includes(aggregate.parcel.id),
    )
    .filter((aggregate) =>
      query ? aggregate.parcel.name.toLowerCase().includes(query) : true,
    );
}
