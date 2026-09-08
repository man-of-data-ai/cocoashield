export type UserRole = "administrateur" | "direction_ccc" | "agronome_terrain" | "operateur_terrain";
export type UserStatus = "active" | "inactive";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role: UserRole;
  cooperative: string | null;
  organizationId: string | null;
  organizationOffer?: "saas_ponctuel" | "saas_annuel" | "saas_byod" | "on_premise" | null;
  status: UserStatus;
  isPlatformAdmin: boolean;
  managedOrganizationIds: string[];
  createdAt?: string;
};

export type CurrentUserProfile = {
  id?: string;
  name?: string;
  email?: string;
  username?: string | null;
  role: UserRole;
  cooperative: string | null;
  organizationId: string | null;
  organizationOffer?: "saas_ponctuel" | "saas_annuel" | "saas_byod" | "on_premise" | null;
  status: UserStatus;
  isPlatformAdmin: boolean;
  managedOrganizationIds: string[];
};
