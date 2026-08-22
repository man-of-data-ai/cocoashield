
export type ParcelStatus = "not_analyzed" | "analyzing" | "sick" | "healthy";

export type TerrainVerificationStatus = "pending" | "verified" | "false_positive";

export type AnalysisStatus = "pending" | "processing" | "completed";

export type AnalysisResult = "healthy" | "infected";

export type AnalysisImageSource = "mobile" | "upload";

export type AnalysisImageStatus = "pending" | "processed" | "failed";

export type GeolocationQuality = "precise" | "approximate" | "none";

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
  geolocationQuality: GeolocationQuality;
};

export type Mission = {
  id: string;
  createdAt: string;
  ownerId: string;
  name: string;
  missionDate: string | null;
  notes: string | null;
};

export type Analysis = {
  id: string;
  parcelId: string;
  createdAt: string;
  status: AnalysisStatus;
  result: AnalysisResult | null;
  notes: string | null;
  completedAt: string | null;
  infectionPercentage: number | null;
  severityLevel: "faible" | "modere" | "eleve" | "critique" | null;
  affectedZones: Array<{
    latitude: number;
    longitude: number;
    severity: number;
    severityLevel?: "faible" | "modere" | "eleve" | "critique";
    surfaceSquareMeters?: number | null;
    geometry?: ParcelBoundary | null;
  }> | null;
  reportGeneratedAt: string | null;
  images: AnalysisImage[];
  parcel?: Parcel;
  missionId: string | null;
  profileId: string | null;
  mission?: Mission | null;
};

export type Parcel = {
  id: string;
  createdAt: string;
  ownerId: string;
  name: string;
  boundary: ParcelBoundary;
  status: ParcelStatus;
  terrainVerificationStatus: TerrainVerificationStatus;
  terrainVerificationComment: string | null;
  terrainVerifiedAt: string | null;
  analyses?: Analysis[];
};

export type ParcelMetrics = {
  areaSquareMeters: number;
  perimeterMeters: number;
  center: {
    lat: number;
    long: number;
  };
};
