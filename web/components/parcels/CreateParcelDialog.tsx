"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { FileCheck2, FileUp, RefreshCcw, Trash2 } from "lucide-react";

import Alert from "@/components/ui/Alert";
import Dialog from "@/components/ui/Dialog";
import Spinner from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api-client";
import { computeParcelMetrics, formatArea } from "@/lib/geo";
import {
  parseParcelBoundaryFile,
  type LngLat,
  type ParsedParcelBoundary,
} from "@/lib/parcel-file-parser";
import { parcelService } from "@/services/parcel-service";
import type { Parcel } from "@/types/parcel";

const ParcelBoundaryMap = dynamic(
  () => import("@/components/parcels/ParcelBoundaryMap"),
  { ssr: false },
);

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (parcel: Parcel) => void;
};

export default function CreateParcelDialog({
  open,
  onClose,
  onCreated,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedParcelBoundary | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metrics = useMemo(
    () =>
      parsed
        ? computeParcelMetrics({
            type: "Polygon",
            coordinates: [parsed.coordinates],
          })
        : null,
    [parsed],
  );

  function reset() {
    setName("");
    setFile(null);
    setParsed(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }
  function close() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function selectFile(next: File | null) {
    if (!next) return;
    setChecking(true);
    setError(null);
    setFile(next);
    setParsed(null);
    try {
      setParsed(await parseParcelBoundaryFile(next));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de vérifier ce fichier.",
      );
    } finally {
      setChecking(false);
    }
  }

  function removeFile() {
    setFile(null);
    setParsed(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError("Le nom de la parcelle doit contenir au moins 2 caractères.");
      return;
    }
    if (!parsed) {
      setError(
        "Importez et vérifiez un fichier de délimitation avant de créer la parcelle.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const parcel = await parcelService.createParcel({
        name: name.trim(),
        coordinates: parsed.coordinates as LngLat[],
      });
      onCreated(parcel);
      reset();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Impossible de créer la parcelle.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Nouvelle parcelle"
      maxWidthClassName="max-w-3xl"
    >
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label
            htmlFor="parcel-name"
            className="block text-sm font-semibold text-slate-700"
          >
            Nom de la parcelle
          </label>
          <input
            id="parcel-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Ex. Plantation Nord"
            className="mt-1.5 h-11 w-full rounded-2xl border border-[#DEE6DA] bg-white px-4 text-sm outline-none focus:border-[#94B37E] focus:ring-2 focus:ring-[#94B37E]/15"
          />
        </div>

        {!file ? (
          <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-[#BFD1B5] bg-[#FBFDF9] px-6 py-8 text-center transition hover:border-[#7FA064] hover:bg-[#F7FAF4]">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#668A4C] shadow-sm">
              <FileUp className="h-6 w-6" />
            </span>
            <span className="mt-3 text-sm font-bold text-slate-800">
              Importer la délimitation
            </span>
            <span className="mt-1 max-w-md text-xs leading-5 text-slate-500">
              Sélectionnez un fichier GeoJSON, KML ou Shapefile Polygon (.shp).
              La géométrie est vérifiée localement avant validation.
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".geojson,.json,.kml,.shp,application/geo+json,application/json,application/vnd.google-earth.kml+xml"
              className="hidden"
              onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
            />
          </label>
        ) : (
          <div className="rounded-3xl border border-[#E1E8DD] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EEF5EA] text-[#5F8740]">
                  <FileCheck2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024).toLocaleString("fr-FR", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    Ko{parsed ? ` · ${parsed.format}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Remplacer
                </button>
                <button
                  type="button"
                  onClick={removeFile}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer
                </button>
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".geojson,.json,.kml,.shp"
              className="hidden"
              onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
            />
            {checking && (
              <div className="mt-4">
                <Spinner label="Vérification de la géométrie..." />
              </div>
            )}
            {parsed && metrics && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl bg-[#F7F9F5] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Format
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {parsed.format}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F7F9F5] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Sommets
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {parsed.coordinates.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F7F9F5] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Surface
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {formatArea(metrics.areaSquareMeters)}
                    </p>
                  </div>
                </div>
                <ParcelBoundaryMap coordinates={parsed.coordinates} readOnly />
              </div>
            )}
          </div>
        )}
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting || checking || !parsed}
            className="rounded-2xl bg-[#244B32] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#356A46] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Spinner label="Création..." /> : "Valider l’import"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
