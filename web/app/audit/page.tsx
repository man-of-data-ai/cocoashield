"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Shield, SlidersHorizontal, X } from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import ModernSelect from "@/components/ui/ModernSelect";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { exportService } from "@/services/export-service";
import type { AuditFacets, AuditLog } from "@/types/export";

const PAGE_SIZE = 50;

/** Libellés des actions journalisées par l'`AuditInterceptor` du backend. */
const ACTION_LABELS: Record<string, string> = {
  "export.generated": "Export",
  "parcel.created": "Création parcelle",
  "parcel.verification.updated": "Vérification terrain",
  "analysis.created": "Lancement d'analyse",
  "analysis.notes.updated": "Note d'analyse",
  "mission.created": "Création mission",
  "configuration.settings.updated": "Modification config.",
  "drone_profile.created": "Création profil drone",
  "drone_profile.updated": "Modification profil drone",
  "user.profile.updated": "Modification utilisateur",
  "user.deleted": "Suppression utilisateur",
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function detailSummary(log: AuditLog): string {
  const details = log.details;
  if (!details) return "—";
  if (log.action === "export.generated") {
    const parts = [
      details.scopeLabel ? `Portée : ${String(details.scopeLabel)}` : null,
      details.format
        ? `Format : ${String(details.format).toUpperCase()}`
        : null,
      typeof details.exportedZones === "number"
        ? `${details.exportedZones} zone(s)`
        : null,
      details.verifiedOnly ? "zones vérifiées uniquement" : null,
      details.includeSourceImages ? "images sources incluses" : null,
    ].filter(Boolean);
    return parts.join(" · ") || "Export généré";
  }
  if (
    log.action === "parcel.verified" ||
    log.action === "parcel.false_positive"
  ) {
    return details.comment
      ? `Commentaire : ${String(details.comment)}`
      : "Statut terrain mis à jour";
  }
  if (log.action === "configuration.settings.updated") {
    return "Seuils de sévérité / clustering mis à jour";
  }
  if (log.action.startsWith("drone_profile.")) {
    const after = details.after as Record<string, unknown> | undefined;
    return after?.profileId
      ? `Profil : ${String(after.profileId)}`
      : "Profil drone mis à jour";
  }
  if (log.action === "parcel.created") {
    return typeof details.coordinateCount === "number"
      ? `${details.coordinateCount} coordonnées enregistrées`
      : "Parcelle créée";
  }
  return Object.entries(details)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
}

function actionClass(action: string) {
  if (action === "export.created")
    return "bg-blue-50 text-blue-700 ring-blue-100";
  if (action.includes("verified"))
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (action.includes("false_positive") || action.includes("deactivated"))
    return "bg-red-50 text-red-700 ring-red-100";
  if (action.includes("updated") || action.includes("created"))
    return "bg-amber-50 text-amber-800 ring-amber-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [facets, setFacets] = useState<AuditFacets>({ users: [], actions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [target, setTarget] = useState("");

  const filters = useMemo(
    () => ({
      user,
      action,
      dateFrom,
      dateTo,
      target: target.trim(),
      limit: PAGE_SIZE,
      offset,
    }),
    [user, action, dateFrom, dateTo, target, offset],
  );

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await exportService.listAudit(filters);
      setLogs(page.items);
      setTotal(page.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger le journal d'audit.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    exportService
      .listAuditFacets()
      .then(setFacets)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLogs(), 180);
    return () => window.clearTimeout(timer);
  }, [loadLogs]);

  // Tout changement de filtre ramène à la première page : conserver un
  // décalage issu d'un filtre précédent afficherait une page vide. L'ajustement
  // se fait pendant le rendu, un effet provoquerait une requête pour rien
  // sur l'ancien décalage.
  const filterKey = `${user}|${action}|${dateFrom}|${dateTo}|${target.trim()}`;
  const [syncedFilterKey, setSyncedFilterKey] = useState(filterKey);
  if (filterKey !== syncedFilterKey) {
    setSyncedFilterKey(filterKey);
    setOffset(0);
  }

  const hasFilters = Boolean(user || action || dateFrom || dateTo || target);

  const resetFilters = () => {
    setUser("");
    setAction("");
    setDateFrom("");
    setDateTo("");
    setTarget("");
  };

  return (
    <AppShell
      title="Audit"
      description="Traçabilité des exports, consultations et modifications importantes de la plateforme."
    >
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Shield className="h-5 w-5 text-[#244B32]" />
                Journal d&apos;audit des exports, consultations et modifications
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Les filtres sont combinables et s&apos;appliquent à
                l&apos;ensemble des événements journalisés.
              </p>
            </div>
            <span className="rounded-full bg-[#244B32]/8 px-3 py-1 text-xs font-semibold text-[#244B32]">
              {total} événement{total > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-slate-50/60 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600">
            <SlidersHorizontal className="h-4 w-4" /> Filtres audit
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.05fr_1.05fr_.9fr_.9fr_1.25fr_auto]">
            <ModernSelect
              value={user}
              onChange={setUser}
              options={[
                { value: "", label: "Tous utilisateurs" },
                ...facets.users.map((value) => ({ value, label: value })),
              ]}
            />
            <ModernSelect
              value={action}
              onChange={setAction}
              options={[
                { value: "", label: "Toutes actions" },
                ...facets.actions.map((value) => ({
                  value,
                  label: actionLabel(value),
                })),
              ]}
            />
            <input
              aria-label="Date de début"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#6E8B3D]"
            />
            <input
              aria-label="Date de fin"
              type="date"
              min={dateFrom || undefined}
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#6E8B3D]"
            />
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="Rechercher une cible..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#6E8B3D]"
              />
            </label>
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasFilters}
              title="Réinitialiser les filtres"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="h-4 w-4" />{" "}
              <span className="xl:hidden">Réinitialiser</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Date / heure</th>
                <th className="px-5 py-3">Utilisateur</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Objet concerné</th>
                <th className="px-5 py-3">Informations</th>
                <th className="px-5 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14">
                    <div className="flex justify-center">
                      <Spinner label="Chargement du journal..." />
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-14 text-center text-sm text-slate-500"
                  >
                    Aucune action ne correspond aux critères sélectionnés.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="align-top transition hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-slate-600">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-700">
                      {log.userEmail ?? log.userId}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${actionClass(log.action)}`}
                      >
                        {actionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-800">
                      {log.targetLabel ??
                        String(log.details?.scopeLabel ?? "—")}
                    </td>
                    <td className="max-w-[430px] px-5 py-4 text-xs leading-5 text-slate-600">
                      {detailSummary(log)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-[11px] text-slate-500">
                      {log.ipAddress ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-500">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} sur {total}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
                disabled={offset === 0 || loading}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                type="button"
                onClick={() => setOffset((current) => current + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total || loading}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
