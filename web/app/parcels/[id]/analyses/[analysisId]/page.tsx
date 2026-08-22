"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, FileText, Gauge, Images, MapPin, Sprout } from "lucide-react";

import ImageDetailPanel from "@/components/analyses/ImageDetailPanel";
import AppShell from "@/components/layout/AppShell";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import StatusBadge from "@/components/ui/StatusBadge";
import SeverityLayerSelector from "@/components/map/SeverityLayerSelector";
import { ApiError } from "@/lib/api-client";
import { canAccess } from "@/lib/access-control";
import { analysisService } from "@/services/analysis-service";
import { userService } from "@/services/user-service";
import type { Analysis } from "@/types/parcel";
import type { Severity } from "@/lib/severity";
import type { RiskZone } from "@/lib/risk-zones";

const AnalysisImageMap = dynamic(() => import("@/components/analyses/AnalysisImageMap"), { ssr: false });
const severityLabels: Record<string,string> = { faible:"Faible", modere:"Modérée", eleve:"Élevée", critique:"Critique" };

export default function AnalysisDetailPage() {
  const params=useParams<{id:string;analysisId:string}>(); const searchParams=useSearchParams(); const source=searchParams.get("from"); const openedFromReports=source==="reports"; const openedFromMap=source==="map"; const openedFromMissions=source==="missions"; const [analysis,setAnalysis]=useState<Analysis|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null); const [selected,setSelected]=useState<string|null>(null); const [activeSeverityLevels,setActiveSeverityLevels]=useState<Severity[]>(["faible","modere","eleve","critique"]); const [selectedRiskZone,setSelectedRiskZone]=useState<RiskZone|null>(null); const [notes,setNotes]=useState(""); const [saving,setSaving]=useState(false); const [canViewReports,setCanViewReports]=useState(false);
  useEffect(()=>{let mounted=true; analysisService.getAnalysis(params.analysisId).then((d)=>{if(mounted){setAnalysis(d);setNotes(d.notes??"");setSelected(d.images[0]?.id??null);}}).catch((e)=>mounted&&setError(e instanceof ApiError?e.message:"Impossible de charger l’analyse.")).finally(()=>mounted&&setLoading(false)); return()=>{mounted=false};},[params.analysisId]);
  useEffect(()=>{let mounted=true; userService.me().then((profile)=>mounted&&setCanViewReports(canAccess(profile.role,"reports"))).catch(()=>mounted&&setCanViewReports(false)); return()=>{mounted=false};},[]);
  const selectedImage=useMemo(()=>analysis?.images.find((i)=>i.id===selected)??null,[analysis,selected]);
  async function save(){setSaving(true);try{setAnalysis(await analysisService.updateNotes(params.analysisId,notes));}finally{setSaving(false);}}
  if(loading) return <AppShell title="Analyse"><div className="flex justify-center py-16"><Spinner label="Chargement de l’analyse..."/></div></AppShell>;
  if(error||!analysis) return <AppShell title="Analyse"><Alert variant="error">{error??"Analyse introuvable."}</Alert></AppShell>;
  const infection = analysis.infectionPercentage ?? (()=>{const p=analysis.images.filter(i=>i.status==="processed"&&i.result);const n=p.filter(i=>i.result==="infected").length;return p.length?(n/p.length)*100:0;})();
  const backHref = openedFromReports ? "/rapports" : openedFromMap ? `/map?parcel=${params.id}&analysis=${analysis.id}` : openedFromMissions ? `/missions${analysis.missionId ? `?mission=${analysis.missionId}` : ""}` : `/parcels/${params.id}`;
  const backLabel = openedFromReports ? "Rapports" : openedFromMap ? "Carte" : openedFromMissions ? "Missions" : (analysis.parcel?.name ?? "Parcelle");
  return <AppShell title={`Analyse · ${analysis.parcel?.name??"Parcelle"}`} headerActions={analysis.result?<StatusBadge status={analysis.result}/>:undefined}>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link href={backHref} className="text-sm font-semibold text-slate-500 hover:text-[#244B32]">← {backLabel}</Link><div className="flex flex-wrap gap-2"><Link href={`/map?parcel=${params.id}&analysis=${analysis.id}`} className="inline-flex items-center gap-2 rounded-2xl border border-[#D9E5D3] bg-white px-4 py-2.5 text-sm font-bold text-[#31583B] hover:bg-[#F6FAF3]"><MapPin className="h-4 w-4"/>Voir sur la carte</Link>{analysis.reportGeneratedAt&&canViewReports&&<Link href={`/rapports/${analysis.id}`} className="inline-flex items-center gap-2 rounded-2xl border border-[#D9E5D3] bg-white px-4 py-2.5 text-sm font-bold text-[#31583B] hover:bg-[#F6FAF3]"><FileText className="h-4 w-4"/>Voir le rapport</Link>}</div></div>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[{label:"Date",value:new Date(analysis.completedAt??analysis.createdAt).toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"}),icon:CalendarClock},{label:"Mission",value:analysis.mission?.name??"Sans mission",icon:MapPin},{label:"Photos",value:String(analysis.images.length),icon:Images},{label:"Infection",value:`${infection.toFixed(1)} %`,icon:Gauge},{label:"Sévérité",value:analysis.severityLevel?severityLabels[analysis.severityLevel]:"En attente",icon:Sprout}].map((item)=><div key={item.label} className="rounded-3xl border border-[#E2E9DE] bg-white p-4 shadow-sm"><item.icon className="h-5 w-5 text-[#628847]"/><p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p><p className="mt-1 text-sm font-bold text-slate-800">{item.value}</p></div>)}
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_380px]">
      <section className="overflow-hidden rounded-[28px] border border-[#E2E9DE] bg-white shadow-sm"><div className="border-b border-[#EDF1EA] px-5 py-4"><div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900">Localisation des observations</h2><p className="mt-1 text-xs text-slate-400">Zones à risque et observations géolocalisées de cette analyse.</p></div><MapPin className="h-5 w-5 text-[#6A904D]"/></div><div className="mt-3"><SeverityLayerSelector value={activeSeverityLevels} onChange={setActiveSeverityLevels} compact/></div></div><div className="h-[520px]">{analysis.parcel&&<AnalysisImageMap parcel={analysis.parcel} analysis={analysis} activeSeverityLevels={activeSeverityLevels} selectedImageId={selected} onSelectImage={setSelected} selectedRiskZone={selectedRiskZone} onSelectRiskZone={setSelectedRiskZone}/>}</div></section>
      <div className="space-y-5">{selectedImage&&<ImageDetailPanel image={selectedImage}/>}<section className="rounded-[26px] border border-[#E2E9DE] bg-white p-5 shadow-sm"><label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-slate-500">Observations</label><textarea id="notes" rows={5} value={notes} onChange={(e)=>setNotes(e.target.value)} className="mt-3 w-full rounded-2xl border border-[#DDE6D9] bg-[#FAFCF8] px-3 py-3 text-sm outline-none focus:border-[#9BBC89]" placeholder="Ajouter une observation terrain"/><button onClick={save} disabled={saving} className="mt-3 w-full rounded-2xl bg-[#244B32] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#356A46] disabled:opacity-60">{saving?"Enregistrement...":"Enregistrer"}</button></section>{analysis.reportGeneratedAt&&<section className="rounded-[26px] border border-[#DCE8D6] bg-[#F7FAF4] p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#5E8544]"><FileText className="h-5 w-5"/></span><div><h3 className="text-sm font-bold text-slate-900">Rapport généré</h3><p className="mt-1 text-xs text-slate-500">Associé automatiquement à cette analyse.</p></div></div></section>}</div>
    </div>
  </AppShell>;
}
