import { NextResponse } from "next/server";

import { MOCK_PARCELS } from "@/lib/mock-data";

/**
 * GET /api/parcels
 *
 * Endpoint complémentaire listant toutes les parcelles connues du système.
 * Non requis par le flux principal (qui passe par POST /api/identify), mais
 * utile pour des besoins futurs (ex. recherche, administration).
 * Protégé implicitement par le même modèle de session que /api/identify
 * pourrait être ajouté ici si nécessaire ; laissé public pour la démo.
 */
export async function GET() {
  return NextResponse.json(MOCK_PARCELS);
}
