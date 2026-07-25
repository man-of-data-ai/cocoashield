"use client";

/**
 * Carte Leaflet affichant la parcelle identifiée : centrage automatique
 * (fitBounds), marqueur sur le point de référence, contour GeoJSON du
 * polygone, et popup récapitulatif. Composant de présentation pur : il ne
 * reçoit que la parcelle à afficher, sans connaître l'origine des données.
 */

import { useEffect } from "react";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import type { LatLngBoundsExpression } from "leaflet";
import type { Feature, Polygon } from "geojson";

import { formatArea, formatDistance } from "@/lib/geo";
import { useParcelMetrics } from "@/hooks/useParcelMetrics";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/constants";
import type { Parcel } from "@/types/parcel";

type ParcelMapProps = {
  parcel: Parcel | null;
};

/** Centre et cadre automatiquement la carte sur le contour de la parcelle. */
function FitBoundsOnParcel({ parcel }: ParcelMapProps) {
  const map = useMap();

  useEffect(() => {
    if (!parcel) {
      return;
    }

    const bounds = parcel.geometry.coordinates[0].map(
      ([longitude, latitude]) => [latitude, longitude]
    ) as LatLngBoundsExpression;

    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, parcel]);

  return null;
}

export default function ParcelMap({ parcel }: ParcelMapProps) {
  const metrics = useParcelMetrics(parcel);

  const parcelFeature: Feature<Polygon> | null = parcel
    ? {
        type: "Feature",
        properties: {
          id: parcel.id,
          name: parcel.name,
          path: parcel.path,
        },
        geometry: parcel.geometry,
      }
    : null;

  return (
    <MapContainer
      center={DEFAULT_MAP_CENTER}
      zoom={DEFAULT_MAP_ZOOM}
      className="h-full min-h-[500px] w-full"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {parcel && parcelFeature && (
        <>
          <GeoJSON
            key={parcel.id}
            data={parcelFeature}
            pathOptions={{
              color: "#2563eb",
              weight: 2,
              fillColor: "#3b82f6",
              fillOpacity: 0.25,
            }}
          />

          <Marker position={[parcel.lat, parcel.long]}>
            <Popup>
              <strong>{parcel.name}</strong>
              <br />
              Identifiant : {parcel.id}
              <br />
              Latitude : {parcel.lat.toFixed(5)}
              <br />
              Longitude : {parcel.long.toFixed(5)}
              <br />
              Image : {parcel.path}
              {metrics && (
                <>
                  <br />
                  Surface : {formatArea(metrics.areaSquareMeters)}
                  <br />
                  Périmètre : {formatDistance(metrics.perimeterMeters)}
                </>
              )}
            </Popup>
          </Marker>

          <FitBoundsOnParcel parcel={parcel} />
        </>
      )}
    </MapContainer>
  );
}
