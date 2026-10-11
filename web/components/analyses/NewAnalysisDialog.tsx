"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Camera, ImagePlus, Route, ScanSearch, Upload, X } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import ModernSelect from "@/components/ui/ModernSelect";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { analysisService, PartialUploadError } from "@/services/analysis-service";
import { configurationService } from "@/services/configuration-service";
import { missionService } from "@/services/mission-service";
import { ApiError } from "@/lib/api-client";
import { formatBytes, screenImages, type RejectedImage, type UploadLimits } from "@/lib/image-upload";
import type { Analysis, Mission } from "@/types/parcel";
import type { DroneProfile } from "@/types/configuration";

type Props = { open: boolean; onClose: () => void; parcelId: string; parcelName?: string; fixedMissionId?: string; fixedDroneProfileId?: string; onAnalysisCreated: (analysis: Analysis) => void };
type Preview = { file: File; url: string };

export default function NewAnalysisDialog({ open, onClose, parcelId, parcelName, fixedMissionId, fixedDroneProfileId, onAnalysisCreated }: Props) {
  const [images,setImages]=useState<File[]>([]);
  const [missionMode,setMissionMode]=useState<"none"|"existing"|"new">("none");
  const [missionId,setMissionId]=useState("");
  const [missionName,setMissionName]=useState("");
  const [missions,setMissions]=useState<Mission[]>([]);
  const [profileId,setProfileId]=useState("");
  const [profiles,setProfiles]=useState<DroneProfile[]>([]);
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [limits,setLimits]=useState<UploadLimits|null>(null);
  const [rejected,setRejected]=useState<RejectedImage[]>([]);
  const [progress,setProgress]=useState<{sent:number;total:number}|null>(null);
  // Analyse créée avant l’échec d’un lot : remontée au parent à la fermeture.
  const [partial,setPartial]=useState<Analysis|null>(null);

  useEffect(()=>{
    if (!open) return;
    analysisService.getUploadLimits().then(setLimits).catch(()=>setError("Impossible de récupérer les limites d’envoi des photos. Réessayez dans un instant."));
    Promise.allSettled([configurationService.listDroneProfiles(true), missionService.listMissions()]).then(([profilesResult,missionsResult])=>{
      setProfiles(profilesResult.status === "fulfilled" ? profilesResult.value : []);
      if (missionsResult.status === "fulfilled") {
        setMissions(missionsResult.value);
        if (missionsResult.value[0]) setMissionId((value)=>value || missionsResult.value[0].id);
      } else setMissions([]);
    });
  },[open]);

  const previews=useMemo<Preview[]>(()=>images.map((file)=>({file,url:URL.createObjectURL(file)})),[images]);
  useEffect(()=>()=>previews.forEach((p)=>URL.revokeObjectURL(p.url)),[previews]);

  // Une analyse créée par un envoi interrompu est remontée au parent même si l’on abandonne.
  function close(){if(partial)onAnalysisCreated(partial);reset();}
  function reset(){setImages([]);setMissionName("");setProfileId("");setError(null);setRejected([]);setProgress(null);setPartial(null);onClose();}
  function addFiles(files: FileList|null){
    if(!files||!limits)return;
    const {accepted,rejected:refused}=screenImages(Array.from(files),limits);
    setRejected(refused);
    setImages((current)=>[...current,...accepted]);
  }
  function removeAt(index:number){setImages((current)=>current.filter((_,i)=>i!==index));}

  // start=false : les photos sont chargées, l’analyse sera lancée plus tard.
  async function submit(start: boolean){
    if(!limits){setError("Les limites d’envoi des photos ne sont pas encore chargées.");return;}
    if(images.length===0&&partial){
      // Toutes les photos sont déjà chargées : il ne reste qu’à lancer.
      if(!start){close();return;}
      setSubmitting(true);setError(null);
      try{const analysis=await analysisService.startAnalysis(partial.id);onAnalysisCreated(analysis);reset();}
      catch(e){setError(e instanceof ApiError?e.message:"Impossible de lancer l’analyse.");}finally{setSubmitting(false);}
      return;
    }
    if(images.length===0){setError("Ajoutez au moins une photo de feuille.");return;}
    if(!fixedMissionId && missionMode === "existing" && !missionId){setError("Sélectionnez la mission correspondant à cette collecte terrain.");return;}
    if(!fixedMissionId && missionMode === "new" && !missionName.trim()){setError("Donnez un nom à la mission de collecte.");return;}
    setSubmitting(true);setError(null);setProgress({sent:0,total:images.length});
    try{
      const analysis=await analysisService.createAnalysis(parcelId,images,limits,{
        missionId: fixedMissionId || (missionMode === "existing" ? missionId : undefined),
        missionName: fixedMissionId ? undefined : (missionMode === "new" ? missionName : undefined),
        profileId: fixedDroneProfileId || profileId,
        start,
        existing: partial ?? undefined,
        onProgress:(sent,total)=>setProgress({sent,total}),
      });
      onAnalysisCreated(analysis);reset();
    }catch(e){
      if(e instanceof PartialUploadError){
        // Les photos déjà envoyées sont gardées : on ne renvoie que le reste.
        setPartial(e.analysis);setImages((current)=>current.slice(e.sent));
        const reason=e.failure instanceof ApiError?` (${e.failure.message})`:"";
        setError(e.sent===e.total
          ? `Les photos sont chargées mais l’analyse n’a pas pu être lancée${reason}. Réessayez, ou lancez-la plus tard depuis la parcelle.`
          : `Envoi interrompu${reason} : ${e.message} Réessayez pour envoyer les photos restantes dans la même analyse.`);
      }else setError(e instanceof ApiError?e.message:"Impossible d’envoyer les photos.");
    }finally{setSubmitting(false);setProgress(null);}
  }

  const withMission = Boolean(fixedMissionId) || missionMode !== "none";

  return <Dialog open={open} onClose={close} title={parcelName ? `Nouvelle analyse · ${parcelName}` : "Nouvelle analyse"}><div className="space-y-6">
    <div className="rounded-2xl bg-[#F3F7F0] p-4"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#5F8740] shadow-sm"><ScanSearch className="h-5 w-5"/></span><div><h3 className="text-sm font-bold text-slate-900">{withMission ? "Parcelle → Mission → Analyse" : "Parcelle → Analyse"}</h3><p className="mt-1 text-xs leading-5 text-slate-500">Cette analyse sera rattachée à la parcelle sélectionnée{withMission ? " et à une mission de collecte" : ""}. Les résultats alimenteront ensuite la carte et le rapport associé.</p></div></div></div>

    {!fixedMissionId && <div>
      <div className="mb-2 flex items-center justify-between gap-3"><label className="text-xs font-bold text-slate-600">Mission de collecte</label><div className="flex rounded-xl bg-slate-100 p-1 text-[11px] font-bold"><button type="button" onClick={()=>setMissionMode("none")} className={`rounded-lg px-2.5 py-1.5 ${missionMode==="none"?"bg-white text-[#244B32] shadow-sm":"text-slate-400"}`}>Sans mission</button><button type="button" onClick={()=>setMissionMode("existing")} disabled={missions.length===0} className={`rounded-lg px-2.5 py-1.5 ${missionMode==="existing"?"bg-white text-[#244B32] shadow-sm":"text-slate-400"}`}>Existante</button><button type="button" onClick={()=>setMissionMode("new")} className={`rounded-lg px-2.5 py-1.5 ${missionMode==="new"?"bg-white text-[#244B32] shadow-sm":"text-slate-400"}`}>Nouvelle</button></div></div>
      {missionMode === "none" ? null : missionMode === "existing" ? <ModernSelect value={missionId} onChange={setMissionId} searchable placeholder="Sélectionner une mission" options={missions.map((mission)=>({value:mission.id,label:mission.name,description:new Date(mission.missionDate??mission.createdAt).toLocaleDateString("fr-FR")}))}/> : <div className="relative"><Route className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={missionName} onChange={(e)=>setMissionName(e.target.value)} placeholder="Ex. Tournée Soubré · Secteur Nord" className="h-11 w-full rounded-2xl border border-[#DDE6D9] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#9BBC89]"/></div>}
    </div>}

    {!fixedDroneProfileId && <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Profil de drone / détection</label><ModernSelect value={profileId} onChange={setProfileId} options={[{value:"",label:"Détection standard"},...profiles.map((p)=>({value:p.profileId,label:p.profileId,description:`${p.manufacturer} ${p.model}`}))]}/></div>}

    <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-[#BFD1B5] bg-[#FBFDF9] px-5 py-6 text-center transition hover:border-[#7FA064] hover:bg-[#F7FAF4]"><ImagePlus className="h-7 w-7 text-[#668A4C]"/><span className="mt-2 text-sm font-bold text-slate-800">Ajouter les photos de l’analyse</span><span className="mt-1 text-xs text-slate-400">Les coordonnées GPS présentes dans les fichiers seront conservées</span>{limits&&<span className="mt-1 text-xs text-slate-400">JPEG, PNG, WebP ou TIFF · {formatBytes(limits.maxImageSizeBytes)} max par photo · nombre de photos illimité</span>}<input type="file" accept={limits?.acceptedMimeTypes.join(",")??"image/*"} multiple disabled={!limits||submitting||Boolean(partial)} className="hidden" onChange={(e)=>{addFiles(e.target.files);e.target.value="";}}/></label>
    {rejected.length>0&&<Alert variant="error"><p className="font-semibold">{rejected.length} fichier{rejected.length>1?"s":""} non ajouté{rejected.length>1?"s":""} :</p><ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">{rejected.slice(0,8).map((r,i)=><li key={`${r.name}-${i}`}><span className="font-semibold">{r.name}</span> : {r.reason}</li>)}{rejected.length>8&&<li>et {rejected.length-8} autre{rejected.length-8>1?"s":""}</li>}</ul></Alert>}
    {previews.length>0&&<div><div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Aperçu</p><span className="rounded-full bg-[#EDF5E8] px-2.5 py-1 text-[11px] font-bold text-[#56773F]">{previews.length} photo{previews.length>1?"s":""}</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{previews.map((preview,index)=><div key={`${preview.file.name}-${index}`} className="group relative overflow-hidden rounded-2xl border border-[#E1E8DD] bg-white"><Image src={preview.url} alt={preview.file.name} width={240} height={112} unoptimized className="h-28 w-full object-cover"/><button type="button" onClick={()=>removeAt(index)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow"><X className="h-3.5 w-3.5"/></button><p className="truncate px-2.5 py-2 text-[10px] font-semibold text-slate-500">{preview.file.name}</p></div>)}</div></div>}
    {error&&<Alert variant="error">{error}</Alert>}
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={close} disabled={submitting} className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Annuler</button><button type="button" onClick={()=>submit(false)} disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D9E5D3] px-5 py-2.5 text-sm font-bold text-[#31583B] hover:bg-[#F6FAF3] disabled:opacity-60"><Upload className="h-4 w-4"/>Charger sans lancer</button><button type="button" onClick={()=>submit(true)} disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#244B32] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#356A46] disabled:opacity-60">{submitting?<Spinner label={progress&&progress.total>0?`Envoi des photos… ${progress.sent}/${progress.total}`:"Envoi des photos..."}/>:<><Camera className="h-4 w-4"/>Lancer l’analyse</>}</button></div>
  </div></Dialog>;
}
