"use client";

import { Globe, Layers3, Map as MapIcon, Satellite } from "lucide-react";

import MapExportButton from "@/components/map/MapExportButton";
import type { MapBasemap, MapLayersState } from "@/components/map/ParcelsOverviewMap";
import type { RefObject } from "react";

type MapToolbarProps = {
  basemap: MapBasemap;
  onBasemapChange: (basemap: MapBasemap) => void;
  layers: MapLayersState;
  onToggleLayer: (layer: keyof MapLayersState) => void;
  exportTargetRef: RefObject<HTMLDivElement | null>;
  hasExportData: boolean;
};

export default function MapToolbar({
  basemap,
  onBasemapChange,
  layers,
  onToggleLayer,
  exportTargetRef,
  hasExportData,
}: MapToolbarProps) {
  const basemaps: { key: MapBasemap; label: string; icon: typeof MapIcon }[] = [
    { key: "clair", label: "Clair", icon: MapIcon },
    { key: "satellite", label: "Satellite", icon: Satellite },
    { key: "osm", label: "OSM", icon: Globe },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {basemaps.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onBasemapChange(key)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              basemap === key
                ? "bg-[#244B32] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onToggleLayer("zones")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            layers.zones ? "bg-[#244B32] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
          title="Afficher ou masquer les parcelles délimitées"
        >
          <Layers3 className="h-3.5 w-3.5" /> Parcelles
        </button>
        <MapExportButton targetRef={exportTargetRef} hasData={hasExportData} />
      </div>
    </div>
  );
}
