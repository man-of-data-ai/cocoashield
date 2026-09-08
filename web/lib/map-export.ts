import { jsPDF } from "jspdf";
import { drawCocoaShieldFooter, drawCocoaShieldHeader } from "@/lib/pdf-brand";
import type { RiskZone } from "@/lib/risk-zones";
import type { ParcelBoundary } from "@/types/parcel";

export type MapExportFormat = "png" | "pdf";

export type MapExportContext = {
  title?: string;
  subtitle?: string;
  details?: string[];
  captureElementId?: string;
};

export type MapExportData = {
  parcels: Array<{ id: string; name: string; boundary: ParcelBoundary }>;
  riskZones: RiskZone[];
};

const COLORS = {
  faible: "#10b981",
  modere: "#facc15",
  eleve: "#f97316",
  critique: "#dc2626",
};

function timestampForFilename(): string {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
}

function allCoordinates(data: MapExportData): Array<[number, number]> {
  const coordinates: Array<[number, number]> = [];
  for (const parcel of data.parcels) {
    for (const ring of parcel.boundary.coordinates) {
      for (const point of ring) coordinates.push([point[0], point[1]]);
    }
  }
  for (const zone of data.riskZones) {
    if (zone.geometry) {
      for (const ring of zone.geometry.coordinates) {
        for (const point of ring) coordinates.push([point[0], point[1]]);
      }
    } else {
      coordinates.push([zone.longitude, zone.latitude]);
    }
  }
  return coordinates;
}

function renderDataCanvas(data: MapExportData, context?: MapExportContext): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Le moteur graphique du navigateur n’est pas disponible.");

  ctx.fillStyle = "#eef3e9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const coords = allCoordinates(data);
  if (coords.length === 0) throw new Error("Aucune géométrie cartographique n’est disponible pour l’export.");

  const minLng = Math.min(...coords.map(([lng]) => lng));
  const maxLng = Math.max(...coords.map(([lng]) => lng));
  const minLat = Math.min(...coords.map(([, lat]) => lat));
  const maxLat = Math.max(...coords.map(([, lat]) => lat));
  const lngSpan = Math.max(maxLng - minLng, 0.0001);
  const latSpan = Math.max(maxLat - minLat, 0.0001);
  const headerHeight = 120;
  const padding = 70;
  const legendWidth = 220;
  const plotWidth = canvas.width - padding * 2 - legendWidth;
  const plotHeight = canvas.height - headerHeight - padding * 2;
  const scale = Math.min(plotWidth / lngSpan, plotHeight / latSpan);
  const usedWidth = lngSpan * scale;
  const usedHeight = latSpan * scale;
  const offsetX = padding + (plotWidth - usedWidth) / 2;
  const offsetY = headerHeight + padding + (plotHeight - usedHeight) / 2;

  const project = (lng: number, lat: number): [number, number] => [
    offsetX + (lng - minLng) * scale,
    offsetY + (maxLat - lat) * scale,
  ];

  ctx.fillStyle = "#203b2a";
  ctx.font = "700 32px Arial, sans-serif";
  ctx.fillText(context?.title ?? "Cocoashield — Cartographie phytosanitaire", padding, 48);
  ctx.fillStyle = "#64748b";
  ctx.font = "20px Arial, sans-serif";
  if (context?.subtitle) ctx.fillText(context.subtitle, padding, 82);
  if (context?.details?.[0]) {
    ctx.textAlign = "right";
    ctx.font = "17px Arial, sans-serif";
    ctx.fillText(context.details.slice(0, 2).join("  ·  "), canvas.width - padding, 50);
    ctx.textAlign = "left";
  }

  ctx.fillStyle = "#e7ede2";
  ctx.fillRect(offsetX - 24, offsetY - 24, usedWidth + 48, usedHeight + 48);

  for (const parcel of data.parcels) {
    const ring = parcel.boundary.coordinates[0] ?? [];
    if (ring.length < 3) continue;
    ctx.beginPath();
    ring.forEach(([lng, lat], index) => {
      const [x, y] = project(lng, lat);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fill();
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 3;
    ctx.stroke();

    const points = ring.map(([lng, lat]) => project(lng, lat));
    const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length;
    const cy = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
    ctx.font = "600 16px Arial, sans-serif";
    ctx.fillStyle = "#334155";
    ctx.textAlign = "center";
    ctx.fillText(parcel.name, cx, cy);
    ctx.textAlign = "left";
  }

  for (const zone of data.riskZones) {
    const color = COLORS[zone.level];
    if (zone.geometry) {
      const ring = zone.geometry.coordinates[0] ?? [];
      if (ring.length < 3) continue;
      ctx.beginPath();
      ring.forEach(([lng, lat], index) => {
        const [x, y] = project(lng, lat);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      const [x, y] = project(zone.longitude, zone.latitude);
      const radius = 24 + Math.max(0, Math.min(1, zone.severity)) * 38;
      const gradient = ctx.createRadialGradient(x, y, 1, x, y, radius);
      gradient.addColorStop(0, `${color}dd`);
      gradient.addColorStop(0.45, `${color}88`);
      gradient.addColorStop(1, `${color}00`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const legendX = canvas.width - legendWidth + 22;
  let legendY = headerHeight + 42;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#dbe5d5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(legendX - 18, legendY - 28, legendWidth - 36, 236, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#203b2a";
  ctx.font = "700 18px Arial, sans-serif";
  ctx.fillText("Sévérité", legendX, legendY);
  legendY += 32;
  for (const [level, label] of [["faible", "Faible"], ["modere", "Modérée"], ["eleve", "Élevée"], ["critique", "Critique"]] as const) {
    ctx.fillStyle = COLORS[level];
    ctx.beginPath();
    ctx.arc(legendX + 9, legendY - 6, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#475569";
    ctx.font = "16px Arial, sans-serif";
    ctx.fillText(label, legendX + 28, legendY);
    legendY += 36;
  }
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(legendX, legendY + 4);
  ctx.lineTo(legendX + 25, legendY + 4);
  ctx.stroke();
  ctx.fillStyle = "#475569";
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("Parcelle", legendX + 36, legendY + 10);

  ctx.fillStyle = "#64748b";
  ctx.font = "15px Arial, sans-serif";
  ctx.fillText(`Généré le ${new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`, padding, canvas.height - 26);
  ctx.textAlign = "right";
  ctx.fillText(`${data.parcels.length} parcelle${data.parcels.length > 1 ? "s" : ""} · ${data.riskZones.length} zone${data.riskZones.length > 1 ? "s" : ""} à risque`, canvas.width - padding, canvas.height - 26);
  ctx.textAlign = "left";

  return canvas;
}

function decorateCapturedMapCanvas(source: HTMLCanvasElement, context?: MapExportContext): HTMLCanvasElement {
  const headerHeight = 118;
  const footerHeight = 54;
  const padding = 34;
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height + headerHeight + footerHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Le moteur graphique du navigateur n’est pas disponible.");

  ctx.fillStyle = "#203B2A";
  ctx.fillRect(0, 0, canvas.width, headerHeight);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 34px Arial, sans-serif";
  ctx.fillText("Cocoashield", padding, 44);
  ctx.font = "700 23px Arial, sans-serif";
  ctx.fillText(context?.title ?? "Cartographie phytosanitaire", padding, 78);
  ctx.fillStyle = "#DCEAD7";
  ctx.font = "16px Arial, sans-serif";
  const subtitle = [context?.subtitle, context?.details?.slice(0, 2).join(" · ")].filter(Boolean).join(" · ");
  if (subtitle) ctx.fillText(subtitle, padding, 103);

  ctx.drawImage(source, 0, headerHeight);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, headerHeight + source.height, canvas.width, footerHeight);
  ctx.strokeStyle = "#E0E7DC";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, headerHeight + source.height + 1);
  ctx.lineTo(canvas.width - padding, headerHeight + source.height + 1);
  ctx.stroke();
  ctx.fillStyle = "#64748B";
  ctx.font = "14px Arial, sans-serif";
  ctx.fillText("Cocoashield — Cartographie phytosanitaire", padding, canvas.height - 18);
  ctx.textAlign = "right";
  ctx.fillText(`Généré le ${new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`, canvas.width - padding, canvas.height - 18);
  ctx.textAlign = "left";
  return canvas;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 0);
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("La génération du fichier PNG a échoué."));
    }, "image/png", 0.96);
  });
}

function buildPdfFromCanvas(canvas: HTMLCanvasElement, context?: MapExportContext): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const headerHeight = 34;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin - headerHeight - 16;
  const ratio = canvas.width / canvas.height;
  let drawWidth = availableWidth;
  let drawHeight = drawWidth / ratio;
  if (drawHeight > availableHeight) {
    drawHeight = availableHeight;
    drawWidth = drawHeight * ratio;
  }
  drawCocoaShieldHeader(doc, {
    title: context?.title ?? "Cartographie phytosanitaire",
    subtitle: context?.subtitle,
    context: context?.details?.slice(0, 2).join(" · "),
    height: 34,
    margin,
  });
  doc.addImage(canvas.toDataURL("image/png"), "PNG", margin + (availableWidth - drawWidth) / 2, headerHeight + 5, drawWidth, drawHeight, undefined, "FAST");
  drawCocoaShieldFooter(doc, "Cartographie phytosanitaire", 1, 1, margin);
  return doc;
}

async function imageReady(image: HTMLImageElement): Promise<void> {
  if (image.complete && image.naturalWidth > 0) return;
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    image.addEventListener("load", done, { once: true });
    image.addEventListener("error", done, { once: true });
    window.setTimeout(done, 2500);
  });
}

async function drawSvgLayer(ctx: CanvasRenderingContext2D, svg: SVGSVGElement, rootRect: DOMRect, scale: number): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const rect = svg.getBoundingClientRect();
  clone.setAttribute("width", String(rect.width));
  clone.setAttribute("height", String(rect.height));
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => undefined);
    ctx.drawImage(image, (rect.left - rootRect.left) * scale, (rect.top - rootRect.top) * scale, rect.width * scale, rect.height * scale);
  } finally { URL.revokeObjectURL(url); }
}

export async function captureMapCanvas(elementId: string): Promise<HTMLCanvasElement> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("La carte à exporter est introuvable.");
  const rect = element.getBoundingClientRect();
  const scale = Math.min(2, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.width * scale));
  canvas.height = Math.max(1, Math.round(rect.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Le moteur graphique du navigateur n’est pas disponible.");
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tiles = Array.from(element.querySelectorAll<HTMLImageElement>(".leaflet-tile-pane img.leaflet-tile"));
  await Promise.all(tiles.map(imageReady));
  for (const tile of tiles) {
    if (!tile.complete || !tile.naturalWidth) continue;
    const tileRect = tile.getBoundingClientRect();
    try { ctx.drawImage(tile, (tileRect.left - rect.left) * scale, (tileRect.top - rect.top) * scale, tileRect.width * scale, tileRect.height * scale); } catch { /* a failed external tile should not cancel the export */ }
  }

  for (const heat of Array.from(element.querySelectorAll<HTMLCanvasElement>(".leaflet-overlay-pane canvas"))) {
    const heatRect = heat.getBoundingClientRect();
    ctx.drawImage(heat, (heatRect.left - rect.left) * scale, (heatRect.top - rect.top) * scale, heatRect.width * scale, heatRect.height * scale);
  }
  for (const svg of Array.from(element.querySelectorAll<SVGSVGElement>(".leaflet-overlay-pane svg"))) await drawSvgLayer(ctx, svg, rect, scale);
  return canvas;
}
export async function exportMapView(data: MapExportData, format: MapExportFormat, context?: MapExportContext): Promise<void> {
  const canvas = context?.captureElementId
    ? await captureMapCanvas(context.captureElementId)
    : renderDataCanvas(data, context);
  const filename = `carte-cocoashield-${timestampForFilename()}.${format}`;
  if (format === "png") {
    const branded = context?.captureElementId ? decorateCapturedMapCanvas(canvas, context) : canvas;
    triggerDownload(await canvasToPngBlob(branded), filename);
    return;
  }
  buildPdfFromCanvas(canvas, context).save(filename);
}
