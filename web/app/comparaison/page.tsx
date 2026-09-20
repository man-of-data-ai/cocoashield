"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  GitCompareArrows,
  Layers3,
  Percent,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import ModernSelect from "@/components/ui/ModernSelect";
import Alert from "@/components/ui/Alert";
import SeverityLayerSelector from "@/components/map/SeverityLayerSelector";
import Spinner from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api-client";
import { exportComparisonPdf } from "@/lib/comparison-export";
import { captureMapCanvas } from "@/lib/map-export";
import { buildAnalysisComparisonSnapshot } from "@/lib/zone-history";
import { parcelService } from "@/services/parcel-service";
import type { Analysis, Parcel } from "@/types/parcel";
import type { ComparisonViewport } from "@/components/comparison/CampaignComparisonMap";
import type { Severity } from "@/lib/severity";
import type { RiskZone } from "@/lib/risk-zones";

const CampaignComparisonMap = dynamic(
  () => import("@/components/comparison/CampaignComparisonMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[430px] items-center justify-center rounded-xl bg-slate-100 lg:h-[500px]">
        <Spinner label="Chargement de la carte..." />
      </div>
    ),
  }
);

function analysisDateValue(analysis: Analysis): Date {
  const date = new Date(analysis.completedAt ?? analysis.createdAt);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function analysisDate(analysis: Analysis): string {
  return analysisDateValue(analysis).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function analysisLabel(analysis: Analysis): string {
  return analysis.mission?.name?.trim() || `Analyse du ${analysisDate(analysis)}`;
}

function formatHa(squareMeters: number): string {
  return `${(squareMeters / 10_000).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ha`;
}

function formatSigned(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function VariationIcon({ value }: { value: number }) {
  if (value > 0.0001) return <ArrowUpRight className="h-4 w-4" />;
  if (value < -0.0001) return <ArrowDownRight className="h-4 w-4" />;
  return <ArrowRight className="h-4 w-4" />;
}

export default function ComparaisonPage() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [comparisonParcelId, setComparisonParcelId] = useState("");
  const [leftAnalysisId, setLeftAnalysisId] = useState("");
  const [rightAnalysisId, setRightAnalysisId] = useState("");
  const [viewport, setViewport] = useState<ComparisonViewport | null>(null);
  const [activeSeverityLevels, setActiveSeverityLevels] = useState<Severity[]>(["faible", "modere", "eleve", "critique"]);
  const [leftRiskZone, setLeftRiskZone] = useState<RiskZone | null>(null);
  const [rightRiskZone, setRightRiskZone] = useState<RiskZone | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    parcelService
      .listParcels()
      .then((loadedParcels) => {
        if (!mounted) return;
        setParcels(loadedParcels);
        const firstComparable = loadedParcels.find((parcel) => (parcel.analyses ?? []).length >= 2) ?? loadedParcels[0];
        if (firstComparable) setComparisonParcelId(firstComparable.id);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof ApiError ? err.message : "Impossible de charger les données de comparaison.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const comparableParcels = useMemo(
    () => parcels.filter((parcel) => (parcel.analyses ?? []).length > 0),
    [parcels]
  );

  const selectedParcel = useMemo(
    () => parcels.find((parcel) => parcel.id === comparisonParcelId) ?? null,
    [parcels, comparisonParcelId]
  );

  const parcelAnalyses = useMemo(
    () => [...(selectedParcel?.analyses ?? [])].sort((a, b) => analysisDateValue(a).getTime() - analysisDateValue(b).getTime()),
    [selectedParcel]
  );

  useEffect(() => {
    setViewport(null);
    setLeftRiskZone(null);
    setRightRiskZone(null);
    if (parcelAnalyses.length >= 2) {
      setLeftAnalysisId(parcelAnalyses[parcelAnalyses.length - 2].id);
      setRightAnalysisId(parcelAnalyses[parcelAnalyses.length - 1].id);
    } else {
      setLeftAnalysisId(parcelAnalyses[0]?.id ?? "");
      setRightAnalysisId("");
    }
  }, [comparisonParcelId, parcelAnalyses.length]);

  const leftAnalysis = useMemo(
    () => parcelAnalyses.find((analysis) => analysis.id === leftAnalysisId) ?? null,
    [parcelAnalyses, leftAnalysisId]
  );
  const rightAnalysis = useMemo(
    () => parcelAnalyses.find((analysis) => analysis.id === rightAnalysisId) ?? null,
    [parcelAnalyses, rightAnalysisId]
  );

  const leftSnapshot = useMemo(
    () => selectedParcel && leftAnalysis ? buildAnalysisComparisonSnapshot(selectedParcel, leftAnalysis) : null,
    [selectedParcel, leftAnalysis]
  );
  const rightSnapshot = useMemo(
    () => selectedParcel && rightAnalysis ? buildAnalysisComparisonSnapshot(selectedParcel, rightAnalysis) : null,
    [selectedParcel, rightAnalysis]
  );

  const rateDeltaPoints = leftSnapshot && rightSnapshot
    ? (rightSnapshot.infectionRate - leftSnapshot.infectionRate) * 100
    : 0;
  const areaDeltaSquareMeters = leftSnapshot && rightSnapshot
    ? rightSnapshot.infectedAreaSquareMeters - leftSnapshot.infectedAreaSquareMeters
    : 0;

  async function handleExportPdf() {
    if (!selectedParcel || !leftAnalysis || !rightAnalysis || !leftSnapshot || !rightSnapshot || leftAnalysis.id === rightAnalysis.id) {
      setExportError("Sélectionnez une parcelle et deux analyses différentes avant l’export.");
      return;
    }
    setIsExporting(true);
    setExportError(null);
    try {
      setViewport(null);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 500));
      const [leftMapCanvas, rightMapCanvas] = await Promise.all([
        captureMapCanvas("comparison-map-left"),
        captureMapCanvas("comparison-map-right"),
      ]);
      exportComparisonPdf({
        leftName: analysisLabel(leftAnalysis),
        leftDate: analysisDate(leftAnalysis),
        rightName: analysisLabel(rightAnalysis),
        rightDate: analysisDate(rightAnalysis),
        leftInfectionRate: leftSnapshot.infectionRate,
        rightInfectionRate: rightSnapshot.infectionRate,
        leftInfectedAreaSquareMeters: leftSnapshot.infectedAreaSquareMeters,
        rightInfectedAreaSquareMeters: rightSnapshot.infectedAreaSquareMeters,
        leftProcessedImages: leftSnapshot.processedImages,
        rightProcessedImages: rightSnapshot.processedImages,
        leftInfectedImages: leftSnapshot.infectedImages,
        rightInfectedImages: rightSnapshot.infectedImages,
        parcelName: selectedParcel.name,
        leftMapImage: leftMapCanvas.toDataURL("image/png", 0.96),
        rightMapImage: rightMapCanvas.toDataURL("image/png", 0.96),
        parcels: [{
          name: selectedParcel.name,
          leftRate: leftSnapshot.infectionRate,
          rightRate: rightSnapshot.infectionRate,
          leftLevel: leftSnapshot.level,
          rightLevel: rightSnapshot.level,
        }],
      });
    } catch (err) {
      console.error(err);
      setExportError("Le PDF comparatif n’a pas pu être généré. Réessayez dans quelques instants.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <AppShell
      title="Comparaison"
      description="Comparez deux analyses réalisées à des dates différentes sur une même parcelle."
      headerActions={
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={isExporting || !leftAnalysis || !rightAnalysis}
          className="inline-flex items-center gap-2 rounded-xl bg-[#244B32] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#356A46] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExporting ? <Spinner className="text-white" /> : <Download className="h-4 w-4" />}
          Exporter le comparatif PDF
        </button>
      }
    >
      {error && <Alert variant="error">{error}</Alert>}
      {exportError && <Alert variant="error">{exportError}</Alert>}

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner label="Chargement des parcelles..." /></div>
      ) : comparableParcels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <GitCompareArrows className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-800">Aucune analyse disponible</p>
          <p className="mt-1 text-sm text-slate-500">Une parcelle doit disposer d’au moins deux analyses datées pour établir un comparatif.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#87B940]/15 text-[#6E8B3D]"><GitCompareArrows className="h-4 w-4" /></div>
              <div>
                <h2 className="font-semibold text-slate-900">Comparer l’évolution d’une parcelle</h2>
                <p className="text-sm text-slate-500">Choisissez d’abord la parcelle, puis deux analyses distinctes. Les deux cartes sont cadrées sur la même délimitation.</p>
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Parcelle</span>
              <ModernSelect
                value={comparisonParcelId}
                onChange={setComparisonParcelId}
                searchable
                options={comparableParcels.map((parcel) => ({ value: parcel.id, label: parcel.name, description: `${parcel.analyses?.length ?? 0} analyse(s)` }))}
              />
            </label>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Analyse de référence</span>
                <ModernSelect
                  value={leftAnalysisId}
                  onChange={(value) => { setLeftAnalysisId(value); setViewport(null); setLeftRiskZone(null); setRightRiskZone(null); }}
                  options={parcelAnalyses.filter((analysis) => analysis.id !== rightAnalysisId).map((analysis) => ({ value: analysis.id, label: analysisLabel(analysis), description: analysisDate(analysis) }))}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Analyse comparée</span>
                <ModernSelect
                  value={rightAnalysisId}
                  onChange={(value) => { setRightAnalysisId(value); setViewport(null); setLeftRiskZone(null); setRightRiskZone(null); }}
                  placeholder="Choisir une seconde analyse"
                  options={parcelAnalyses.filter((analysis) => analysis.id !== leftAnalysisId).map((analysis) => ({ value: analysis.id, label: analysisLabel(analysis), description: analysisDate(analysis) }))}
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Couches de sévérité</div>
              <SeverityLayerSelector value={activeSeverityLevels} onChange={setActiveSeverityLevels} compact />
            </div>
          </section>

          {parcelAnalyses.length < 2 && <Alert variant="info">Cette parcelle ne possède qu’une seule analyse. Ajoutez une seconde analyse à une date différente pour comparer son évolution.</Alert>}

          {leftSnapshot && rightSnapshot && leftAnalysis && rightAnalysis && selectedParcel && leftAnalysis.id !== rightAnalysis.id ? (
            <div className="space-y-5 rounded-2xl bg-[#F6F8F3] p-0.5">
              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Taux d&apos;infection</span><Percent className="h-4 w-4 text-[#6E8B3D]" /></div><div className="mt-2 flex items-end gap-2"><span className="text-2xl font-semibold text-slate-900">{(rightSnapshot.infectionRate * 100).toFixed(1)} %</span><span className="pb-1 text-xs text-slate-400">analyse comparée</span></div></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Variation</span><VariationIcon value={rateDeltaPoints} /></div><div className={`mt-2 text-2xl font-semibold ${rateDeltaPoints > 0 ? "text-red-600" : rateDeltaPoints < 0 ? "text-emerald-600" : "text-slate-900"}`}>{formatSigned(rateDeltaPoints)} pts</div><p className="mt-1 text-xs text-slate-500">points de pourcentage</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Surface infectée</span><Layers3 className="h-4 w-4 text-[#6E8B3D]" /></div><div className="mt-2 text-2xl font-semibold text-slate-900">{formatHa(rightSnapshot.infectedAreaSquareMeters)}</div><p className="mt-1 text-xs text-slate-500">estimation sur la parcelle</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Évolution surface</span><VariationIcon value={areaDeltaSquareMeters} /></div><div className={`mt-2 text-2xl font-semibold ${areaDeltaSquareMeters > 0 ? "text-red-600" : areaDeltaSquareMeters < 0 ? "text-emerald-600" : "text-slate-900"}`}>{formatSigned(areaDeltaSquareMeters / 10_000, 2)} ha</div><p className="mt-1 text-xs text-slate-500">entre les deux analyses</p></div>
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                {[
                  { analysis: leftAnalysis, snapshot: leftSnapshot, side: "left" as const },
                  { analysis: rightAnalysis, snapshot: rightSnapshot, side: "right" as const },
                ].map(({ analysis, snapshot, side }) => (
                  <article key={side} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <header className="border-b border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#6E8B3D]"><CalendarDays className="h-3.5 w-3.5" />{side === "left" ? "Référence" : "Comparaison"}</div><h3 className="mt-1 text-lg font-semibold text-slate-900">{analysisLabel(analysis)}</h3><p className="text-sm text-slate-500">{analysisDate(analysis)} · {selectedParcel.name}</p></div>
                        <div className="rounded-xl bg-[#244B32]/5 px-3 py-2 text-right"><div className="text-xs text-slate-500">Infection</div><div className="font-semibold text-[#244B32]">{(snapshot.infectionRate * 100).toFixed(1)} %</div></div>
                      </div>
                    </header>
                    <div className="p-3">
                      <CampaignComparisonMap
                        mapElementId={`comparison-map-${side}`}
                        snapshot={snapshot}
                        referenceParcel={selectedParcel}
                        viewport={viewport}
                        onViewportChange={setViewport}
                        activeSeverityLevels={activeSeverityLevels}
                        selectedRiskZone={side === "left" ? leftRiskZone : rightRiskZone}
                        onSelectRiskZone={side === "left" ? setLeftRiskZone : setRightRiskZone}
                      />
                    </div>
                    <footer className="grid grid-cols-3 gap-px border-t border-slate-200 bg-slate-200">
                      <div className="bg-white p-3"><div className="text-[11px] uppercase tracking-wide text-slate-400">Images</div><div className="mt-0.5 font-semibold text-slate-800">{snapshot.processedImages}</div></div>
                      <div className="bg-white p-3"><div className="text-[11px] uppercase tracking-wide text-slate-400">Infectées</div><div className="mt-0.5 font-semibold text-slate-800">{snapshot.infectedImages}</div></div>
                      <div className="bg-white p-3"><div className="text-[11px] uppercase tracking-wide text-slate-400">Surface</div><div className="mt-0.5 font-semibold text-slate-800">{formatHa(snapshot.infectedAreaSquareMeters)}</div></div>
                    </footer>
                  </article>
                ))}
              </section>
            </div>
          ) : parcelAnalyses.length >= 2 ? (
            <Alert variant="info">Sélectionnez deux analyses distinctes de cette parcelle.</Alert>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
