import { EARTH_RADIUS_METERS } from "@/lib/constants";
import type { ParcelBoundary, ParcelMetrics } from "@/types/parcel";

type Ring = number[][]; // [ [lng, lat], ... ]
type PlanarPoint = { x: number; y: number };

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function projectRingToMeters(ring: Ring): PlanarPoint[] {
  const meanLat = ring.reduce((sum, [, lat]) => sum + lat, 0) / ring.length;
  const cosMeanLat = Math.cos(toRadians(meanLat));

  return ring.map(([lng, lat]) => ({
    x: EARTH_RADIUS_METERS * toRadians(lng) * cosMeanLat,
    y: EARTH_RADIUS_METERS * toRadians(lat),
  }));
}

function shoelaceArea(points: PlanarPoint[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) / 2;
}

function planarPerimeter(points: PlanarPoint[]): number {
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    total += Math.hypot(next.x - current.x, next.y - current.y);
  }
  return total;
}

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
    { lng: 0, lat: 0 },
  );

  return {
    lat: totals.lat / points.length,
    long: totals.lng / points.length,
  };
}

export function computeParcelMetrics(geometry: ParcelBoundary): ParcelMetrics {
  const outerRing = geometry.coordinates[0];
  const projected = projectRingToMeters(outerRing);

  return {
    areaSquareMeters: shoelaceArea(projected),
    perimeterMeters: planarPerimeter(projected),
    center: ringCentroid(outerRing),
  };
}

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

export function formatCoordinate(value: number): string {
  return value.toFixed(5);
}
