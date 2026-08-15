/**
 * Service de gestion des parcelles. Isole les appels réseau vers le backend
 * (back/src/modules/parcels).
 */

import { apiRequest } from "@/lib/api-client";
import type { Parcel, TerrainVerificationStatus } from "@/types/parcel";

export type CreateParcelInput = {
  name: string;
  /** Anneau de coordonnées [longitude, latitude] délimitant le champ. */
  coordinates: [number, number][];
};

export const parcelService = {
  /** Liste les parcelles de l'utilisateur connecté. */
  async listParcels(): Promise<Parcel[]> {
    return apiRequest<Parcel[]>("/v1/parcels");
  },

  /** Récupère une parcelle et son historique d'analyses. */
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

  /** Crée une nouvelle parcelle à partir de son nom et de son contour. */
  async createParcel(input: CreateParcelInput): Promise<Parcel> {
    return apiRequest<Parcel>("/v1/parcels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },
};
