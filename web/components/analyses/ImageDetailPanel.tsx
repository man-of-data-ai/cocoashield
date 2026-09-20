import StatusBadge from "@/components/ui/StatusBadge";
import { analysisService } from "@/services/analysis-service";
import type { AnalysisImage } from "@/types/parcel";

type ImageDetailPanelProps = {
  image: AnalysisImage;
};

const STATUS_LABELS: Record<AnalysisImage["status"], string> = {
  pending: "En attente d'analyse",
  processed: "Analysée",
  failed: "Échec de l'analyse",
};

export default function ImageDetailPanel({ image }: ImageDetailPanelProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element -- image servie par le backend, pas d'optimisation next/image nécessaire */}
      <img
        src={analysisService.imageFileUrl(image.id)}
        alt="Photo de la parcelle"
        className="h-64 w-full object-cover"
      />

      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          {image.result ? (
            <StatusBadge status={image.result} />
          ) : (
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {STATUS_LABELS[image.status]}
            </span>
          )}

          {image.confidence !== null && (
            <span className="text-xs text-slate-500">
              Confiance : {(image.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Source : {image.source === "mobile" ? "Application mobile" : "Import web"}
        </p>

        {image.latitude !== null && image.longitude !== null && (
          <p className="text-xs text-slate-500">
            {image.latitude.toFixed(5)}, {image.longitude.toFixed(5)}
          </p>
        )}
      </div>
    </div>
  );
}
