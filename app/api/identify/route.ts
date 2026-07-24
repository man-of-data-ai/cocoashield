import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  SESSION_COOKIE_NAME,
} from "@/lib/constants";
import { identifyParcelByFilename } from "@/lib/mock-data";
import { verifySessionToken } from "@/lib/token";
import type { Parcel } from "@/types/parcel";

/**
 * POST /api/identify
 *
 * Reçoit une image de feuille cadastrale (multipart/form-data, champ
 * "image") et renvoie la parcelle identifiée, conforme au contrat :
 * { id, name, lat, long, path, geometry }.
 *
 * Dans cette démo, l'"identification" est simulée par une correspondance
 * sur le nom du fichier (voir lib/mock-data.ts). Le contrat de l'endpoint
 * est cependant celui d'un vrai service de reconnaissance d'image : il
 * suffira de remplacer l'implémentation interne (par un appel à un modèle
 * de vision, un service tiers, etc.) sans toucher au front-end.
 *
 * Réponse 200 : Parcel
 * Réponse 400 : { message } — fichier manquant / type ou taille invalide
 * Réponse 401 : { message } — utilisateur non authentifié
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    return NextResponse.json(
      { message: "Non authentifié." },
      { status: 401 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "Le corps de la requête doit être un multipart/form-data." },
      { status: 400 }
    );
  }

  const image = formData.get("image");

  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json(
      { message: "Aucune image valide n'a été transmise." },
      { status: 400 }
    );
  }

  if (!ACCEPTED_IMAGE_TYPES.includes(image.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return NextResponse.json(
      {
        message:
          "Format d'image non supporté. Formats acceptés : JPG, PNG, WebP.",
      },
      { status: 400 }
    );
  }

  if (image.size > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json(
      { message: "L'image dépasse la taille maximale autorisée (10 Mo)." },
      { status: 400 }
    );
  }

  // Simule le temps de traitement d'un vrai service de reconnaissance.
  await new Promise((resolve) => setTimeout(resolve, 900));

  const parcel: Parcel = identifyParcelByFilename(image.name);

  return NextResponse.json(parcel);
}
