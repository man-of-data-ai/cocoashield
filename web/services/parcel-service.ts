
import { apiRequest } from "@/lib/api-client";
import type { Parcel, TerrainVerificationStatus } from "@/types/parcel";

export type CreateParcelInput = {
  name: string;
  coordinates: [number, number][];
  producerName?: string;
  producerEmail?: string;
  producerPhone?: string;
};

export type ParcelSummary = { parcelCount:number; analyzedParcelCount:number; analysisCount:number; completedAnalysisCount:number; infectedAnalysisCount:number; averageInfectionPercentage:number; activeZones:number; criticalZones:number; affectedSurfaceSquareMeters:number; generatedAt:string };

export const parcelService = {
  async getSummary(): Promise<ParcelSummary> {
    return apiRequest<ParcelSummary>("/v1/parcels/summary");
  },

  async listParcels(): Promise<Parcel[]> {
    return apiRequest<Parcel[]>("/v1/parcels");
  },

  async getParcel(id: string): Promise<Parcel> {
    return apiRequest<Parcel>(`/v1/parcels/${id}`);
  },

  async updateVerification(
    id: string,
    status: TerrainVerificationStatus,
    comment?: string
  ): Promise<Parcel> {
    return apiRequest<Parcel>(`/v1/parcels/${id}/verification`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, comment }),
    });
  },

  async createParcel(input: CreateParcelInput): Promise<Parcel> {
    return apiRequest<Parcel>("/v1/parcels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },
};
