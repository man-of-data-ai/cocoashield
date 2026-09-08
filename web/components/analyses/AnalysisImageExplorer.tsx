"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, ImageIcon, Minus, Move, Plus, RotateCcw } from "lucide-react";
import { analysisService } from "@/services/analysis-service";
import type { AnalysisImage } from "@/types/parcel";
import type { RiskZone } from "@/lib/risk-zones";
import type { Severity } from "@/lib/severity";

const LABELS: Record<Severity | "healthy" | "unlocated", string> = { critique:"Zone critique", eleve:"Zone élevée", modere:"Zone modérée", faible:"Zone faible", healthy:"Observations saines", unlocated:"Sans géolocalisation" };
const ORDER: Array<Severity | "healthy" | "unlocated"> = ["critique","eleve","modere","faible","healthy","unlocated"];

function distanceMeters(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}){const R=6371000;const p1=a.latitude*Math.PI/180,p2=b.latitude*Math.PI/180;const dp=(b.latitude-a.latitude)*Math.PI/180,dl=(b.longitude-a.longitude)*Math.PI/180;const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
function bucket(image:AnalysisImage,zones:RiskZone[]):Severity|"healthy"|"unlocated"{if(image.status==="processed"&&image.result==="healthy")return "healthy";if(image.latitude===null||image.longitude===null)return "unlocated";let nearest:RiskZone|null=null,dist=Infinity;for(const z of zones){const d=distanceMeters({latitude:image.latitude,longitude:image.longitude},z);if(d<dist){dist=d;nearest=z;}}if(nearest&&dist<=120)return nearest.level;return image.result==="infected"?"modere":"healthy";}

export default function AnalysisImageExplorer({images,zones,selectedImageId,onSelectImage,selectedRiskZone}:{images:AnalysisImage[];zones:RiskZone[];selectedImageId:string|null;onSelectImage:(id:string)=>void;selectedRiskZone:RiskZone|null}){
  const selected=images.find(i=>i.id===selectedImageId)??images[0]??null;
  const [zoom,setZoom]=useState(1); const [offset,setOffset]=useState({x:0,y:0}); const drag=useRef<{x:number;y:number;ox:number;oy:number}|null>(null);
  useEffect(()=>{setZoom(1);setOffset({x:0,y:0});},[selected?.id]);
  const groups=useMemo(()=>{const m=new Map<string,AnalysisImage[]>();for(const i of images){const k=bucket(i,zones);m.set(k,[...(m.get(k)??[]),i]);}return ORDER.map(k=>({key:k,label:LABELS[k],images:m.get(k)??[]})).filter(g=>g.images.length);},[images,zones]);
  return <section className="overflow-hidden rounded-[28px] border border-[#E2E9DE] bg-white shadow-sm">
    <div className="border-b border-[#EDF1EA] p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900">Images par concentration de maladie</h2><p className="mt-1 text-xs text-slate-400">Sélectionnez une observation puis zoomez et déplacez l’image pour inspecter les symptômes.</p></div><ImageIcon className="h-5 w-5 text-[#628847]"/></div>{selectedRiskZone&&<div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#EEF5E9] px-3 py-1.5 text-[11px] font-semibold text-[#31583B]"><Crosshair className="h-3.5 w-3.5"/>Zone {LABELS[selectedRiskZone.level].toLowerCase()} sélectionnée sur la carte</div>}</div>
    {selected?<>
      <div className="relative h-[300px] overflow-hidden bg-slate-950 select-none" onPointerDown={e=>{(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,ox:offset.x,oy:offset.y}}} onPointerMove={e=>{if(!drag.current)return;setOffset({x:drag.current.ox+e.clientX-drag.current.x,y:drag.current.oy+e.clientY-drag.current.y})}} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}>
        {/* eslint-disable-next-line @next/next/no-img-element */}<img src={analysisService.imageFileUrl(selected.id)} alt="Observation agronomique" draggable={false} className="h-full w-full object-contain transition-transform duration-75" style={{transform:`translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,cursor:zoom>1?"grab":"default"}}/>
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-2xl bg-white/95 p-1.5 shadow-lg"><button type="button" onClick={()=>setZoom(z=>Math.max(1,z-.25))} className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-slate-100" aria-label="Dézoomer"><Minus className="h-4 w-4"/></button><span className="w-12 text-center text-[11px] font-bold text-slate-600">{Math.round(zoom*100)}%</span><button type="button" onClick={()=>setZoom(z=>Math.min(4,z+.25))} className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-slate-100" aria-label="Zoomer"><Plus className="h-4 w-4"/></button><button type="button" onClick={()=>{setZoom(1);setOffset({x:0,y:0})}} className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-slate-100" aria-label="Réinitialiser"><RotateCcw className="h-4 w-4"/></button></div>
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 px-2.5 py-1 text-[10px] font-semibold text-white"><Move className="h-3 w-3"/>Glisser pour explorer</div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-b border-[#EDF1EA] p-3 text-[11px] sm:grid-cols-4">
        <div className="rounded-xl bg-[#F7F9F5] p-2"><span className="text-slate-400">Diagnostic</span><p className="mt-0.5 font-bold text-slate-700">{selected.result==="infected"?"Maladie détectée":selected.result==="healthy"?"Observation saine":"En attente"}</p></div>
        <div className="rounded-xl bg-[#F7F9F5] p-2"><span className="text-slate-400">Confiance</span><p className="mt-0.5 font-bold text-slate-700">{selected.confidence===null?"—":`${Math.round(selected.confidence*100)} %`}</p></div>
        <div className="rounded-xl bg-[#F7F9F5] p-2"><span className="text-slate-400">Latitude</span><p className="mt-0.5 truncate font-mono font-semibold text-slate-700">{selected.latitude===null?"—":selected.latitude.toFixed(5)}</p></div>
        <div className="rounded-xl bg-[#F7F9F5] p-2"><span className="text-slate-400">Longitude</span><p className="mt-0.5 truncate font-mono font-semibold text-slate-700">{selected.longitude===null?"—":selected.longitude.toFixed(5)}</p></div>
      </div>
      <div className="max-h-[430px] space-y-4 overflow-auto p-4">{groups.map(group=><div key={group.key}><div className="mb-2 flex items-center justify-between"><h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{group.label}</h3><span className="text-[10px] text-slate-400">{group.images.length} image{group.images.length>1?"s":""}</span></div><div className="grid grid-cols-3 gap-2">{group.images.map(image=><button type="button" key={image.id} onClick={()=>onSelectImage(image.id)} className={`overflow-hidden rounded-xl border text-left transition ${image.id===selected.id?"border-[#628847] ring-2 ring-[#DDEAD5]":"border-slate-200 hover:border-slate-300"}`}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={analysisService.imageFileUrl(image.id)} alt="Observation" className="h-20 w-full object-cover"/><div className="truncate px-2 py-1.5 text-[9px] font-semibold text-slate-500">{image.confidence!==null?`Confiance ${Math.round(image.confidence*100)} %`:image.result==="healthy"?"Saine":"Observation"}</div></button>)}</div></div>)}</div>
    </>:<div className="p-8 text-center text-sm text-slate-500">Aucune image associée à cette analyse.</div>}
  </section>;
}
