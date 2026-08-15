"use client";

import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";

import SeverityHeatmapLayers from "@/components/map/SeverityHeatmapLayers";
import RiskZoneInfoPanel from "@/components/map/RiskZoneInfoPanel";
import MapLegend from "@/components/map/MapLegend";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/constants";
import { riskZonesFromAnalysis, type RiskZone } from "@/lib/risk-zones";
import type { Severity } from "@/lib/severity";
import type { Analysis, Parcel } from "@/types/parcel";

type Props = { parcel: Parcel; analysis: Analysis; activeSeverityLevels: Severity[]; selectedImageId: string | null; onSelectImage: (imageId: string) => void; selectedRiskZone: RiskZone | null; onSelectRiskZone: (zone: RiskZone | null) => void };
const SATELLITE_URL="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
function ringToLatLngs(ring:number[][]):LatLngExpression[]{return ring.map(([lng,lat])=>[lat,lng]);}
function Fit({parcel}:{parcel:Parcel}){const map=useMap();useEffect(()=>{const b=parcel.boundary.coordinates[0].map(([lng,lat])=>[lat,lng]) as LatLngBoundsExpression;map.fitBounds(b,{padding:[30,30],maxZoom:18,animate:false});},[map,parcel]);return null;}

export default function AnalysisImageMap({parcel,analysis,activeSeverityLevels,selectedImageId,onSelectImage,selectedRiskZone,onSelectRiskZone}:Props){
  const zones=useMemo(()=>riskZonesFromAnalysis(parcel,analysis),[parcel,analysis]);
  const located=analysis.images.filter((image)=>image.latitude!==null&&image.longitude!==null&&image.geolocationQuality==="precise");
  return <div className="relative h-full w-full">
    <MapContainer center={DEFAULT_MAP_CENTER} zoom={DEFAULT_MAP_ZOOM} className="h-full min-h-[400px] w-full">
      <TileLayer attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics" url={SATELLITE_URL} crossOrigin="anonymous"/>
      <Polygon positions={ringToLatLngs(parcel.boundary.coordinates[0])} pathOptions={{color:"#64748B",weight:2,fillColor:"#E2E8F0",fillOpacity:0.12}}><Tooltip>{parcel.name}</Tooltip></Polygon>
      <SeverityHeatmapLayers zones={zones} activeLevels={activeSeverityLevels} onSelectZone={onSelectRiskZone}/>
      {located.map((image)=><CircleMarker key={image.id} center={[image.latitude!,image.longitude!]} radius={image.id===selectedImageId?5:3} pathOptions={{color:"#FFFFFF",weight:1.5,fillColor:"#334155",fillOpacity:0.6}} eventHandlers={{click:()=>onSelectImage(image.id)}}><Tooltip>Observation géolocalisée</Tooltip></CircleMarker>)}
      <Fit parcel={parcel}/>
    </MapContainer>
    <MapLegend/><RiskZoneInfoPanel zone={selectedRiskZone} onClose={()=>onSelectRiskZone(null)}/>
  </div>;
}
