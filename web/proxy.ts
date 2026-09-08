import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";
type Role = "administrateur" | "direction_ccc" | "agronome_terrain" | "operateur_terrain";
type Offer = "saas_ponctuel" | "saas_annuel" | "saas_byod" | "on_premise" | null;

function area(pathname: string): string | null {
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

const rolePermissions: Record<Role, string[]> = {
  administrateur: ["dashboard","parcels","map","comparison","missions","exports","reports","users","audit","analysis"],
  direction_ccc: ["dashboard"],
  agronome_terrain: ["parcels","map","comparison","missions","analysis"],
  operateur_terrain: ["parcels","map","missions","analysis"],
};
const platformPermissions = ["dashboard","organizations","users","configuration","audit"];

function home(profile: { role: Role; isPlatformAdmin?: boolean }) {
  return profile.isPlatformAdmin || profile.role === "administrateur" || profile.role === "direction_ccc" ? "/dashboard" : "/parcels";
}

export async function proxy(request: NextRequest) {
  const cookie = request.headers.get("cookie") ?? "";
  const sessionResponse = await fetch(`${BACKEND_URL}/v1/auth/get-session`, { headers: { cookie }, cache: "no-store" });
  const session = sessionResponse.ok ? await sessionResponse.json() : null;
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const profileResponse = await fetch(`${BACKEND_URL}/v1/users/me/profile`, { headers: { cookie }, cache: "no-store" });
  if (!profileResponse.ok) return NextResponse.redirect(new URL("/login", request.url));
  const profile = await profileResponse.json() as { role: Role; isPlatformAdmin?: boolean; organizationOffer?: Offer };
  const requestedArea = area(request.nextUrl.pathname);
  if (!requestedArea) return NextResponse.next();

  const allowed = profile.isPlatformAdmin ? platformPermissions : rolePermissions[profile.role] ?? [];
  const canConfigureOnPremise = !profile.isPlatformAdmin && profile.role === "administrateur" && profile.organizationOffer === "on_premise";
  if (requestedArea === "configuration" && canConfigureOnPremise) return NextResponse.next();
  if (!allowed.includes(requestedArea)) return NextResponse.redirect(new URL(home(profile), request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/parcels/:path*", "/map/:path*", "/comparaison/:path*", "/missions/:path*", "/exports/:path*", "/rapports/:path*", "/configuration/:path*", "/utilisateurs/:path*", "/organisations/:path*", "/audit/:path*"],
};
