"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import CreateParcelDialog from "@/components/parcels/CreateParcelDialog";
import ParcelsTable from "@/components/parcels/ParcelsTable";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api-client";
import { parcelService } from "@/services/parcel-service";
import type { Parcel } from "@/types/parcel";

export default function ParcelsPage() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let mounted = true;
    parcelService
      .listParcels()
      .then((d) => mounted && setParcels(d))
      .catch(
        (e) =>
          mounted &&
          setError(
            e instanceof ApiError
              ? e.message
              : "Impossible de charger les parcelles.",
          ),
      )
      .finally(() => mounted && setIsLoading(false));
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <AppShell title="Parcelles">
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
        <ParcelsTable parcels={parcels} onCreateClick={() => setOpen(true)} />
      )}
      <CreateParcelDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreated={(parcel) => setParcels((current) => [parcel, ...current])}
      />
    </AppShell>
  );
}
