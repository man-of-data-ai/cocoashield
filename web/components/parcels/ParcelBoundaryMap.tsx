"use client";

/**
 * Carte Leaflet permettant de dessiner le contour d'une parcelle en cliquant
 * sur la carte : chaque clic ajoute un sommet, un aperçu (polygone dès 3
 * points, sinon ligne) se met à jour en direct. Composant contrôlé : reçoit
 * les coordonnées courantes et notifie le parent à chaque changement.
 */

import { useMemo } from "react";
import {
  MapContainer,
  Polygon,
  Polyline,
  TileLayer,
  useMapEvents,
} from "react-leaflet";

import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/constants";

/** Coordonnées [longitude, latitude], ordre GeoJSON. */
type LngLat = [number, number];

type ParcelBoundaryMapProps = {
  coordinates: LngLat[];
  onChange: (coordinates: LngLat[]) => void;
};

function ClickToAddVertex({
  onAdd,
}: {
  onAdd: (coordinate: LngLat) => void;
}) {
  useMapEvents({
    click(event) {
      onAdd([event.latlng.lng, event.latlng.lat]);
    },
  });
  return null;
}

export default function ParcelBoundaryMap({
  coordinates,
  onChange,
}: ParcelBoundaryMapProps) {
  const latLngPoints = useMemo(
    () => coordinates.map(([lng, lat]): [number, number] => [lat, lng]),
    [coordinates]
  );

  function handleAdd(coordinate: LngLat) {
    onChange([...coordinates, coordinate]);
  }

  function handleUndo() {
    onChange(coordinates.slice(0, -1));
  }

  function handleClear() {
    onChange([]);
  }

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickToAddVertex onAdd={handleAdd} />

        {latLngPoints.length >= 3 ? (
          <Polygon
            positions={latLngPoints}
            pathOptions={{
              color: "#2563eb",
              weight: 2,
              fillColor: "#3b82f6",
              fillOpacity: 0.25,
            }}
          />
        ) : latLngPoints.length >= 2 ? (
          <Polyline positions={latLngPoints} pathOptions={{ color: "#2563eb", weight: 2 }} />
        ) : null}
      </MapContainer>

      <div className="absolute right-3 top-3 z-[1000] flex gap-2">
        <button
          type="button"
          onClick={handleUndo}
          disabled={coordinates.length === 0}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Annuler le dernier point
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={coordinates.length === 0}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Effacer
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-lg bg-white/90 px-3 py-1.5 text-xs text-slate-600 shadow-sm">
        Cliquez sur la carte pour ajouter un point ({coordinates.length} point
        {coordinates.length > 1 ? "s" : ""})
      </div>
    </div>
  );
}
