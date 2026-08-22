import { apiRequest } from "@/lib/api-client";
import type {
  AppUser,
  CurrentUserProfile,
  UserRole,
  UserStatus,
} from "@/types/user-profile";
import type { AuthResponse } from "@/types/auth";

export const userService = {
  async create(input: {
    email: string;
    username: string;
    password: string;
    role: UserRole;
    cooperative?: string;
  }): Promise<AppUser> {
    const created = await apiRequest<AuthResponse>("/v1/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        username: input.username,
        password: input.password,
        confirmPassword: input.password,
      }),
    });
    return this.update(created.user.id, {
      role: input.role,
      cooperative: input.cooperative || null,
      status: "active",
    });
  },
  list(includeDeleted = false): Promise<AppUser[]> {
    return apiRequest<AppUser[]>(
      `/v1/users${includeDeleted ? "?includeDeleted=true" : ""}`,
    );
  },
  me(): Promise<CurrentUserProfile> {
    return apiRequest<CurrentUserProfile>("/v1/users/me/profile");
  },
  update(
    id: string,
    input: {
      role?: UserRole;
      cooperative?: string | null;
      status?: UserStatus;
    },
  ): Promise<AppUser> {
    return apiRequest<AppUser>(`/v1/users/${id}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },
  /** Suppression réversible : le compte reste restaurable. */
  remove(id: string): Promise<{ id: string; deleted: boolean }> {
    return apiRequest<{ id: string; deleted: boolean }>(`/v1/users/${id}`, {
      method: "DELETE",
    });
  },
  restore(id: string): Promise<AppUser> {
    return apiRequest<AppUser>(`/v1/users/${id}/restore`, { method: "POST" });
  },
};
