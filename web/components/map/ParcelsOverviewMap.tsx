"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";

import SeverityHeatmapLayers from "@/components/map/SeverityHeatmapLayers";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/constants";
import type { ImageEntry, ParcelAggregate } from "@/lib/map-filters";
import type { RiskZone } from "@/lib/risk-zones";
import type { Severity } from "@/lib/severity";

export type MapBasemap = "clair" | "satellite" | "osm";
export type MapLayersState = { zones: boolean; heatmap: boolean; points: boolean };

type Props = {
  parcels: ParcelAggregate[];
  riskZones: RiskZone[];
  diagnosticPoints: ImageEntry[];
  activeSeverityLevels: Severity[];
  selectedParcelId: string | null;
  onSelectParcel: (parcelId: string) => void;
  onSelectRiskZone?: (zone: RiskZone) => void;
  basemap: MapBasemap;
  layers: MapLayersState;
};

const TILE_LAYERS: Record<MapBasemap, { url: string; attribution: string }> = {
  clair: { url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", attribution: "&copy; OpenStreetMap contributors &copy; CARTO" },
  osm: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "&copy; OpenStreetMap contributors" },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics" },
};

function safeRing(boundary: ParcelAggregate["parcel"]["boundary"]): number[][] {
  const ring = boundary?.coordinates?.[0];
  if (!Array.isArray(ring)) return [];
  return ring.filter((point) => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]));
}
function ringToLatLngs(ring: number[][]): LatLngExpression[] { return ring.map(([lng, lat]) => [lat, lng]); }
function computeBounds(parcels: ParcelAggregate[]): LatLngBoundsExpression | null {
  const points: [number, number][] = [];
  for (const { parcel } of parcels) for (const [lng, lat] of safeRing(parcel.boundary)) points.push([lat, lng]);
  return points.length >= 3 ? points : null;
}
function FitParcelsBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => { if (bounds) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 17, animate: false }); }, [map, bounds]);
  return null;
}

export default function ParcelsOverviewMap({ parcels, riskZones, diagnosticPoints, activeSeverityLevels, selectedParcelId, onSelectParcel, onSelectRiskZone, basemap, layers }: Props) {
  const bounds = useMemo(() => computeBounds(parcels), [parcels]);
  const tile = TILE_LAYERS[basemap];
  const [mapKey] = useState(() => "parcels-overview-map");
  return <MapContainer key={mapKey} center={DEFAULT_MAP_CENTER} zoom={DEFAULT_MAP_ZOOM} bounds={bounds ?? undefined} boundsOptions={{ padding: [32, 32] }} className="h-full w-full">
    <FitParcelsBounds bounds={bounds}/>
    <TileLayer attribution={tile.attribution} url={tile.url} crossOrigin="anonymous"/>
    {layers.zones && parcels.map(({ parcel }) => {
      const selected = parcel.id === selectedParcelId;
      const ring = safeRing(parcel.boundary);
      if (ring.length < 3) return null;
      return <Polygon key={parcel.id} positions={ringToLatLngs(ring)} pathOptions={{ color: selected ? "#244B32" : "#64748B", weight: selected ? 4 : 2, fillColor: "#E2E8F0", fillOpacity: selected ? 0.26 : 0.13 }} eventHandlers={{ click: () => onSelectParcel(parcel.id) }}><Tooltip sticky>{parcel.name}</Tooltip></Polygon>;
    })}

    {layers.points && diagnosticPoints.filter(({image}) => image.latitude !== null && image.longitude !== null && image.geolocationQuality !== "none").map(({parcel,analysis,image}) => {
      const qualityColor = image.geolocationQuality === "rtk_fix" ? "#2563EB" : image.geolocationQuality === "rtk_float" ? "#7C3AED" : image.geolocationQuality === "saisie_manuelle" ? "#6B7280" : image.geolocationQuality === "precise" ? "#2563EB" : "#F59E0B";
      const resultColor = image.result === "infected" ? "#DC2626" : image.result === "healthy" ? "#16A34A" : "#64748B";
      const qualityLabel = image.geolocationQuality === "rtk_fix" ? "RTK Fix" : image.geolocationQuality === "rtk_float" ? "RTK Float" : image.geolocationQuality === "gnss_seul" ? "GNSS seul" : image.geolocationQuality === "saisie_manuelle" ? "Saisie manuelle" : image.geolocationQuality === "precise" ? "GPS précis" : "GPS approximatif";
      return <CircleMarker key={`point:${image.id}`} center={[image.latitude!,image.longitude!]} radius={5.5} pathOptions={{ color: qualityColor, weight: 2.5, fillColor: resultColor, fillOpacity: 0.9 }} eventHandlers={{ click: () => onSelectParcel(parcel.id) }}>
        <Tooltip><div className="text-xs"><strong>{parcel.name}</strong><br/>{image.result === "infected" ? "Infecté" : image.result === "healthy" ? "Sain" : "En attente"} · {qualityLabel}<br/>Confiance : {image.confidence === null ? "—" : `${Math.round(image.confidence*100)} %`}<br/>Analyse {analysis.id.slice(0,8)}</div></Tooltip>
      </CircleMarker>;
    })}
    {layers.heatmap && <SeverityHeatmapLayers zones={riskZones} activeLevels={activeSeverityLevels} onSelectZone={(zone)=>{onSelectParcel(zone.parcelId);onSelectRiskZone?.(zone);}}/>}
  </MapContainer>;
}
