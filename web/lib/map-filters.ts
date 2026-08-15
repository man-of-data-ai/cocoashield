/**
 * Filtrage combiné du dashboard cartographique (§5.3, exigence 16) :
 * période, mission, sévérité, vecteur de capture, qualité de géolocalisation.
 *
 * Le filtrage opère au niveau image (la granularité la plus fine dont on
 * dispose), puis les résultats sont ré-agrégés par parcelle pour recolorer
 * les zones et construire les couches cartographiques. Tout se fait côté
 * client à partir des données déjà chargées : aucun rechargement réseau
 * n'est nécessaire lorsqu'un filtre change.
 */

import type {
  Analysis,
  AnalysisImage,
  AnalysisImageSource,
  GeolocationQuality,
  Parcel,
} from "@/types/parcel";
import {
  computeSeverityFromImages,
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
  /** Utilisés uniquement quand period === "custom" (format YYYY-MM-DD). */
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

/** Une image "aplatie", avec ses parents parcelle/analyse pour le contexte. */
export type ImageEntry = {
  parcel: Parcel;
  analysis: Analysis;
  image: AnalysisImage;
};

/** Aplatit toutes les parcelles en liste d'images individuelles. */
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
  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : null;
  if (days === null) return null;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start;
}

/** Filtre les images par vecteur, qualité géoloc, mission et période. La
 * sévérité et la recherche par nom se font en aval, sur les parcelles
 * ré-agrégées (voir applySeverityAndSearchFilters). */
export function applyDataFilters(
  entries: ImageEntry[],
  filters: MapFiltersState
): ImageEntry[] {
  const now = new Date();
  const presetStart = periodStartDate(filters.period, now);
  const customStart = filters.customStart ? new Date(filters.customStart) : null;
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
    if (droneFilterActive && (!analysis.profileId || !filters.droneProfileIds.includes(analysis.profileId))) {
      return false;
    }
    if (missionFilterActive) {
      if (!analysis.missionId || !filters.missionIds.includes(analysis.missionId)) {
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

/** Ré-agrège les images filtrées par parcelle, avec sévérité recalculée. */
export function aggregateByParcel(entries: ImageEntry[]): ParcelAggregate[] {
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
      parcelEntries.map((entry) => entry.image)
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

/** Applique le filtre sévérité + recherche texte sur les agrégats parcelle. */
export function applySeverityAndSearchFilters(
  aggregates: ParcelAggregate[],
  filters: Pick<MapFiltersState, "activeLevels" | "search" | "parcelIds">
): ParcelAggregate[] {
  const query = filters.search.trim().toLowerCase();
  return aggregates
    .filter((aggregate) =>
      filters.parcelIds.length === 0 || filters.parcelIds.includes(aggregate.parcel.id)
    )
        .filter((aggregate) =>
      query ? aggregate.parcel.name.toLowerCase().includes(query) : true
    );
}
