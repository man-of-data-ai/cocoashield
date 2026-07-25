"use client";

/**
 * Détail d'une parcelle : statut courant, métriques du contour, historique
 * des analyses, et démarrage d'une nouvelle analyse (image/dossier/archive).
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import AnalysisList from "@/components/analyses/AnalysisList";
import NewAnalysisDialog from "@/components/analyses/NewAnalysisDialog";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import StatusBadge from "@/components/ui/StatusBadge";
import { useParcelMetrics } from "@/hooks/useParcelMetrics";
import { ApiError } from "@/lib/api-client";
import { formatArea, formatDistance } from "@/lib/geo";
import { parcelService } from "@/services/parcel-service";
import type { Analysis, Parcel, PendingImport } from "@/types/parcel";

export default function ParcelDetailPage() {
  const params = useParams<{ id: string }>();
  const parcelId = params.id;

  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const metrics = useParcelMetrics(parcel);

  useEffect(() => {
    let isMounted = true;

    parcelService
      .getParcel(parcelId)
      .then((data) => {
        if (isMounted) {
          setParcel(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Impossible de charger la parcelle."
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
  }, [parcelId]);

  function handleAnalysisCreated(analysis: Analysis) {
    setParcel((current) =>
      current
        ? {
            ...current,
            status: "analyzing",
            analyses: [analysis, ...(current.analyses ?? [])],
          }
        : current
    );
  }

  function handleImportCreated(pendingImport: PendingImport) {
    setParcel((current) =>
      current
        ? { ...current, imports: [pendingImport, ...(current.imports ?? [])] }
        : current
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <Spinner label="Chargement de la parcelle..." />
      </main>
    );
  }

  if (error || !parcel) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <Alert variant="error">{error ?? "Parcelle introuvable."}</Alert>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <Link href="/parcels" className="text-sm text-slate-500 hover:text-slate-700">
            ← Mes parcelles
          </Link>

          <div className="mt-2 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">{parcel.name}</h1>
            <StatusBadge status={parcel.status} />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-8">
        {metrics && (
          <div className="mb-8 grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Surface
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatArea(metrics.areaSquareMeters)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Périmètre
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatDistance(metrics.perimeterMeters)}
              </p>
            </div>
          </div>
        )}

        {parcel.imports && parcel.imports.length > 0 && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-sm font-semibold text-amber-900">
              Imports en attente de traitement
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-amber-800">
              {parcel.imports.map((pendingImport) => (
                <li key={pendingImport.id}>{pendingImport.originalName}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Analyses</h2>

          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            + Nouvelle analyse
          </button>
        </div>

        <AnalysisList parcelId={parcel.id} analyses={parcel.analyses ?? []} />
      </section>

      <NewAnalysisDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        parcelId={parcel.id}
        onAnalysisCreated={handleAnalysisCreated}
        onImportCreated={handleImportCreated}
      />
    </main>
  );
}
