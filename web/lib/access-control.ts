import type { CurrentUserProfile, UserRole } from "@/types/user-profile";

export type AppArea = "dashboard" | "parcels" | "map" | "comparison" | "missions" | "exports" | "reports" | "configuration" | "users" | "audit" | "analysis" | "organizations";

export const ROLE_AREAS: Record<UserRole, AppArea[]> = {
  administrateur: ["dashboard", "parcels", "map", "comparison", "missions", "exports", "reports", "users", "audit", "analysis"],
  // La Direction On-Premise reçoit une vue agrégée uniquement : aucune parcelle nominative ni carte détaillée.
  direction_ccc: ["dashboard"],
  agronome_terrain: ["parcels", "map", "comparison", "missions", "analysis"],
  operateur_terrain: ["parcels", "map", "missions", "analysis"],
};

export const PLATFORM_ADMIN_AREAS: AppArea[] = ["dashboard", "organizations", "users", "configuration", "audit"];

export function areaForPath(pathname: string): AppArea | null {
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (/^\/parcels\/[^/]+\/analyses\/[^/]+/.test(pathname)) return "analysis";
  if (pathname.startsWith("/parcels")) return "parcels";
  if (pathname.startsWith("/map")) return "map";
  if (pathname.startsWith("/comparaison")) return "comparison";
  if (pathname.startsWith("/missions")) return "missions";
  if (pathname.startsWith("/exports")) return "exports";
  if (pathname.startsWith("/rapports")) return "reports";
  if (pathname.startsWith("/configuration")) return "configuration";
  if (pathname.startsWith("/utilisateurs")) return "users";
  if (pathname.startsWith("/organisations")) return "organizations";
  if (pathname.startsWith("/audit")) return "audit";
  return null;
}

export function canAccess(role: UserRole, area: AppArea): boolean {
  return ROLE_AREAS[role].includes(area);
}

export function canAccessProfile(profile: Pick<CurrentUserProfile, "role" | "isPlatformAdmin" | "organizationOffer">, area: AppArea): boolean {
  if (profile.isPlatformAdmin) return PLATFORM_ADMIN_AREAS.includes(area);
  if (area === "configuration") return profile.role === "administrateur" && profile.organizationOffer === "on_premise";
  return canAccess(profile.role, area);
}

export function defaultPathForRole(role: UserRole): string {
  return role === "administrateur" || role === "direction_ccc" ? "/dashboard" : "/parcels";
}

export function defaultPathForProfile(profile: Pick<CurrentUserProfile, "role" | "isPlatformAdmin">): string {
  return profile.isPlatformAdmin ? "/dashboard" : defaultPathForRole(profile.role);
}
