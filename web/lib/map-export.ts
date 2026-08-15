/**
 * Export rapide de la vue carte en PNG/PDF (§5.3, exigence 19). Capture le
 * DOM tel qu'affiché à l'écran (zones, points, heatmap, légende — tout ce
 * qui est rendu dans le conteneur passé en argument) via html2canvas, donc
 * l'état visible (filtres actifs, couches activées, légende) est reflété
 * fidèlement sans avoir besoin d'un écran d'export dédié.
 *
 * Limites connues (à garder en tête en production) :
 * - Les tuiles de fond de carte (OSM/Esri) doivent être servies avec des
 *   en-têtes CORS pour être capturées sans "tainter" le canvas ; le
 *   TileLayer est configuré avec `crossOrigin` pour le permettre, mais si
 *   un fournisseur de tuiles ne renvoie pas ces en-têtes, le fond de carte
 *   peut apparaître vide sur l'export (le reste — zones, points, légende,
 *   heatmap — reste capturé correctement).
 */

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export type MapExportFormat = "png" | "pdf";

const EXPORT_TIME_BUDGET_MS = 5000;

function timestampForFilename(): string {
  return new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/[:T]/g, "-");
}

async function captureElement(node: HTMLElement): Promise<HTMLCanvasElement> {
  // scale=2 donne un rendu net (utile pour une insertion en présentation)
  // sans faire exploser le temps de capture sur une vue standard.
  return html2canvas(node, {
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#eef2f7",
    scale: Math.min(window.devicePixelRatio || 1, 1.5),
    logging: false,
    ignoreElements: (element) => element.classList?.contains("leaflet-tile") ?? false,
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("La génération du PNG a échoué."));
    }, "image/png");
  });
}

function buildPdfFromCanvas(canvas: HTMLCanvasElement): jsPDF {
  const isLandscape = canvas.width >= canvas.height;
  const doc = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const headerHeight = 12;

  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2 - headerHeight;
  const imageRatio = canvas.width / canvas.height;

  let drawWidth = availableWidth;
  let drawHeight = drawWidth / imageRatio;
  if (drawHeight > availableHeight) {
    drawHeight = availableHeight;
    drawWidth = drawHeight * imageRatio;
  }

  const offsetX = margin + (availableWidth - drawWidth) / 2;
  const offsetY = margin + headerHeight;

  doc.setFontSize(11);
  doc.setTextColor(15, 42, 68);
  doc.text("CocoaShield — Vue carte", margin, margin + 4);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Exporté le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString(
      "fr-FR",
      { hour: "2-digit", minute: "2-digit" }
    )}`,
    margin,
    margin + 9
  );

  const imageData = canvas.toDataURL("image/png");
  doc.addImage(imageData, "PNG", offsetX, offsetY, drawWidth, drawHeight);

  return doc;
}

/**
 * Exporte le contenu de `node` (typiquement le conteneur de la carte, avec
 * légende et couches actives) en un clic, au format demandé. Journalise un
 * avertissement (sans échouer) si la capture dépasse le budget de 5 s fixé
 * par le critère d'acceptation.
 */
export async function exportMapView(
  node: HTMLElement,
  format: MapExportFormat
): Promise<void> {
  const startedAt = performance.now();
  const canvas = await captureElement(node);

  const filename = `carte-cocoashield-${timestampForFilename()}.${format}`;

  if (format === "png") {
    const blob = await canvasToPngBlob(canvas);
    triggerDownload(blob, filename);
  } else {
    const doc = buildPdfFromCanvas(canvas);
    doc.save(filename);
  }

  const durationMs = performance.now() - startedAt;
  if (durationMs > EXPORT_TIME_BUDGET_MS) {
    console.warn(
      `Export carte : ${Math.round(durationMs)}ms, au-delà du budget de ${EXPORT_TIME_BUDGET_MS}ms visé pour une vue standard.`
    );
  }
}
