"use client";

import { useState } from "react";
import { FileImage, FileText, Loader2 } from "lucide-react";

import {
  exportMapView,
  type MapExportContext,
  type MapExportData,
  type MapExportFormat,
} from "@/lib/map-export";

type MapExportButtonProps = {
  data: MapExportData;
  context?: MapExportContext;
};

export default function MapExportButton({
  data,
  context,
}: MapExportButtonProps) {
  const [pending, setPending] = useState<MapExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(format: MapExportFormat) {
    if (pending) return;
    if (data.parcels.length === 0) {
      setError("Aucune donnée affichée à exporter.");
      return;
    }
    setPending(format);
    setError(null);
    try {
      await exportMapView(data, format, context);
    } catch (cause) {
      console.error("Export carte impossible", cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Le fichier n’a pas pu être généré.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {error && (
        <span className="max-w-56 text-right text-[11px] font-medium text-red-600">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={() => handleExport("png")}
        disabled={pending !== null}
        className="flex items-center gap-1.5 rounded-full bg-[#344E41] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#3A5A40] disabled:opacity-50"
        title="Télécharger la cartographie affichée au format PNG"
      >
        {pending === "png" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileImage className="h-3.5 w-3.5" />
        )}
        Export PNG
      </button>
      <button
        type="button"
        onClick={() => handleExport("pdf")}
        disabled={pending !== null}
        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
        title="Télécharger la cartographie affichée au format PDF"
      >
        {pending === "pdf" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileText className="h-3.5 w-3.5" />
        )}
        Export PDF
      </button>
    </div>
  );
}
