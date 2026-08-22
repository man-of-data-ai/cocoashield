export type LngLat = [number, number];

export type ParsedParcelBoundary = {
  format: "GeoJSON" | "KML" | "Shapefile";
  coordinates: LngLat[];
};

function assertCoordinate(value: unknown): value is LngLat {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(Number(value[0])) &&
    Number.isFinite(Number(value[1]))
  );
}

function normalizeRing(raw: unknown): LngLat[] {
  if (!Array.isArray(raw))
    throw new Error(
      "Aucun contour polygonal valide n’a été trouvé dans le fichier.",
    );
  const ring = raw
    .filter(assertCoordinate)
    .map(([lng, lat]) => [Number(lng), Number(lat)] as LngLat);
  if (ring.length < 3)
    throw new Error(
      "Le contour doit contenir au moins trois coordonnées valides.",
    );
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1])
    ring.push([...first] as LngLat);
  return ring;
}

function ringArea(ring: LngLat[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(sum / 2);
}

function largestRing(rings: LngLat[][]): LngLat[] {
  if (rings.length === 0)
    throw new Error(
      "Aucun polygone exploitable n’a été trouvé dans le fichier.",
    );
  return rings.reduce((largest, candidate) =>
    ringArea(candidate) > ringArea(largest) ? candidate : largest,
  );
}

type GeoJsonGeometry = { type?: string; coordinates?: unknown };
type GeoJsonFeature = { type?: string; geometry?: GeoJsonGeometry | null };
type GeoJsonDocument = GeoJsonGeometry & {
  features?: GeoJsonFeature[];
  geometry?: GeoJsonGeometry | null;
};

function parseGeoJson(text: string): ParsedParcelBoundary {
  const value = JSON.parse(text) as GeoJsonDocument;
  const geometries: GeoJsonGeometry[] = [];
  if (value?.type === "FeatureCollection") {
    for (const feature of value.features ?? [])
      if (feature?.geometry) geometries.push(feature.geometry);
  } else if (value?.type === "Feature" && value.geometry)
    geometries.push(value.geometry);
  else geometries.push(value);

  const rings: LngLat[][] = [];
  for (const geometry of geometries) {
    if (geometry?.type === "Polygon" && Array.isArray(geometry.coordinates))
      rings.push(normalizeRing(geometry.coordinates[0]));
    if (geometry?.type === "MultiPolygon") {
      for (const polygon of Array.isArray(geometry.coordinates)
        ? geometry.coordinates
        : [])
        rings.push(
          normalizeRing(Array.isArray(polygon) ? polygon[0] : undefined),
        );
    }
  }
  return { format: "GeoJSON", coordinates: largestRing(rings) };
}

function parseKml(text: string): ParsedParcelBoundary {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror"))
    throw new Error("Le fichier KML n’est pas valide.");
  const rings: LngLat[][] = [];
  for (const node of Array.from(
    doc.querySelectorAll("Polygon outerBoundaryIs LinearRing coordinates"),
  )) {
    const coordinates = (node.textContent ?? "")
      .trim()
      .split(/\s+/)
      .map((token) => token.split(","))
      .filter((parts) => parts.length >= 2)
      .map((parts) => [Number(parts[0]), Number(parts[1])] as LngLat)
      .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
    if (coordinates.length >= 3) rings.push(normalizeRing(coordinates));
  }
  return { format: "KML", coordinates: largestRing(rings) };
}

function parseShapefile(buffer: ArrayBuffer): ParsedParcelBoundary {
  const view = new DataView(buffer);
  if (view.byteLength < 100 || view.getInt32(0, false) !== 9994)
    throw new Error("Le fichier .shp n’est pas un Shapefile valide.");
  const headerType = view.getInt32(32, true);
  if (![5, 15, 25].includes(headerType))
    throw new Error(
      "Seuls les Shapefiles de type Polygon sont pris en charge.",
    );

  const rings: LngLat[][] = [];
  let offset = 100;
  while (offset + 8 <= view.byteLength) {
    const contentBytes = view.getInt32(offset + 4, false) * 2;
    const contentStart = offset + 8;
    const contentEnd = contentStart + contentBytes;
    if (contentBytes <= 0 || contentEnd > view.byteLength) break;
    const shapeType = view.getInt32(contentStart, true);
    if ([5, 15, 25].includes(shapeType) && contentBytes >= 48) {
      const numParts = view.getInt32(contentStart + 36, true);
      const numPoints = view.getInt32(contentStart + 40, true);
      const partsStart = contentStart + 44;
      const pointsStart = partsStart + numParts * 4;
      if (
        numParts > 0 &&
        numPoints >= 3 &&
        pointsStart + numPoints * 16 <= contentEnd
      ) {
        const starts = Array.from({ length: numParts }, (_, index) =>
          view.getInt32(partsStart + index * 4, true),
        );
        for (let part = 0; part < numParts; part += 1) {
          const start = starts[part];
          const end = part + 1 < numParts ? starts[part + 1] : numPoints;
          const coordinates: LngLat[] = [];
          for (let point = start; point < end; point += 1) {
            const pointOffset = pointsStart + point * 16;
            const lng = view.getFloat64(pointOffset, true);
            const lat = view.getFloat64(pointOffset + 8, true);
            if (Number.isFinite(lng) && Number.isFinite(lat))
              coordinates.push([lng, lat]);
          }
          if (coordinates.length >= 3) rings.push(normalizeRing(coordinates));
        }
      }
    }
    offset = contentEnd;
  }
  return { format: "Shapefile", coordinates: largestRing(rings) };
}

export async function parseParcelBoundaryFile(
  file: File,
): Promise<ParsedParcelBoundary> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "geojson" || extension === "json")
    return parseGeoJson(await file.text());
  if (extension === "kml") return parseKml(await file.text());
  if (extension === "shp") return parseShapefile(await file.arrayBuffer());
  throw new Error(
    "Format non pris en charge. Utilisez un fichier .geojson, .json, .kml ou .shp.",
  );
}
