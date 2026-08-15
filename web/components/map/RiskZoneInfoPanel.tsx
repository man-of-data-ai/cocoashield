"use client";

import { MapPinned, Ruler, X } from "lucide-react";
import { SEVERITY_BADGE_CLASSES, SEVERITY_LABELS } from "@/lib/severity";
import type { RiskZone } from "@/lib/risk-zones";

export default function RiskZoneInfoPanel({ zone, onClose }: { zone: RiskZone | null; onClose: () => void }) {
  if (!zone) return null;
  return <div className="absolute bottom-4 left-4 z-[900] w-[min(360px,calc(100%-2rem))] rounded-3xl border border-white/70 bg-white/95 p-4 shadow-xl backdrop-blur">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Zone à risque</p><h3 className="mt-1 font-bold text-slate-900">{zone.parcelName}</h3></div>
      <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4"/></button>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-2xl bg-slate-50 p-3"><span className="text-slate-400">Sévérité</span><div className="mt-1"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold text-white ${SEVERITY_BADGE_CLASSES[zone.level]}`}>{SEVERITY_LABELS[zone.level]}</span></div></div>
      <div className="rounded-2xl bg-slate-50 p-3"><span className="text-slate-400">Intensité</span><p className="mt-1 font-bold text-slate-800">{Math.round(zone.severity*100)} %</p></div>
      <div className="rounded-2xl bg-slate-50 p-3"><span className="flex items-center gap-1 text-slate-400"><MapPinned className="h-3.5 w-3.5"/>Latitude</span><p className="mt-1 font-mono font-semibold text-slate-800">{zone.latitude.toFixed(6)}</p></div>
      <div className="rounded-2xl bg-slate-50 p-3"><span className="flex items-center gap-1 text-slate-400"><MapPinned className="h-3.5 w-3.5"/>Longitude</span><p className="mt-1 font-mono font-semibold text-slate-800">{zone.longitude.toFixed(6)}</p></div>
    </div>
    {zone.surfaceSquareMeters!==null&&<div className="mt-2 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600"><Ruler className="h-4 w-4"/><span>Surface de zone : <strong>{zone.surfaceSquareMeters.toLocaleString("fr-FR",{maximumFractionDigits:1})} m²</strong></span></div>}
  </div>;
}
