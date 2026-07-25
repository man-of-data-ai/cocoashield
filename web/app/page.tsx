import { redirect } from "next/navigation";

/**
 * Page racine : aiguillage pur, sans rendu visible. Redirige vers /parcels ;
 * le proxy (proxy.ts) se charge de rediriger vers /login si la session
 * n'est pas valide.
 */
export default function Home() {
  redirect("/parcels");
}
