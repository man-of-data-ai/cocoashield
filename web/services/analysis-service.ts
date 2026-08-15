/**
 * Service de gestion des analyses (back/src/modules/analyses).
 */

import { apiRequest } from "@/lib/api-client";
import type { Analysis } from "@/types/parcel";

export const analysisService = {
  /** Récupère une analyse et ses images. */
  async getAnalysis(id: string): Promise<Analysis> {
    return apiRequest<Analysis>(`/v1/analyses/${id}`);
  },

  /** Met à jour les notes d'une analyse. */
  async updateNotes(id: string, notes: string): Promise<Analysis> {
    return apiRequest<Analysis>(`/v1/analyses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  },

  /**
   * Démarre une nouvelle analyse à partir d'une ou plusieurs images (upload
   * web : toujours classées côté serveur, jamais pré-classées comme le
   * mobile). `missionName` associe (ou crée) une mission/campagne.
   */
  async createAnalysis(
    parcelId: string,
    images: File[],
    missionName?: string,
    profileId?: string
  ): Promise<Analysis> {
    const formData = new FormData();
    for (const image of images) {
      formData.append("images", image);
    }
    if (missionName && missionName.trim()) {
      formData.append("missionName", missionName.trim());
    }
    if (profileId && profileId.trim()) {
      formData.append("profileId", profileId.trim());
    }

    return apiRequest<Analysis>(`/v1/parcels/${parcelId}/analyses`, {
      method: "POST",
      body: formData,
    });
  },

  /** URL same-origin de l'image (le cookie de session suit automatiquement). */
  imageFileUrl(imageId: string): string {
    return `/v1/analyses-images/${imageId}/file`;
  },
};
