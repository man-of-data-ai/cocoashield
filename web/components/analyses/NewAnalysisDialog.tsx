"use client";

/**
 * Démarre une nouvelle analyse pour une parcelle : image unique, plusieurs
 * images (ou un dossier entier via l'attribut non-standard mais largement
 * supporté `webkitdirectory`), ou un fichier d'archive (.rar, .zip...) à
 * traiter plus tard (aucune classification immédiate).
 */

import { useState } from "react";

import Alert from "@/components/ui/Alert";
import Dialog from "@/components/ui/Dialog";
import Spinner from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api-client";
import { analysisService } from "@/services/analysis-service";
import type { Analysis, PendingImport } from "@/types/parcel";

type NewAnalysisDialogProps = {
  open: boolean;
  onClose: () => void;
  parcelId: string;
  onAnalysisCreated: (analysis: Analysis) => void;
  onImportCreated: (pendingImport: PendingImport) => void;
};

type FolderInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  webkitdirectory?: string;
};

export default function NewAnalysisDialog({
  open,
  onClose,
  parcelId,
  onAnalysisCreated,
  onImportCreated,
}: NewAnalysisDialogProps) {
  const [images, setImages] = useState<File[]>([]);
  const [archive, setArchive] = useState<File | null>(null);
  const [isSubmittingImages, setIsSubmittingImages] = useState(false);
  const [isSubmittingArchive, setIsSubmittingArchive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setImages([]);
    setArchive(null);
    setError(null);
    onClose();
  }

  async function handleSubmitImages() {
    if (images.length === 0) {
      setError("Sélectionnez au moins une image.");
      return;
    }

    setIsSubmittingImages(true);
    setError(null);

    try {
      const analysis = await analysisService.createAnalysis(parcelId, images);
      onAnalysisCreated(analysis);
      handleClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Impossible de démarrer l'analyse. Veuillez réessayer."
      );
    } finally {
      setIsSubmittingImages(false);
    }
  }

  async function handleSubmitArchive() {
    if (!archive) {
      setError("Sélectionnez un fichier à importer.");
      return;
    }

    setIsSubmittingArchive(true);
    setError(null);

    try {
      const pendingImport = await analysisService.createImport(parcelId, archive);
      onImportCreated(pendingImport);
      handleClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Impossible d'importer le fichier. Veuillez réessayer."
      );
    } finally {
      setIsSubmittingArchive(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Nouvelle analyse">
      <div className="space-y-8">
        <section>
          <h3 className="text-sm font-semibold text-slate-900">
            Image(s) ou dossier
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Chaque image sera analysée par le serveur. Si une seule image est
            infectée, l&rsquo;analyse entière est considérée infectée.
          </p>

          <div className="mt-3 space-y-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Une ou plusieurs images
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) =>
                  setImages(Array.from(event.target.files ?? []))
                }
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Ou un dossier entier
              </label>
              <input
                type="file"
                {...({ webkitdirectory: "" } as FolderInputProps)}
                multiple
                onChange={(event) =>
                  setImages(Array.from(event.target.files ?? []))
                }
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          {images.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              {images.length} fichier{images.length > 1 ? "s" : ""} sélectionné
              {images.length > 1 ? "s" : ""}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmitImages}
            disabled={isSubmittingImages}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmittingImages ? (
              <Spinner label="Envoi en cours..." />
            ) : (
              "Démarrer l'analyse"
            )}
          </button>
        </section>

        <section className="border-t border-slate-200 pt-6">
          <h3 className="text-sm font-semibold text-slate-900">
            Archive (.rar, .zip...)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Stockée telle quelle, à traiter plus tard — aucune classification
            immédiate.
          </p>

          <input
            type="file"
            accept=".rar,.zip,.7z"
            onChange={(event) => setArchive(event.target.files?.[0] ?? null)}
            className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />

          <button
            type="button"
            onClick={handleSubmitArchive}
            disabled={isSubmittingArchive}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmittingArchive ? (
              <Spinner label="Import en cours..." />
            ) : (
              "Importer pour plus tard"
            )}
          </button>
        </section>

        {error && <Alert variant="error">{error}</Alert>}
      </div>
    </Dialog>
  );
}
