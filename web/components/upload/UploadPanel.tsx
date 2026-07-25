"use client";

/**
 * Colonne gauche du dashboard : upload d'image, aperçu, déclenchement de
 * l'identification. Composant de présentation pur — toute la logique
 * (appel API, calcul de métriques) vit dans les hooks passés en props.
 */

import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { useImagePreview } from "@/hooks/useImagePreview";

type UploadPanelProps = {
  image: File | null;
  setImage: (file: File | null) => void;
  onLocate: () => void;
  isLoading: boolean;
  error: string | null;
};

export default function UploadPanel({
  image,
  setImage,
  onLocate,
  isLoading,
  error,
}: UploadPanelProps) {
  const previewUrl = useImagePreview(image);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Charger une feuille
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Sélectionnez une image au format JPG, PNG ou WebP.
        </p>
      </div>

      <label
        htmlFor="parcel-image"
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center transition hover:border-blue-500 hover:bg-blue-50"
      >
        <span className="text-base font-medium text-slate-700">
          Choisir une image
        </span>

        <span className="mt-1 text-sm text-slate-500">
          Cliquez pour parcourir vos fichiers
        </span>
      </label>

      <input
        id="parcel-image"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          setImage(file);
        }}
      />

      {image && (
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- aperçu local d'un fichier utilisateur, pas d'optimisation next/image nécessaire
            <img
              src={previewUrl}
              alt="Aperçu de l'image sélectionnée"
              className="h-40 w-full object-cover"
            />
          )}

          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Image sélectionnée
            </p>

            <p className="mt-1 break-all font-medium text-slate-800">
              {image.name}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {(image.size / 1024).toFixed(1)} Ko
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-5">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <button
        type="button"
        onClick={onLocate}
        disabled={!image || isLoading}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isLoading ? (
          <Spinner label="Identification en cours..." />
        ) : (
          "Localiser la parcelle"
        )}
      </button>
    </div>
  );
}
