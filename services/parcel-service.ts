/**
 * Service de gestion des parcelles.
 * Isole les appels réseau liés aux parcelles (identification, listing).
 */

import { apiRequest } from "@/lib/api-client";
import type { Parcel } from "@/types/parcel";

export const parcelService = {
  /**
   * Envoie une image de feuille cadastrale à l'API et retourne la parcelle
   * identifiée. Utilise FormData car il s'agit d'un upload de fichier.
   */
  async identifyParcel(image: File): Promise<Parcel> {
    const formData = new FormData();
    formData.append("image", image);

    return apiRequest<Parcel>("/api/identify", {
      method: "POST",
      body: formData,
      // Pas de Content-Type manuel : le navigateur fixe le bon boundary
      // multipart automatiquement lorsqu'on passe un FormData.
    });
  },

  /** Liste l'ensemble des parcelles connues du système. */
  async listParcels(): Promise<Parcel[]> {
    return apiRequest<Parcel[]>("/api/parcels");
  },
};
