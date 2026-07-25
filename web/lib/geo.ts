/**
 * Calculs géométriques appliqués aux polygones GeoJSON de parcelles.
 *
 * Les parcelles cadastrales sont de petite taille (quelques dizaines de
 * mètres). On utilise donc une projection équirectangulaire locale (centrée
 * sur la latitude moyenne du polygone) pour convertir les coordonnées
 * géographiques en mètres, puis des formules planes classiques (Shoelace
 * pour la surface, somme des distances pour le périmètre). Cette
 * approximation est largement suffisante à cette échelle et évite une
 * dépendance externe (type turf.js) pour un calcul de précision géodésique
 * complète.
 */

import { EARTH_RADIUS_METERS } from "@/lib/constants";
import type { ParcelBoundary, ParcelMetrics } from "@/types/parcel";

type Ring = number[][]; // [ [lng, lat], ... ]
type PlanarPoint = { x: number; y: number };

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Projette un anneau de coordonnées [lng, lat] en un plan local (mètres),
 * centré sur la latitude moyenne de l'anneau afin de minimiser la distorsion.
 */
function projectRingToMeters(ring: Ring): PlanarPoint[] {
  const meanLat =
    ring.reduce((sum, [, lat]) => sum + lat, 0) / ring.length;
  const cosMeanLat = Math.cos(toRadians(meanLat));

  return ring.map(([lng, lat]) => ({
    x: EARTH_RADIUS_METERS * toRadians(lng) * cosMeanLat,
    y: EARTH_RADIUS_METERS * toRadians(lat),
  }));
}

/**
 * Aire d'un polygone plan via la formule du lacet (Shoelace formula).
 */
function shoelaceArea(points: PlanarPoint[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) / 2;
}

/**
 * Périmètre d'un polygone plan (somme des longueurs des segments).
 */
function planarPerimeter(points: PlanarPoint[]): number {
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    total += Math.hypot(next.x - current.x, next.y - current.y);
  }
  return total;
}

/**
 * Centroïde géométrique (moyenne simple des sommets du contour extérieur).
 * Suffisant pour un affichage informatif ; on exclut le dernier point du
 * contour s'il duplique le premier (fermeture du polygone GeoJSON).
 */
function ringCentroid(ring: Ring): { lat: number; long: number } {
  const isClosed =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];

  const points = isClosed ? ring.slice(0, -1) : ring;

  const totals = points.reduce(
    (acc, [lng, lat]) => ({
      lng: acc.lng + lng,
      lat: acc.lat + lat,
    }),
    { lng: 0, lat: 0 }
  );

  return {
    lat: totals.lat / points.length,
    long: totals.lng / points.length,
  };
}

/**
 * Calcule surface, périmètre et centre d'une géométrie de parcelle.
 * Seul le contour extérieur (premier anneau) est pris en compte ; les
 * éventuels trous (anneaux suivants) sont ignorés, un cas rare pour une
 * parcelle cadastrale simple.
 */
export function computeParcelMetrics(geometry: ParcelBoundary): ParcelMetrics {
  const outerRing = geometry.coordinates[0];
  const projected = projectRingToMeters(outerRing);

  return {
    areaSquareMeters: shoelaceArea(projected),
    perimeterMeters: planarPerimeter(projected),
    center: ringCentroid(outerRing),
  };
}

/** Formate une surface en m² ou en hectares selon sa grandeur. */
export function formatArea(squareMeters: number): string {
  if (squareMeters >= 10_000) {
    return `${(squareMeters / 10_000).toLocaleString("fr-FR", {
      maximumFractionDigits: 2,
    })} ha`;
  }
  return `${squareMeters.toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
  })} m²`;
}

/** Formate une distance en mètres ou en kilomètres selon sa grandeur. */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toLocaleString("fr-FR", {
      maximumFractionDigits: 2,
    })} km`;
  }
  return `${meters.toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
  })} m`;
}

/** Formate une coordonnée géographique avec 5 décimales (~1m de précision). */
export function formatCoordinate(value: number): string {
  return value.toFixed(5);
}
