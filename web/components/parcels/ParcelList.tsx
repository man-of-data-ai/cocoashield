import Link from "next/link";

import StatusBadge from "@/components/ui/StatusBadge";
import type { Parcel } from "@/types/parcel";

type ParcelListProps = {
  parcels: Parcel[];
};

export default function ParcelList({ parcels }: ParcelListProps) {
  if (parcels.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
        Aucune parcelle pour le moment. Créez-en une pour commencer.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {parcels.map((parcel) => (
        <Link
          key={parcel.id}
          href={`/parcels/${parcel.id}`}
          className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-slate-900">{parcel.name}</h3>
            <StatusBadge status={parcel.status} />
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Créée le{" "}
            {new Date(parcel.createdAt).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </Link>
      ))}
    </div>
  );
}
