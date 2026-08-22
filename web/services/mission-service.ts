import { apiRequest } from "@/lib/api-client";
import type { Mission } from "@/types/parcel";

export type CreateMissionInput = {
  name: string;
  missionDate?: string;
  notes?: string;
};

export const missionService = {
  async listMissions(): Promise<Mission[]> {
    return apiRequest<Mission[]>("/v1/missions");
  },

  async createMission(input: CreateMissionInput): Promise<Mission> {
    return apiRequest<Mission>("/v1/missions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },
};
