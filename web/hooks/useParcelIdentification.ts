"use client";

/**
 * Hook encapsulant le workflow "identifier une parcelle à partir d'une
 * image" : appel au service, état de chargement, gestion d'erreur.
 * Garde les composants d'affichage (UploadPanel, MapPage) libres de toute
 * logique métier ou réseau, conformément aux exigences du projet.
 */

import { useCallback, useState } from "react";

import { ApiError } from "@/lib/api-client";
import { parcelService } from "@/services/parcel-service";
import type { Parcel } from "@/types/parcel";

type UseParcelIdentificationResult = {
  parcel: Parcel | null;
  isLoading: boolean;
  error: string | null;
  identify: (image: File) => Promise<void>;
  reset: () => void;
};

export function useParcelIdentification(): UseParcelIdentificationResult {
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identify = useCallback(async (image: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await parcelService.identifyParcel(image);
      setParcel(result);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Impossible d'identifier la parcelle. Veuillez réessayer.";
      setError(message);
      setParcel(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setParcel(null);
    setError(null);
  }, []);

  return { parcel, isLoading, error, identify, reset };
}
