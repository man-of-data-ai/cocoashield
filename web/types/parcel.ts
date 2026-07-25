/**
 * Types du domaine parcelles/analyses, reflétant les entités du backend
 * (back/src/modules/parcels, back/src/modules/analyses).
 */

export type ParcelStatus = "not_analyzed" | "analyzing" | "sick" | "healthy";

export type AnalysisStatus = "pending" | "processing" | "completed";

export type AnalysisResult = "healthy" | "infected";

export type AnalysisImageSource = "mobile" | "upload";

export type AnalysisImageStatus = "pending" | "processed" | "failed";

/**
 * Géométrie GeoJSON du contour d'une parcelle.
 * Le premier anneau (index 0) est le contour extérieur du polygone.
 * Format des coordonnées : [longitude, latitude], conformément à GeoJSON.
 */
export type ParcelBoundary = {
  type: "Polygon";
  coordinates: number[][][];
};

export type AnalysisImage = {
  id: string;
  createdAt: string;
  filePath: string;
  source: AnalysisImageSource;
  status: AnalysisImageStatus;
  result: AnalysisResult | null;
  confidence: number | null;
  latitude: number | null;
  longitude: number | null;
};

export type Analysis = {
  id: string;
  parcelId: string;
  createdAt: string;
  status: AnalysisStatus;
  result: AnalysisResult | null;
  notes: string | null;
  completedAt: string | null;
  images: AnalysisImage[];
  parcel?: Parcel;
};

export type PendingImport = {
  id: string;
  createdAt: string;
  originalName: string;
  mimeType: string | null;
};

export type Parcel = {
  id: string;
  createdAt: string;
  ownerId: string;
  name: string;
  boundary: ParcelBoundary;
  status: ParcelStatus;
  analyses?: Analysis[];
  imports?: PendingImport[];
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
