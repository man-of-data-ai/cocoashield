"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Download,
  FileArchive,
  FileJson,
  FileSpreadsheet,
  FileText,
  Globe2,
  Image as ImageIcon,
  MapPinned,
  ShieldCheck,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import ModernSelect from "@/components/ui/ModernSelect";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api-client";
import { exportService } from "@/services/export-service";
import { missionService } from "@/services/mission-service";
import { parcelService } from "@/services/parcel-service";
import type { ExportFormat, ExportRecord, ExportScope } from "@/types/export";
import type { Mission, Parcel } from "@/types/parcel";

const FORMAT_OPTIONS: Array<{
  value: ExportFormat;
  label: string;
  detail: string;
  icon: typeof FileJson;
}> = [
  { value: "geojson", label: "GeoJSON", detail: "SIG / web", icon: FileJson },
  { value: "shapefile", label: "Shapefile", detail: "QGIS / ArcGIS", icon: FileArchive },
  { value: "kml-kmz", label: "KML/KMZ", detail: "Google Earth", icon: Globe2 },
  { value: "csv", label: "CSV", detail: "Tableur / données", icon: FileSpreadsheet },
  { value: "pdf", label: "PDF", detail: "Rapport officiel", icon: FileText },
];

const FORMAT_LABELS: Record<ExportFormat, string> = {
  geojson: "GeoJSON",
  shapefile: "Shapefile",
  "kml-kmz": "KML/KMZ",
  csv: "CSV",
  pdf: "PDF",
};

const SCOPE_LABELS: Record<ExportScope, string> = {
  zone: "Zone",
  mission: "Mission",
  period: "Période",
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ExportsPage() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [history, setHistory] = useState<ExportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [scope, setScope] = useState<ExportScope>("zone");
  const [scopeId, setScopeId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [formats, setFormats] = useState<ExportFormat[]>(["geojson"]);
  const [includeSourceImages, setIncludeSourceImages] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      parcelService.listParcels(),
      missionService.listMissions(),
      exportService.list(),
    ])
      .then(([loadedParcels, loadedMissions, loadedHistory]) => {
        if (!mounted) return;
        setParcels(loadedParcels);
        setMissions(loadedMissions);
        setHistory(loadedHistory);
        const firstZone = loadedParcels.flatMap((parcel) => (parcel.analyses ?? []).flatMap((analysis) => (analysis.affectedZones ?? []).map((_, index) => `${analysis.id}:${index}`)))[0];
        if (firstZone) setScopeId(firstZone);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Impossible de charger l'écran d'export.");
      })
      .finally(() => mounted && setIsLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const verifiedCount = useMemo(
    () => parcels.filter((parcel) => parcel.terrainVerificationStatus === "verified").length,
    [parcels]
  );

  const zoneOptions = useMemo(() => parcels.flatMap((parcel) =>
    (parcel.analyses ?? []).flatMap((analysis) => (analysis.affectedZones ?? []).map((zone, index) => ({
      value: `${analysis.id}:${index}`,
      label: `${parcel.name} · Zone ${index + 1}`,
      description: `${zone.severityLevel ?? analysis.severityLevel ?? "Sévérité inconnue"} · ${(100 * (zone.infectionRate ?? zone.severity ?? 0)).toFixed(0)} % · ${new Date(zone.lastDetectionAt ?? analysis.completedAt ?? analysis.createdAt).toLocaleDateString("fr-FR")}`,
      badge: parcel.terrainVerificationStatus === "verified" ? "VÉRIFIÉE" : undefined,
    })))
  ), [parcels]);

  function changeScope(next: ExportScope) {
    setScope(next);
    setError(null);
    setSuccess(null);
    if (next === "zone") setScopeId(zoneOptions[0]?.value ?? "");
    else if (next === "mission") setScopeId(missions[0]?.id ?? "");
    else setScopeId("");
  }

  function toggleFormat(format: ExportFormat) {
    setFormats((current) =>
      current.includes(format)
        ? current.filter((value) => value !== format)
        : [...current, format]
    );
  }

  async function generateExport() {
    setError(null);
    setSuccess(null);
    if (formats.length === 0) {
      setError("Sélectionnez au moins un format.");
      return;
    }
    if ((scope === "zone" || scope === "mission") && !scopeId) {
      setError(scope === "zone" ? "Sélectionnez une zone." : "Sélectionnez une mission.");
      return;
    }
    if (scope === "period" && (!dateFrom || !dateTo)) {
      setError("Renseignez les deux dates de la période.");
      return;
    }
    if (scope === "period" && dateFrom > dateTo) {
      setError("La date de début doit précéder la date de fin.");
      return;
    }

    setIsGenerating(true);
    try {
      await exportService.generate({
        scope,
        formats,
        scopeId: scope === "period" ? undefined : scopeId,
        dateFrom: scope === "period" ? dateFrom : undefined,
        dateTo: scope === "period" ? dateTo : undefined,
        includeSourceImages,
        verifiedOnly,
      });
      setHistory(await exportService.list());
      setSuccess(
        formats.length > 1 || includeSourceImages
          ? "Archive d'export générée et journalisée."
          : "Export généré et journalisé."
      );
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Impossible de générer l'export."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <AppShell
      title="Exports"
      description="Générez des jeux de données SIG et des rapports, avec traçabilité de chaque diffusion."
    >
      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
      {success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {success}</div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner label="Chargement des exports..." /></div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.05fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Download className="h-5 w-5 text-[#244B32]" /> Export multi-portée et multi-format
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Les géométries sont exportées en WGS84 (EPSG:4326) avec les attributs métier Cocoashield.
            </p>

            <div className="mt-6">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">Portée</label>
              <ModernSelect value={scope} onChange={(value) => changeScope(value as ExportScope)} options={[{ value: "zone", label: "Zone", description: "Exporter une zone agrégée" }, { value: "mission", label: "Mission", description: "Exporter une campagne" }, { value: "period", label: "Période", description: "Exporter une plage de dates" }]} />
            </div>

            {scope === "zone" && (
              <label className="mt-4 block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">Zone agrégée</span>
                <ModernSelect value={scopeId} onChange={setScopeId} searchable placeholder="Aucune zone cartographiée disponible" options={zoneOptions} />
              </label>
            )}

            {scope === "mission" && (
              <label className="mt-4 block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">Mission</span>
                <ModernSelect value={scopeId} onChange={setScopeId} searchable placeholder="Aucune mission disponible" options={missions.map((mission) => ({ value: mission.id, label: mission.name }))} />
              </label>
            )}

            {scope === "period" && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600"><CalendarDays className="h-3.5 w-3.5" /> Du</span>
                  <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#244B32]" />
                </label>
                <label>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">Au</span>
                  <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#244B32]" />
                </label>
              </div>
            )}

            <div className="mt-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Formats</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {FORMAT_OPTIONS.map(({ value, label, detail, icon: Icon }) => {
                  const checked = formats.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleFormat(value)}
                      aria-pressed={checked}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${checked ? "border-[#244B32]/30 bg-[#244B32]/5" : "border-slate-200 bg-slate-50/60 hover:bg-slate-50"}`}
                    >
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border text-xs ${checked ? "border-[#244B32] bg-[#244B32] text-white" : "border-slate-300 bg-white text-transparent"}`}>✓</span>
                      <Icon className="h-4 w-4 text-slate-500" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-800">{label}</span>
                        <span className="block text-[11px] text-slate-500">{detail}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-[#87B940]/40 bg-[#87B940]/8 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={includeSourceImages} onChange={(event) => setIncludeSourceImages(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#244B32]" />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><ImageIcon className="h-4 w-4" /> Inclure les images sources</span>
                  <span className="mt-0.5 block text-xs text-slate-500">Les fichiers images sont ajoutés dans une archive avec les données sélectionnées.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#244B32]" />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><ShieldCheck className="h-4 w-4" /> Restreindre aux zones vérifiées sur le terrain</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{verifiedCount} zone{verifiedCount > 1 ? "s" : ""} actuellement marquée{verifiedCount > 1 ? "s" : ""} comme vérifiée{verifiedCount > 1 ? "s" : ""}.</span>
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={generateExport}
              disabled={isGenerating}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#244B32] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#356A46] disabled:cursor-wait disabled:opacity-60"
            >
              {isGenerating ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Génération...</> : <><Download className="h-4 w-4" /> Générer l'export</>}
            </button>
          </section>

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-900"><MapPinned className="h-5 w-5 text-[#244B32]" /> Journalisation de chaque export</div>
              <p className="mt-1 text-sm text-slate-500">Chaque format généré crée une ligne dans la table <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">exports</code> et une entrée dans l'audit.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date / heure</th>
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">Portée</th>
                    <th className="px-4 py-3">Format</th>
                    <th className="px-4 py-3">Options</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((record) => (
                    <tr key={record.id} className="text-slate-700">
                      <td className="whitespace-nowrap px-4 py-3 text-xs">{formatDateTime(record.createdAt)}</td>
                      <td className="max-w-[190px] truncate px-4 py-3 text-xs" title={record.userEmail ?? record.userId}>{record.userEmail ?? record.userId}</td>
                      <td className="px-4 py-3">
                        <span className="block text-xs font-semibold text-slate-800">{SCOPE_LABELS[record.scope]}</span>
                        <span className="block max-w-[180px] truncate text-[11px] text-slate-500" title={record.scopeLabel}>{record.scopeLabel}</span>
                      </td>
                      <td className="px-4 py-3"><span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold">{FORMAT_LABELS[record.format]}</span></td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">
                        {record.includeSourceImages ? "Images sources" : "Sans images"}<br />
                        {record.verifiedOnly ? "Vérifiées uniquement" : "Toutes zones"}
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-14 text-center text-sm text-slate-500">Aucun export journalisé pour le moment.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
