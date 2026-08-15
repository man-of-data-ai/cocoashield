import type { UserRole } from "@/types/user-profile";

export type AppArea = "parcels" | "map" | "comparison" | "missions" | "exports" | "reports" | "configuration" | "users" | "audit" | "analysis";

export const ROLE_AREAS: Record<UserRole, AppArea[]> = {
  administrateur: ["parcels", "map", "comparison", "missions", "exports", "reports", "configuration", "users", "audit", "analysis"],
  direction_ccc: ["map", "reports", "audit", "analysis"],
  agronome_terrain: ["parcels", "map", "comparison", "missions", "analysis"],
};

export function areaForPath(pathname: string): AppArea | null {
  if (/^\/parcels\/[^/]+\/analyses\/[^/]+/.test(pathname)) return "analysis";
  if (pathname.startsWith("/parcels")) return "parcels";
  if (pathname.startsWith("/map")) return "map";
  if (pathname.startsWith("/comparaison")) return "comparison";
  if (pathname.startsWith("/missions")) return "missions";
  if (pathname.startsWith("/exports")) return "exports";
  if (pathname.startsWith("/rapports")) return "reports";
  if (pathname.startsWith("/configuration")) return "configuration";
  if (pathname.startsWith("/utilisateurs")) return "users";
  if (pathname.startsWith("/audit")) return "audit";
  return null;
}

export function canAccess(role: UserRole, area: AppArea): boolean {
  return ROLE_AREAS[role].includes(area);
}

export function defaultPathForRole(role: UserRole): string {
  if (role === "direction_ccc") return "/map";
  if (role === "agronome_terrain") return "/parcels";
  return "/map";
}
