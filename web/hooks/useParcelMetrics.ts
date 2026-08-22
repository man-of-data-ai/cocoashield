"use client";


import { useMemo } from "react";

import { computeParcelMetrics } from "@/lib/geo";
import type { Parcel, ParcelMetrics } from "@/types/parcel";

export function useParcelMetrics(parcel: Parcel | null): ParcelMetrics | null {
  return useMemo(() => {
    if (!parcel) {
      return null;
    }
    return computeParcelMetrics(parcel.boundary);
  }, [parcel]);
}
