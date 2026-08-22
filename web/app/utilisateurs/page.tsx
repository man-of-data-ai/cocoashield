"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  Pencil,
  Building2,
  CheckCircle2,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import ModernSelect from "@/components/ui/ModernSelect";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import Dialog from "@/components/ui/Dialog";
import { userService } from "@/services/user-service";
import type { AppUser, UserRole } from "@/types/user-profile";

const ROLE_OPTIONS = [
  {
    value: "administrateur",
    label: "Administrateur",
    description: "Paramétrage, utilisateurs et accès complet",
    badge: "ADMIN",
  },
  {
    value: "direction_ccc",
    label: "Direction CCC",
    description: "Pilotage, rapports et données agrégées",
    badge: "CCC",
  },
  {
    value: "agronome_terrain",
    label: "Agronome Terrain",
    description: "Parcelles, missions et observations",
    badge: "TERRAIN",
  },
];

const ROLE_STYLES: Record<UserRole, string> = {
  administrateur: "bg-[#E8EFE6] text-[#244B32] ring-[#C9D9C3]",
  direction_ccc: "bg-[#FFF3E7] text-[#A85B1E] ring-[#F3D4B5]",
  agronome_terrain: "bg-[#EEF6E8] text-[#5B7F3E] ring-[#D4E5C8]",
};

function roleLabel(role: UserRole) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "CocoaDemo2026!",
    role: "agronome_terrain",
    cooperative: "",
  });
  const [pendingRole, setPendingRole] = useState<{
    user: AppUser;
    nextRole: UserRole;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AppUser | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  useEffect(() => {
    userService
      .list()
      .then(setUsers)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger les utilisateurs.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesText =
        !needle ||
        `${user.name} ${user.email} ${user.cooperative ?? ""}`
          .toLowerCase()
          .includes(needle);
      return matchesText && (role === "all" || user.role === role);
    });
  }, [users, query, role]);

  async function updateRole(user: AppUser, nextRole: string) {
    setSavingId(user.id);
    setError(null);
    try {
      const updated = await userService.update(user.id, {
        role: nextRole as UserRole,
      });
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "La mise à jour du rôle a échoué.",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function confirmRoleChange() {
    if (!pendingRole) return;
    const { user, nextRole } = pendingRole;
    await updateRole(user, nextRole);
    setPendingRole(null);
  }

  async function deleteUser() {
    if (
      !pendingDelete ||
      deleteConfirmation.trim().toUpperCase() !== "SUPPRIMER"
    )
      return;
    setSavingId(pendingDelete.id);
    setError(null);
    try {
      await userService.remove(pendingDelete.id);
      setUsers((current) =>
        current.filter((item) => item.id !== pendingDelete.id),
      );
      setPendingDelete(null);
      setDeleteConfirmation("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "La suppression du compte a échoué.",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function createUser() {
    if (
      !newUser.name.trim() ||
      !newUser.email.trim() ||
      newUser.password.length < 8
    ) {
      setError(
        "Renseignez un nom, un email et un mot de passe d'au moins 8 caractères.",
      );
      return;
    }
    setCreateLoading(true);
    setError(null);
    try {
      const created = await userService.create({
        email: newUser.email.trim(),
        username: newUser.name.trim().replace(/\s+/g, "."),
        password: newUser.password,
        role: newUser.role as UserRole,
        cooperative: newUser.cooperative.trim(),
      });
      setUsers((current) => [created, ...current]);
      setCreateOpen(false);
      setNewUser({
        name: "",
        email: "",
        password: "CocoaDemo2026!",
        role: "agronome_terrain",
        cooperative: "",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "La création du compte a échoué.",
      );
    } finally {
      setCreateLoading(false);
    }
  }

  const counts = {
    administrateur: users.filter((user) => user.role === "administrateur")
      .length,
    direction_ccc: users.filter((user) => user.role === "direction_ccc").length,
    agronome_terrain: users.filter((user) => user.role === "agronome_terrain")
      .length,
  };

  return (
    <AppShell
      title="Utilisateurs"
      description="Gérez les profils et les responsabilités au sein de Cocoashield."
      headerActions={
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#244B32] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#356A46]"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Ajouter utilisateur</span>
        </button>
      }
    >
      {error && (
        <div className="mb-5">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {ROLE_OPTIONS.map((item) => {
          const Icon =
            item.value === "administrateur"
              ? ShieldCheck
              : item.value === "direction_ccc"
                ? Building2
                : UserRound;
          const count = counts[item.value as UserRole];
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setRole(item.value)}
              className={`group rounded-3xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${role === item.value ? "border-[#AFC9A3] ring-4 ring-[#6FA33E]/8" : "border-[#E4EAE0]"}`}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F2F7EE] text-[#5E853F]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-2xl font-bold tracking-tight text-[#203B2A]">
                  {count}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-800">
                {item.label}
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-[26px] border border-[#E2E9DE] bg-white shadow-[0_8px_30px_rgba(43,73,48,0.05)]">
        <div className="flex flex-col gap-4 border-b border-[#EDF0EA] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-[#244B32]" />
              <h2 className="font-bold text-slate-900">Comptes utilisateurs</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {users.length} compte{users.length > 1 ? "s" : ""} enregistré
              {users.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nom, email, coopérative..."
                className="h-11 w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] pl-9 pr-4 text-sm outline-none transition focus:border-[#9BBC89] focus:bg-white sm:w-64"
              />
            </div>
            <ModernSelect
              value={role}
              onChange={setRole}
              options={[
                {
                  value: "all",
                  label: "Tous les rôles",
                  description: "Afficher l'ensemble des profils",
                },
                ...ROLE_OPTIONS,
              ]}
              className="sm:w-60"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner label="Chargement des utilisateurs..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[#FAFBF9] text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Utilisateur</th>
                  <th className="px-5 py-3.5">Rôle</th>
                  <th className="px-5 py-3.5">Organisation</th>
                  <th className="px-5 py-3.5">Statut</th>
                  <th className="px-5 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-[#EDF0EA] transition hover:bg-[#FBFCFA]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF5E9] text-xs font-extrabold text-[#406237]">
                          {initials(user.name)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {user.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${ROLE_STYLES[user.role]}`}
                      >
                        {roleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {user.cooperative || "Cocoashield"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {user.status === "active" ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Pencil className="h-4 w-4 text-slate-300" />
                        <ModernSelect
                          value={user.role}
                          onChange={(value) =>
                            value !== user.role &&
                            setPendingRole({
                              user,
                              nextRole: value as UserRole,
                            })
                          }
                          options={ROLE_OPTIONS}
                          disabled={savingId === user.id}
                          className="w-56"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPendingDelete(user);
                            setDeleteConfirmation("");
                          }}
                          disabled={savingId === user.id}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-40"
                          aria-label={`Supprimer ${user.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-400">
                Aucun utilisateur ne correspond aux filtres.
              </p>
            )}
          </div>
        )}
      </section>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Ajouter un utilisateur"
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">
              Nom complet
              <input
                value={newUser.name}
                onChange={(event) =>
                  setNewUser((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Jean Dupont"
                className="mt-1.5 w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#9BBC89]"
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Email
              <input
                type="email"
                value={newUser.email}
                onChange={(event) =>
                  setNewUser((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="jean@coop.ci"
                className="mt-1.5 w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#9BBC89]"
              />
            </label>
          </div>
          <label className="block text-xs font-bold text-slate-600">
            Rôle
            <ModernSelect
              className="mt-1.5"
              value={newUser.role}
              onChange={(value) =>
                setNewUser((current) => ({ ...current, role: value }))
              }
              options={ROLE_OPTIONS}
            />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            Organisation
            <input
              value={newUser.cooperative}
              onChange={(event) =>
                setNewUser((current) => ({
                  ...current,
                  cooperative: event.target.value,
                }))
              }
              placeholder="COOP-CA Soubré"
              className="mt-1.5 w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#9BBC89]"
            />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            Mot de passe temporaire
            <input
              type="text"
              value={newUser.password}
              onChange={(event) =>
                setNewUser((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#9BBC89]"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => void createUser()}
              disabled={createLoading}
              className="rounded-2xl bg-[#244B32] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {createLoading ? "Création..." : "Créer le compte"}
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={pendingRole !== null}
        onClose={() => setPendingRole(null)}
        title="Confirmer le changement de rôle"
      >
        {pendingRole && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold">
                    Vérifiez cette modification avant de continuer.
                  </p>
                  <p className="mt-1 text-xs leading-5">
                    Les droits d’accès de cet utilisateur seront mis à jour
                    immédiatement.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-[#F7F9F5] p-4">
              <p className="text-sm font-bold text-slate-900">
                {pendingRole.user.name}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {pendingRole.user.email}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Ancien rôle
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {roleLabel(pendingRole.user.role)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Nouveau rôle
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#244B32]">
                    {roleLabel(pendingRole.nextRole)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingRole(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void confirmRoleChange()}
                disabled={savingId === pendingRole.user.id}
                className="rounded-xl bg-[#244B32] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                Confirmer le rôle
              </button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={pendingDelete !== null}
        onClose={() => {
          setPendingDelete(null);
          setDeleteConfirmation("");
        }}
        title="Supprimer un utilisateur"
      >
        {pendingDelete && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold">Cette action est irréversible.</p>
                  <p className="mt-1 text-xs leading-5">
                    Le compte de {pendingDelete.name} sera définitivement
                    supprimé.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">
                Saisissez SUPPRIMER pour confirmer
                <input
                  value={deleteConfirmation}
                  onChange={(event) =>
                    setDeleteConfirmation(event.target.value)
                  }
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
                  placeholder="SUPPRIMER"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingDelete(null);
                  setDeleteConfirmation("");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void deleteUser()}
                disabled={
                  deleteConfirmation.trim().toUpperCase() !== "SUPPRIMER" ||
                  savingId === pendingDelete.id
                }
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </AppShell>
  );
}
