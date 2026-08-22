export type UserRole = "administrateur" | "direction_ccc" | "agronome_terrain";
export type UserStatus = "active" | "inactive";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role: UserRole;
  cooperative: string | null;
  status: UserStatus;
  createdAt?: string;
};

export type CurrentUserProfile = Pick<
  AppUser,
  "role" | "cooperative" | "status"
>;
