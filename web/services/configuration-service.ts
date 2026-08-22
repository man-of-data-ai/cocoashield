import { apiRequest } from "@/lib/api-client";
import type {
  DroneProfile,
  DroneProfileInput,
  PlatformSettings,
} from "@/types/configuration";

export const configurationService = {
  getSettings(): Promise<PlatformSettings> {
    return apiRequest<PlatformSettings>("/v1/configuration/settings");
  },

  updateSettings(
    payload: Pick<
      PlatformSettings,
      | "severityModerate"
      | "severityHigh"
      | "severityCritical"
      | "clusteringRadiusM"
      | "minImagesPerZone"
    >,
  ): Promise<PlatformSettings> {
    return apiRequest<PlatformSettings>("/v1/configuration/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  listDroneProfiles(activeOnly = false): Promise<DroneProfile[]> {
    return apiRequest<DroneProfile[]>(
      `/v1/configuration/drone-profiles${activeOnly ? "?activeOnly=true" : ""}`,
    );
  },

  createDroneProfile(payload: DroneProfileInput): Promise<DroneProfile> {
    return apiRequest<DroneProfile>("/v1/configuration/drone-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  updateDroneProfile(
    id: string,
    payload: Partial<DroneProfileInput>,
  ): Promise<DroneProfile> {
    return apiRequest<DroneProfile>(`/v1/configuration/drone-profiles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
};
