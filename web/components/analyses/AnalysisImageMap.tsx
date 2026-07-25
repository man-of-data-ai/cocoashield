"use client";

/**
 * Carte Leaflet d'une analyse : contour de la parcelle + un marqueur par
 * image géolocalisée (couleur selon le résultat), cliquable pour afficher
 * son détail (voir ImageDetailPanel).
 */

import { useEffect } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";

import type { LatLngBoundsExpression } from "leaflet";
import type { Feature, Polygon } from "geojson";

import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/constants";
import type { AnalysisImage, ParcelBoundary } from "@/types/parcel";

type AnalysisImageMapProps = {
  boundary: ParcelBoundary;
  images: AnalysisImage[];
  selectedImageId: string | null;
  onSelect: (imageId: string) => void;
};

const MARKER_COLORS: Record<string, string> = {
  healthy: "#059669",
  infected: "#dc2626",
  pending: "#94a3b8",
};

function FitBoundsOnBoundary({ boundary }: { boundary: ParcelBoundary }) {
  const map = useMap();

  useEffect(() => {
    const bounds = boundary.coordinates[0].map(
      ([longitude, latitude]) => [latitude, longitude]
    ) as LatLngBoundsExpression;
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, boundary]);

  return null;
}

export default function AnalysisImageMap({
  boundary,
  images,
  selectedImageId,
  onSelect,
}: AnalysisImageMapProps) {
  const boundaryFeature: Feature<Polygon> = {
    type: "Feature",
    properties: {},
    geometry: boundary,
  };

  const locatedImages = images.filter(
    (image): image is AnalysisImage & { latitude: number; longitude: number } =>
      image.latitude !== null && image.longitude !== null
  );

  return (
    <MapContainer
      center={DEFAULT_MAP_CENTER}
      zoom={DEFAULT_MAP_ZOOM}
      className="h-full min-h-[400px] w-full"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <GeoJSON
        data={boundaryFeature}
        pathOptions={{ color: "#2563eb", weight: 2, fillColor: "#3b82f6", fillOpacity: 0.15 }}
      />

      {locatedImages.map((image) => (
        <CircleMarker
          key={image.id}
          center={[image.latitude, image.longitude]}
          radius={image.id === selectedImageId ? 10 : 7}
          pathOptions={{
            color: MARKER_COLORS[image.result ?? "pending"],
            fillColor: MARKER_COLORS[image.result ?? "pending"],
            fillOpacity: 0.8,
            weight: image.id === selectedImageId ? 3 : 1,
          }}
          eventHandlers={{ click: () => onSelect(image.id) }}
        />
      ))}

      <FitBoundsOnBoundary boundary={boundary} />
    </MapContainer>
  );
}
