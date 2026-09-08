"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Building2, CircleDollarSign, FileDown, MapPinned, Settings2, ShieldCheck, Users } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import { exportDirectionSummaryPdf } from "@/lib/direction-summary-pdf";
import { organizationService, OFFER_LABELS, type Organization } from "@/services/organization-service";
import { parcelService, type ParcelSummary } from "@/services/parcel-service";
import { userService } from "@/services/user-service";
import type { AppUser, CurrentUserProfile } from "@/types/user-profile";

export default function DashboardPage() {
  const [profile,setProfile]=useState<CurrentUserProfile|null>(null);
  const [organizations,setOrganizations]=useState<Organization[]>([]);
  const [users,setUsers]=useState<AppUser[]>([]);
  const [summary,setSummary]=useState<ParcelSummary|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{
    userService.me().then(async (me)=>{
      setProfile(me);
      if (me.isPlatformAdmin) {
        const [o,u]=await Promise.all([organizationService.list(true),userService.list()]);
        setOrganizations(o); setUsers(u);
      } else {
        setSummary(await parcelService.getSummary());
      }
    }).catch((e)=>setError(e instanceof Error?e.message:"Impossible de charger le dashboard.")).finally(()=>setLoading(false));
  },[]);

  const platformMetrics=useMemo(()=>({active:organizations.filter(o=>o.active).length,clientUsers:users.filter(u=>!u.isPlatformAdmin).length,autonomous:organizations.filter(o=>o.active&&(o.offer==="saas_byod"||o.offer==="on_premise")).length}),[organizations,users]);

  if (loading || !profile) return <AppShell title="Dashboard"><div className="flex justify-center py-20"><Spinner label="Chargement du dashboard..."/></div></AppShell>;

  if (profile.isPlatformAdmin) return <AppShell title="Dashboard CocoaShield" description="Suivi des organisations clientes, des offres et des comptes de la plateforme.">
    {error&&<Alert variant="error">{error}</Alert>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[{label:"Organisations",value:organizations.length,sub:`${platformMetrics.active} actives`,icon:Building2},{label:"Utilisateurs clients",value:platformMetrics.clientUsers,sub:"hors équipe CocoaShield",icon:Users},{label:"Offres autonomes",value:platformMetrics.autonomous,sub:"BYOD / On-Premise",icon:ShieldCheck},{label:"Configuration",value:"Plateforme",sub:"offres & règles globales",icon:Settings2}].map(i=><div key={i.label} className="rounded-[26px] border border-[#E2E9DE] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F0F5EC] text-[#5F8740]"><i.icon className="h-5 w-5"/></span><strong className="text-2xl text-[#203B2A]">{i.value}</strong></div><p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">{i.label}</p><p className="mt-1 text-xs text-slate-500">{i.sub}</p></div>)}
    </div>
    <section className="mt-6 rounded-[28px] border border-[#E2E9DE] bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-[#628847]"/><h2 className="font-bold text-slate-900">Répartition des offres</h2></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{Object.entries(OFFER_LABELS).map(([key,label])=>{const n=organizations.filter(o=>o.offer===key).length;return <div key={key} className="rounded-2xl bg-[#F7F9F5] p-4"><p className="text-sm font-bold text-slate-800">{label}</p><p className="mt-2 text-2xl font-semibold text-[#244B32]">{n}</p><p className="text-xs text-slate-400">organisation{n>1?"s":""}</p></div>})}</div></section>
  </AppShell>;

  const isDirection=profile.role==="direction_ccc";
  const name=profile.cooperative || "Organisation On-Premise";
  return <AppShell title={isDirection?"Vue Direction":"Dashboard On-Premise"} description={isDirection?"Pilotage agrégé de la situation phytosanitaire, sans données nominatives de parcelles.":`Administration locale de ${name}.`}>
    {error&&<div className="mb-4"><Alert variant="error">{error}</Alert></div>}
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#DCE8D7] bg-[#F3F8EF] p-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#628847]">Offre active</p><p className="mt-1 font-bold text-[#203B2A]">On-Premise · Instance locale</p><p className="mt-1 text-xs text-slate-500">{name} · données et administration hébergées localement</p></div>{isDirection&&summary&&<button type="button" onClick={()=>exportDirectionSummaryPdf(summary,name)} className="inline-flex items-center gap-2 rounded-xl bg-[#244B32] px-4 py-2.5 text-xs font-bold text-white"><FileDown className="h-4 w-4"/>Exporter la synthèse PDF</button>}</div>
    {summary&&<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[{label:"Parcelles suivies",value:summary.parcelCount,sub:`${summary.analyzedParcelCount} analysées`,icon:MapPinned},{label:"Analyses terminées",value:summary.completedAnalysisCount,sub:`${summary.infectedAnalysisCount} avec infection`,icon:BarChart3},{label:"Foyers actifs",value:summary.activeZones,sub:`${summary.criticalZones} critiques`,icon:ShieldCheck},{label:"Prévalence moyenne",value:`${summary.averageInfectionPercentage.toFixed(1)} %`,sub:`${(summary.affectedSurfaceSquareMeters/10000).toFixed(2)} ha touchés`,icon:CircleDollarSign}].map(i=><div key={i.label} className="rounded-[26px] border border-[#E2E9DE] bg-white p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F0F5EC] text-[#5F8740]"><i.icon className="h-5 w-5"/></span><p className="mt-5 text-2xl font-bold text-[#203B2A]">{i.value}</p><p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">{i.label}</p><p className="mt-1 text-xs text-slate-500">{i.sub}</p></div>)}
    </div>}
    {isDirection?<section className="mt-6 rounded-[28px] border border-[#E2E9DE] bg-white p-6 shadow-sm"><h2 className="font-bold text-slate-900">Périmètre de la vue Direction</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Cette vue est volontairement agrégée. Les noms de planteurs, coordonnées exactes et contours nominatifs des parcelles ne sont pas accessibles depuis ce profil. Les indicateurs servent au pilotage institutionnel et à la surveillance de l’évolution globale.</p></section>:<section className="mt-6 rounded-[28px] border border-[#E2E9DE] bg-white p-6 shadow-sm"><h2 className="font-bold text-slate-900">Administration locale</h2><p className="mt-2 text-sm text-slate-500">L’administrateur On-Premise gère localement les utilisateurs, les missions, les profils drones, les seuils de cartographie, la rétention et l’audit.</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/utilisateurs" className="rounded-xl border border-[#DCE8D7] bg-[#F7FAF5] px-4 py-2 text-xs font-bold text-[#31583B]">Gérer les utilisateurs</Link><Link href="/missions" className="rounded-xl border border-[#DCE8D7] bg-[#F7FAF5] px-4 py-2 text-xs font-bold text-[#31583B]">Créer une mission</Link><Link href="/configuration" className="rounded-xl bg-[#244B32] px-4 py-2 text-xs font-bold text-white">Configuration locale</Link></div></section>}
  </AppShell>;
}
