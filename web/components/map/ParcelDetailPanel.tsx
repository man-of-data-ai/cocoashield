import Link from "next/link";
import {
  AlertTriangle,
  Eye,
  Image as ImageIcon,
  MapPin,
  ScanSearch,
} from "lucide-react";
import SeverityBadge from "@/components/ui/SeverityBadge";
import { formatArea, computeParcelMetrics } from "@/lib/geo";
import { computeParcelSeverity } from "@/lib/severity";
import { useSeverityThresholds } from "@/context/SeverityThresholdsContext";
import type { GeolocationQuality, Parcel } from "@/types/parcel";

type Props = {
  parcel: Parcel | null;
  onOpenFullDetails?: (parcel: Parcel) => void;
};
const GEOLOC_LABELS: Record<GeolocationQuality, string> = {
  precise: "GPS précis",
  approximate: "Approximative",
  none: "Inconnue",
};
export default function ParcelDetailPanel({
  parcel,
  onOpenFullDetails,
}: Props) {
  const { thresholds } = useSeverityThresholds();
  if (!parcel)
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-[26px] border border-[#E2E9DE] bg-white p-8 text-center text-slate-400 shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1F6ED]">
          <MapPin className="h-5 w-5 text-[#6B8F51]" />
        </span>
        <p className="mt-4 text-sm font-bold text-slate-700">
          Sélectionnez une parcelle
        </p>
        <p className="mt-1 max-w-52 text-xs leading-5">
          Cliquez sur une zone de la carte pour consulter ses indicateurs et sa
          dernière analyse.
        </p>
      </div>
    );
  const metrics = computeParcelMetrics(parcel.boundary);
  const severity = computeParcelSeverity(parcel, thresholds);
  const images = (parcel.analyses ?? []).flatMap((a) => a.images ?? []);
  const conf = images
    .map((i) => i.confidence)
    .filter((v): v is number => typeof v === "number");
  const avg = conf.length
    ? conf.reduce((a, b) => a + b, 0) / conf.length
    : null;
  const quality: GeolocationQuality = images.some(
    (i) => i.geolocationQuality === "precise",
  )
    ? "precise"
    : images.some((i) => i.geolocationQuality === "approximate")
      ? "approximate"
      : "none";
  const latest = [...(parcel.analyses ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
  return (
    <div className="flex h-full flex-col rounded-[26px] border border-[#E2E9DE] bg-white shadow-sm">
      <div className="border-b border-[#EDF1EA] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Parcelle sélectionnée
            </p>
            <h3 className="mt-1 text-lg font-bold tracking-[-0.02em] text-slate-900">
              {parcel.name}
            </h3>
          </div>
          <SeverityBadge level={severity.level} />
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-auto p-5">
        <div className="grid grid-cols-2 gap-2">
          {[
            ["Surface", formatArea(metrics.areaSquareMeters)],
            [
              "Infection",
              severity.processedImages
                ? `${Math.round(severity.infectionRate * 100)} %`
                : "—",
            ],
            ["Confiance", avg === null ? "—" : `${Math.round(avg * 100)} %`],
            ["Géoloc", GEOLOC_LABELS[quality]],
          ].map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-[#F7F9F5] p-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {l}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800">{v}</p>
            </div>
          ))}
        </div>
        {quality !== "precise" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="h-4 w-4" />
              Précision géographique limitée
            </div>
          </div>
        )}
        <div className="rounded-2xl border border-[#E7ECE3] p-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <ImageIcon className="h-3.5 w-3.5" />
            Observations analysées
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {severity.processedImages
              ? `${severity.infectedImages} infectée${severity.infectedImages > 1 ? "s" : ""} sur ${severity.processedImages}`
              : "Aucun résultat disponible"}
          </p>
        </div>
      </div>
      <div className="space-y-2 border-t border-[#EDF1EA] p-4">
        {latest && (
          <Link
            href={`/parcels/${parcel.id}/analyses/${latest.id}?from=map`}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#244B32] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#356A46]"
          >
            <ScanSearch className="h-4 w-4" />
            Voir l’analyse
          </Link>
        )}
        <button
          type="button"
          onClick={() => onOpenFullDetails?.(parcel)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#DEE6DA] bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-[#F8FAF6]"
        >
          <Eye className="h-4 w-4" />
          Fiche parcelle
        </button>
      </div>
    </div>
  );
}
