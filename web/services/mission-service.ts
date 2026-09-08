
import { apiRequest } from "@/lib/api-client";
import type { Mission } from "@/types/parcel";

export type CreateMissionInput = {
  name: string;
  missionDate: string;
  droneProfileId: string;
  parcelIds: string[];
  notes?: string;
};

export const missionService = {
  async listMissions(): Promise<Mission[]> {
    return apiRequest<Mission[]>("/v1/missions");
  },

  async updateNotes(id: string, notes: string): Promise<Mission> {
    return apiRequest<Mission>(`/v1/missions/${id}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  },

  async createMission(input: CreateMissionInput): Promise<Mission> {
    return apiRequest<Mission>("/v1/missions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },
};
