export type PlatformSettings = {
  id: string;
  ownerId: string;
  severityModerate: number;
  severityHigh: number;
  severityCritical: number;
  clusteringRadiusM: number;
  minImagesPerZone: number;
  createdAt: string;
  updatedAt: string;
};

export type DroneProfile = {
  id: string;
  ownerId: string;
  profileId: string;
  manufacturer: string;
  model: string;
  rtkPrecisionCm: number | null;
  metadataFormat: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DroneProfileInput = {
  profileId: string;
  manufacturer: string;
  model: string;
  rtkPrecisionCm: number | null;
  metadataFormat: string;
  active?: boolean;
};
