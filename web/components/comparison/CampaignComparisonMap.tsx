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
import type { ZoneHistorySnapshot } from "@/lib/zone-history";
import type { Parcel } from "@/types/parcel";

export type ComparisonViewport = { center: [number, number]; zoom: number };
type Props = { snapshot: ZoneHistorySnapshot; referenceParcels: Parcel[]; viewport: ComparisonViewport | null; onViewportChange: (viewport: ComparisonViewport) => void; activeSeverityLevels: Severity[]; selectedRiskZone: RiskZone | null; onSelectRiskZone: (zone: RiskZone | null) => void };

const SATELLITE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_ATTRIBUTION = "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics";
function ringToLatLngs(ring:number[][]):LatLngExpression[]{return ring.map(([lng,lat])=>[lat,lng]);}
function computeBounds(parcels:Parcel[]):LatLngBoundsExpression|undefined{const points:[number,number][]=[];for(const parcel of parcels)for(const [lng,lat] of parcel.boundary.coordinates[0])points.push([lat,lng]);return points.length?points:undefined;}
function ViewportSynchronizer({viewport,onViewportChange}:Pick<Props,"viewport"|"onViewportChange">){const map=useMap();useEffect(()=>{if(!viewport)return;const c=map.getCenter();if(Math.abs(c.lat-viewport.center[0])>0.000001||Math.abs(c.lng-viewport.center[1])>0.000001||map.getZoom()!==viewport.zoom)map.setView(viewport.center,viewport.zoom,{animate:false});},[map,viewport]);useMapEvents({moveend(e){const c=e.target.getCenter();onViewportChange({center:[c.lat,c.lng],zoom:e.target.getZoom()});},zoomend(e){const c=e.target.getCenter();onViewportChange({center:[c.lat,c.lng],zoom:e.target.getZoom()});}});return null;}

export default function CampaignComparisonMap({snapshot,referenceParcels,viewport,onViewportChange,activeSeverityLevels,selectedRiskZone,onSelectRiskZone}:Props){
  const bounds=useMemo(()=>computeBounds(referenceParcels),[referenceParcels]);
  const snapshotByParcel=useMemo(()=>new Map(snapshot.parcels.map((item)=>[item.parcel.id,item])),[snapshot.parcels]);
  const zones=useMemo(()=>referenceParcels.flatMap((parcel)=>(parcel.analyses??[]).filter((analysis)=>analysis.missionId===snapshot.mission.id).flatMap((analysis)=>riskZonesFromAnalysis(parcel,analysis))),[referenceParcels,snapshot.mission.id]);
  return <div className="relative h-[430px] min-h-[360px] overflow-hidden rounded-xl bg-slate-100 lg:h-[500px]">
    <MapContainer center={DEFAULT_MAP_CENTER} zoom={DEFAULT_MAP_ZOOM} bounds={viewport?undefined:bounds} boundsOptions={{padding:[28,28]}} className="h-full w-full">
      <TileLayer url={SATELLITE_URL} attribution={SATELLITE_ATTRIBUTION} crossOrigin="anonymous"/>
      {referenceParcels.map((parcel)=>{const history=snapshotByParcel.get(parcel.id);return <Polygon key={parcel.id} positions={ringToLatLngs(parcel.boundary.coordinates[0])} pathOptions={{color:history?"#64748B":"#94A3B8",weight:2,fillColor:"#E2E8F0",fillOpacity:history?0.14:0.05,dashArray:history?undefined:"5 5"}}><Tooltip sticky><div className="space-y-0.5"><div className="font-semibold">{parcel.name}</div><div>{history?`Infection ${(history.infectionRate*100).toFixed(1)} %`:"Aucun relevé pour cette campagne"}</div></div></Tooltip></Polygon>;})}
      <SeverityHeatmapLayers zones={zones} activeLevels={activeSeverityLevels} onSelectZone={onSelectRiskZone}/>
      <ViewportSynchronizer viewport={viewport} onViewportChange={onViewportChange}/>
    </MapContainer>
    <MapLegend/><RiskZoneInfoPanel zone={selectedRiskZone} onClose={()=>onSelectRiskZone(null)}/>
  </div>;
}
