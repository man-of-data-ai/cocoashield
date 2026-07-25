"use client";

/**
 * Dashboard cartographique : colonne gauche (upload + identification),
 * colonne droite (carte Leaflet). Cette page orchestre les hooks et
 * transmet leur état aux composants de présentation — elle ne contient
 * elle-même aucune logique métier ou réseau directe.
 */

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";

import ParcelInfoPanel from "@/components/map/ParcelInfoPanel";
import UploadPanel from "@/components/upload/UploadPanel";
import { useAuth } from "@/context/AuthContext";
import { useParcelIdentification } from "@/hooks/useParcelIdentification";
import { useParcelMetrics } from "@/hooks/useParcelMetrics";

// La carte Leaflet dépend du DOM (window) : chargement dynamique sans SSR.
const ParcelMap = dynamic(() => import("@/components/map/ParcelMap"), {
  ssr: false,
});

export default function MapPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [image, setImage] = useState<File | null>(null);
  const { parcel, isLoading, error, identify, reset } =
    useParcelIdentification();
  const metrics = useParcelMetrics(parcel);

  function handleImageChange(file: File | null) {
    setImage(file);
    reset();
  }

  function handleLocateParcel() {
    if (!image) {
      return;
    }
    void identify(image);
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Cartographie des parcelles
            </h1>
          </div>

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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <aside className="lg:col-span-4 xl:col-span-3">
            <UploadPanel
              image={image}
              setImage={handleImageChange}
              onLocate={handleLocateParcel}
              isLoading={isLoading}
              error={error}
            />
          </aside>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-8 xl:col-span-9">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-900">
                Localisation de la parcelle
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Le contour apparaît après identification de l&rsquo;image.
              </p>
            </div>

            <div className="h-[500px]">
              <ParcelMap parcel={parcel} />
            </div>

            {parcel && metrics && (
              <ParcelInfoPanel parcel={parcel} metrics={metrics} />
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
