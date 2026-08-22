
import { apiRequest } from "@/lib/api-client";
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  User,
} from "@/types/auth";

type SessionResponse = {
  session: unknown;
  user: User;
} | null;

export const authService = {
  async login(credentials: LoginCredentials): Promise<User> {
    const data = await apiRequest<AuthResponse>("/v1/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    return data.user;
  },

  async register(credentials: RegisterCredentials): Promise<User> {
    const data = await apiRequest<AuthResponse>("/v1/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    return data.user;
  },

  async logout(): Promise<void> {
    await apiRequest<{ success: boolean }>("/v1/auth/sign-out", {
      method: "POST",
    });
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const data = await apiRequest<SessionResponse>("/v1/auth/get-session");
      return data?.user ?? null;
    } catch {
      return null;
    }
  },
};
