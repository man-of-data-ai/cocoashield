"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck, UserRound, UsersRound, Pencil, Building2, CheckCircle2, Plus, Trash2, AlertTriangle, Eye, EyeOff } from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import ModernSelect from "@/components/ui/ModernSelect";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import Dialog from "@/components/ui/Dialog";
import { userService } from "@/services/user-service";
import { organizationService, OFFER_LABELS, TYPE_LABELS, AUTONOMOUS_ADMIN_OFFERS, type Organization } from "@/services/organization-service";
import type { AppUser, UserRole, UserStatus } from "@/types/user-profile";

const ROLE_OPTIONS = [
  { value: "administrateur", label: "Administrateur", description: "Paramétrage, utilisateurs et accès complet", badge: "ADMIN" },
  { value: "direction_ccc", label: "Direction CCC", description: "Pilotage, rapports et données agrégées", badge: "CCC" },
  { value: "agronome_terrain", label: "Agronome Terrain", description: "Cartographie, comparaison et validation agronomique", badge: "AGRO" },
  { value: "operateur_terrain", label: "Opérateur terrain", description: "Missions, collecte et consultation de couverture", badge: "TERRAIN" },
];

const ROLE_STYLES: Record<UserRole, string> = {
  administrateur: "bg-[#E8EFE6] text-[#244B32] ring-[#C9D9C3]",
  direction_ccc: "bg-[#FFF3E7] text-[#A85B1E] ring-[#F3D4B5]",
  agronome_terrain: "bg-[#EEF6E8] text-[#5B7F3E] ring-[#D4E5C8]",
  operateur_terrain: "bg-sky-50 text-sky-700 ring-sky-200",
};

function roleLabel(role: UserRole) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "CocoaDemo2026!", role: "agronome_terrain", cooperative: "", organizationId: "", managedOrganizationIds: [] as string[] });
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "", role: "agronome_terrain" as UserRole, status: "active" as UserStatus, organizationId: "", managedOrganizationIds: [] as string[] });
  const [pendingDelete, setPendingDelete] = useState<AppUser | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  useEffect(() => {
    Promise.all([userService.list(), organizationService.list(), userService.me()]).then(([loadedUsers, loadedOrganizations]) => { setUsers(loadedUsers); setOrganizations(loadedOrganizations); if (loadedOrganizations.length === 1) { const org = loadedOrganizations[0]; setNewUser((current) => ({ ...current, organizationId: org.id, cooperative: org.name, managedOrganizationIds: [org.id] })); } }).catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger les utilisateurs.")).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesText = !needle || `${user.name} ${user.email} ${user.cooperative ?? ""}`.toLowerCase().includes(needle);
      return matchesText && (role === "all" || user.role === role);
    });
  }, [users, query, role]);

  function openEditUser(user: AppUser) {
    setError(null);
    setEditShowPassword(false);
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      status: user.status,
      organizationId: user.organizationId ?? "",
      managedOrganizationIds: user.managedOrganizationIds ?? [],
    });
  }

  async function saveEditedUser() {
    if (!editingUser) return;
    if (!editForm.name.trim() || !editForm.email.trim()) { setError("Le nom et l’email sont obligatoires."); return; }
    if (editForm.password && editForm.password.length < 8) { setError("Le nouveau mot de passe doit contenir au moins 8 caractères."); return; }
    if (editForm.role === "administrateur" && editForm.managedOrganizationIds.length === 0 && !editingUser.isPlatformAdmin) { setError("Sélectionnez au moins une organisation pour cet administrateur."); return; }
    if (editForm.role !== "administrateur" && !editForm.organizationId) { setError("Sélectionnez l’organisation de cet utilisateur."); return; }
    setEditLoading(true); setSavingId(editingUser.id); setError(null);
    try {
      const organization = organizations.find((item) => item.id === editForm.organizationId);
      const updated = await userService.update(editingUser.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        password: editForm.password || undefined,
        role: editForm.role,
        status: editForm.status,
        organizationId: editForm.role === "administrateur" ? null : editForm.organizationId,
        cooperative: editForm.role === "administrateur" ? editingUser.cooperative : organization?.name ?? null,
        managedOrganizationIds: editForm.role === "administrateur" ? editForm.managedOrganizationIds : [],
      });
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditingUser(null);
    } catch (err) { setError(err instanceof Error ? err.message : "La modification de l’utilisateur a échoué."); }
    finally { setEditLoading(false); setSavingId(null); }
  }

  async function deleteUser() {
    if (!pendingDelete || deleteConfirmation.trim().toUpperCase() !== "SUPPRIMER") return;
    setSavingId(pendingDelete.id);
    setError(null);
    try {
      await userService.remove(pendingDelete.id);
      setUsers((current) => current.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
      setDeleteConfirmation("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "La suppression du compte a échoué.");
    } finally {
      setSavingId(null);
    }
  }


  async function createUser() {
    if (!newUser.name.trim() || !newUser.email.trim() || newUser.password.length < 8) {
      setError("Renseignez un nom, un email et un mot de passe d'au moins 8 caractères.");
      return;
    }
    setCreateLoading(true);
    setError(null);
    try {
      const created = await userService.create({ name: newUser.name.trim(), email: newUser.email.trim(), username: newUser.name.trim().replace(/\s+/g, "."), password: newUser.password, role: newUser.role as UserRole, cooperative: newUser.cooperative.trim(), organizationId: newUser.organizationId || null, managedOrganizationIds: newUser.role === "administrateur" ? newUser.managedOrganizationIds : undefined });
      setUsers((current) => [created, ...current]);
      setCreateOpen(false);
      const onlyOrg = organizations.length === 1 ? organizations[0] : null;
      setNewUser({ name: "", email: "", password: "CocoaDemo2026!", role: "agronome_terrain", cooperative: onlyOrg?.name ?? "", organizationId: onlyOrg?.id ?? "", managedOrganizationIds: onlyOrg ? [onlyOrg.id] : [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "La création du compte a échoué.");
    } finally {
      setCreateLoading(false);
    }
  }

  const counts = {
    administrateur: users.filter((user) => user.role === "administrateur").length,
    direction_ccc: users.filter((user) => user.role === "direction_ccc").length,
    agronome_terrain: users.filter((user) => user.role === "agronome_terrain").length,
    operateur_terrain: users.filter((user) => user.role === "operateur_terrain").length,
  };

  return (
    <AppShell title="Utilisateurs" description="Gérez les profils et les responsabilités au sein de Cocoashield." headerActions={<button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-[#244B32] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#356A46]"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Ajouter utilisateur</span></button>}>
      {error && <div className="mb-5"><Alert variant="error">{error}</Alert></div>}

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {ROLE_OPTIONS.map((item) => {
          const Icon = item.value === "administrateur" ? ShieldCheck : item.value === "direction_ccc" ? Building2 : UserRound;
          const count = counts[item.value as UserRole];
          return <button key={item.value} type="button" onClick={() => setRole(item.value)} className={`group rounded-3xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${role === item.value ? "border-[#AFC9A3] ring-4 ring-[#6FA33E]/8" : "border-[#E4EAE0]"}`}>
            <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F2F7EE] text-[#5E853F]"><Icon className="h-5 w-5" /></span><span className="text-2xl font-bold tracking-tight text-[#203B2A]">{count}</span></div>
            <h3 className="mt-4 text-sm font-bold text-slate-800">{item.label}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{item.description}</p>
          </button>;
        })}
      </div>

      <section className="overflow-hidden rounded-[26px] border border-[#E2E9DE] bg-white shadow-[0_8px_30px_rgba(43,73,48,0.05)]">
        <div className="flex flex-col gap-4 border-b border-[#EDF0EA] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-[#244B32]" /><h2 className="font-bold text-slate-900">Comptes utilisateurs</h2></div><p className="mt-1 text-xs text-slate-400">{users.length} compte{users.length > 1 ? "s" : ""} enregistré{users.length > 1 ? "s" : ""}</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, email, coopérative..." className="h-11 w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] pl-9 pr-4 text-sm outline-none transition focus:border-[#9BBC89] focus:bg-white sm:w-64" /></div>
            <ModernSelect value={role} onChange={setRole} options={[{ value: "all", label: "Tous les rôles", description: "Afficher l'ensemble des profils" }, ...ROLE_OPTIONS]} className="sm:w-60" />
          </div>
        </div>

        {loading ? <div className="flex justify-center py-16"><Spinner label="Chargement des utilisateurs..." /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[#FAFBF9] text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"><tr><th className="px-5 py-3.5">Utilisateur</th><th className="px-5 py-3.5">Rôle</th><th className="px-5 py-3.5">Organisation</th><th className="px-5 py-3.5">Statut</th><th className="px-5 py-3.5">Action</th></tr></thead>
              <tbody>
                {filtered.map((user) => <tr key={user.id} className="border-t border-[#EDF0EA] transition hover:bg-[#FBFCFA]">
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF5E9] text-xs font-extrabold text-[#406237]">{initials(user.name)}</div><div><p className="text-sm font-bold text-slate-800">{user.name}</p><p className="mt-0.5 text-xs text-slate-400">{user.email}</p></div></div></td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${ROLE_STYLES[user.role]}`}>{roleLabel(user.role)}</span></td>
                  <td className="px-5 py-4 text-sm text-slate-600">{user.role === "administrateur" && user.managedOrganizationIds.length ? user.managedOrganizationIds.map((id) => organizations.find((org) => org.id === id)?.name).filter(Boolean).join(", ") : user.cooperative || "Cocoashield"}</td>
                  <td className="px-5 py-4">{user.status === "active" ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Actif</span> : <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">Inactif</span>}</td>
                  <td className="px-5 py-4"><div className="flex items-center gap-2"><button type="button" onClick={() => openEditUser(user)} disabled={savingId === user.id} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDE6D9] bg-white text-slate-500 transition hover:border-[#9BBC89] hover:bg-[#F5F9F2] hover:text-[#244B32] disabled:opacity-40" aria-label={`Modifier ${user.name}`}><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => { setPendingDelete(user); setDeleteConfirmation(""); }} disabled={savingId === user.id} className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-40" aria-label={`Supprimer ${user.name}`}><Trash2 className="h-4 w-4" /></button></div></td>
                </tr>)}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="py-12 text-center text-sm text-slate-400">Aucun utilisateur ne correspond aux filtres.</p>}
          </div>
        )}
      </section>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Ajouter un utilisateur">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Nom complet<input value={newUser.name} onChange={(event) => setNewUser((current) => ({ ...current, name: event.target.value }))} placeholder="Jean Dupont" className="mt-1.5 w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#9BBC89]" /></label><label className="text-xs font-bold text-slate-600">Email<input type="email" value={newUser.email} onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))} placeholder="jean@coop.ci" className="mt-1.5 w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#9BBC89]" /></label></div>
          <label className="block text-xs font-bold text-slate-600">Rôle<ModernSelect className="mt-1.5" value={newUser.role} onChange={(value) => setNewUser((current) => ({ ...current, role: value, managedOrganizationIds: value === "administrateur" ? (current.managedOrganizationIds.length ? current.managedOrganizationIds : current.organizationId && AUTONOMOUS_ADMIN_OFFERS.includes(organizations.find((org)=>org.id===current.organizationId)?.offer as any) ? [current.organizationId] : []) : current.managedOrganizationIds }))} options={ROLE_OPTIONS} /></label>
          {newUser.role === "administrateur" ? <div><p className="text-xs font-bold text-slate-600">Organisation(s)</p><div className="mt-1.5 space-y-2 rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] p-3">{organizations.map((org)=>{const checked=newUser.managedOrganizationIds.includes(org.id);const eligible=AUTONOMOUS_ADMIN_OFFERS.includes(org.offer);return <label key={org.id} className={`flex items-start gap-3 rounded-xl p-2 ${eligible?"cursor-pointer hover:bg-white":"cursor-not-allowed opacity-50"}`}><input type="checkbox" className="mt-1" checked={checked} disabled={!eligible || (organizations.length===1 && checked)} onChange={()=>setNewUser(current=>({...current,managedOrganizationIds:checked?current.managedOrganizationIds.filter(id=>id!==org.id):[...current.managedOrganizationIds,org.id]}))}/><span><span className="block text-sm font-semibold text-slate-700">{org.name}</span><span className="text-xs text-slate-400">{TYPE_LABELS[org.type]} · {OFFER_LABELS[org.offer]}</span></span></label>})}</div></div> : <label className="block text-xs font-bold text-slate-600">Organisation<ModernSelect className="mt-1.5" value={newUser.organizationId} onChange={(value) => { const org=organizations.find((item)=>item.id===value); setNewUser((current)=>({ ...current, organizationId:value, cooperative:org?.name ?? "" })); }} searchable={organizations.length > 6} disabled={organizations.length === 1} placeholder="Sélectionner l’organisation" options={organizations.map((org)=>({value:org.id,label:org.name,description:`${TYPE_LABELS[org.type]} · ${OFFER_LABELS[org.offer]}`}))} /></label>}
          <label className="block text-xs font-bold text-slate-600">Mot de passe temporaire<div className="relative mt-1.5"><input type={showPassword ? "text" : "password"} autoComplete="new-password" value={newUser.password} onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))} className="w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] px-3.5 py-2.5 pr-11 text-sm font-normal outline-none focus:border-[#9BBC89]" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-600" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setCreateOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Annuler</button><button type="button" onClick={() => void createUser()} disabled={createLoading || (newUser.role === "administrateur" ? newUser.managedOrganizationIds.length === 0 || newUser.managedOrganizationIds.some((id)=>!AUTONOMOUS_ADMIN_OFFERS.includes(organizations.find((org)=>org.id===id)?.offer as any)) : !newUser.organizationId)} className="rounded-2xl bg-[#244B32] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{createLoading ? "Création..." : "Créer le compte"}</button></div>
        </div>
      </Dialog>

      <Dialog open={editingUser !== null} onClose={() => setEditingUser(null)} title="Modifier l’utilisateur">
        {editingUser && <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">Nom complet<input value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} className="mt-1.5 w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#9BBC89]" /></label>
            <label className="text-xs font-bold text-slate-600">Email<input type="email" value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} className="mt-1.5 w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#9BBC89]" /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-600">Rôle<ModernSelect className="mt-1.5" value={editForm.role} onChange={(value) => setEditForm((current) => ({ ...current, role: value as UserRole, organizationId: value !== "administrateur" && !current.organizationId ? (current.managedOrganizationIds[0] ?? organizations[0]?.id ?? "") : current.organizationId, managedOrganizationIds: value === "administrateur" && current.managedOrganizationIds.length === 0 && current.organizationId ? [current.organizationId] : current.managedOrganizationIds }))} options={ROLE_OPTIONS} disabled={editingUser.isPlatformAdmin} /></label>
            <label className="block text-xs font-bold text-slate-600">Statut<ModernSelect className="mt-1.5" value={editForm.status} onChange={(value) => setEditForm((current) => ({ ...current, status: value as UserStatus }))} options={[{value:"active",label:"Actif",description:"Le compte peut se connecter"},{value:"inactive",label:"Inactif",description:"Le compte est désactivé"}]} disabled={editingUser.isPlatformAdmin} /></label>
          </div>
          {editForm.role === "administrateur" && !editingUser.isPlatformAdmin ? <div><p className="text-xs font-bold text-slate-600">Organisation(s)</p><div className="mt-1.5 max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] p-3">{organizations.map((org) => { const checked=editForm.managedOrganizationIds.includes(org.id); const eligible=AUTONOMOUS_ADMIN_OFFERS.includes(org.offer); return <label key={org.id} className={`flex items-start gap-3 rounded-xl p-2 ${eligible?"cursor-pointer hover:bg-white":"cursor-not-allowed opacity-50"}`}><input type="checkbox" className="mt-1" checked={checked} disabled={!eligible} onChange={() => setEditForm((current) => ({ ...current, managedOrganizationIds: checked ? current.managedOrganizationIds.filter((id) => id !== org.id) : [...current.managedOrganizationIds, org.id] }))}/><span><span className="block text-sm font-semibold text-slate-700">{org.name}</span><span className="text-xs text-slate-400">{TYPE_LABELS[org.type]} · {OFFER_LABELS[org.offer]}</span></span></label>; })}</div></div> : editForm.role !== "administrateur" ? <label className="block text-xs font-bold text-slate-600">Organisation<ModernSelect className="mt-1.5" value={editForm.organizationId} onChange={(value) => setEditForm((current) => ({ ...current, organizationId: value }))} disabled={organizations.length === 1} searchable={organizations.length > 6} placeholder="Sélectionner l’organisation" options={organizations.map((org)=>({value:org.id,label:org.name,description:`${TYPE_LABELS[org.type]} · ${OFFER_LABELS[org.offer]}`}))}/></label> : <div className="rounded-2xl bg-[#F5F8F2] p-3 text-xs text-slate-500">Administrateur CocoaShield global : son périmètre d’organisation n’est pas modifiable ici.</div>}
          <label className="block text-xs font-bold text-slate-600">Nouveau mot de passe <span className="font-normal text-slate-400">(laisser vide pour conserver l’actuel)</span><div className="relative mt-1.5"><input type={editShowPassword ? "text" : "password"} autoComplete="new-password" value={editForm.password} onChange={(event) => setEditForm((current) => ({ ...current, password: event.target.value }))} className="w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] px-3.5 py-2.5 pr-11 text-sm font-normal outline-none focus:border-[#9BBC89]" /><button type="button" onClick={() => setEditShowPassword((value) => !value)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 hover:bg-white" aria-label={editShowPassword ? "Masquer" : "Afficher"}>{editShowPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div></label>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setEditingUser(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Annuler</button><button type="button" onClick={() => void saveEditedUser()} disabled={editLoading} className="rounded-xl bg-[#244B32] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{editLoading ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>}
      </Dialog>

      <Dialog open={pendingDelete !== null} onClose={() => { setPendingDelete(null); setDeleteConfirmation(""); }} title="Supprimer un utilisateur">
        {pendingDelete && <div className="space-y-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0"/><div><p className="font-bold">Cette action est irréversible.</p><p className="mt-1 text-xs leading-5">Le compte de {pendingDelete.name} sera définitivement supprimé.</p></div></div></div>
          <div><label className="text-xs font-bold text-slate-600">Saisissez SUPPRIMER pour confirmer<input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-red-300" placeholder="SUPPRIMER" /></label></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => { setPendingDelete(null); setDeleteConfirmation(""); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Annuler</button><button type="button" onClick={() => void deleteUser()} disabled={deleteConfirmation.trim().toUpperCase() !== "SUPPRIMER" || savingId === pendingDelete.id} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Supprimer définitivement</button></div>
        </div>}
      </Dialog>
    </AppShell>
  );
}
