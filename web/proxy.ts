import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";
type Role = "administrateur" | "direction_ccc" | "agronome_terrain";

function area(pathname: string): string | null {
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

const permissions: Record<Role, string[]> = {
  administrateur: ["parcels","map","comparison","missions","exports","reports","configuration","users","audit","analysis"],
  direction_ccc: ["map","reports","audit","analysis"],
  agronome_terrain: ["parcels","map","comparison","missions","analysis"],
};

function home(role: Role) { if (role === "agronome_terrain") return "/parcels"; if (role === "direction_ccc") return "/map"; return "/utilisateurs"; }

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
  const profile = await profileResponse.json() as { role: Role };
  const requestedArea = area(request.nextUrl.pathname);
  if (requestedArea && !permissions[profile.role]?.includes(requestedArea)) {
    return NextResponse.redirect(new URL(home(profile.role), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/parcels/:path*", "/map/:path*", "/comparaison/:path*", "/missions/:path*", "/exports/:path*", "/rapports/:path*", "/configuration/:path*", "/utilisateurs/:path*", "/audit/:path*"],
};
