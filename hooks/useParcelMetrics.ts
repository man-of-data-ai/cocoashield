"use client";

/**
 * Calcule les métriques géométriques d'une parcelle (surface, périmètre,
 * centre) à partir de sa géométrie GeoJSON. Mémoïsé pour éviter de refaire
 * le calcul à chaque rendu.
 */

import { useMemo } from "react";

import { computeParcelMetrics } from "@/lib/geo";
import type { Parcel, ParcelMetrics } from "@/types/parcel";

export function useParcelMetrics(parcel: Parcel | null): ParcelMetrics | null {
  return useMemo(() => {
    if (!parcel) {
      return null;
    }
    return computeParcelMetrics(parcel.geometry);
  }, [parcel]);
}
