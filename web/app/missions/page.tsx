"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Route, Search, SlidersHorizontal, Eye, Download } from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import ModernSelect from "@/components/ui/ModernSelect";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import Dialog from "@/components/ui/Dialog";
import { ApiError } from "@/lib/api-client";
import { computeParcelMetrics } from "@/lib/geo";
import { missionService } from "@/services/mission-service";
import { parcelService } from "@/services/parcel-service";
import type {
  Analysis,
  Mission,
  Parcel,
} from "@/types/parcel";

type MissionProcessingStatus = "processing" | "processed" | "error";
type DroneFilter = string;

type MissionRow = {
  mission: Mission;
  date: Date | null;
  status: MissionProcessingStatus;
  vectorSources: string[];
  imageCount: number;
  parcelCount: number;
  surfaceSquareMeters: number;
};

const STATUS_LABELS: Record<MissionProcessingStatus, string> = {
  processing: "En traitement",
  processed: "Traitée",
  error: "Erreur",
};

const STATUS_CLASSES: Record<MissionProcessingStatus, string> = {
  processing: "border-amber-200 bg-amber-50 text-amber-700",
  processed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-red-200 bg-red-50 text-red-700",
};

function parseMissionDate(mission: Mission): Date | null {
  const value = mission.missionDate ?? mission.createdAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function missionStatus(analyses: Analysis[]): MissionProcessingStatus {
  if (
    analyses.some((analysis) =>
      analysis.images?.some((image) => image.status === "failed")
    )
  ) {
    return "error";
  }

  if (
    analyses.length > 0 &&
    analyses.every(
      (analysis) =>
        analysis.status === "completed" &&
        (analysis.images?.every((image) => image.status === "processed") ?? true)
    )
  ) {
    return "processed";
  }

  return "processing";
}

function formatDate(date: Date | null): string {
  if (!date) return "Date inconnue";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatSurface(squareMeters: number): string {
  return `${(squareMeters / 10_000).toLocaleString("fr-FR", {
    minimumFractionDigits: squareMeters > 0 && squareMeters < 10_000 ? 2 : 1,
    maximumFractionDigits: 2,
  })} ha`;
}

function buildMissionRows(missions: Mission[], parcels: Parcel[]): MissionRow[] {
  return missions.map((mission) => {
    const related = parcels.flatMap((parcel) =>
      (parcel.analyses ?? [])
        .filter((analysis) => analysis.missionId === mission.id)
        .map((analysis) => ({ parcel, analysis }))
    );

    const analyses = related.map(({ analysis }) => analysis);
    const vectorSources = Array.from(
      new Set(analyses.map((analysis) => analysis.profileId).filter((value): value is string => Boolean(value)))
    );
    const parcelIds = new Set(related.map(({ parcel }) => parcel.id));
    const surfaceSquareMeters = parcels
      .filter((parcel) => parcelIds.has(parcel.id))
      .reduce((total, parcel) => {
        try {
          return total + computeParcelMetrics(parcel.boundary).areaSquareMeters;
        } catch {
          return total;
        }
      }, 0);

    return {
      mission,
      date: parseMissionDate(mission),
      status: missionStatus(analyses),
      vectorSources,
      imageCount: analyses.reduce(
        (total, analysis) => total + (analysis.images?.length ?? 0),
        0
      ),
      parcelCount: parcelIds.size,
      surfaceSquareMeters,
    };
  });
}

export default function MissionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedMissionId = searchParams.get("mission");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MissionProcessingStatus>(
    "all"
  );
  const [droneFilter, setDroneFilter] = useState<DroneFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [missionDate, setMissionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedMissionRow, setSelectedMissionRow] = useState<MissionRow | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([missionService.listMissions(), parcelService.listParcels()])
      .then(([loadedMissions, loadedParcels]) => {
        if (!isMounted) return;
        setMissions(loadedMissions);
        setParcels(loadedParcels);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Impossible de charger les missions."
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const rows = useMemo(() => buildMissionRows(missions, parcels), [missions, parcels]);

  const requestedMissionRow = useMemo(() => requestedMissionId ? rows.find((item) => item.mission.id === requestedMissionId) ?? null : null, [requestedMissionId, rows]);
  const activeMissionRow = selectedMissionRow ?? requestedMissionRow;

  const selectedMissionLinks = useMemo(() => {
    if (!activeMissionRow) return [];
    return parcels.flatMap((parcel) => (parcel.analyses ?? [])
      .filter((analysis) => analysis.missionId === activeMissionRow.mission.id)
      .map((analysis) => ({ parcel, analysis }))
    ).sort((a,b)=>new Date(b.analysis.createdAt).getTime()-new Date(a.analysis.createdAt).getTime());
  }, [activeMissionRow, parcels]);

  const availableVectors = useMemo(
    () =>
      Array.from(new Set(rows.flatMap((row) => row.vectorSources))).sort(),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("fr-FR");
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;

    return rows.filter((row) => {
      if (
        normalizedSearch &&
        !row.mission.name.toLocaleLowerCase("fr-FR").includes(normalizedSearch)
      ) {
        return false;
      }
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (
        droneFilter !== "all" &&
        !row.vectorSources.includes(droneFilter)
      ) {
        return false;
      }
      if (from && (!row.date || row.date < from)) return false;
      if (to && (!row.date || row.date > to)) return false;
      return true;
    });
  }, [rows, search, statusFilter, droneFilter, dateFrom, dateTo]);

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    droneFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setDroneFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  function resetForm() {
    setName("");
    setMissionDate("");
    setNotes("");
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setFormError("Le nom de la mission est requis.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const mission = await missionService.createMission({
        name: name.trim(),
        missionDate: missionDate || undefined,
        notes: notes.trim() || undefined,
      });
      setMissions((current) => [mission, ...current]);
      resetForm();
      setIsDialogOpen(false);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Impossible de créer la mission."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function downloadMission(row: MissionRow) {
    const payload = {
      mission: row.mission,
      statut: STATUS_LABELS[row.status],
      drones: row.vectorSources,
      nombreImages: row.imageCount,
      nombreParcelles: row.parcelCount,
      surfaceHectares: Number((row.surfaceSquareMeters / 10_000).toFixed(2)),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mission-${row.mission.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell
      title="Missions"
      description="Suivez l'intégration et le traitement des campagnes de collecte terrain."
      headerActions={
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className="rounded-xl bg-[#244B32] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#356A46]"
        >
          + Nouvelle mission
        </button>
      }
    >
      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Chargement des missions..." />
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Route className="h-5 w-5 text-[#244B32]" />
                  Tableau des campagnes avec statut
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredRows.length} mission{filteredRows.length > 1 ? "s" : ""} affichée{filteredRows.length > 1 ? "s" : ""} sur {rows.length}.
                </p>
              </div>

              <div className="relative w-full xl:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher une mission..."
                  aria-label="Rechercher par nom de mission"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#244B32]"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Statut
                </span>
                <ModernSelect value={statusFilter} onChange={(value) => setStatusFilter(value as "all" | MissionProcessingStatus)} options={[{ value: "all", label: "Tous statuts" }, { value: "processing", label: "En traitement" }, { value: "processed", label: "Traitée" }, { value: "error", label: "Erreur" }]} />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Drone
                </span>
                <ModernSelect value={droneFilter} onChange={(value) => setDroneFilter(value as DroneFilter)} options={[{ value: "all", label: "Tous les drones" }, ...availableVectors.map((drone) => ({ value: drone, label: drone }))]} />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" /> Du
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#244B32]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Au
                </span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#244B32]"
                />
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 xl:w-auto"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="p-10 text-center">
              <Route className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-600">Aucune mission pour le moment.</p>
              <p className="mt-1 text-xs text-slate-400">
                Les missions se créent aussi automatiquement lors de l’ajout d’une analyse.
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-10 text-center">
              <Search className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">Aucun résultat</p>
              <p className="mt-1 text-xs text-slate-400">
                Modifiez la recherche ou les filtres combinés.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full border-collapse text-left">
                <thead className="bg-slate-50/80">
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    <th className="px-5 py-3.5">Mission</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Drone</th>
                    <th className="px-5 py-3.5">Images</th>
                    <th className="px-5 py-3.5">Parcelles</th>
                    <th className="px-5 py-3.5">Surface</th>
                    <th className="px-5 py-3.5">Statut</th>
                    <th className="px-5 py-3.5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.mission.id}
                      className="border-b border-slate-100 text-sm text-slate-700 last:border-b-0 hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {row.mission.name}
                        </div>
                        {row.mission.notes && (
                          <div className="mt-0.5 max-w-[320px] truncate text-xs text-slate-400">
                            {row.mission.notes}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-5 py-4">
                        {row.vectorSources.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {row.vectorSources.map((vector) => (
                              <span
                                key={vector}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                              >
                                {vector}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {row.imageCount.toLocaleString("fr-FR")}
                      </td>
                      <td className="px-5 py-4">{row.parcelCount}</td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {row.surfaceSquareMeters > 0
                          ? formatSurface(row.surfaceSquareMeters)
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_CLASSES[row.status]}`}
                        >
                          {STATUS_LABELS[row.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setSelectedMissionRow(row)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#AFC5A3] hover:text-[#244B32]" aria-label={`Consulter ${row.mission.name}`}><Eye className="h-4 w-4" /></button>
                          <button type="button" onClick={() => downloadMission(row)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#244B32] text-white transition hover:bg-[#356A46]" aria-label={`Télécharger ${row.mission.name}`}><Download className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Nouvelle mission</h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Nom
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ex: Tournée Nord - Semaine 12"
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#244B32] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Date (optionnel)
                </label>
                <input
                  type="date"
                  value={missionDate}
                  onChange={(event) => setMissionDate(event.target.value)}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#244B32] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Notes (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#244B32] focus:outline-none"
                />
              </div>

              {formError && <Alert variant="error">{formError}</Alert>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(false);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#244B32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#356A46] disabled:opacity-50"
                >
                  {isSubmitting ? "Création..." : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Dialog open={activeMissionRow !== null} onClose={() => { setSelectedMissionRow(null); if (requestedMissionId) router.replace("/missions"); }} title="Détail de la mission">
        {activeMissionRow && <div className="space-y-4">
          <div className="rounded-2xl bg-[#F7F9F5] p-4"><h3 className="font-bold text-slate-900">{activeMissionRow.mission.name}</h3><p className="mt-1 text-xs text-slate-500">{formatDate(activeMissionRow.date)}</p>{activeMissionRow.mission.notes && <p className="mt-3 text-sm leading-6 text-slate-600">{activeMissionRow.mission.notes}</p>}</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Images</p><p className="mt-1 font-bold text-slate-800">{activeMissionRow.imageCount}</p></div>
            <div className="rounded-2xl border border-slate-200 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Parcelles</p><p className="mt-1 font-bold text-slate-800">{activeMissionRow.parcelCount}</p></div>
            <div className="rounded-2xl border border-slate-200 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Surface</p><p className="mt-1 font-bold text-slate-800">{activeMissionRow.surfaceSquareMeters > 0 ? formatSurface(activeMissionRow.surfaceSquareMeters) : "—"}</p></div>
            <div className="rounded-2xl border border-slate-200 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Statut</p><p className="mt-1 font-bold text-slate-800">{STATUS_LABELS[activeMissionRow.status]}</p></div>
          </div>
          <div><h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Parcelles et analyses associées</h4>{selectedMissionLinks.length === 0 ? <p className="mt-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">Cette mission n’a pas encore d’analyse associée.</p> : <div className="mt-2 space-y-2">{selectedMissionLinks.map(({parcel,analysis})=><div key={analysis.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3"><div className="min-w-0"><Link href={`/parcels/${parcel.id}`} className="truncate text-xs font-bold text-slate-800 hover:text-[#244B32]">{parcel.name}</Link><p className="mt-1 text-[11px] text-slate-400">Analyse du {new Date(analysis.createdAt).toLocaleDateString("fr-FR")} · {analysis.images.length} image{analysis.images.length>1?"s":""}</p></div><Link href={`/parcels/${parcel.id}/analyses/${analysis.id}?from=missions`} className="shrink-0 rounded-xl border border-[#D9E5D3] px-3 py-2 text-[11px] font-bold text-[#31583B] hover:bg-[#F6FAF3]">Voir l’analyse</Link></div>)}</div>}</div>
          <button type="button" onClick={() => downloadMission(activeMissionRow)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#244B32] px-4 py-2.5 text-sm font-bold text-white"><Download className="h-4 w-4"/>Télécharger la mission</button>
        </div>}
      </Dialog>
    </AppShell>
  );
}
