
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

export function computeParcelSeverity(
  parcel: Pick<Parcel, "analyses">,
  thresholds?: SeverityThresholds
): ParcelSeverity {
  const analyses: Analysis[] = parcel.analyses ?? [];
  const images = analyses.flatMap((analysis) => analysis.images ?? []);
  return computeSeverityFromImages(images, thresholds);
}

export function severityRank(level: SeverityLevel): number {
  return SEVERITY_ORDER.indexOf(level);
}
