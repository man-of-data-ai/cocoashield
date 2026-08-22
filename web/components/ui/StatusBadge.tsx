import type { AnalysisResult, ParcelStatus } from "@/types/parcel";

type Status = ParcelStatus | AnalysisResult;

const STATUS_LABELS: Record<Status, string> = {
  not_analyzed: "Non analysée",
  analyzing: "Analyse en cours",
  sick: "Malade",
  healthy: "Saine",
  infected: "Infectée",
};

const STATUS_CLASSES: Record<Status, string> = {
  not_analyzed: "border-slate-200 bg-slate-100 text-slate-600",
  analyzing: "border-amber-200 bg-amber-50 text-amber-700",
  sick: "border-red-200 bg-red-50 text-red-700",
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  infected: "border-red-200 bg-red-50 text-red-700",
};

type StatusBadgeProps = {
  status: Status;
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
