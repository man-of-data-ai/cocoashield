"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { BarChart3, Database, Download, LogOut, Map, Layers, Send, Settings, Shield, Users, Menu, X, Clock3, ChevronDown, Building2, Pencil, Eye, EyeOff, LayoutDashboard } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { areaForPath, canAccessProfile, defaultPathForProfile } from "@/lib/access-control";
import { setRuntimeSeverityThresholds } from "@/lib/severity";
import { configurationService } from "@/services/configuration-service";
import { userService } from "@/services/user-service";
import type { CurrentUserProfile, UserRole } from "@/types/user-profile";
import Spinner from "@/components/ui/Spinner";
import Dialog from "@/components/ui/Dialog";
import Alert from "@/components/ui/Alert";

type NavItem = { href: string; label: string; icon: typeof Database; area: ReturnType<typeof areaForPath> };
const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, area: "dashboard" },
  { href: "/parcels", label: "Parcelles", icon: Database, area: "parcels" },
  { href: "/map", label: "Carte", icon: Map, area: "map" },
  { href: "/comparaison", label: "Comparaison", icon: Layers, area: "comparison" },
  { href: "/missions", label: "Missions", icon: Send, area: "missions" },
  { href: "/exports", label: "Exports", icon: Download, area: "exports" },
  { href: "/rapports", label: "Rapports", icon: BarChart3, area: "reports" },
  { href: "/configuration", label: "Configuration", icon: Settings, area: "configuration" },
  { href: "/utilisateurs", label: "Utilisateurs", icon: Users, area: "users" },
  { href: "/organisations", label: "Organisations", icon: Building2, area: "organizations" },
  { href: "/audit", label: "Audit", icon: Shield, area: "audit" },
];

type AppShellProps = { children: React.ReactNode; title: string; description?: string; headerActions?: React.ReactNode };
const ROLE_LABELS: Record<UserRole, string> = { administrateur: "Administrateur", direction_ccc: "Direction CCC", agronome_terrain: "Agronome Terrain", operateur_terrain: "Opérateur terrain" };

function initialsFor(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?"; }
function formatDuration(totalSeconds: number) { const h = Math.floor(totalSeconds / 3600); const m = Math.floor((totalSeconds % 3600) / 60); const s = totalSeconds % 60; return [h,m,s].map((v) => String(v).padStart(2,"0")).join(":"); }

function AppShellContent({ children, title, description, headerActions }: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", currentPassword: "", password: "", confirmPassword: "" });

  useEffect(() => {
    configurationService.getSettings().then((settings) => setRuntimeSeverityThresholds({ modere: settings.severityModerate, eleve: settings.severityHigh, critique: settings.severityCritical })).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    userService.me().then(setProfile).catch(() => setProfile(null)).finally(() => setProfileLoading(false));
    const storageKey = `cocoashield-session-start:${user.id}`;
    const stored = window.sessionStorage.getItem(storageKey);
    const startedAt = stored ? Number(stored) : Date.now();
    if (!stored) window.sessionStorage.setItem(storageKey, String(startedAt));
    const update = () => setSessionSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [user]);

  useEffect(() => {
    if (!profile || !pathname) return;
    const area = areaForPath(pathname);
    if (area && !canAccessProfile(profile, area)) router.replace(defaultPathForProfile(profile));
  }, [profile, pathname, router]);

  const visibleNav = useMemo(() => profile ? NAV_ITEMS.filter((item) => item.area && canAccessProfile(profile, item.area)) : [], [profile]);
  const currentArea = pathname ? areaForPath(pathname) : null;
  const analysisSource = searchParams.get("from");
  const navigationArea = currentArea === "analysis"
    ? analysisSource === "reports"
      ? "reports"
      : analysisSource === "map"
        ? "map"
        : analysisSource === "missions"
          ? "missions"
          : "parcels"
    : currentArea;
  const denied = Boolean(profile && currentArea && !canAccessProfile(profile, currentArea));

  async function handleLogout() { if (user) window.sessionStorage.removeItem(`cocoashield-session-start:${user.id}`); await logout(); router.replace("/login"); }

  function openProfileEditor() {
    setProfileOpen(false);
    setProfileError(null);
    setProfileForm({ name: profile?.name ?? user?.name ?? "", currentPassword: "", password: "", confirmPassword: "" });
    setProfileEditorOpen(true);
  }

  async function saveOwnProfile() {
    const name = profileForm.name.trim();
    if (!name) { setProfileError("Le nom est obligatoire."); return; }
    if (profileForm.password && profileForm.password.length < 8) { setProfileError("Le nouveau mot de passe doit contenir au moins 8 caractères."); return; }
    if (profileForm.password !== profileForm.confirmPassword) { setProfileError("La confirmation du mot de passe ne correspond pas."); return; }
    if (profileForm.password && !profileForm.currentPassword) { setProfileError("Saisissez votre mot de passe actuel pour le modifier."); return; }
    setProfileSaving(true); setProfileError(null);
    try {
      const updated = await userService.updateMe({ name, currentPassword: profileForm.currentPassword || undefined, password: profileForm.password || undefined });
      setProfile(updated);
      setProfileEditorOpen(false);
    } catch (err) { setProfileError(err instanceof Error ? err.message : "La mise à jour du profil a échoué."); }
    finally { setProfileSaving(false); }
  }

  const sidebar = <div className="flex h-full flex-col bg-white px-4 py-5">
    <Link href={profile ? defaultPathForProfile(profile) : "/parcels"} className="flex items-center gap-3 rounded-2xl px-2 py-1.5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3F7EE] ring-1 ring-[#DDE8D7]">
        <Image src="/logo.png" alt="Cocoashield" width={42} height={42} className="h-9 w-9 object-contain" />
      </div>
      <span className="text-[17px] font-bold tracking-[-0.02em] text-[#203B2A]">Cocoashield</span>
    </Link>
    <div className="mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Navigation</div>
    <nav className="mt-2 space-y-1">{visibleNav.map(({href,label,icon:Icon,area}) => {
      const active = navigationArea === area;
      return <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-[#EEF5E9] text-[#244B32]" : "text-slate-500 hover:bg-[#F7F9F4] hover:text-[#244B32]"}`}>
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${active ? "bg-white text-[#679442] shadow-sm" : "text-slate-400 group-hover:text-[#679442]"}`}><Icon className="h-4 w-4" /></span>{label}
      </Link>;
    })}</nav>
  </div>;

  return <div className="min-h-screen bg-[#F6F8F3] text-slate-800">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] border-r border-[#E7ECE3] lg:block">{sidebar}</aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-[#16301F]/25 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu"/><aside className="relative h-full w-[286px] border-r border-[#E7ECE3] shadow-2xl">{sidebar}</aside><button onClick={() => setMobileOpen(false)} className="absolute left-[298px] top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg" aria-label="Fermer le menu"><X className="h-5 w-5"/></button></div>}
    <div className="lg:pl-[240px]">
      <header className="sticky top-0 z-30 border-b border-[#E3E9DF] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[68px] max-w-[1680px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button onClick={() => setMobileOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E1E8DD] bg-white text-[#244B32] lg:hidden" aria-label="Ouvrir le menu"><Menu className="h-5 w-5"/></button>
          <div className="min-w-0 flex-1" />
          <div className="relative">
            <button type="button" onClick={() => setProfileOpen((v) => !v)} className="flex items-center gap-3 rounded-2xl border border-[#E1E8DD] bg-white px-2.5 py-2 shadow-sm transition hover:border-[#C8D7C1] sm:px-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#244B32] text-xs font-bold text-white">{initialsFor(profile?.name ?? user?.name ?? "?")}</div>
              <div className="hidden max-w-[190px] text-left sm:block"><div className="truncate text-xs font-bold text-slate-800">{profile?.name ?? user?.name ?? "Utilisateur"}</div><div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400"><span>{profile ? ROLE_LABELS[profile.role] : "Chargement"}</span><span>•</span><span className="font-mono text-[#5A7D42]">{formatDuration(sessionSeconds)}</span></div></div>
              <ChevronDown className={`hidden h-4 w-4 text-slate-400 transition sm:block ${profileOpen ? "rotate-180" : ""}`}/>
            </button>
            {profileOpen && <div className="absolute right-0 top-[calc(100%+8px)] w-72 rounded-2xl border border-[#E1E8DD] bg-white p-3 shadow-[0_18px_50px_rgba(31,61,40,0.14)]"><div className="rounded-xl bg-[#F5F8F2] p-3"><p className="text-xs font-bold text-slate-800">{profile?.name ?? user?.name}</p><p className="mt-1 text-[11px] text-slate-500">{profile?.email ?? user?.email}</p><div className="mt-3 flex items-center justify-between"><span className="rounded-full bg-[#E8F3E2] px-2.5 py-1 text-[10px] font-bold text-[#4E713B]">{profile ? ROLE_LABELS[profile.role] : "—"}</span><span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#244B32]"><Clock3 className="h-3.5 w-3.5"/>{formatDuration(sessionSeconds)}</span></div></div><button type="button" onClick={openProfileEditor} className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-[#F2F7EE] hover:text-[#244B32]"><Pencil className="h-4 w-4"/>Modifier mon profil</button><button type="button" onClick={handleLogout} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600"><LogOut className="h-4 w-4"/>Se déconnecter</button></div>}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {profileLoading || denied ? <div className="flex min-h-[45vh] items-center justify-center"><Spinner label="Chargement de votre espace..."/></div> : <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div><h1 className="text-2xl font-bold tracking-[-0.03em] text-[#1E3426] sm:text-3xl">{title}</h1>{description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>}</div>
            {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
          </div>
          {children}
        </>}
      </main>
    </div>
    <Dialog open={profileEditorOpen} onClose={() => setProfileEditorOpen(false)} title="Mon profil">
      <div className="space-y-4">
        {profileError && <Alert variant="error">{profileError}</Alert>}
        <label className="block text-xs font-bold text-slate-600">Nom complet
          <input value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} className="mt-1.5 w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#9BBC89]" />
        </label>
        <div className="rounded-2xl border border-[#E4EAE0] bg-[#F8FAF6] p-3 text-xs text-slate-500">
          <div><span className="font-semibold text-slate-700">Organisation :</span> {profile?.cooperative || "—"}</div>
          <div className="mt-1"><span className="font-semibold text-slate-700">Rôle :</span> {profile ? ROLE_LABELS[profile.role] : "—"}</div>
          <p className="mt-2 text-[11px] text-slate-400">L’organisation et le rôle ne peuvent pas être modifiés depuis votre profil.</p>
        </div>
        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs font-bold text-slate-700">Changer le mot de passe</p>
          <div className="mt-3 space-y-3">
            <input type="password" autoComplete="current-password" value={profileForm.currentPassword} onChange={(event) => setProfileForm((current) => ({ ...current, currentPassword: event.target.value }))} placeholder="Mot de passe actuel" className="w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] px-3.5 py-2.5 text-sm outline-none focus:border-[#9BBC89]" />
            <div className="relative">
              <input type={showProfilePassword ? "text" : "password"} autoComplete="new-password" value={profileForm.password} onChange={(event) => setProfileForm((current) => ({ ...current, password: event.target.value }))} placeholder="Nouveau mot de passe" className="w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] px-3.5 py-2.5 pr-11 text-sm outline-none focus:border-[#9BBC89]" />
              <button type="button" onClick={() => setShowProfilePassword((value) => !value)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 hover:bg-white" aria-label={showProfilePassword ? "Masquer" : "Afficher"}>{showProfilePassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button>
            </div>
            <input type="password" autoComplete="new-password" value={profileForm.confirmPassword} onChange={(event) => setProfileForm((current) => ({ ...current, confirmPassword: event.target.value }))} placeholder="Confirmer le nouveau mot de passe" className="w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] px-3.5 py-2.5 text-sm outline-none focus:border-[#9BBC89]" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setProfileEditorOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Annuler</button><button type="button" onClick={() => void saveOwnProfile()} disabled={profileSaving} className="rounded-2xl bg-[#244B32] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{profileSaving ? "Enregistrement..." : "Enregistrer"}</button></div>
      </div>
    </Dialog>
  </div>;
}


export default function AppShell(props: AppShellProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F6F8F3]" />}>
      <AppShellContent {...props} />
    </Suspense>
  );
}
