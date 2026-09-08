import { apiRequest } from "@/lib/api-client";
import type { AppUser, CurrentUserProfile, UserRole, UserStatus } from "@/types/user-profile";
import type { AuthResponse } from "@/types/auth";

export type UserProfileUpdate = { name?: string; email?: string; password?: string; role?: UserRole; cooperative?: string | null; organizationId?: string | null; status?: UserStatus; isPlatformAdmin?: boolean; managedOrganizationIds?: string[] };

export const userService = {
  async create(input: { name: string; email: string; username: string; password: string; role: UserRole; cooperative?: string; organizationId?: string | null; managedOrganizationIds?: string[] }): Promise<AppUser> {
    const created = await apiRequest<AuthResponse>("/v1/users/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: input.email, username: input.username, password: input.password, confirmPassword: input.password }) });
    return this.update(created.user.id, { name: input.name, role: input.role, cooperative: input.cooperative || null, organizationId: input.role === "administrateur" ? null : input.organizationId || null, managedOrganizationIds: input.role === "administrateur" ? (input.managedOrganizationIds ?? (input.organizationId ? [input.organizationId] : [])) : undefined, status: "active" });
  },
  list(): Promise<AppUser[]> { return apiRequest<AppUser[]>("/v1/users"); },
  me(): Promise<CurrentUserProfile> { return apiRequest<CurrentUserProfile>("/v1/users/me/profile"); },
  updateMe(input: { name?: string; currentPassword?: string; password?: string }): Promise<CurrentUserProfile> { return apiRequest<CurrentUserProfile>("/v1/users/me/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }); },
  update(id: string, input: UserProfileUpdate): Promise<AppUser> { return apiRequest<AppUser>(`/v1/users/${id}/profile`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }); },
  remove(id: string): Promise<{ id: string; deleted: boolean }> { return apiRequest<{ id: string; deleted: boolean }>(`/v1/users/${id}`, { method: "DELETE" }); },
};
