"use client";

import { useState, type RefObject } from "react";
import { FileImage, FileText, Loader2 } from "lucide-react";

import { exportMapView, type MapExportFormat } from "@/lib/map-export";

type MapExportButtonProps = {
  targetRef: RefObject<HTMLDivElement | null>;
  hasData: boolean;
};

/** Export immédiat de la carte visible, sans passer par l'écran Exports. */
export default function MapExportButton({ targetRef, hasData }: MapExportButtonProps) {
  const [pending, setPending] = useState<MapExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(format: MapExportFormat) {
    const node = targetRef.current;
    if (pending) return;
    if (!hasData) { setError("Aucune donnée affichée à exporter."); return; }
    if (!node) { setError("La carte n’est pas encore prête."); return; }

    setPending(format);
    setError(null);
    try {
      await exportMapView(node, format);
    } catch (cause) {
      console.error("Export carte impossible", cause);
      setError("Échec de l'export");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {error && <span className="text-[11px] font-medium text-red-600">{error}</span>}
      <button
        type="button"
        onClick={() => handleExport("png")}
        disabled={pending !== null}
        className="flex items-center gap-1.5 rounded-full bg-[#344E41] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#3A5A40] disabled:opacity-50"
        title="Exporter la vue actuellement visible en PNG"
      >
        {pending === "png" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileImage className="h-3.5 w-3.5" />}
        Export PNG
      </button>
      <button
        type="button"
        onClick={() => handleExport("pdf")}
        disabled={pending !== null}
        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
        title="Exporter la vue actuellement visible en PDF"
      >
        {pending === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
        Export PDF
      </button>
    </div>
  );
}
