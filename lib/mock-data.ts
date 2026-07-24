/**
 * Données de démonstration servies par l'API interne (app/api/**).
 *
 * Ce fichier isole toute la "logique métier de données" afin que les Route
 * Handlers restent minces. Le jour où ce projet est branché sur une vraie
 * API REST externe, il suffit de supprimer ce fichier et de remplacer les
 * services (services/*.ts) par des appels vers l'API réelle — aucun
 * composant ni hook n'a besoin de changer.
 */

import type { Parcel } from "@/types/parcel";

export type MockUser = {
  id: string;
  email: string;
  name: string;
  /** Mot de passe en clair, uniquement acceptable pour une démo locale. */
  password: string;
};

export const MOCK_USERS: MockUser[] = [
  {
    id: "u-1",
    email: "demo@cadastre.fr",
    name: "Agent Cadastral",
    password: "demo1234",
  },
  {
    id: "u-2",
    email: "admin@cadastre.fr",
    name: "Administrateur",
    password: "admin1234",
  },
];

/**
 * Parcelles connues du système, indexées par le nom du fichier image associé
 * (en minuscules). C'est ce fichier que POST /api/identify consulte pour
 * "reconnaître" une feuille cadastrale envoyée par l'utilisateur.
 */
export const MOCK_PARCELS: Parcel[] = [
  {
    id: 1,
    name: "Parcelle 145",
    lat: 33.5731,
    long: -7.5898,
    path: "parcelle145.jpg",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-7.5903, 33.5728],
          [-7.5894, 33.5727],
          [-7.5892, 33.5734],
          [-7.5901, 33.5736],
          [-7.5903, 33.5728],
        ],
      ],
    },
  },
  {
    id: 2,
    name: "Parcelle 12",
    lat: 33.5892,
    long: -7.6114,
    path: "parcelle1.jpg",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-7.6120, 33.5888],
          [-7.6108, 33.5887],
          [-7.6106, 33.5896],
          [-7.6118, 33.5897],
          [-7.6120, 33.5888],
        ],
      ],
    },
  },
  {
    id: 3,
    name: "Parcelle 78",
    lat: 48.8566,
    long: 2.3522,
    path: "parcelle2.jpg",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [2.3515, 48.8562],
          [2.3528, 48.8561],
          [2.353, 48.8569],
          [2.3517, 48.857],
          [2.3515, 48.8562],
        ],
      ],
    },
  },
  {
    id: 4,
    name: "Parcelle 33",
    lat: 34.0209,
    long: -6.8417,
    path: "parcelle33.jpg",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-6.8424, 34.0204],
          [-6.8411, 34.0203],
          [-6.8409, 34.0213],
          [-6.8421, 34.0214],
          [-6.8424, 34.0204],
        ],
      ],
    },
  },
  {
    id: 5,
    name: "Parcelle 90",
    lat: 31.6295,
    long: -7.9811,
    path: "parcelle90.jpg",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-7.9818, 31.629],
          [-7.9805, 31.6289],
          [-7.9803, 31.6299],
          [-7.9815, 31.63],
          [-7.9818, 31.629],
        ],
      ],
    },
  },
];

/**
 * Retourne un index déterministe (et stable) à partir d'une chaîne, utilisé
 * pour attribuer une parcelle de secours lorsque le nom du fichier envoyé ne
 * correspond à aucune parcelle connue. Cela permet à la démo de toujours
 * renvoyer un résultat plausible, comme le ferait un vrai service de
 * reconnaissance d'image.
 */
function stableHashIndex(value: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash % modulo;
}

/**
 * "Identifie" une parcelle à partir du nom de fichier de l'image envoyée.
 * 1. Recherche une correspondance exacte (insensible à la casse) sur `path`.
 * 2. À défaut, retombe sur une correspondance déterministe afin que la démo
 *    reste utilisable avec n'importe quelle image.
 */
export function identifyParcelByFilename(filename: string): Parcel {
  const normalized = filename.trim().toLowerCase();

  const exactMatch = MOCK_PARCELS.find(
    (parcel) => parcel.path.toLowerCase() === normalized
  );

  if (exactMatch) {
    return exactMatch;
  }

  const fallbackIndex = stableHashIndex(normalized, MOCK_PARCELS.length);
  return MOCK_PARCELS[fallbackIndex];
}
