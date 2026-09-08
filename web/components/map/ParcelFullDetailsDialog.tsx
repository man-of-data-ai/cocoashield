"use client";

import {
  AlertTriangle,
  Check,
  FileText,
  History,
  Images,
  MapPin,
  MessageSquareText,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Dialog from "@/components/ui/Dialog";
import SeverityBadge from "@/components/ui/SeverityBadge";
import Spinner from "@/components/ui/Spinner";
import { formatArea, formatDistance, computeParcelMetrics } from "@/lib/geo";
import { computeParcelSeverity } from "@/lib/severity";
import { analysisService } from "@/services/analysis-service";
import { parcelService } from "@/services/parcel-service";
import type { Analysis, GeolocationQuality, Parcel } from "@/types/parcel";

type ParcelFullDetailsDialogProps = {
  open: boolean;
  onClose: () => void;
  parcel: Parcel | null;
  isLoading?: boolean;
  loadError?: string | null;
  onParcelChange?: (parcel: Parcel) => void;
};

type TabId = "summary" | "history" | "images" | "verification" | "memos";
type VerificationState = "pending" | "verified" | "false_positive";

const GEOLOC_LABELS: Record<GeolocationQuality, string> = {
  rtk_fix: "RTK Fix",
  rtk_float: "RTK Float",
  gnss_seul: "GNSS seul",
  saisie_manuelle: "Saisie manuelle",
  precise: "GPS précis (historique)",
  approximate: "Approximative (historique)",
  none: "Inconnue",
};

const tabs: Array<{ id: TabId; label: string; icon: typeof FileText }> = [
  { id: "summary", label: "Résumé", icon: FileText },
  { id: "history", label: "Historique", icon: History },
  { id: "images", label: "Images sources", icon: Images },
  { id: "verification", label: "Vérifications", icon: ShieldCheck },
  { id: "memos", label: "Mémos avant/après", icon: MessageSquareText },
];

function analysisLabel(analysis: Analysis): string {
  if (analysis.result === "infected") return "Infectée";
  if (analysis.result === "healthy") return "Saine";
  if (analysis.status === "processing") return "En cours";
  return "En attente";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function ConfidenceRing({ value }: { value: number | null }) {
  const percentage = value === null ? 0 : Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="relative grid h-28 w-28 place-items-center rounded-full bg-slate-100">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(#244B32 ${percentage * 3.6}deg, #e2e8f0 0deg)`,
        }}
      />
      <div className="relative grid h-[88px] w-[88px] place-items-center rounded-full bg-white text-center shadow-sm">
        <div>
          <div className="text-2xl font-bold text-slate-900">{value === null ? "—" : `${percentage}%`}</div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Confiance</div>
        </div>
      </div>
    </div>
  );
}

export default function ParcelFullDetailsDialog({
  open,
  onClose,
  parcel,
  isLoading = false,
  loadError = null,
  onParcelChange,
}: ParcelFullDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [verification, setVerification] = useState<VerificationState>("pending");
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const analyses = useMemo(
    () => [...(parcel?.analyses ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [parcel]
  );
  const latestAnalysis = analyses[0] ?? null;
  const images = useMemo(() => analyses.flatMap((analysis) => analysis.images ?? []), [analyses]);

  useEffect(() => {
    if (!open) return;
    setActiveTab("summary");
    setVerification(parcel?.terrainVerificationStatus ?? "pending");
    setComment(latestAnalysis?.notes ?? parcel?.terrainVerificationComment ?? "");
    setSaveMessage(null);
    setSaveError(null);
  }, [open, parcel?.id, latestAnalysis?.id]);

  async function setVerificationState(next: VerificationState) {
    if (!parcel) return;
    setSaveError(null);
    const previous = verification;
    setVerification(next);
    try {
      const updated = await parcelService.updateVerification(parcel.id, next, comment.trim());
      onParcelChange?.(updated);
      setSaveMessage(next === "verified" ? "Vérification terrain enregistrée." : "Faux positif enregistré.");
    } catch (error) {
      setVerification(previous);
      setSaveError(error instanceof Error ? error.message : "Impossible d’enregistrer la vérification terrain.");
    }
  }

  const metrics = parcel ? computeParcelMetrics(parcel.boundary) : null;
  const severity = parcel ? computeParcelSeverity(parcel) : null;
  const confidenceValues = images
    .map((image) => image.confidence)
    .filter((value): value is number => typeof value === "number");
  const averageConfidence = confidenceValues.length
    ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
    : null;
  const geolocQuality: GeolocationQuality = images.some((image) => image.geolocationQuality === "rtk_fix")
    ? "rtk_fix"
    : images.some((image) => image.geolocationQuality === "rtk_float")
      ? "rtk_float"
      : images.some((image) => image.geolocationQuality === "precise")
        ? "precise"
        : images.some((image) => image.geolocationQuality === "gnss_seul")
          ? "gnss_seul"
          : images.some((image) => image.geolocationQuality === "approximate")
            ? "approximate"
            : images.some((image) => image.geolocationQuality === "saisie_manuelle")
              ? "saisie_manuelle"
              : "none";

  async function saveComment() {
    if (!latestAnalysis || !parcel) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const updated = await analysisService.updateNotes(latestAnalysis.id, comment.trim());
      const nextParcel = {
        ...parcel,
        analyses: (parcel.analyses ?? []).map((analysis) => analysis.id === updated.id ? updated : analysis),
      };
      onParcelChange?.(nextParcel);
      setSaveMessage("Mémo enregistré.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Impossible d’enregistrer le mémo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={parcel?.name ?? "Fiche complète de la parcelle"} maxWidthClassName="max-w-6xl">
      {isLoading ? (
        <div className="flex min-h-[360px] items-center justify-center"><Spinner label="Chargement de la fiche complète..." /></div>
      ) : loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</div>
      ) : !parcel || !metrics || !severity ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">Aucune parcelle sélectionnée.</div>
      ) : (
        <div className="-mx-6 -mb-6">
          <div className="border-y border-slate-200 bg-slate-50/60 px-4 py-2 sm:px-6">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                      active ? "bg-[#244B32] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-[68vh] overflow-y-auto p-4 sm:p-6">
            {activeTab === "summary" && (
              <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
                <aside className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Score confiance moyen</p>
                  <div className="mt-4 flex justify-center"><ConfidenceRing value={averageConfidence} /></div>
                  <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
                    Calculé sur {confidenceValues.length} image{confidenceValues.length > 1 ? "s" : ""} avec score disponible.
                  </p>
                </aside>

                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Sévérité</p>
                      <div className="mt-2"><SeverityBadge level={severity.level} /></div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Surface</p>
                      <p className="mt-1 text-base font-bold text-slate-900">{formatArea(metrics.areaSquareMeters)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Périmètre</p>
                      <p className="mt-1 text-base font-bold text-slate-900">{formatDistance(metrics.perimeterMeters)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Géolocalisation</p>
                      <p className="mt-1 text-base font-bold text-slate-900">{GEOLOC_LABELS[geolocQuality]}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Actions terrain — Vérification</p>
                        <p className="mt-1 text-xs text-slate-600">Qualifier rapidement le constat affiché sur la carte.</p>
                      </div>
                      {verification !== "pending" && (
                        <span className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                          {verification === "verified" ? "Vérifiée terrain" : "Faux positif confirmé"}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setVerificationState("verified")}
                        className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${verification === "verified" ? "bg-emerald-700 text-white" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                      >
                        <Check className="h-4 w-4" /> Marquer vérifiée terrain
                      </button>
                      <button
                        type="button"
                        onClick={() => setVerificationState("false_positive")}
                        className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${verification === "false_positive" ? "bg-red-700 text-white" : "bg-red-600 text-white hover:bg-red-700"}`}
                      >
                        <X className="h-4 w-4" /> Faux positif confirmé
                      </button>
                    </div>
                    <textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Commentaire terrain (symptômes observés, action menée, contexte...)"
                      rows={3}
                      className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#6E8B3D] focus:ring-2 focus:ring-[#6E8B3D]/15"
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs">
                        {saveError && <span className="text-red-600">{saveError}</span>}
                        {saveMessage && <span className="text-emerald-700">{saveMessage}</span>}
                        {!latestAnalysis && <span className="text-slate-500">Une analyse est nécessaire pour enregistrer un mémo.</span>}
                      </div>
                      <button
                        type="button"
                        onClick={saveComment}
                        disabled={!latestAnalysis || isSaving}
                        className="rounded-xl bg-[#244B32] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#356A46] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSaving ? "Enregistrement..." : "Enregistrer le mémo"}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Centre</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{metrics.center.lat.toFixed(5)}, {metrics.center.long.toFixed(5)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Images analysées</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{severity.processedImages}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Taux infecté</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{severity.processedImages ? `${Math.round(severity.infectionRate * 100)}%` : "—"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              analyses.length ? (
                <div className="space-y-3">
                  {analyses.map((analysis) => (
                    <div key={analysis.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{formatDate(analysis.createdAt)}</p>
                          <p className="mt-1 text-xs text-slate-500">{analysis.mission?.name ?? "Sans mission"} · {analysis.images?.length ?? 0} image{(analysis.images?.length ?? 0) > 1 ? "s" : ""}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{analysisLabel(analysis)}</span>
                      </div>
                      {analysis.notes && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{analysis.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : <EmptyState text="Aucune analyse enregistrée pour cette parcelle." />
            )}

            {activeTab === "images" && (
              images.length ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {images.map((image) => (
                    <article key={image.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="aspect-video bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={analysisService.imageFileUrl(image.id)} alt="Image source de l'analyse" className="h-full w-full object-cover" loading="lazy" />
                      </div>
                      <div className="space-y-2 p-3 text-xs text-slate-600">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900">{image.result === "infected" ? "Infectée" : image.result === "healthy" ? "Saine" : "En attente"}</span>
                          <span>{image.confidence === null ? "—" : `${Math.round(image.confidence * 100)}%`}</span>
                        </div>
                        <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {GEOLOC_LABELS[image.geolocationQuality]}</div>
                        <div>{formatDate(image.createdAt)}</div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <EmptyState text="Aucune image source disponible." />
            )}

            {activeTab === "verification" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-bold text-slate-900">État de vérification terrain</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {verification === "verified" && "Cette parcelle est enregistrée comme vérifiée sur le terrain."}
                    {verification === "false_positive" && "Le signal est enregistré comme faux positif confirmé."}
                    {verification === "pending" && "Aucune décision terrain n’a encore été enregistrée."}
                  </p>
                  <div className="mt-4 grid gap-2">
                    <button type="button" onClick={() => setVerificationState("verified")} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Marquer vérifiée terrain</button>
                    <button type="button" onClick={() => setVerificationState("false_positive")} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Faux positif confirmé</button>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-bold text-slate-900">Qualité des données</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between"><span className="text-slate-500">Géolocalisation</span><span className="font-semibold text-slate-900">{GEOLOC_LABELS[geolocQuality]}</span></div>
                    <div className="flex items-center justify-between"><span className="text-slate-500">Confiance moyenne</span><span className="font-semibold text-slate-900">{averageConfidence === null ? "—" : `${Math.round(averageConfidence * 100)}%`}</span></div>
                    <div className="flex items-center justify-between"><span className="text-slate-500">Images traitées</span><span className="font-semibold text-slate-900">{severity.processedImages}</span></div>
                  </div>
                  {!(["rtk_fix","precise"] as GeolocationQuality[]).includes(geolocQuality) && (
                    <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" /> Une vérification terrain est recommandée car la précision de géolocalisation est dégradée.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "memos" && (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-bold text-slate-900">Mémo terrain actuel</h3>
                  <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={8} placeholder="Ajoutez les observations terrain, symptômes, traitements ou décisions..." className="mt-3 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#6E8B3D] focus:ring-2 focus:ring-[#6E8B3D]/15" />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-xs">{saveError && <span className="text-red-600">{saveError}</span>}{saveMessage && <span className="text-emerald-700">{saveMessage}</span>}</div>
                    <button type="button" onClick={saveComment} disabled={!latestAnalysis || isSaving} className="rounded-xl bg-[#244B32] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#356A46] disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? "Enregistrement..." : "Enregistrer"}</button>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-sm font-bold text-slate-900">Mémos précédents</h3>
                  <div className="mt-3 space-y-3">
                    {analyses.filter((analysis) => analysis.notes).length ? analyses.filter((analysis) => analysis.notes).map((analysis) => (
                      <div key={analysis.id} className="rounded-xl bg-white p-3 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{formatDate(analysis.createdAt)}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">{analysis.notes}</p>
                      </div>
                    )) : <p className="text-xs text-slate-500">Aucun mémo précédent.</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">{text}</div>;
}
