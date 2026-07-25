import Link from "next/link";

import StatusBadge from "@/components/ui/StatusBadge";
import type { Analysis } from "@/types/parcel";

type AnalysisListProps = {
  parcelId: string;
  analyses: Analysis[];
};

export default function AnalysisList({ parcelId, analyses }: AnalysisListProps) {
  if (analyses.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
        Aucune analyse pour cette parcelle pour le moment.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {analyses.map((analysis) => (
        <li key={analysis.id}>
          <Link
            href={`/parcels/${parcelId}/analyses/${analysis.id}`}
            className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">
                {new Date(analysis.createdAt).toLocaleString("fr-FR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {analysis.images.length} image
                {analysis.images.length > 1 ? "s" : ""}
                {analysis.notes && ` · ${analysis.notes}`}
              </p>
            </div>

            {analysis.result ? (
              <StatusBadge status={analysis.result} />
            ) : (
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {analysis.status === "processing" ? "En cours" : "En attente"}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
