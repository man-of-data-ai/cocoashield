import { apiRequest } from "@/lib/api-client";
import type { Parcel, TerrainVerificationStatus } from "@/types/parcel";

export type CreateParcelInput = {
  name: string;
  coordinates: [number, number][];
};

export const parcelService = {
  async listParcels(): Promise<Parcel[]> {
    return apiRequest<Parcel[]>("/v1/parcels");
  },

  async getParcel(id: string): Promise<Parcel> {
    return apiRequest<Parcel>(`/v1/parcels/${id}`);
  },

  async updateVerification(
    id: string,
    status: TerrainVerificationStatus,
    comment?: string,
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
