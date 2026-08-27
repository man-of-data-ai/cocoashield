/**
 * Vocabulaire et affichage de la sévérité.
 *
 * La **classification** est faite par le backend, qui applique les seuils
 * configurés dans `platform_settings` et stocke `severityLevel` sur chaque
 * analyse. Le front affiche ce niveau : il ne redéfinit pas la règle métier.
 *
 * Les fonctions de calcul ci-dessous ne servent qu'aux analyses non encore
 * finalisées (aucun `severityLevel` disponible). Elles sont pures : les
 * seuils sont passés en argument, jamais lus dans un état global mutable.
 */

import type { Analysis, AnalysisImage, Parcel } from "@/types/parcel";

export type Severity = "faible" | "modere" | "eleve" | "critique";

export type SeverityLevel = Severity | "inconnu";

export type ParcelSeverity = {
  level: SeverityLevel;
  infectionRate: number;
  processedImages: number;
  infectedImages: number;
  totalImages: number;
};

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  faible: "Faible",
  modere: "Modérée",
  eleve: "Élevée",
  critique: "Critique",
  inconnu: "—",
};

export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  faible: "#10b981",
  modere: "#facc15",
  eleve: "#f97316",
  critique: "#dc2626",
  inconnu: "#94a3b8",
};

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

/** Seuils exprimés en taux d'infection (0 → 1), tels que servis par l'API. */
export type SeverityThresholds = {
  modere: number;
  eleve: number;
  critique: number;
};

/**
 * Repli utilisé tant que la configuration n'a pas été chargée. Les valeurs
 * font écho aux défauts du backend (`DEFAULT_SETTINGS`) ; la valeur qui fait
 * foi reste celle renvoyée par `/v1/configuration/settings`.
 */
export const FALLBACK_SEVERITY_THRESHOLDS: SeverityThresholds = {
  modere: 0.1,
  eleve: 0.25,
  critique: 0.4,
};

export function levelFromRate(
  rate: number,
  thresholds: SeverityThresholds,
): Severity {
  if (rate >= thresholds.critique) return "critique";
  if (rate >= thresholds.eleve) return "eleve";
  if (rate >= thresholds.modere) return "modere";
  return "faible";
}

export function computeSeverityFromImages(
  images: AnalysisImage[],
  thresholds: SeverityThresholds,
): ParcelSeverity {
  const processed = images.filter(
    (image) => image.status === "processed" && image.result !== null,
  );
  const infected = processed.filter((image) => image.result === "infected");
  const infectionRate =
    processed.length > 0 ? infected.length / processed.length : 0;

  return {
    level:
      processed.length > 0
        ? levelFromRate(infectionRate, thresholds)
        : "inconnu",
    infectionRate,
    processedImages: processed.length,
    infectedImages: infected.length,
    totalImages: images.length,
  };
}

/**
 * Sévérité d'une parcelle.
 *
 * Priorité au niveau calculé par le backend sur l'analyse la plus récente ;
 * le comptage local n'intervient que pour les analyses encore en cours.
 */
export function computeParcelSeverity(
  parcel: Pick<Parcel, "analyses">,
  thresholds: SeverityThresholds,
): ParcelSeverity {
  const analyses: Analysis[] = parcel.analyses ?? [];
  const images = analyses.flatMap((analysis) => analysis.images ?? []);
  const computed = computeSeverityFromImages(images, thresholds);

  const latestScored = analyses.find(
    (analysis) => analysis.severityLevel !== null,
  );
  if (!latestScored?.severityLevel) {
    return computed;
  }

  return {
    ...computed,
    level: latestScored.severityLevel,
    infectionRate: (latestScored.infectionPercentage ?? 0) / 100,
  };
}

export function severityRank(level: SeverityLevel): number {
  return SEVERITY_ORDER.indexOf(level);
}
