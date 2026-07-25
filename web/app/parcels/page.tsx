"use client";

/**
 * Liste des parcelles de l'utilisateur connecté, avec création d'une
 * nouvelle parcelle en dessinant son contour sur une carte Leaflet.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import CreateParcelDialog from "@/components/parcels/CreateParcelDialog";
import ParcelList from "@/components/parcels/ParcelList";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api-client";
import { parcelService } from "@/services/parcel-service";
import type { Parcel } from "@/types/parcel";

export default function ParcelsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    parcelService
      .listParcels()
      .then((data) => {
        if (isMounted) {
          setParcels(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Impossible de charger les parcelles."
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
  }, []);

  function handleCreated(parcel: Parcel) {
    setParcels((current) => [parcel, ...current]);
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <h1 className="text-2xl font-bold text-slate-900">Mes parcelles</h1>

          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-slate-500 sm:inline">
                {user.name}
              </span>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {parcels.length} parcelle{parcels.length > 1 ? "s" : ""}
          </p>

          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            + Nouvelle parcelle
          </button>
        </div>

        {error && (
          <div className="mb-6">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner label="Chargement des parcelles..." />
          </div>
        ) : (
          <ParcelList parcels={parcels} />
        )}
      </section>

      <CreateParcelDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onCreated={handleCreated}
      />
    </main>
  );
}
