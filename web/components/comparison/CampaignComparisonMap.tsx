"use client";

import { useEffect, useMemo } from "react";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import { MapContainer, Polygon, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";

import SeverityHeatmapLayers from "@/components/map/SeverityHeatmapLayers";
import RiskZoneInfoPanel from "@/components/map/RiskZoneInfoPanel";
import MapLegend from "@/components/map/MapLegend";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/constants";
import { riskZonesFromAnalysis, type RiskZone } from "@/lib/risk-zones";
import type { Severity } from "@/lib/severity";
import type { AnalysisComparisonSnapshot } from "@/lib/zone-history";
import type { Parcel } from "@/types/parcel";

export type ComparisonViewport = { center: [number, number]; zoom: number };
type Props = {
  mapElementId?: string;
  snapshot: AnalysisComparisonSnapshot;
  referenceParcel: Parcel;
  viewport: ComparisonViewport | null;
  onViewportChange: (viewport: ComparisonViewport) => void;
  activeSeverityLevels: Severity[];
  selectedRiskZone: RiskZone | null;
  onSelectRiskZone: (zone: RiskZone | null) => void;
};

const SATELLITE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_ATTRIBUTION = "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics";

function safeRing(parcel: Parcel): number[][] {
  const ring = parcel.boundary?.coordinates?.[0];
  return Array.isArray(ring)
    ? ring.filter((point) => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]))
    : [];
}
function ringToLatLngs(ring: number[][]): LatLngExpression[] {
  return ring.map(([lng, lat]) => [lat, lng]);
}
function computeBounds(parcel: Parcel): LatLngBoundsExpression | undefined {
  const points = safeRing(parcel).map(([lng, lat]) => [lat, lng] as [number, number]);
  return points.length >= 3 ? points : undefined;
}
function FitComparisonBounds({ bounds }: { bounds: LatLngBoundsExpression | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 18, animate: false });
  }, [map, bounds]);
  return null;
}
function ViewportSynchronizer({ viewport, onViewportChange }: Pick<Props, "viewport" | "onViewportChange">) {
  const map = useMap();
  useEffect(() => {
    if (!viewport) return;
    const c = map.getCenter();
    if (
      Math.abs(c.lat - viewport.center[0]) > 0.000001 ||
      Math.abs(c.lng - viewport.center[1]) > 0.000001 ||
      map.getZoom() !== viewport.zoom
    ) {
      map.setView(viewport.center, viewport.zoom, { animate: false });
    }
  }, [map, viewport]);
  useMapEvents({
    moveend(e) {
      const c = e.target.getCenter();
      onViewportChange({ center: [c.lat, c.lng], zoom: e.target.getZoom() });
    },
    zoomend(e) {
      const c = e.target.getCenter();
      onViewportChange({ center: [c.lat, c.lng], zoom: e.target.getZoom() });
    },
  });
  return null;
}

export default function CampaignComparisonMap({
  mapElementId,
  snapshot,
  referenceParcel,
  viewport,
  onViewportChange,
  activeSeverityLevels,
  selectedRiskZone,
  onSelectRiskZone,
}: Props) {
  const bounds = useMemo(() => computeBounds(referenceParcel), [referenceParcel]);
  const zones = useMemo(
    () => riskZonesFromAnalysis(referenceParcel, snapshot.analysis),
    [referenceParcel, snapshot.analysis]
  );
  const ring = safeRing(referenceParcel);

  return (
    <div id={mapElementId} className="relative h-[430px] min-h-[360px] overflow-hidden rounded-xl bg-slate-100 lg:h-[500px]">
      <MapContainer center={DEFAULT_MAP_CENTER} zoom={DEFAULT_MAP_ZOOM} bounds={viewport ? undefined : bounds} boundsOptions={{ padding: [28, 28] }} className="h-full w-full">
        <TileLayer url={SATELLITE_URL} attribution={SATELLITE_ATTRIBUTION} crossOrigin="anonymous" />
        {!viewport && <FitComparisonBounds bounds={bounds} />}
        {ring.length >= 3 && (
          <Polygon
            positions={ringToLatLngs(ring)}
            pathOptions={{ color: "#244B32", weight: 3, fillColor: "#E2E8F0", fillOpacity: 0.12 }}
          >
            <Tooltip sticky>
              <div className="space-y-0.5">
                <div className="font-semibold">{referenceParcel.name}</div>
                <div>Infection {(snapshot.infectionRate * 100).toFixed(1)} %</div>
              </div>
            </Tooltip>
          </Polygon>
        )}
        <SeverityHeatmapLayers zones={zones} activeLevels={activeSeverityLevels} onSelectZone={onSelectRiskZone} />
        <ViewportSynchronizer viewport={viewport} onViewportChange={onViewportChange} />
      </MapContainer>
      <MapLegend />
      <RiskZoneInfoPanel zone={selectedRiskZone} onClose={() => onSelectRiskZone(null)} />
    </div>
  );
}
