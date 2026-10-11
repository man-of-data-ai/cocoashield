import { apiRequest } from "@/lib/api-client";
import { batchImages, type UploadLimits } from "@/lib/image-upload";
import type { Analysis, MobileCapture } from "@/types/parcel";

export type CreateAnalysisContext = {
  missionId?: string;
  missionName?: string;
  profileId?: string;
  /** false : charge les photos sans lancer l’analyse. */
  start?: boolean;
  onProgress?: (sent: number, total: number) => void;
};

/** Un lot a échoué après la création : l’analyse existe, non lancée. */
export class PartialUploadError extends Error {
  constructor(
    readonly analysis: Analysis,
    readonly sent: number,
    readonly total: number,
    readonly failure: unknown
  ) {
    super(`${sent} photo${sent > 1 ? "s" : ""} sur ${total} envoyée${sent > 1 ? "s" : ""}.`);
    this.name = "PartialUploadError";
  }
}

function imagesForm(images: File[]): FormData {
  const formData = new FormData();
  for (const image of images) formData.append("images", image);
  return formData;
}

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

  getUploadLimits(): Promise<UploadLimits> {
    return apiRequest<UploadLimits>("/v1/analyses/upload-limits");
  },

  /**
   * Envoie les photos par lots : le premier crée l’analyse sans la lancer, les
   * suivants s’y ajoutent, puis l’analyse est lancée si demandé. Avec
   * `existing` (envoi interrompu), tous les lots s’ajoutent à cette analyse.
   */
  async createAnalysis(
    parcelId: string,
    images: File[],
    limits: UploadLimits,
    context: CreateAnalysisContext & { existing?: Analysis } = {}
  ): Promise<Analysis> {
    const batches = batchImages(images, limits);
    const start = context.start !== false;
    let analysis = context.existing;
    let sent = 0;

    if (!analysis) {
      const first = batches.shift() ?? [];
      const formData = imagesForm(first);
      if (context.missionId?.trim()) formData.append("missionId", context.missionId.trim());
      else if (context.missionName?.trim()) formData.append("missionName", context.missionName.trim());
      if (context.profileId?.trim()) formData.append("profileId", context.profileId.trim());
      // Un seul lot : création et lancement dans la même requête.
      if (!start || batches.length > 0) formData.append("start", "false");
      analysis = await apiRequest<Analysis>(`/v1/parcels/${parcelId}/analyses`, {
        method: "POST",
        body: formData,
      });
      sent = first.length;
      context.onProgress?.(sent, images.length);
      if (batches.length === 0) return analysis;
    }

    try {
      for (const batch of batches) {
        analysis = await apiRequest<Analysis>(`/v1/analyses/${analysis.id}/images`, {
          method: "POST",
          body: imagesForm(batch),
        });
        sent += batch.length;
        context.onProgress?.(sent, images.length);
      }
      if (start) analysis = await this.startAnalysis(analysis.id);
    } catch (error) {
      throw new PartialUploadError(analysis, sent, images.length, error);
    }
    return analysis;
  },

  startAnalysis(id: string): Promise<Analysis> {
    return apiRequest<Analysis>(`/v1/analyses/${id}/start`, { method: "POST" });
  },

  listMobileCaptures(): Promise<MobileCapture[]> {
    return apiRequest<MobileCapture[]>("/v1/analyses/mobile");
  },

  imageFileUrl(imageId: string): string {
    return `/v1/analyses-images/${imageId}/file`;
  },
};
