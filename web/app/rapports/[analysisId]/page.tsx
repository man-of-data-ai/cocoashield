"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarClock, Download, FileText, Gauge, Images, MapPin, ShieldAlert, Sprout } from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import SeverityBadge from "@/components/ui/SeverityBadge";
import { buildAnalysisReport } from "@/lib/analysis-report";
import { exportAnalysisReportPdf } from "@/lib/report-pdf";
import { ApiError } from "@/lib/api-client";
import { analysisService } from "@/services/analysis-service";
import type { Analysis } from "@/types/parcel";

function formatArea(squareMeters: number | null): string {
  if (squareMeters === null) return "—";
  if (squareMeters >= 10_000) return `${(squareMeters / 10_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ha`;
  return `${Math.round(squareMeters).toLocaleString("fr-FR")} m²`;
}

export default function ReportDetailPage() {
  const params = useParams<{ analysisId: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    analysisService
      .getAnalysis(params.analysisId)
      .then((value) => mounted && setAnalysis(value))
      .catch((cause) => mounted && setError(cause instanceof ApiError ? cause.message : "Impossible de charger le rapport."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [params.analysisId]);

  const report = useMemo(() => analysis ? buildAnalysisReport(analysis) : null, [analysis]);

  function handleExport() {
    if (!report) return;
    setExporting(true);
    setExportError(null);
    try {
      exportAnalysisReportPdf(report);
    } catch (cause) {
      console.error(cause);
      setExportError("Le rapport PDF n’a pas pu être généré. Réessayez dans quelques instants.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return <AppShell title="Rapport"><div className="flex justify-center py-20"><Spinner label="Chargement du rapport..." /></div></AppShell>;
  }

  if (error || !analysis || !report) {
    return <AppShell title="Rapport"><Alert variant="error">{error ?? "Rapport introuvable."}</Alert></AppShell>;
  }

  const healthyRatio = report.processedImages > 0 ? report.healthyImages / report.processedImages * 100 : 0;
  const infectedRatio = report.processedImages > 0 ? report.infectedImages / report.processedImages * 100 : 0;

  return (
    <AppShell
      title={`Rapport · ${report.parcelName}`}
      headerActions={
        <button type="button" onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-2 rounded-2xl bg-[#244B32] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#356A46] disabled:opacity-60">
          {exporting ? <Spinner className="text-white" /> : <Download className="h-4 w-4" />}
          Télécharger le PDF
        </button>
      }
    >
      {exportError && <div className="mb-5"><Alert variant="error">{exportError}</Alert></div>}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/rapports" className="text-sm font-semibold text-slate-500 transition hover:text-[#244B32]">← Rapports</Link>
        <div className="flex flex-wrap gap-2">
          <Link href={`/map?parcel=${analysis.parcelId}&analysis=${analysis.id}`} className="inline-flex items-center gap-2 rounded-2xl border border-[#D9E5D3] bg-white px-4 py-2.5 text-sm font-bold text-[#31583B] transition hover:bg-[#F6FAF3]"><MapPin className="h-4 w-4" />Voir sur la carte</Link>
          <Link href={`/parcels/${analysis.parcelId}/analyses/${analysis.id}?from=reports`} className="inline-flex items-center gap-2 rounded-2xl border border-[#D9E5D3] bg-white px-4 py-2.5 text-sm font-bold text-[#31583B] transition hover:bg-[#F6FAF3]"><Activity className="h-4 w-4" />Voir l’analyse</Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-[30px] border border-[#DFE7DB] bg-white shadow-sm">
        <div className="bg-[#244B32] px-6 py-6 text-white sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#CDE0C5]">Rapport d’analyse phytosanitaire</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">{report.parcelName}</h2>
              <p className="mt-2 text-sm text-[#DCE8D8]">{report.missionName}</p>
            </div>
            {report.severity && <SeverityBadge level={report.severity} />}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#DCE8D8]"><span>Analyse : {report.analysisDate.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</span><span>Rapport : {report.reportDate.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</span></div>
        </div>

        <div className="p-5 sm:p-7">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Taux d’infection", value: `${report.infectionPercentage.toFixed(1)} %`, icon: Gauge },
              { label: "Images analysées", value: `${report.processedImages} / ${report.totalImages}`, icon: Images },
              { label: "Zones à risque", value: String(report.affectedZoneCount), icon: MapPin },
              { label: "Surface affectée", value: formatArea(report.affectedAreaSquareMeters), icon: Sprout },
            ].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-3xl border border-[#E4EAE0] bg-[#FAFCF8] p-4"><Icon className="h-5 w-5 text-[#628847]" /><p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p><p className="mt-1 text-xl font-bold text-[#203B2A]">{value}</p></div>)}
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
            <div className="space-y-5">
              <section className="rounded-[26px] border border-[#E4EAE0] p-5">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#628847]" /><h3 className="text-sm font-bold text-slate-900">Résumé de l’analyse</h3></div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{report.processedImages > 0 ? `L’analyse a traité ${report.processedImages} image${report.processedImages > 1 ? "s" : ""}. ${report.infectedImages} observation${report.infectedImages > 1 ? "s" : ""} infectée${report.infectedImages > 1 ? "s" : ""} a/ont été identifiée${report.infectedImages > 1 ? "s" : ""}, soit un taux d’infection de ${report.infectionPercentage.toFixed(1)} %. Le niveau de sévérité associé est ${report.severityLabel.toLowerCase()}.` : "Aucun résultat d’image exploitable n’est encore disponible pour cette analyse."}</p>
                {report.notes && <div className="mt-4 rounded-2xl bg-[#F6F9F3] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Observation terrain</p><p className="mt-2 text-sm leading-6 text-slate-700">{report.notes}</p></div>}
              </section>

              <section className="rounded-[26px] border border-[#E4EAE0] p-5">
                <h3 className="text-sm font-bold text-slate-900">Répartition des observations</h3>
                <div className="mt-4 space-y-4">
                  <div><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-slate-600">Saines</span><span className="font-bold text-emerald-700">{report.healthyImages}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-emerald-50"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${healthyRatio}%` }} /></div></div>
                  <div><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-slate-600">Infectées</span><span className="font-bold text-red-700">{report.infectedImages}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-red-50"><div className="h-full rounded-full bg-red-500" style={{ width: `${infectedRatio}%` }} /></div></div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Géoloc. précise</p><p className="mt-1 text-lg font-bold text-slate-800">{report.preciseImages}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Infectées localisées</p><p className="mt-1 text-lg font-bold text-slate-800">{report.locatedInfectedImages}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Échecs traitement</p><p className="mt-1 text-lg font-bold text-slate-800">{report.failedImages}</p></div>
                </div>
              </section>

              <section className="rounded-[26px] border border-[#E4EAE0] p-5">
                <h3 className="text-sm font-bold text-slate-900">Zones à risque</h3>
                {report.zones.length === 0 ? <p className="mt-3 text-sm text-slate-500">Aucune zone à risque géolocalisée n’est disponible pour cette analyse.</p> : <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200"><div className="grid grid-cols-[1fr_1fr_1fr_.8fr] bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400"><span>Sévérité</span><span>Latitude</span><span>Longitude</span><span>Surface</span></div>{report.zones.map((zone) => <div key={zone.id} className="grid grid-cols-[1fr_1fr_1fr_.8fr] border-t border-slate-100 px-3 py-3 text-xs text-slate-600"><span className="font-semibold">{zone.severityLabel}</span><span className="font-mono">{zone.latitude.toFixed(6)}</span><span className="font-mono">{zone.longitude.toFixed(6)}</span><span>{formatArea(zone.surfaceSquareMeters)}</span></div>)}</div>}
              </section>
            </div>

            <div className="space-y-5">
              <section className="rounded-[26px] border border-[#E4EAE0] bg-[#FAFCF8] p-5"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-[#628847]" /><h3 className="text-sm font-bold text-slate-900">Points importants</h3></div><div className="mt-4 space-y-3">{report.insights.map((insight) => <div key={insight} className="flex gap-3 text-sm leading-5 text-slate-600"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6D914E]" /><span>{insight}</span></div>)}</div></section>
              <section className="rounded-[26px] border border-[#E4EAE0] bg-white p-5"><h3 className="text-sm font-bold text-slate-900">Recommandations de suivi</h3><div className="mt-4 space-y-3">{report.recommendations.map((recommendation) => <div key={recommendation} className="flex gap-3 text-sm leading-5 text-slate-600"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EEF5E9] text-[10px] font-bold text-[#5D823F]">✓</span><span>{recommendation}</span></div>)}</div></section>
              <section className="rounded-[26px] border border-[#E4EAE0] p-5"><div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[#628847]" /><h3 className="text-sm font-bold text-slate-900">Traçabilité</h3></div><dl className="mt-4 space-y-3 text-xs"><div className="flex justify-between gap-4"><dt className="text-slate-400">Analyse</dt><dd className="font-mono text-slate-600">{analysis.id}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-400">Parcelle</dt><dd className="font-semibold text-slate-700">{report.parcelName}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-400">Mission</dt><dd className="text-right font-semibold text-slate-700">{report.missionName}</dd></div></dl></section>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#DCE8D6] bg-[#F7FAF4] px-4 py-3 text-xs leading-5 text-[#587044]">Ce rapport est un outil d’aide à la surveillance phytosanitaire. Les décisions d’intervention doivent être confirmées par une observation terrain lorsque cela est nécessaire.</div>
        </div>
      </section>
    </AppShell>
  );
}
