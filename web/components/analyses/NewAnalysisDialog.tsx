"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Camera, ImagePlus, Route, ScanSearch, X } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import ModernSelect from "@/components/ui/ModernSelect";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { analysisService } from "@/services/analysis-service";
import { configurationService } from "@/services/configuration-service";
import { missionService } from "@/services/mission-service";
import { ApiError } from "@/lib/api-client";
import type { Analysis, Mission } from "@/types/parcel";
import type { DroneProfile } from "@/types/configuration";

type Props = {
  open: boolean;
  onClose: () => void;
  parcelId: string;
  parcelName?: string;
  onAnalysisCreated: (analysis: Analysis) => void;
};
type Preview = { file: File; url: string };

export default function NewAnalysisDialog({
  open,
  onClose,
  parcelId,
  parcelName,
  onAnalysisCreated,
}: Props) {
  const [images, setImages] = useState<File[]>([]);
  const [missionMode, setMissionMode] = useState<"existing" | "new">(
    "existing",
  );
  const [missionId, setMissionId] = useState("");
  const [missionName, setMissionName] = useState("");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [profileId, setProfileId] = useState("");
  const [profiles, setProfiles] = useState<DroneProfile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.allSettled([
      configurationService.listDroneProfiles(true),
      missionService.listMissions(),
    ]).then(([profilesResult, missionsResult]) => {
      setProfiles(
        profilesResult.status === "fulfilled" ? profilesResult.value : [],
      );
      if (missionsResult.status === "fulfilled") {
        setMissions(missionsResult.value);
        if (missionsResult.value[0])
          setMissionId((value) => value || missionsResult.value[0].id);
        if (missionsResult.value.length === 0) setMissionMode("new");
      } else setMissions([]);
    });
  }, [open]);

  const previews = useMemo<Preview[]>(
    () => images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [images],
  );
  useEffect(
    () => () => previews.forEach((p) => URL.revokeObjectURL(p.url)),
    [previews],
  );

  function close() {
    setImages([]);
    setMissionName("");
    setProfileId("");
    setError(null);
    onClose();
  }
  function addFiles(files: FileList | null) {
    if (!files) return;
    setImages((current) => [
      ...current,
      ...Array.from(files).filter((f) => f.type.startsWith("image/")),
    ]);
  }
  function removeAt(index: number) {
    setImages((current) => current.filter((_, i) => i !== index));
  }

  async function submit() {
    if (images.length === 0) {
      setError("Ajoutez au moins une photo de feuille pour lancer l’analyse.");
      return;
    }
    if (missionMode === "existing" && !missionId) {
      setError(
        "Sélectionnez la mission correspondant à cette collecte terrain.",
      );
      return;
    }
    if (missionMode === "new" && !missionName.trim()) {
      setError("Donnez un nom à la mission de collecte.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const analysis = await analysisService.createAnalysis(parcelId, images, {
        missionId: missionMode === "existing" ? missionId : undefined,
        missionName: missionMode === "new" ? missionName : undefined,
        profileId,
      });
      onAnalysisCreated(analysis);
      close();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Impossible de lancer l’analyse.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={
        parcelName ? `Nouvelle analyse · ${parcelName}` : "Nouvelle analyse"
      }
    >
      <div className="space-y-6">
        <div className="rounded-2xl bg-[#F3F7F0] p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#5F8740] shadow-sm">
              <ScanSearch className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Parcelle → Mission → Analyse
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Cette analyse sera rattachée à la parcelle sélectionnée et à une
                mission de collecte. Les résultats alimenteront ensuite la carte
                et le rapport associé.
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="text-xs font-bold text-slate-600">
              Mission de collecte
            </label>
            <div className="flex rounded-xl bg-slate-100 p-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setMissionMode("existing")}
                disabled={missions.length === 0}
                className={`rounded-lg px-2.5 py-1.5 ${missionMode === "existing" ? "bg-white text-[#244B32] shadow-sm" : "text-slate-400"}`}
              >
                Existante
              </button>
              <button
                type="button"
                onClick={() => setMissionMode("new")}
                className={`rounded-lg px-2.5 py-1.5 ${missionMode === "new" ? "bg-white text-[#244B32] shadow-sm" : "text-slate-400"}`}
              >
                Nouvelle
              </button>
            </div>
          </div>
          {missionMode === "existing" ? (
            <ModernSelect
              value={missionId}
              onChange={setMissionId}
              searchable
              placeholder="Sélectionner une mission"
              options={missions.map((mission) => ({
                value: mission.id,
                label: mission.name,
                description: new Date(
                  mission.missionDate ?? mission.createdAt,
                ).toLocaleDateString("fr-FR"),
              }))}
            />
          ) : (
            <div className="relative">
              <Route className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={missionName}
                onChange={(e) => setMissionName(e.target.value)}
                placeholder="Ex. Tournée Soubré · Secteur Nord"
                className="h-11 w-full rounded-2xl border border-[#DDE6D9] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#9BBC89]"
              />
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">
            Profil de drone / détection
          </label>
          <ModernSelect
            value={profileId}
            onChange={setProfileId}
            options={[
              { value: "", label: "Détection standard" },
              ...profiles.map((p) => ({
                value: p.profileId,
                label: p.profileId,
                description: `${p.manufacturer} ${p.model}`,
              })),
            ]}
          />
        </div>

        <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-[#BFD1B5] bg-[#FBFDF9] px-5 py-6 text-center transition hover:border-[#7FA064] hover:bg-[#F7FAF4]">
          <ImagePlus className="h-7 w-7 text-[#668A4C]" />
          <span className="mt-2 text-sm font-bold text-slate-800">
            Ajouter les photos de l’analyse
          </span>
          <span className="mt-1 text-xs text-slate-400">
            Les coordonnées GPS présentes dans les fichiers seront conservées
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>
        {previews.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Aperçu
              </p>
              <span className="rounded-full bg-[#EDF5E8] px-2.5 py-1 text-[11px] font-bold text-[#56773F]">
                {previews.length} photo{previews.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {previews.map((preview, index) => (
                <div
                  key={`${preview.file.name}-${index}`}
                  className="group relative overflow-hidden rounded-2xl border border-[#E1E8DD] bg-white"
                >
                  <Image
                    src={preview.url}
                    alt={preview.file.name}
                    width={240}
                    height={112}
                    unoptimized
                    className="h-28 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <p className="truncate px-2.5 py-2 text-[10px] font-semibold text-slate-500">
                    {preview.file.name}
                  </p>
                </div>
              ))}
            </div>
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
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#244B32] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#356A46] disabled:opacity-60"
          >
            {submitting ? (
              <Spinner label="Analyse en cours..." />
            ) : (
              <>
                <Camera className="h-4 w-4" />
                Lancer l’analyse
              </>
            )}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
