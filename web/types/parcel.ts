/**
 * Géométrie GeoJSON d'une parcelle cadastrale.
 * Le premier anneau (index 0) est le contour extérieur du polygone.
 * Format des coordonnées : [longitude, latitude], conformément à GeoJSON.
 */
export type ParcelGeometry = {
  type: "Polygon";
  coordinates: number[][][];
};

/**
 * Parcelle telle que renvoyée par l'API d'identification (POST /api/identify).
 */
export type Parcel = {
  id: number;
  name: string;
  lat: number;
  long: number;
  path: string;
  geometry: ParcelGeometry;
};

/**
 * Métriques géométriques calculées côté client à partir du polygone
 * (surface, périmètre, centre) — voir lib/geo.ts.
 */
export type ParcelMetrics = {
  areaSquareMeters: number;
  perimeterMeters: number;
  center: {
    lat: number;
    long: number;
  };
};