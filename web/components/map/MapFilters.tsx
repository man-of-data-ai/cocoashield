import { Check, SlidersHorizontal } from "lucide-react";
import ModernSelect from "@/components/ui/ModernSelect";
import { ALL_GEOLOC_QUALITIES, type MapFiltersState } from "@/lib/map-filters";
import { SEVERITY_LABELS, type SeverityLevel } from "@/lib/severity";
import type { DroneProfile } from "@/types/configuration";
import type { GeolocationQuality, Mission, Parcel } from "@/types/parcel";

const LEVELS: SeverityLevel[] = ["faible", "modere", "eleve", "critique"];
const LEVEL_DOTS: Record<string, string> = { faible: "bg-emerald-500", modere: "bg-amber-400", eleve: "bg-orange-500", critique: "bg-red-600" };
const GEO_LABELS: Record<GeolocationQuality,string> = { precise:"GPS précis", approximate:"Approximative", none:"Sans géolocalisation" };

type Props={filters:MapFiltersState;onChange:(filters:MapFiltersState)=>void;missions:Mission[];parcels:Parcel[];droneProfiles:DroneProfile[]};

export default function MapFilters({filters,onChange,missions,parcels,droneProfiles}:Props){
  const selectedMission=filters.missionIds.length===1?filters.missionIds[0]:"";
  const selectedParcel=filters.parcelIds.length===1?filters.parcelIds[0]:"";
  const selectedGeo=filters.geolocQualities.length===1?filters.geolocQualities[0]:"all";

  function toggleLevel(level:SeverityLevel){
    const next = filters.activeLevels.includes(level) ? filters.activeLevels.filter((x)=>x!==level) : [...filters.activeLevels,level];
    onChange({...filters,activeLevels:next});
  }

  function toggleDrone(profileId:string){
    const allIds = droneProfiles.map((profile)=>profile.profileId);
    const current = filters.droneProfileIds.length === 0 ? allIds : filters.droneProfileIds;
    const next = current.includes(profileId) ? current.filter((id)=>id!==profileId) : [...current, profileId];
    onChange({...filters,droneProfileIds: next.length === allIds.length ? [] : next});
  }

  const isDroneChecked = (profileId:string) => filters.droneProfileIds.length === 0 || filters.droneProfileIds.includes(profileId);

  return <aside className="rounded-[24px] border border-[#E1E8DD] bg-white p-4 shadow-sm">
    <div className="flex items-center gap-2 text-base font-bold text-slate-800"><SlidersHorizontal className="h-5 w-5 text-[#628847]"/>Filtres</div>

    <div className="mt-5 space-y-5">
      <section>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Période</p>
        <div className="grid grid-cols-2 gap-2">
          <input aria-label="Date de début" type="date" value={filters.customStart??""} onChange={(e)=>onChange({...filters,period:"custom",customStart:e.target.value||null})} className="h-11 min-w-0 rounded-2xl border border-[#DEE6DA] bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#A9C09C]"/>
          <input aria-label="Date de fin" type="date" value={filters.customEnd??""} onChange={(e)=>onChange({...filters,period:"custom",customEnd:e.target.value||null})} className="h-11 min-w-0 rounded-2xl border border-[#DEE6DA] bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#A9C09C]"/>
        </div>
      </section>

      <section>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Mission</p>
        <ModernSelect value={selectedMission} onChange={(value)=>onChange({...filters,missionIds:value?[value]:[]})} searchable options={[{value:"",label:"Toutes les missions"},...missions.map((m)=>({value:m.id,label:m.name}))]}/>
      </section>

      <section>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Sévérité</p>
        <div className="space-y-2">
          {LEVELS.map((level)=><button key={level} type="button" onClick={()=>toggleLevel(level)} className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left text-sm text-slate-700 transition hover:bg-[#F7F9F5]">
            <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${filters.activeLevels.includes(level)?"border-[#6E9C50] bg-[#6E9C50] text-white":"border-slate-300 bg-white text-transparent"}`}><Check className="h-3.5 w-3.5"/></span>
            <span className={`h-3 w-3 rounded-full ${LEVEL_DOTS[level]}`}/><span>{SEVERITY_LABELS[level]}</span>
          </button>)}
        </div>
      </section>

      <section>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Drone</p>
        <div className="space-y-2">
          {droneProfiles.length===0?<p className="text-xs text-slate-400">Aucun drone configuré</p>:droneProfiles.map((profile)=><button key={profile.id} type="button" onClick={()=>toggleDrone(profile.profileId)} className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left text-sm text-slate-700 transition hover:bg-[#F7F9F5]">
            <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${isDroneChecked(profile.profileId)?"border-[#6E9C50] bg-[#6E9C50] text-white":"border-slate-300 bg-white text-transparent"}`}><Check className="h-3.5 w-3.5"/></span>
            <span className="truncate">{profile.manufacturer} {profile.model}</span>
          </button>)}
        </div>
      </section>

      <section>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Qualité géoloc</p>
        <ModernSelect value={selectedGeo} onChange={(value)=>onChange({...filters,geolocQualities:value==="all"?ALL_GEOLOC_QUALITIES:[value as GeolocationQuality]})} options={[{value:"all",label:"Toutes"},...ALL_GEOLOC_QUALITIES.map((q)=>({value:q,label:GEO_LABELS[q]}))]}/>
      </section>

      <section>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Parcelle</p>
        <ModernSelect value={selectedParcel} onChange={(value)=>onChange({...filters,parcelIds:value?[value]:[]})} searchable options={[{value:"",label:"Toutes les parcelles"},...parcels.map((p)=>({value:p.id,label:p.name}))]}/>
      </section>

    </div>
  </aside>;
}
