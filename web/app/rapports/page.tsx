"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ChevronRight, FileText, Filter, Search, Sprout, CheckCircle2, Clock3, AlertTriangle } from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import ModernSelect from "@/components/ui/ModernSelect";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { parcelService } from "@/services/parcel-service";
import type { Analysis, Parcel } from "@/types/parcel";

type ReportRow = { id: string; parcel: Parcel; analysis: Analysis; date: Date; status: "Terminé" | "En cours" | "À traiter"; observation: string; healthy: number; infected: number; infectionPercentage: number; severity: string };

function buildRows(parcels: Parcel[]): ReportRow[] {
  return parcels.flatMap((parcel) => (parcel.analyses ?? []).map((analysis) => {
    const healthy = analysis.images.filter((image) => image.result === "healthy").length;
    const infected = analysis.images.filter((image) => image.result === "infected").length;
    const status: ReportRow["status"] = analysis.status === "completed" ? "Terminé" : analysis.status === "processing" ? "En cours" : "À traiter";
    const processed = healthy + infected;
    return { id: analysis.id, parcel, analysis, date: new Date(analysis.reportGeneratedAt ?? analysis.completedAt ?? analysis.createdAt), status, observation: analysis.notes || (infected > 0 ? `${infected} observation${infected > 1 ? "s" : ""} à surveiller` : "Aucune anomalie majeure signalée"), healthy, infected, infectionPercentage: analysis.infectionPercentage ?? (processed ? infected / processed * 100 : 0), severity: analysis.severityLevel ?? "inconnu" };
  })).sort((a, b) => b.date.getTime() - a.date.getTime());
}

const STATUS_OPTIONS = [{ value: "all", label: "Tous les statuts" }, { value: "Terminé", label: "Terminés" }, { value: "En cours", label: "En cours" }, { value: "À traiter", label: "À traiter" }];

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const focusedAnalysisId = searchParams.get("analysis");
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [parcelId, setParcelId] = useState("all");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState("all");
  const [referenceNow] = useState(() => Date.now());

  useEffect(() => { parcelService.listParcels().then(setParcels).catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger les rapports.")).finally(() => setLoading(false)); }, []);

  const rows = useMemo(() => buildRows(parcels), [parcels]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const now = referenceNow;
    return rows.filter((row) => {
      const ageDays = (now - row.date.getTime()) / 86400000;
      const periodOk = period === "all" || (period === "30" && ageDays <= 30) || (period === "90" && ageDays <= 90) || (period === "365" && ageDays <= 365);
      const textOk = !needle || `${row.parcel.name} ${row.observation} ${row.analysis.mission?.name ?? ""}`.toLowerCase().includes(needle);
      return textOk && (parcelId === "all" || row.parcel.id === parcelId) && (status === "all" || row.status === status) && periodOk;
    });
  }, [rows, query, parcelId, status, period, referenceNow]);

  const completed = rows.filter((row) => row.status === "Terminé").length;
  const active = rows.filter((row) => row.status !== "Terminé").length;
  const infected = rows.reduce((sum, row) => sum + row.infected, 0);

  return <AppShell title="Rapports">
    {error && <div className="mb-5"><Alert variant="error">{error}</Alert></div>}

    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[{ label: "Rapports", value: rows.length, icon: FileText, helper: "Toutes périodes" }, { label: "Terminés", value: completed, icon: CheckCircle2, helper: "Disponibles à consulter" }, { label: "En suivi", value: active, icon: Clock3, helper: "En cours ou à traiter" }, { label: "Feuilles infectées", value: infected, icon: AlertTriangle, helper: "Observations recensées" }].map((card) => <div key={card.label} className="rounded-3xl border border-[#E3E9DF] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F1F6ED] text-[#5D823F]"><card.icon className="h-5 w-5" /></span><span className="text-2xl font-bold text-[#203B2A]">{card.value}</span></div><p className="mt-4 text-sm font-bold text-slate-800">{card.label}</p><p className="mt-1 text-xs text-slate-400">{card.helper}</p></div>)}
    </div>

    <section className="rounded-[26px] border border-[#E2E9DE] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-[#5E853F]" /><h2 className="text-sm font-bold text-slate-800">Rechercher et filtrer</h2></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une parcelle, mission ou observation..." className="h-11 w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] pl-9 pr-4 text-sm outline-none focus:border-[#9BBC89] focus:bg-white" /></div>
        <ModernSelect value={parcelId} onChange={setParcelId} searchable options={[{ value: "all", label: "Toutes les parcelles" }, ...parcels.map((parcel) => ({ value: parcel.id, label: parcel.name, description: `${parcel.analyses?.length ?? 0} rapport(s)` }))]} />
        <ModernSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        <ModernSelect value={period} onChange={setPeriod} options={[{ value: "all", label: "Toutes les dates" }, { value: "30", label: "30 derniers jours" }, { value: "90", label: "3 derniers mois" }, { value: "365", label: "12 derniers mois" }]} />
      </div>
    </section>

    <section className="mt-5 overflow-hidden rounded-[26px] border border-[#E2E9DE] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#EDF0EA] p-5"><div><h2 className="font-bold text-slate-900">Rapports de suivi</h2><p className="mt-1 text-xs text-slate-400">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</p></div><CalendarDays className="h-5 w-5 text-[#7D9A68]" /></div>
      {loading ? <div className="flex justify-center py-16"><Spinner label="Chargement des rapports..." /></div> : filtered.length === 0 ? <div className="py-16 text-center"><Sprout className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">Aucun rapport pour ces critères</p><p className="mt-1 text-xs text-slate-400">Modifiez les filtres ou réalisez une nouvelle analyse terrain.</p></div> : <div className="divide-y divide-[#EDF0EA]">{filtered.map((row) => {
        const statusStyle = row.status === "Terminé" ? "bg-emerald-50 text-emerald-700" : row.status === "En cours" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
        return <article key={row.id} className={`group grid gap-4 p-5 transition hover:bg-[#FBFCFA] lg:grid-cols-[1.2fr_.9fr_.8fr_1.4fr_auto] lg:items-center ${focusedAnalysisId === row.id ? "bg-[#F2F7EE] ring-1 ring-inset ring-[#BFD2B4]" : ""}`}>
          <div><p className="text-sm font-bold text-slate-900">{row.parcel.name}</p><p className="mt-1 text-xs text-slate-400">{row.analysis.mission?.name || "Observation terrain"}</p><p className="mt-1 font-mono text-[10px] text-slate-400">Analyse {row.analysis.id.slice(0, 8)}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</p><p className="mt-1 text-sm font-semibold text-slate-700">{row.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</p></div>
          <div><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle}`}>{row.status}</span><p className="mt-2 text-[11px] text-slate-400">{row.analysis.images.length} photo{row.analysis.images.length > 1 ? "s" : ""}</p></div>
          <div><p className="line-clamp-2 text-sm leading-5 text-slate-600">{row.observation}</p><div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold"><span className="rounded-full bg-[#EEF5E9] px-2 py-1 text-[#587B42]">{row.healthy} saines</span><span className="rounded-full bg-red-50 px-2 py-1 text-red-600">{row.infected} infectées</span><span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{row.infectionPercentage.toFixed(1)} %</span></div></div>
          <Link href={`/parcels/${row.parcel.id}/analyses/${row.analysis.id}?from=reports`} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E0E7DC] text-slate-400 transition group-hover:border-[#B8CEAD] group-hover:bg-white group-hover:text-[#4D713B]" aria-label="Voir le rapport"><ChevronRight className="h-4 w-4" /></Link>
        </article>;
      })}</div>}
    </section>
  </AppShell>;
}
