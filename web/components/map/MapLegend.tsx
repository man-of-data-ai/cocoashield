import { CircleDot, Layers, RadioTower } from "lucide-react";
import { SEVERITY_BADGE_CLASSES, SEVERITY_LABELS, type SeverityLevel } from "@/lib/severity";

const LEGEND_LEVELS: SeverityLevel[] = ["faible", "modere", "eleve", "critique"];

export default function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-[1000] min-w-[190px] space-y-2 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow backdrop-blur">
      <div className="flex items-center gap-1.5 font-bold text-slate-800"><Layers className="h-3.5 w-3.5" /> Sévérité des zones</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">{LEGEND_LEVELS.map((level) => <div key={level} className="flex items-center gap-2 text-slate-600"><span className={`h-3 w-3 rounded-full ${SEVERITY_BADGE_CLASSES[level]}`} />{SEVERITY_LABELS[level]}</div>)}</div>
      <div className="border-t border-slate-100 pt-2"><div className="font-bold text-slate-700">Évolution temporelle</div><div className="mt-1 grid gap-1 text-[10px] text-slate-500"><span><b>━━</b> Nouveau foyer</span><span><b>━ ━</b> Foyer connu</span><span><b>· · ·</b> Régression</span></div></div>
      <div className="border-t border-slate-100 pt-2"><div className="flex items-center gap-1.5 font-bold text-slate-700"><CircleDot className="h-3.5 w-3.5"/> Diagnostics</div><div className="mt-1 flex gap-3 text-[10px] text-slate-500"><span><b className="text-emerald-600">●</b> sain</span><span><b className="text-red-600">●</b> infecté</span></div></div>
      <div className="border-t border-slate-100 pt-2"><div className="flex items-center gap-1.5 font-bold text-slate-700"><RadioTower className="h-3.5 w-3.5"/> Qualité géoloc</div><div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-slate-500"><span><b className="text-blue-600">●</b> RTK Fix</span><span><b className="text-violet-600">●</b> RTK Float</span><span><b className="text-amber-500">●</b> GNSS</span><span><b className="text-slate-500">●</b> manuelle</span></div></div>
    </div>
  );
}
