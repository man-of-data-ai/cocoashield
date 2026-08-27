"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet.heat";
import { CircleMarker, Polygon, Tooltip, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

import {
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  type Severity,
} from "@/lib/severity";
import type { RiskZone } from "@/lib/risk-zones";

const LEVELS: Severity[] = ["faible", "modere", "eleve", "critique"];

function rgba(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  const value = Number.parseInt(raw, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function ringToLatLngs(ring: number[][]): LatLngExpression[] {
  return ring.map(([lng, lat]) => [lat, lng]);
}

function HeatLayer({ level, zones }: { level: Severity; zones: RiskZone[] }) {
  const map = useMap();
  const ref = useRef<L.HeatLayer | null>(null);
  const color = SEVERITY_COLORS[level];
  const points = useMemo<L.HeatLatLngTuple[]>(
    () =>
      zones
        .filter((zone) => !zone.geometry)
        .map((zone) => [
          zone.latitude,
          zone.longitude,
          Math.max(0.35, zone.severity),
        ]),
    [zones],
  );

  useEffect(() => {
    ref.current = L.heatLayer(points, {
      radius: 34,
      blur: 26,
      maxZoom: 18,
      max: 1,
      minOpacity: 0.34,
      gradient: {
        0.15: rgba(color, 0.18),
        0.45: rgba(color, 0.48),
        0.75: rgba(color, 0.78),
        1: color,
      },
    }).addTo(map);
    return () => {
      if (ref.current) map.removeLayer(ref.current);
      ref.current = null;
    };
  }, [map, points, color]);
  return null;
}

type Props = {
  zones: RiskZone[];
  activeLevels: Severity[];
  onSelectZone?: (zone: RiskZone) => void;
};

export default function SeverityHeatmapLayers({
  zones,
  activeLevels,
  onSelectZone,
}: Props) {
  return (
    <>
      {LEVELS.filter((level) => activeLevels.includes(level)).map((level) => {
        const levelZones = zones.filter((zone) => zone.level === level);
        if (levelZones.length === 0) return null;
        return (
          <Fragment key={level}>
            <HeatLayer level={level} zones={levelZones} />
            {levelZones
              .filter((zone) => zone.geometry)
              .map((zone) => (
                <Polygon
                  key={`${zone.id}:geometry`}
                  positions={ringToLatLngs(zone.geometry!.coordinates[0])}
                  pathOptions={{
                    color: SEVERITY_COLORS[level],
                    fillColor: SEVERITY_COLORS[level],
                    fillOpacity: 0.42,
                    weight: 1.5,
                  }}
                  eventHandlers={{ click: () => onSelectZone?.(zone) }}
                >
                  <Tooltip>
                    {zone.parcelName} · {SEVERITY_LABELS[level]}
                  </Tooltip>
                </Polygon>
              ))}
            {levelZones
              .filter((zone) => !zone.geometry)
              .map((zone) => (
                <CircleMarker
                  key={`${zone.id}:hit`}
                  center={[zone.latitude, zone.longitude]}
                  radius={20}
                  pathOptions={{
                    color: "transparent",
                    fillColor: "transparent",
                    fillOpacity: 0,
                    opacity: 0,
                  }}
                  eventHandlers={{ click: () => onSelectZone?.(zone) }}
                >
                  <Tooltip>
                    {zone.parcelName} · {SEVERITY_LABELS[level]}
                  </Tooltip>
                </CircleMarker>
              ))}
          </Fragment>
        );
      })}
    </>
  );
}
