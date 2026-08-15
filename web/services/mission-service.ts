/**
 * Service de gestion des missions (back/src/modules/missions). Une mission
 * regroupe les analyses réalisées lors d'une même campagne de collecte
 * terrain, et sert de filtre sur le dashboard cartographique.
 */

import { apiRequest } from "@/lib/api-client";
import type { Mission } from "@/types/parcel";

export type CreateMissionInput = {
  name: string;
  missionDate?: string;
  notes?: string;
};

export const missionService = {
  /** Liste les missions de l'utilisateur connecté. */
  async listMissions(): Promise<Mission[]> {
    return apiRequest<Mission[]>("/v1/missions");
  },

  /** Crée une nouvelle mission (campagne de collecte). */
  async createMission(input: CreateMissionInput): Promise<Mission> {
    return apiRequest<Mission>("/v1/missions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },
};
