"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, Camera, MapPinned, Ruler, ScanSearch } from "lucide-react";

import AnalysisList from "@/components/analyses/AnalysisList";
import NewAnalysisDialog from "@/components/analyses/NewAnalysisDialog";
import AppShell from "@/components/layout/AppShell";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import StatusBadge from "@/components/ui/StatusBadge";
import { useParcelMetrics } from "@/hooks/useParcelMetrics";
import { ApiError } from "@/lib/api-client";
import { formatArea, formatDistance } from "@/lib/geo";
import { parcelService } from "@/services/parcel-service";
import type { Analysis, Parcel } from "@/types/parcel";

export default function ParcelDetailPage() {
  const params = useParams<{ id: string }>();
  const [parcel,setParcel]=useState<Parcel|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null); const [analysisOpen,setAnalysisOpen]=useState(false);
  const metrics=useParcelMetrics(parcel);
  useEffect(()=>{let mounted=true; parcelService.getParcel(params.id).then((d)=>mounted&&setParcel(d)).catch((e)=>mounted&&setError(e instanceof ApiError?e.message:"Impossible de charger la parcelle.")).finally(()=>mounted&&setLoading(false)); return()=>{mounted=false};},[params.id]);
  const onCreated=(analysis:Analysis)=>setParcel((current)=>current?{...current,status:"analyzing",analyses:[analysis,...(current.analyses??[])]}:current);
  if(loading) return <AppShell title="Parcelle"><div className="flex justify-center py-16"><Spinner label="Chargement de la parcelle..."/></div></AppShell>;
  if(error||!parcel) return <AppShell title="Parcelle"><Alert variant="error">{error??"Parcelle introuvable."}</Alert></AppShell>;
  return <AppShell title={parcel.name} headerActions={<StatusBadge status={parcel.status}/>}> 
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link href="/parcels" className="text-sm font-semibold text-slate-500 hover:text-[#244B32]">← Parcelles</Link><button onClick={()=>setAnalysisOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-[#244B32] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#356A46]"><ScanSearch className="h-4 w-4"/>Lancer une analyse</button></div>
    {metrics&&<div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[{label:"Surface",value:formatArea(metrics.areaSquareMeters),icon:Ruler},{label:"Périmètre",value:formatDistance(metrics.perimeterMeters),icon:MapPinned},{label:"Analyses",value:String(parcel.analyses?.length??0),icon:Activity},{label:"Photos analysées",value:String((parcel.analyses??[]).reduce((n,a)=>n+a.images.length,0)),icon:Camera}].map((item)=><div key={item.label} className="rounded-3xl border border-[#E2E9DE] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F0F5EC] text-[#5F8740]"><item.icon className="h-5 w-5"/></span><strong className="text-lg text-[#203B2A]">{item.value}</strong></div><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">{item.label}</p></div>)}</div>}
    <section className="rounded-[26px] border border-[#E2E9DE] bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="text-base font-bold text-slate-900">Historique des analyses</h2><p className="mt-1 text-xs text-slate-400">Chaque analyse regroupe les photos utilisées, les résultats et le rapport généré.</p></div><AnalysisList parcelId={parcel.id} analyses={parcel.analyses??[]}/></section>
    <NewAnalysisDialog open={analysisOpen} onClose={()=>setAnalysisOpen(false)} parcelId={parcel.id} parcelName={parcel.name} onAnalysisCreated={onCreated}/>
  </AppShell>;
}
