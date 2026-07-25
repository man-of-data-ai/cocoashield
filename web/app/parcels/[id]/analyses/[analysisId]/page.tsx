"use client";

/**
 * Détail d'une analyse : statut/résultat, notes éditables, carte des images
 * géolocalisées (clic pour afficher le détail d'une image) et liste des
 * images sans position GPS.
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import ImageDetailPanel from "@/components/analyses/ImageDetailPanel";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import StatusBadge from "@/components/ui/StatusBadge";
import { ApiError } from "@/lib/api-client";
import { analysisService } from "@/services/analysis-service";
import type { Analysis } from "@/types/parcel";

const AnalysisImageMap = dynamic(
  () => import("@/components/analyses/AnalysisImageMap"),
  { ssr: false }
);

export default function AnalysisDetailPage() {
  const params = useParams<{ id: string; analysisId: string }>();

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  useEffect(() => {
    let isMounted = true;

    analysisService
      .getAnalysis(params.analysisId)
      .then((data) => {
        if (isMounted) {
          setAnalysis(data);
          setNotes(data.notes ?? "");
          setSelectedImageId(data.images[0]?.id ?? null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Impossible de charger l'analyse."
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [params.analysisId]);

  async function handleSaveNotes() {
    setIsSavingNotes(true);
    try {
      const updated = await analysisService.updateNotes(params.analysisId, notes);
      setAnalysis(updated);
    } finally {
      setIsSavingNotes(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <Spinner label="Chargement de l'analyse..." />
      </main>
    );
  }

  if (error || !analysis) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <Alert variant="error">{error ?? "Analyse introuvable."}</Alert>
      </main>
    );
  }

  const selectedImage =
    analysis.images.find((image) => image.id === selectedImageId) ?? null;
  const imagesWithoutGps = analysis.images.filter(
    (image) => image.latitude === null || image.longitude === null
  );

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <Link
            href={`/parcels/${params.id}`}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← {analysis.parcel?.name ?? "Retour à la parcelle"}
          </Link>

          <div className="mt-2 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">
              Analyse du{" "}
              {new Date(analysis.createdAt).toLocaleDateString("fr-FR", {
                dateStyle: "medium",
              })}
            </h1>
            {analysis.result && <StatusBadge status={analysis.result} />}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
            <div className="h-[420px]">
              {analysis.parcel && (
                <AnalysisImageMap
                  boundary={analysis.parcel.boundary}
                  images={analysis.images}
                  selectedImageId={selectedImageId}
                  onSelect={setSelectedImageId}
                />
              )}
            </div>
          </div>

          <div className="space-y-4">
            {selectedImage && <ImageDetailPanel image={selectedImage} />}

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-slate-700"
              >
                Notes
              </label>
              <textarea
                id="notes"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Ajouter une note sur cette analyse..."
              />
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSavingNotes ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>

        {imagesWithoutGps.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">
              Images sans position GPS ({imagesWithoutGps.length})
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {imagesWithoutGps.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedImageId(image.id)}
                  className={`overflow-hidden rounded-xl border text-left transition ${
                    selectedImageId === image.id
                      ? "border-blue-400 ring-2 ring-blue-100"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- image servie par le backend */}
                  <img
                    src={analysisService.imageFileUrl(image.id)}
                    alt="Photo de la parcelle"
                    className="h-24 w-full object-cover"
                  />
                  {image.result && (
                    <div className="p-2">
                      <StatusBadge status={image.result} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
