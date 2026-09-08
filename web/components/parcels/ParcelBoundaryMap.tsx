"use client";

import { useMemo } from "react";
import { MapContainer, Marker, Polygon, Polyline, TileLayer, useMapEvents } from "react-leaflet";
import { RotateCcw, Trash2, Check } from "lucide-react";
import L from "leaflet";

import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/constants";
import { computeParcelMetrics, formatArea } from "@/lib/geo";

type LngLat = [number, number];

type ParcelBoundaryMapProps = {
  coordinates: LngLat[];
  onChange?: (coordinates: LngLat[]) => void;
  readOnly?: boolean;
};

function MapClickHandler({ onAdd, disabled }: { onAdd: (coordinate: LngLat) => void; disabled: boolean }) {
  useMapEvents({
    click(event) {
      if (!disabled) onAdd([event.latlng.lng, event.latlng.lat]);
    },
  });
  return null;
}

export default function ParcelBoundaryMap({ coordinates, onChange = () => {}, readOnly = false }: ParcelBoundaryMapProps) {
  const isClosed = coordinates.length >= 3 && coordinates[0][0] === coordinates[coordinates.length - 1][0] && coordinates[0][1] === coordinates[coordinates.length - 1][1];
  const editableCoordinates = isClosed ? coordinates.slice(0, -1) : coordinates;
  const latLngPoints = useMemo(
    () => editableCoordinates.map(([lng, lat]): [number, number] => [lat, lng]),
    [editableCoordinates]
  );

  const vertexIcon = useMemo(() => L.divIcon({
    className: "!border-0 !bg-transparent",
    html: '<span style="display:block;width:12px;height:12px;border:2px solid #244B32;background:#fff;border-radius:9999px;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  }), []);

  const area = useMemo(() => {
    if (editableCoordinates.length < 3 || !isClosed) return null;
    return computeParcelMetrics({ type: "Polygon", coordinates: [[...editableCoordinates, editableCoordinates[0]]] }).areaSquareMeters;
  }, [editableCoordinates, isClosed]);

  function handleAdd(coordinate: LngLat) {
    if (isClosed) return;
    onChange([...editableCoordinates, coordinate]);
  }

  function handleUndo() {
    if (isClosed) return;
    onChange(editableCoordinates.slice(0, -1));
  }

  function handleClear() {
    onChange([]);
  }

  function handleClosePolygon() {
    if (editableCoordinates.length < 3 || isClosed) return;
    onChange([...editableCoordinates, editableCoordinates[0]]);
  }

  function handleVertexDrag(index: number, lat: number, lng: number) {
    const next = editableCoordinates.map((coordinate, coordinateIndex) =>
      coordinateIndex === index ? [lng, lat] as LngLat : coordinate
    );
    onChange(isClosed ? [...next, next[0]] : next);
  }

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-xl border border-slate-200">
      <MapContainer center={DEFAULT_MAP_CENTER} zoom={DEFAULT_MAP_ZOOM} className="h-full w-full">
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onAdd={handleAdd} disabled={readOnly || isClosed} />

        {latLngPoints.length >= 3 ? (
          <Polygon
            positions={latLngPoints}
            pathOptions={{ color: "#244B32", weight: 2, fillColor: "#87B940", fillOpacity: 0.22 }}
          />
        ) : latLngPoints.length >= 2 ? (
          <Polyline positions={latLngPoints} pathOptions={{ color: "#244B32", weight: 2 }} />
        ) : null}

        {latLngPoints.map(([lat, lng], index) => (
          <Marker
            key={`${index}-${lat}-${lng}`}
            position={[lat, lng]}
            icon={vertexIcon}
            draggable={!readOnly}
            eventHandlers={{
              dragend(event) {
                const marker = event.target;
                const position = marker.getLatLng();
                handleVertexDrag(index, position.lat, position.lng);
              },
            }}
          />
        ))}
      </MapContainer>

      {!readOnly && <div className="absolute right-3 top-3 z-[1000] flex flex-wrap justify-end gap-2">
        {!isClosed && (
          <>
            <button
              type="button"
              onClick={handleUndo}
              disabled={editableCoordinates.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Annuler
            </button>
            <button
              type="button"
              onClick={handleClosePolygon}
              disabled={editableCoordinates.length < 3}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#244B32] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#356A46] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Fermer le polygone
            </button>
          </>
        )}
        <button
          type="button"
          onClick={handleClear}
          disabled={editableCoordinates.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Supprimer
        </button>
      </div>}

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[1000] flex items-center justify-between gap-3 rounded-lg bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm">
        <span>{readOnly ? "Aperçu du contour importé." : isClosed ? "Polygone fermé · déplacez les points pour modifier la forme." : "Cliquez sur la carte pour ajouter les sommets."}</span>
        {area !== null && <span className="shrink-0 font-semibold text-[#244B32]">{formatArea(area)}</span>}
      </div>
    </div>
  );
}
