import { apiRequest } from "@/lib/api-client";
import type { Analysis } from "@/types/parcel";

export type CreateAnalysisContext = {
  missionId?: string;
  missionName?: string;
  profileId?: string;
};

export const analysisService = {
  async getAnalysis(id: string): Promise<Analysis> {
    return apiRequest<Analysis>(`/v1/analyses/${id}`);
  },

  async updateNotes(id: string, notes: string): Promise<Analysis> {
    return apiRequest<Analysis>(`/v1/analyses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  },

  async createAnalysis(
    parcelId: string,
    images: File[],
    context: CreateAnalysisContext = {}
  ): Promise<Analysis> {
    const formData = new FormData();
    for (const image of images) formData.append("images", image);
    if (context.missionId?.trim()) formData.append("missionId", context.missionId.trim());
    else if (context.missionName?.trim()) formData.append("missionName", context.missionName.trim());
    if (context.profileId?.trim()) formData.append("profileId", context.profileId.trim());

    return apiRequest<Analysis>(`/v1/parcels/${parcelId}/analyses`, {
      method: "POST",
      body: formData,
    });
  },

  imageFileUrl(imageId: string): string {
    return `/v1/analyses-images/${imageId}/file`;
  },
};
