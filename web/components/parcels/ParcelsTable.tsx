"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Database, Search } from "lucide-react";

import { computeParcelMetrics, formatArea } from "@/lib/geo";
import { computeParcelSeverity, SEVERITY_BADGE_CLASSES, SEVERITY_LABELS } from "@/lib/severity";
import type { Parcel } from "@/types/parcel";

type ParcelsTableProps = {
  parcels: Parcel[];
  onCreateClick: () => void;
};

function missionsCountFor(parcel: Parcel): number {
  const missionIds = new Set(
    (parcel.analyses ?? []).map((analysis) => analysis.missionId).filter(Boolean)
  );
  return missionIds.size > 0 ? missionIds.size : (parcel.analyses ?? []).length;
}

function latestActivityFor(parcel: Parcel): string {
  const dates = (parcel.analyses ?? []).map((analysis) =>
    new Date(analysis.createdAt).getTime()
  );
  if (dates.length === 0) return "—";
  const mostRecent = Math.max(...dates);
  return new Date(mostRecent).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ParcelsTable({ parcels, onCreateClick }: ParcelsTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return parcels;
    return parcels.filter((parcel) => parcel.name.toLowerCase().includes(query));
  }, [parcels, search]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#244B32]/5">
            <Database className="h-4 w-4 text-[#244B32]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Vue d&rsquo;ensemble</h2>
            <p className="text-xs text-slate-400">
              Recherchez une parcelle et consultez son état.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher"
              className="w-56 rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition focus:border-[#244B32] focus:bg-white focus:ring-2 focus:ring-[#244B32]/10"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCreateClick}
              className="whitespace-nowrap rounded-full bg-[#244B32] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#356A46]"
            >
              + Nouvelle parcelle
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-slate-500">
          {parcels.length === 0
            ? "Aucune parcelle pour le moment. Créez-en une pour commencer."
            : "Aucune parcelle ne correspond à cette recherche."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-widest text-slate-400">
                <th className="px-5 py-3 font-semibold">Référence</th>
                <th className="px-5 py-3 font-semibold">Superficie</th>
                <th className="px-5 py-3 font-semibold">Sévérité</th>
                <th className="px-5 py-3 font-semibold">Missions</th>
                <th className="px-5 py-3 font-semibold">Dernière activité</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((parcel) => {
                const severity = computeParcelSeverity(parcel);
                const areaLabel = formatArea(
                  computeParcelMetrics(parcel.boundary).areaSquareMeters
                );

                return (
                  <tr
                    key={parcel.id}
                    className="border-t border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/parcels/${parcel.id}`}
                        className="font-semibold text-slate-900 hover:underline"
                      >
                        {parcel.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{areaLabel}</td>
                    <td className="px-5 py-3.5">
                      {severity.level === "inconnu" ? <span className="text-slate-400">—</span> : <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white ${SEVERITY_BADGE_CLASSES[severity.level]}`}
                      >
                        {SEVERITY_LABELS[severity.level]}
                      </span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-600">
                        {missionsCountFor(parcel)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {latestActivityFor(parcel)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/parcels/${parcel.id}`} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#244B32] hover:text-[#244B32]">Consulter</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
