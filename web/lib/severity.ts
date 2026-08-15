/**
 * Sévérité graduée d'une parcelle, calculée côté client à partir du taux
 * d'images classées "infected" parmi les images déjà traitées de toutes ses
 * analyses. Le backend ne stocke qu'un statut binaire par image
 * (AnalysisResult: healthy | infected) ; on agrège ce signal en 4 niveaux
 * pour se rapprocher de la maquette (faible / modérée / élevée / critique)
 * sans avoir à modifier le modèle de données.
 */

import type { Analysis, AnalysisImage, Parcel } from "@/types/parcel";

export type Severity = "faible" | "modere" | "eleve" | "critique";

/** Sévérité pour une parcelle qui n'a pas encore de résultat exploitable. */
export type SeverityLevel = Severity | "inconnu";

export type ParcelSeverity = {
  level: SeverityLevel;
  /** Taux d'images infectées parmi les images traitées, de 0 à 1. */
  infectionRate: number;
  processedImages: number;
  infectedImages: number;
  /** Nombre total d'images (traitées ou non) toutes analyses confondues. */
  totalImages: number;
};

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  faible: "Faible",
  modere: "Modérée",
  eleve: "Élevée",
  critique: "Critique",
  inconnu: "—",
};

/** Couleur pleine (marqueurs, badges) par niveau de sévérité. */
export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  faible: "#10b981",
  modere: "#facc15",
  eleve: "#f97316",
  critique: "#dc2626",
  inconnu: "#94a3b8",
};

/** Classes Tailwind équivalentes, pour les badges/légendes. */
export const SEVERITY_BADGE_CLASSES: Record<SeverityLevel, string> = {
  faible: "bg-emerald-500",
  modere: "bg-yellow-400",
  eleve: "bg-orange-500",
  critique: "bg-red-600",
  inconnu: "bg-slate-400",
};

const SEVERITY_ORDER: SeverityLevel[] = [
  "inconnu",
  "faible",
  "modere",
  "eleve",
  "critique",
];

/** Seuils par défaut (taux d'infection) délimitant chaque niveau. */
export type SeverityThresholds = {
  faible: number;
  modere: number;
  eleve: number;
  critique: number;
};

export const DEFAULT_SEVERITY_THRESHOLDS: SeverityThresholds = {
  faible: 0,
  modere: 0.1,
  eleve: 0.25,
  critique: 0.4,
};

let runtimeSeverityThresholds: SeverityThresholds = { ...DEFAULT_SEVERITY_THRESHOLDS };

export function setRuntimeSeverityThresholds(thresholds: Omit<SeverityThresholds, 'faible'>): void {
  runtimeSeverityThresholds = { faible: 0, ...thresholds };
}

export function getRuntimeSeverityThresholds(): SeverityThresholds {
  return runtimeSeverityThresholds;
}

function levelFromRate(
  rate: number,
  thresholds: SeverityThresholds = runtimeSeverityThresholds
): Severity {
  if (rate >= thresholds.critique) return "critique";
  if (rate >= thresholds.eleve) return "eleve";
  if (rate >= thresholds.modere) return "modere";
  return "faible";
}

/**
 * Calcule la sévérité à partir d'un ensemble d'images déjà résolu (par
 * exemple le sous-ensemble retenu après application des filtres période /
 * mission / vecteur / qualité géoloc). Toutes les images "processed"
 * (traitées avec un résultat) sont agrégées ; un ensemble sans image
 * traitée est "inconnu".
 */
export function computeSeverityFromImages(
  images: AnalysisImage[],
  thresholds?: SeverityThresholds
): ParcelSeverity {
  const totalImages = images.length;
  const processed = images.filter(
    (image) => image.status === "processed" && image.result !== null
  );
  const infected = processed.filter((image) => image.result === "infected");

  const processedImages = processed.length;
  const infectedImages = infected.length;
  const infectionRate = processedImages > 0 ? infectedImages / processedImages : 0;

  const level: SeverityLevel =
    processedImages > 0 ? levelFromRate(infectionRate, thresholds) : "inconnu";

  return { level, infectionRate, processedImages, infectedImages, totalImages };
}

/**
 * Calcule la sévérité d'une parcelle à partir de la totalité de ses
 * analyses (aucun filtre appliqué). Pratique pour les vues qui n'ont pas
 * besoin de filtrage (ex: liste des parcelles).
 */
export function computeParcelSeverity(
  parcel: Pick<Parcel, "analyses">,
  thresholds?: SeverityThresholds
): ParcelSeverity {
  const analyses: Analysis[] = parcel.analyses ?? [];
  const images = analyses.flatMap((analysis) => analysis.images ?? []);
  return computeSeverityFromImages(images, thresholds);
}

/** Compare deux niveaux de sévérité (ordre croissant de gravité). */
export function severityRank(level: SeverityLevel): number {
  return SEVERITY_ORDER.indexOf(level);
}
