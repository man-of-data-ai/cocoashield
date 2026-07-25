"use client";

/**
 * Formulaire de création de parcelle : nom + contour dessiné sur une carte
 * Leaflet (clic pour ajouter un sommet). Composant de présentation orchestré
 * par app/parcels/page.tsx, qui fournit `onCreated`.
 */

import dynamic from "next/dynamic";
import { useState, type FormEvent } from "react";

import Alert from "@/components/ui/Alert";
import Dialog from "@/components/ui/Dialog";
import Spinner from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api-client";
import { parcelService } from "@/services/parcel-service";
import type { Parcel } from "@/types/parcel";

const ParcelBoundaryMap = dynamic(
  () => import("@/components/parcels/ParcelBoundaryMap"),
  { ssr: false }
);

type LngLat = [number, number];

type CreateParcelDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (parcel: Parcel) => void;
};

export default function CreateParcelDialog({
  open,
  onClose,
  onCreated,
}: CreateParcelDialogProps) {
  const [name, setName] = useState("");
  const [coordinates, setCoordinates] = useState<LngLat[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setCoordinates([]);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (coordinates.length < 3) {
      setError("Dessinez au moins 3 points pour délimiter le champ.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const parcel = await parcelService.createParcel({ name, coordinates });
      onCreated(parcel);
      reset();
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Impossible de créer la parcelle. Veuillez réessayer.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Nouvelle parcelle">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="parcel-name"
            className="block text-sm font-medium text-slate-700"
          >
            Nom de la parcelle
          </label>
          <input
            id="parcel-name"
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Champ Nord"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            Contour du champ
          </p>
          <ParcelBoundaryMap coordinates={coordinates} onChange={setCoordinates} />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? <Spinner label="Création..." /> : "Créer la parcelle"}
        </button>
      </form>
    </Dialog>
  );
}
