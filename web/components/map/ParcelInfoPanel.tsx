/**
 * Affiche les informations dérivées de la parcelle identifiée : surface,
 * périmètre et coordonnées du centre. Purement présentation : reçoit la
 * parcelle et ses métriques déjà calculées (via useParcelMetrics).
 */

import { formatArea, formatCoordinate, formatDistance } from "@/lib/geo";
import type { Parcel, ParcelMetrics } from "@/types/parcel";

type ParcelInfoPanelProps = {
  parcel: Parcel;
  metrics: ParcelMetrics;
};

export default function ParcelInfoPanel({
  parcel,
  metrics,
}: ParcelInfoPanelProps) {
  const stats = [
    { label: "Identifiant", value: `#${parcel.id}` },
    { label: "Nom", value: parcel.name },
    { label: "Surface", value: formatArea(metrics.areaSquareMeters) },
    { label: "Périmètre", value: formatDistance(metrics.perimeterMeters) },
    {
      label: "Centre (lat, long)",
      value: `${formatCoordinate(metrics.center.lat)}, ${formatCoordinate(
        metrics.center.long
      )}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 border-t border-slate-200 px-5 py-4 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <div key={stat.label}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {stat.label}
          </p>
          <p className="mt-1 font-semibold text-slate-900">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
