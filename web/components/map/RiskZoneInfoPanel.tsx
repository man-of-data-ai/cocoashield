"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock3, Eye, Images, MapPinned, Percent, Ruler, ShieldCheck, TrendingDown, X } from "lucide-react";
import { SEVERITY_BADGE_CLASSES, SEVERITY_LABELS } from "@/lib/severity";
import type { RiskZone } from "@/lib/risk-zones";
import { analysisService } from "@/services/analysis-service";

export default function RiskZoneInfoPanel({ zone, onClose, minimumConfidence = 0.75 }: { zone: RiskZone | null; onClose: () => void; minimumConfidence?: number }) {
  if (!zone) return null;
  return <div className="absolute bottom-4 left-4 z-[900] max-h-[calc(100%-2rem)] w-[min(390px,calc(100%-2rem))] overflow-auto rounded-3xl border border-white/70 bg-white/95 p-4 shadow-xl backdrop-blur">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Fiche de zone</p><h3 className="mt-1 font-bold text-slate-900">{zone.parcelName}</h3></div>
      <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4"/></button>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-2xl bg-slate-50 p-3"><span className="text-slate-400">Sévérité</span><div className="mt-1"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold text-white ${SEVERITY_BADGE_CLASSES[zone.level]}`}>{SEVERITY_LABELS[zone.level]}</span></div><p className="mt-1 text-[10px] font-semibold text-slate-500">{zone.zoneStatus === "active" ? "Nouveau foyer" : zone.zoneStatus === "known" ? "Foyer connu" : "Zone en régression"}</p></div>
      <div className="rounded-2xl bg-slate-50 p-3"><span className="flex items-center gap-1 text-slate-400"><Percent className="h-3.5 w-3.5"/>Taux d'infection</span><p className="mt-1 font-bold text-slate-800">{Math.round(zone.infectionRate*100)} %</p></div>
      <div className="rounded-2xl bg-slate-50 p-3"><span className="flex items-center gap-1 text-slate-400"><Images className="h-3.5 w-3.5"/>Feuilles analysées</span><p className="mt-1 font-bold text-slate-800">{zone.diagnosticCount.toLocaleString("fr-FR")}</p></div>
      <div className="rounded-2xl bg-slate-50 p-3"><span className="flex items-center gap-1 text-slate-400"><ShieldCheck className="h-3.5 w-3.5"/>Confiance moyenne</span><p className="mt-1 font-bold text-slate-800">{zone.averageConfidence===null?"—":`${Math.round(zone.averageConfidence*100)} %`}</p></div>
      <div className="rounded-2xl bg-slate-50 p-3"><span className="flex items-center gap-1 text-slate-400"><MapPinned className="h-3.5 w-3.5"/>Position</span><p className="mt-1 font-mono text-[11px] font-semibold text-slate-800">{zone.latitude.toFixed(5)}, {zone.longitude.toFixed(5)}</p></div>
      <div className="rounded-2xl bg-slate-50 p-3"><span className="flex items-center gap-1 text-slate-400"><Clock3 className="h-3.5 w-3.5"/>Dernière détection</span><p className="mt-1 font-semibold text-slate-800">{zone.lastDetectionAt?new Date(zone.lastDetectionAt).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"}):"—"}</p></div>
    </div>
    {zone.surfaceSquareMeters!==null&&<div className="mt-2 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600"><Ruler className="h-4 w-4"/><span>Surface estimée : <strong>{zone.surfaceSquareMeters.toLocaleString("fr-FR",{maximumFractionDigits:1})} m²</strong></span></div>}
    {zone.averageConfidence !== null && zone.averageConfidence < minimumConfidence && <div className="mt-2 flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800"><TrendingDown className="h-4 w-4"/><span>Confiance moyenne faible : vérification terrain recommandée.</span></div>}
    {zone.sourceImageIds.length>0&&<div className="mt-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Images sources</p><div className="grid grid-cols-4 gap-2">{zone.sourceImageIds.slice(0,4).map((id)=><div key={id} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"><Image src={analysisService.imageFileUrl(id)} alt="Image source" fill unoptimized className="object-cover"/></div>)}</div></div>}
    <div className="mt-4 flex gap-2">
      <Link href={`/parcels/${zone.parcelId}/analyses/${zone.analysisId}?from=map`} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#244B32] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#356A46]"><Eye className="h-3.5 w-3.5"/>Ouvrir l'analyse</Link>
      <Link href={`/parcels/${zone.parcelId}?verify=1`} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#BFD1B5] px-3 py-2.5 text-xs font-bold text-[#31583B] hover:bg-[#F4F8F1]"><CheckCircle2 className="h-3.5 w-3.5"/>Vérifier</Link>
    </div>
    <p className="mt-3 text-[10px] leading-4 text-slate-400">Zone d'aide à la décision : la validation terrain reste nécessaire avant toute intervention agronomique.</p>
  </div>;
}
