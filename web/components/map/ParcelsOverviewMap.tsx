"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";

import SeverityHeatmapLayers from "@/components/map/SeverityHeatmapLayers";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/constants";
import type { ParcelAggregate } from "@/lib/map-filters";
import type { RiskZone } from "@/lib/risk-zones";
import type { Severity } from "@/lib/severity";

export type MapBasemap = "clair" | "satellite" | "osm";
export type MapLayersState = { zones: boolean; heatmap: boolean };

type Props = {
  parcels: ParcelAggregate[];
  riskZones: RiskZone[];
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

function ringToLatLngs(ring: number[][]): LatLngExpression[] { return ring.map(([lng, lat]) => [lat, lng]); }
function computeBounds(parcels: ParcelAggregate[]): LatLngBoundsExpression | null {
  const points: [number, number][] = [];
  for (const { parcel } of parcels) for (const [lng, lat] of parcel.boundary.coordinates[0]) points.push([lat, lng]);
  return points.length ? points : null;
}
function FitParcelsBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => { if (bounds) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 17, animate: false }); }, [map, bounds]);
  return null;
}

export default function ParcelsOverviewMap({ parcels, riskZones, activeSeverityLevels, selectedParcelId, onSelectParcel, onSelectRiskZone, basemap, layers }: Props) {
  const bounds = useMemo(() => computeBounds(parcels), [parcels]);
  const tile = TILE_LAYERS[basemap];
  const [mapKey] = useState(() => "parcels-overview-map");
  return <MapContainer key={mapKey} center={DEFAULT_MAP_CENTER} zoom={DEFAULT_MAP_ZOOM} bounds={bounds ?? undefined} boundsOptions={{ padding: [32, 32] }} className="h-full w-full">
    <FitParcelsBounds bounds={bounds}/>
    <TileLayer attribution={tile.attribution} url={tile.url} crossOrigin="anonymous"/>
    {layers.zones && parcels.map(({ parcel }) => {
      const selected = parcel.id === selectedParcelId;
      return <Polygon key={parcel.id} positions={ringToLatLngs(parcel.boundary.coordinates[0])} pathOptions={{ color: selected ? "#244B32" : "#64748B", weight: selected ? 4 : 2, fillColor: "#E2E8F0", fillOpacity: selected ? 0.26 : 0.13 }} eventHandlers={{ click: () => onSelectParcel(parcel.id) }}><Tooltip sticky>{parcel.name}</Tooltip></Polygon>;
    })}
    {layers.heatmap && <SeverityHeatmapLayers zones={riskZones} activeLevels={activeSeverityLevels} onSelectZone={(zone)=>{onSelectParcel(zone.parcelId);onSelectRiskZone?.(zone);}}/>}
  </MapContainer>;
}
