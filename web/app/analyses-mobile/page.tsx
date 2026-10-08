"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Smartphone, SlidersHorizontal, X } from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import Alert from "@/components/ui/Alert";
import Dialog from "@/components/ui/Dialog";
import ModernSelect from "@/components/ui/ModernSelect";
import Spinner from "@/components/ui/Spinner";
import StatusBadge from "@/components/ui/StatusBadge";
import { analysisService } from "@/services/analysis-service";
import type { MobileCapture } from "@/types/parcel";

// Les captures arrivent du terrain en continu : l'onglet se met à jour seul.
const REFRESH_MS = 5000;

type Agreement = "agree" | "disagree" | "pending" | "failed";

const AGREEMENT_LABELS: Record<Agreement, string> = {
  agree: "Concordant",
  disagree: "Divergent",
  pending: "Analyse serveur en cours",
  failed: "Échec analyse serveur",
};

const AGREEMENT_CLASSES: Record<Agreement, string> = {
  agree: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  disagree: "bg-red-50 text-red-700 ring-red-100",
  pending: "bg-amber-50 text-amber-800 ring-amber-100",
  failed: "bg-slate-100 text-slate-700 ring-slate-200",
};

function agreementOf(capture: MobileCapture): Agreement {
  if (capture.status === "failed") return "failed";
  if (capture.status === "pending" || !capture.result) return "pending";
  return capture.result === capture.mobileResult ? "agree" : "disagree";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function organizationName(capture: MobileCapture) {
  return capture.organizationName ?? "—";
}

function parcelName(capture: MobileCapture) {
  return capture.analysis.parcel?.name ?? "Hors parcelle";
}

function formatConfidence(value: number | null | undefined) {
  return typeof value === "number" ? `${Math.round(value * 100)} %` : "—";
}

function Verdict({ result, confidence, caption }: { result: MobileCapture["result"] | undefined; confidence: number | null | undefined; caption?: string | null }) {
  if (!result) return <span className="text-xs text-slate-400">—</span>;
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusBadge status={result} />
      <span className="text-[11px] text-slate-500">Confiance {formatConfidence(confidence)}{caption ? ` · ${caption}` : ""}</span>
    </div>
  );
}

function Author({ who }: { who: MobileCapture["author"] }) {
  // Les captures antérieures à l'enregistrement de l'auteur n'en ont pas.
  if (!who) return <span className="text-xs text-slate-400">—</span>;
  return (
    <div>
      <p className="text-xs font-semibold text-slate-800">{who.name}</p>
      <p className="text-[11px] text-slate-500">{who.email}</p>
    </div>
  );
}

function AgreementBadge({ agreement }: { agreement: Agreement }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${AGREEMENT_CLASSES[agreement]}`}>{AGREEMENT_LABELS[agreement]}</span>;
}

export default function MobileAnalysesPage() {
  const [captures, setCaptures] = useState<MobileCapture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agreement, setAgreement] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MobileCapture | null>(null);

  const load = useCallback(async () => {
    try {
      setCaptures(await analysisService.listMobileCaptures());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les analyses mobiles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [load]);

  const stats = useMemo(() => {
    const compared = captures.filter((capture) => ["agree", "disagree"].includes(agreementOf(capture)));
    const agreeing = compared.filter((capture) => agreementOf(capture) === "agree").length;
    return {
      total: captures.length,
      agreementRate: compared.length ? `${Math.round((agreeing / compared.length) * 100)} %` : "—",
      disagreements: compared.length - agreeing,
      pending: captures.filter((capture) => agreementOf(capture) === "pending").length,
    };
  }, [captures]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return captures.filter((capture) => {
      if (agreement && agreementOf(capture) !== agreement) return false;
      if (!term) return true;
      const who = capture.author;
      return `${parcelName(capture)} ${organizationName(capture)} ${who?.name ?? ""} ${who?.email ?? ""}`.toLowerCase().includes(term);
    });
  }, [captures, agreement, search]);

  const hasFilters = Boolean(agreement || search);

  return (
    <AppShell title="Analyses mobiles" description="Photos prises sur le terrain : verdict du téléphone comparé à la ré-analyse du serveur.">
      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Captures reçues", value: stats.total },
          { label: "Concordance mobile / serveur", value: stats.agreementRate },
          { label: "Verdicts divergents", value: stats.disagreements },
          { label: "Analyses serveur en cours", value: stats.pending },
        ].map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tile.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{tile.value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Smartphone className="h-5 w-5 text-[#244B32]" />
                Captures mobiles
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Chaque photo est ré-analysée par le serveur. Le verdict serveur alimente les analyses de parcelle ; celui du téléphone est conservé pour comparaison.
              </p>
            </div>
            <span className="rounded-full bg-[#244B32]/8 px-3 py-1 text-xs font-semibold text-[#244B32]">
              {visible.length} capture{visible.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-slate-50/60 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600">
            <SlidersHorizontal className="h-4 w-4" /> Filtres
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto]">
            <ModernSelect value={agreement} onChange={setAgreement} options={[{ value: "", label: "Toutes les captures" }, ...(Object.keys(AGREEMENT_LABELS) as Agreement[]).map((value) => ({ value, label: AGREEMENT_LABELS[value] }))]} />
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une parcelle, une organisation ou un utilisateur..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#6E8B3D]" />
            </label>
            <button type="button" onClick={() => { setAgreement(""); setSearch(""); }} disabled={!hasFilters} title="Réinitialiser les filtres" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
              <X className="h-4 w-4" /> <span className="md:hidden">Réinitialiser</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Photo</th>
                <th className="px-5 py-3">Date / heure</th>
                <th className="px-5 py-3">Pris par</th>
                <th className="px-5 py-3">Parcelle</th>
                <th className="px-5 py-3">Verdict mobile</th>
                <th className="px-5 py-3">Verdict serveur</th>
                <th className="px-5 py-3">Concordance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-14"><div className="flex justify-center"><Spinner label="Chargement des captures..." /></div></td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-14 text-center text-sm text-slate-500">{captures.length ? "Aucune capture ne correspond aux critères sélectionnés." : "Aucune capture mobile reçue pour le moment."}</td></tr>
              ) : visible.map((capture) => (
                <tr key={capture.id} onClick={() => setSelected(capture)} className="cursor-pointer align-middle transition hover:bg-slate-50/70">
                  <td className="px-5 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- image servie par le backend, pas d'optimisation next/image nécessaire */}
                    <img src={analysisService.imageFileUrl(capture.id)} alt="Capture mobile" loading="lazy" className="h-14 w-14 rounded-xl border border-slate-200 object-cover" />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs font-medium text-slate-600">{formatDateTime(capture.createdAt)}</td>
                  <td className="px-5 py-3"><Author who={capture.author} /></td>
                  <td className="px-5 py-3">
                    <p className={`text-xs font-semibold ${capture.analysis.parcel ? "text-slate-800" : "italic text-slate-500"}`}>{parcelName(capture)}</p>
                    <p className="text-[11px] text-slate-500">{organizationName(capture)}</p>
                  </td>
                  <td className="px-5 py-3"><Verdict result={capture.mobileResult} confidence={capture.mobileConfidence} /></td>
                  <td className="px-5 py-3"><Verdict result={capture.result} confidence={capture.confidence} caption={capture.modelVersion ? `modèle ${capture.modelVersion}` : null} /></td>
                  <td className="px-5 py-3"><AgreementBadge agreement={agreementOf(capture)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={selected !== null} onClose={() => setSelected(null)} title="Capture mobile" maxWidthClassName="max-w-3xl">
        {selected && (
          <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element -- image servie par le backend, pas d'optimisation next/image nécessaire */}
            <img src={analysisService.imageFileUrl(selected.id)} alt="Capture mobile" className="max-h-[60vh] w-full rounded-2xl border border-slate-200 object-contain bg-slate-50" />
            <dl className="space-y-4 text-sm">
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Concordance</dt><dd className="mt-1"><AgreementBadge agreement={agreementOf(selected)} /></dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verdict mobile</dt><dd className="mt-1"><Verdict result={selected.mobileResult} confidence={selected.mobileConfidence} /></dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verdict serveur</dt><dd className="mt-1"><Verdict result={selected.result} confidence={selected.confidence} caption={selected.modelVersion ? `modèle ${selected.modelVersion}` : null} /></dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pris par</dt><dd className="mt-1"><Author who={selected.author} /></dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parcelle</dt><dd className="mt-1 text-slate-800">{parcelName(selected)}{selected.analysis.parcel ? ` · ${organizationName(selected)}` : ""}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reçue le</dt><dd className="mt-1 text-slate-800">{formatDateTime(selected.createdAt)}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Position</dt><dd className="mt-1 font-mono text-xs text-slate-700">{selected.latitude !== null && selected.longitude !== null ? `${selected.latitude.toFixed(6)}, ${selected.longitude.toFixed(6)}` : "Non géolocalisée"}</dd></div>
            </dl>
          </div>
        )}
      </Dialog>
    </AppShell>
  );
}
