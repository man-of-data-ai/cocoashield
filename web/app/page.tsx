import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { verifySessionToken } from "@/lib/token";

/**
 * Page racine : aiguillage pur, sans rendu visible. Vérifie la session côté
 * serveur (via le cookie httpOnly) et redirige vers /map si connecté, sinon
 * vers /login. Aucune logique métier n'est jamais visible côté client ici.
 */
export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  redirect(session ? "/map" : "/login");
}
