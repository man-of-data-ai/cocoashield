"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import KpiBanner from "@/components/map/KpiBanner";
import MapFilters from "@/components/map/MapFilters";
import MapLegend from "@/components/map/MapLegend";
import MapToolbar from "@/components/map/MapToolbar";
import RiskZoneInfoPanel from "@/components/map/RiskZoneInfoPanel";
import ParcelDetailPanel from "@/components/map/ParcelDetailPanel";
import ParcelFullDetailsDialog from "@/components/map/ParcelFullDetailsDialog";
import type { MapBasemap, MapLayersState } from "@/components/map/ParcelsOverviewMap";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api-client";
import { computeParcelMetrics } from "@/lib/geo";
import {
  DEFAULT_MAP_FILTERS,
  aggregateByParcel,
  applyDataFilters,
  applySeverityAndSearchFilters,
  collectImageEntries,
  type MapFiltersState,
  type ParcelAggregate,
} from "@/lib/map-filters";
import { computeParcelSeverity, severityRank, setRuntimeSeverityThresholds, type Severity } from "@/lib/severity";
import { riskZonesFromAnalysis, type RiskZone } from "@/lib/risk-zones";
import { missionService } from "@/services/mission-service";
import { parcelService } from "@/services/parcel-service";
import { configurationService } from "@/services/configuration-service";
import type { Mission, Parcel } from "@/types/parcel";
import type { DroneProfile } from "@/types/configuration";

const ParcelsOverviewMap = dynamic(() => import("@/components/map/ParcelsOverviewMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-100">
      <Spinner label="Chargement de la carte..." />
    </div>
  ),
});

const DEFAULT_LAYERS: MapLayersState = { zones: true, heatmap: true };

function freshnessLabel(entries: ReturnType<typeof collectImageEntries>): string {
  if (entries.length === 0) return "—";
  const latest = Math.max(...entries.map((entry) => new Date(entry.image.createdAt).getTime()));
  if (!Number.isFinite(latest)) return "—";
  const minutes = Math.max(0, Math.floor((Date.now() - latest) / 60_000));
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j`;
}

export default function MapDashboardPage() {
  const searchParams = useSearchParams();
  const requestedParcelId = searchParams.get("parcel");
  const requestedAnalysisId = searchParams.get("analysis");
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [droneProfiles, setDroneProfiles] = useState<DroneProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MapFiltersState>(DEFAULT_MAP_FILTERS);
  const [layers, setLayers] = useState<MapLayersState>(DEFAULT_LAYERS);
  const [basemap, setBasemap] = useState<MapBasemap>("satellite");
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(requestedParcelId);
  const [fullDetailsParcel, setFullDetailsParcel] = useState<Parcel | null>(null);
  const [selectedRiskZone, setSelectedRiskZone] = useState<RiskZone | null>(null);
  const [isFullDetailsOpen, setIsFullDetailsOpen] = useState(false);
  const [isFullDetailsLoading, setIsFullDetailsLoading] = useState(false);
  const [fullDetailsError, setFullDetailsError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([parcelService.listParcels(), missionService.listMissions(), configurationService.getSettings(), configurationService.listDroneProfiles(true)]).then((results) => {
      if (!isMounted) return;
      const [parcelsResult, missionsResult, configurationResult, droneProfilesResult] = results;
      if (parcelsResult.status === "fulfilled") setParcels(parcelsResult.value);
      else setError(parcelsResult.reason instanceof ApiError ? parcelsResult.reason.message : "Impossible de charger les parcelles.");
      if (missionsResult.status === "fulfilled") setMissions(missionsResult.value);
      else console.warn("Impossible de charger les missions :", missionsResult.reason);
      if (droneProfilesResult.status === "fulfilled") setDroneProfiles(droneProfilesResult.value);
      if (configurationResult.status === "fulfilled") {
        setRuntimeSeverityThresholds({
          modere: configurationResult.value.severityModerate,
          eleve: configurationResult.value.severityHigh,
          critique: configurationResult.value.severityCritical,
        });
      }
      setIsLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  function toggleLayer(layer: keyof MapLayersState) {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  }

  async function openFullDetails(parcel: Parcel) {
    setIsFullDetailsOpen(true);
    setFullDetailsParcel(parcel);
    setIsFullDetailsLoading(true);
    setFullDetailsError(null);
    try {
      const detailedParcel = await parcelService.getParcel(parcel.id);
      setFullDetailsParcel(detailedParcel);
      setParcels((current) => current.map((item) => item.id === detailedParcel.id ? detailedParcel : item));
    } catch (err) {
      setFullDetailsError(err instanceof ApiError ? err.message : "Impossible de charger la fiche complète de la parcelle.");
    } finally {
      setIsFullDetailsLoading(false);
    }
  }

  function handleFullDetailsParcelChange(updatedParcel: Parcel) {
    setFullDetailsParcel(updatedParcel);
    setParcels((current) => current.map((item) => item.id === updatedParcel.id ? updatedParcel : item));
  }

  const allImageEntries = useMemo(() => collectImageEntries(parcels), [parcels]);
  const dataFilteredEntries = useMemo(() => applyDataFilters(allImageEntries, filters), [allImageEntries, filters]);
  const parcelAggregates = useMemo(() => aggregateByParcel(dataFilteredEntries), [dataFilteredEntries]);

  const aggregatesWithEmptyParcels = useMemo(() => {
    const byId = new Map(parcelAggregates.map((aggregate) => [aggregate.parcel.id, aggregate]));
    const dataFilterRestrictive =
      filters.missionIds.length > 0 ||
      filters.vectors.length < 2 ||
      filters.droneProfileIds.length > 0 ||
      filters.geolocQualities.length < 3 ||
      filters.period !== "all";
    if (dataFilterRestrictive) return parcelAggregates;

    const result: ParcelAggregate[] = [...parcelAggregates];
    for (const parcel of parcels) {
      if (byId.has(parcel.id)) continue;
      const severity = computeParcelSeverity(parcel);
      result.push({
        parcel,
        entries: [],
        level: severity.level,
        infectionRate: severity.infectionRate,
        processedImages: severity.processedImages,
        infectedImages: severity.infectedImages,
      });
    }
    return result;
  }, [parcelAggregates, parcels, filters]);

  const visibleAggregates = useMemo(
    () => applySeverityAndSearchFilters(aggregatesWithEmptyParcels, filters).sort((a, b) => severityRank(b.level) - severityRank(a.level)),
    [aggregatesWithEmptyParcels, filters]
  );
  const visibleParcelIds = useMemo(() => new Set(visibleAggregates.map((aggregate) => aggregate.parcel.id)), [visibleAggregates]);
  const visibleImageEntries = useMemo(() => dataFilteredEntries.filter((entry) => visibleParcelIds.has(entry.parcel.id)), [dataFilteredEntries, visibleParcelIds]);
  const selectedParcel = useMemo(() => visibleAggregates.find((aggregate) => aggregate.parcel.id === selectedParcelId)?.parcel ?? null, [visibleAggregates, selectedParcelId]);

  const visibleRiskZones = useMemo(() => {
    const analyses = new Map<string, { parcel: Parcel; analysis: (typeof visibleImageEntries)[number]["analysis"]; imageIds: Set<string> }>();
    for (const entry of visibleImageEntries) {
      if (requestedAnalysisId && entry.analysis.id !== requestedAnalysisId) continue;
      const current = analyses.get(entry.analysis.id) ?? { parcel: entry.parcel, analysis: entry.analysis, imageIds: new Set<string>() };
      current.imageIds.add(entry.image.id);
      analyses.set(entry.analysis.id, current);
    }
    return Array.from(analyses.values()).flatMap(({ parcel, analysis, imageIds }) => riskZonesFromAnalysis(parcel, analysis, imageIds));
  }, [visibleImageEntries, requestedAnalysisId]);
  const activeSeverityLevels = filters.activeLevels.filter((level): level is Severity => level !== "inconnu");
  const requestedAnalysis = requestedAnalysisId
    ? parcels.flatMap((parcel) => (parcel.analyses ?? []).map((analysis) => ({ parcel, analysis }))).find((entry) => entry.analysis.id === requestedAnalysisId) ?? null
    : null;

  const kpis = useMemo(() => {
    const missionIds = new Set(visibleImageEntries.map((entry) => entry.analysis.missionId).filter((id): id is string => Boolean(id)));
    const infectedSurfaceSquareMeters = visibleAggregates.reduce((sum, aggregate) => {
      const area = computeParcelMetrics(aggregate.parcel.boundary).areaSquareMeters;
      return sum + area * aggregate.infectionRate;
    }, 0);
    return {
      missionsCount: missionIds.size > 0 ? missionIds.size : missions.length,
      activeZones: visibleAggregates.length,
      infectedSurfaceSquareMeters,
      freshnessLabel: freshnessLabel(visibleImageEntries),
    };
  }, [visibleAggregates, visibleImageEntries, missions.length]);

  return (
    <AppShell title="Carte">
      {requestedAnalysisId && requestedParcelId && <div className="mb-4"><Alert variant="info">Vue ouverte depuis une analyse : la parcelle concernée est présélectionnée et les zones à risque affichées correspondent à cette analyse.</Alert></div>}
      {error && <Alert variant="error">{error}</Alert>}

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner label="Chargement des parcelles..." /></div>
      ) : parcels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-600">Aucune parcelle pour le moment.</p>
          <Link href="/parcels" className="mt-3 inline-block rounded-xl bg-[#244B32] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#356A46]">Créer une parcelle</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <KpiBanner
            missionsCount={kpis.missionsCount}
            activeZones={kpis.activeZones}
            infectedSurfaceSquareMeters={kpis.infectedSurfaceSquareMeters}
            freshnessLabel={kpis.freshnessLabel}
          />

          <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_330px] xl:items-start">
            <div className="relative z-20"><MapFilters filters={filters} onChange={setFilters} missions={missions} parcels={parcels} droneProfiles={droneProfiles} /></div>
            <div className="overflow-hidden rounded-[24px] border border-[#DFE7DB] bg-white shadow-sm">
                <MapToolbar basemap={basemap} onBasemapChange={setBasemap} layers={layers} onToggleLayer={toggleLayer} exportData={{ parcels: visibleAggregates.map((aggregate) => ({ id: aggregate.parcel.id, name: aggregate.parcel.name, boundary: aggregate.parcel.boundary })), riskZones: visibleRiskZones.filter((zone) => activeSeverityLevels.includes(zone.level)) }} exportContext={{ title: requestedAnalysis ? `Analyse · ${requestedAnalysis.parcel.name}` : "Cocoashield — Cartographie phytosanitaire", subtitle: requestedAnalysis ? `Analyse du ${new Date(requestedAnalysis.analysis.completedAt ?? requestedAnalysis.analysis.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}` : `${visibleAggregates.length} parcelle${visibleAggregates.length > 1 ? "s" : ""} affichée${visibleAggregates.length > 1 ? "s" : ""}`, details: requestedAnalysis ? [`Infection : ${(requestedAnalysis.analysis.infectionPercentage ?? 0).toFixed(1)} %`, `Sévérité : ${requestedAnalysis.analysis.severityLevel ?? "En attente"}`, `Zones à risque affichées : ${visibleRiskZones.length}`] : [`Missions : ${kpis.missionsCount}`, `Zones affichées : ${visibleRiskZones.length}`, `Surface infectée estimée : ${(kpis.infectedSurfaceSquareMeters / 10_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ha`] }} />
                <div className="relative h-[640px] min-h-[520px] overflow-hidden bg-slate-100 xl:h-[720px]">
                  <ParcelsOverviewMap parcels={visibleAggregates} riskZones={visibleRiskZones} activeSeverityLevels={activeSeverityLevels} selectedParcelId={selectedParcelId} onSelectParcel={setSelectedParcelId} onSelectRiskZone={setSelectedRiskZone} basemap={basemap} layers={layers} />
                  <MapLegend />
                  <RiskZoneInfoPanel zone={selectedRiskZone} onClose={()=>setSelectedRiskZone(null)} />
                </div>
            </div>
            <div className="min-h-[520px]"><ParcelDetailPanel parcel={selectedParcel} onOpenFullDetails={openFullDetails} /></div>
          </div>
        </div>
      )}
      <ParcelFullDetailsDialog
        open={isFullDetailsOpen}
        onClose={() => setIsFullDetailsOpen(false)}
        parcel={fullDetailsParcel}
        isLoading={isFullDetailsLoading}
        loadError={fullDetailsError}
        onParcelChange={handleFullDetailsParcelChange}
      />
    </AppShell>
  );
}
