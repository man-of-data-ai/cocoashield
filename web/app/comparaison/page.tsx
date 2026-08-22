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
  Image as ImageIcon,
  Layers3,
  MapPinned,
  Percent,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import ModernSelect from "@/components/ui/ModernSelect";
import Alert from "@/components/ui/Alert";
import SeverityLayerSelector from "@/components/map/SeverityLayerSelector";
import Spinner from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api-client";
import { exportComparisonPdf } from "@/lib/comparison-export";
import {
  buildZoneHistorySnapshot,
  parcelsForComparisonReference,
} from "@/lib/zone-history";
import { missionService } from "@/services/mission-service";
import { parcelService } from "@/services/parcel-service";
import type { Mission, Parcel } from "@/types/parcel";
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

function missionDate(mission: Mission): string {
  const raw = mission.missionDate ?? mission.createdAt;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  const [missions, setMissions] = useState<Mission[]>([]);
  const [leftMissionId, setLeftMissionId] = useState("");
  const [rightMissionId, setRightMissionId] = useState("");
  const [viewport, setViewport] = useState<ComparisonViewport | null>(null);
  const [activeSeverityLevels, setActiveSeverityLevels] = useState<Severity[]>(["faible","modere","eleve","critique"]);
  const [leftRiskZone, setLeftRiskZone] = useState<RiskZone | null>(null);
  const [rightRiskZone, setRightRiskZone] = useState<RiskZone | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([parcelService.listParcels(), missionService.listMissions()])
      .then(([loadedParcels, loadedMissions]) => {
        if (!mounted) return;
        setParcels(loadedParcels);
        setMissions(loadedMissions);
        if (loadedMissions[0]) setLeftMissionId(loadedMissions[0].id);
        if (loadedMissions[1]) setRightMissionId(loadedMissions[1].id);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Impossible de charger les données de comparaison."
        );
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const leftMission = useMemo(
    () => missions.find((mission) => mission.id === leftMissionId) ?? null,
    [missions, leftMissionId]
  );
  const rightMission = useMemo(
    () => missions.find((mission) => mission.id === rightMissionId) ?? null,
    [missions, rightMissionId]
  );

  const referenceParcels = useMemo(
    () =>
      parcelsForComparisonReference(parcels, [leftMissionId, rightMissionId]),
    [parcels, leftMissionId, rightMissionId]
  );

  const leftSnapshot = useMemo(
    () => (leftMission ? buildZoneHistorySnapshot(parcels, leftMission) : null),
    [parcels, leftMission]
  );
  const rightSnapshot = useMemo(
    () => (rightMission ? buildZoneHistorySnapshot(parcels, rightMission) : null),
    [parcels, rightMission]
  );

  const rateDeltaPoints =
    leftSnapshot && rightSnapshot
      ? (rightSnapshot.infectionRate - leftSnapshot.infectionRate) * 100
      : 0;
  const areaDeltaSquareMeters =
    leftSnapshot && rightSnapshot
      ? rightSnapshot.infectedAreaSquareMeters -
        leftSnapshot.infectedAreaSquareMeters
      : 0;

  async function handleExportPdf() {
    if (!leftMission || !rightMission || !leftSnapshot || !rightSnapshot || leftMissionId === rightMissionId) {
      setExportError("Sélectionnez deux campagnes différentes contenant des données avant l’export.");
      return;
    }
    setIsExporting(true);
    setExportError(null);
    try {
      const leftByParcel = new Map(leftSnapshot.parcels.map((snapshot) => [snapshot.parcel.id, snapshot]));
      const rightByParcel = new Map(rightSnapshot.parcels.map((snapshot) => [snapshot.parcel.id, snapshot]));
      exportComparisonPdf({
        leftName: leftMission.name,
        leftDate: missionDate(leftMission),
        rightName: rightMission.name,
        rightDate: missionDate(rightMission),
        leftInfectionRate: leftSnapshot.infectionRate,
        rightInfectionRate: rightSnapshot.infectionRate,
        leftInfectedAreaSquareMeters: leftSnapshot.infectedAreaSquareMeters,
        rightInfectedAreaSquareMeters: rightSnapshot.infectedAreaSquareMeters,
        leftProcessedImages: leftSnapshot.processedImages,
        rightProcessedImages: rightSnapshot.processedImages,
        leftInfectedImages: leftSnapshot.infectedImages,
        rightInfectedImages: rightSnapshot.infectedImages,
        parcels: referenceParcels.map((parcel) => {
          const left = leftByParcel.get(parcel.id);
          const right = rightByParcel.get(parcel.id);
          return {
            name: parcel.name,
            leftRate: left?.infectionRate ?? null,
            rightRate: right?.infectionRate ?? null,
            leftLevel: left?.level ?? null,
            rightLevel: right?.level ?? null,
          };
        }),
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
      description="Comparez deux campagnes sur la même emprise pour visualiser l'évolution des foyers."
      headerActions={
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={isExporting}
          className="inline-flex items-center gap-2 rounded-xl bg-[#244B32] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#356A46] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExporting ? (
            <Spinner className="text-white" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Exporter le comparatif PDF
        </button>
      }
    >
      {error && <Alert variant="error">{error}</Alert>}
      {exportError && <Alert variant="error">{exportError}</Alert>}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner label="Chargement des campagnes..." />
        </div>
      ) : missions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <GitCompareArrows className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-800">
            Aucune campagne disponible
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Créez ou associez des analyses à des missions pour pouvoir les comparer.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#87B940]/15 text-[#6E8B3D]">
                <GitCompareArrows className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Comparer les relevés</h2>
                <p className="text-sm text-slate-500">
                  Sélectionnez deux campagnes. Les deux cartes restent synchronisées sur la même zone géographique.
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-2xl bg-slate-50 p-3"><div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Couches de sévérité</div><SeverityLayerSelector value={activeSeverityLevels} onChange={setActiveSeverityLevels} compact /></div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Campagne de référence
                </span>
                <ModernSelect value={leftMissionId} onChange={(value)=>{setLeftMissionId(value);setViewport(null);setLeftRiskZone(null);setRightRiskZone(null);}} options={missions.filter((mission) => mission.id !== rightMissionId).map((mission) => ({ value: mission.id, label: mission.name, description: missionDate(mission) }))} />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Campagne comparée
                </span>
                <ModernSelect value={rightMissionId} onChange={(value)=>{setRightMissionId(value);setViewport(null);setLeftRiskZone(null);setRightRiskZone(null);}} placeholder="Choisir une seconde campagne" options={missions.filter((mission) => mission.id !== leftMissionId).map((mission) => ({ value: mission.id, label: mission.name, description: missionDate(mission) }))} />
              </label>
            </div>
          </section>

          {missions.length < 2 && (
            <Alert variant="info">
              Deux campagnes distinctes sont nécessaires pour établir un comparatif.
            </Alert>
          )}

          {leftSnapshot && rightSnapshot && leftMission && rightMission && leftMission.id !== rightMission.id ? (
            <div className="space-y-5 rounded-2xl bg-[#F6F8F3] p-0.5">
              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Taux d&apos;infection
                    </span>
                    <Percent className="h-4 w-4 text-[#6E8B3D]" />
                  </div>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-2xl font-semibold text-slate-900">
                      {(rightSnapshot.infectionRate * 100).toFixed(1)} %
                    </span>
                    <span className="pb-1 text-xs text-slate-400">campagne comparée</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Variation
                    </span>
                    <VariationIcon value={rateDeltaPoints} />
                  </div>
                  <div className={`mt-2 text-2xl font-semibold ${rateDeltaPoints > 0 ? "text-red-600" : rateDeltaPoints < 0 ? "text-emerald-600" : "text-slate-900"}`}>
                    {formatSigned(rateDeltaPoints)} pts
                  </div>
                  <p className="mt-1 text-xs text-slate-500">points de pourcentage</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Surface infectée
                    </span>
                    <Layers3 className="h-4 w-4 text-[#6E8B3D]" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatHa(rightSnapshot.infectedAreaSquareMeters)}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">estimation pondérée par le taux observé</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Évolution surface
                    </span>
                    <VariationIcon value={areaDeltaSquareMeters} />
                  </div>
                  <div className={`mt-2 text-2xl font-semibold ${areaDeltaSquareMeters > 0 ? "text-red-600" : areaDeltaSquareMeters < 0 ? "text-emerald-600" : "text-slate-900"}`}>
                    {formatSigned(areaDeltaSquareMeters / 10_000, 2)} ha
                  </div>
                  <p className="mt-1 text-xs text-slate-500">entre les deux campagnes</p>
                </div>
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                {[
                  { mission: leftMission, snapshot: leftSnapshot, side: "left" as const },
                  { mission: rightMission, snapshot: rightSnapshot, side: "right" as const },
                ].map(({ mission, snapshot, side }) => (
                  <article
                    key={side}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <header className="border-b border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#6E8B3D]">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {side === "left" ? "Référence" : "Comparaison"}
                          </div>
                          <h3 className="mt-1 text-lg font-semibold text-slate-900">
                            {mission.name}
                          </h3>
                          <p className="text-sm text-slate-500">{missionDate(mission)}</p>
                        </div>
                        <div className="rounded-xl bg-[#244B32]/5 px-3 py-2 text-right">
                          <div className="text-xs text-slate-500">Infection</div>
                          <div className="font-semibold text-[#244B32]">
                            {(snapshot.infectionRate * 100).toFixed(1)} %
                          </div>
                        </div>
                      </div>
                    </header>

                    <div className="p-3">
                      <CampaignComparisonMap
                        snapshot={snapshot}
                        referenceParcels={referenceParcels}
                        viewport={viewport}
                        onViewportChange={setViewport}
                        activeSeverityLevels={activeSeverityLevels}
                        selectedRiskZone={side === "left" ? leftRiskZone : rightRiskZone}
                        onSelectRiskZone={side === "left" ? setLeftRiskZone : setRightRiskZone}
                      />
                    </div>

                    <footer className="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-4">
                      <div className="bg-white p-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">Zones</div>
                        <div className="mt-0.5 font-semibold text-slate-800">{snapshot.parcels.length}</div>
                      </div>
                      <div className="bg-white p-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">Images</div>
                        <div className="mt-0.5 font-semibold text-slate-800">{snapshot.processedImages}</div>
                      </div>
                      <div className="bg-white p-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">Infectées</div>
                        <div className="mt-0.5 font-semibold text-slate-800">{snapshot.infectedImages}</div>
                      </div>
                      <div className="bg-white p-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">Surface</div>
                        <div className="mt-0.5 font-semibold text-slate-800">{formatHa(snapshot.infectedAreaSquareMeters)}</div>
                      </div>
                    </footer>
                  </article>
                ))}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <MapPinned className="h-4 w-4 text-[#6E8B3D]" />
                      Lecture du comparatif
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Les deux vues utilisent la même emprise et se synchronisent lors du déplacement ou du zoom. Les contours correspondent aux parcelles présentes dans au moins une des deux campagnes ; la heatmap et les points proviennent uniquement des relevés de la campagne affichée.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <ImageIcon className="h-4 w-4" />
                    {referenceParcels.length} parcelle{referenceParcels.length > 1 ? "s" : ""} de référence
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-[#87B940]/30 bg-[#87B940]/10 px-3 py-2 text-xs font-medium text-[#556D34]">
                  non-garantie diagnostique — Les taux et surfaces sont des indicateurs d&apos;aide à la surveillance et doivent être confirmés par une vérification terrain.
                </div>
              </section>
            </div>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
