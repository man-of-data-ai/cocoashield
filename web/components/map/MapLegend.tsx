import { Layers } from "lucide-react";

import {
  SEVERITY_BADGE_CLASSES,
  SEVERITY_LABELS,
  type SeverityLevel,
} from "@/lib/severity";

const LEGEND_LEVELS: SeverityLevel[] = ["faible", "modere", "eleve", "critique"];

export default function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] min-w-[160px] space-y-1.5 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow backdrop-blur">
      <div className="flex items-center gap-1.5 font-bold text-slate-800">
        <Layers className="h-3.5 w-3.5" /> Sévérité
      </div>
      {LEGEND_LEVELS.map((level) => (
        <div key={level} className="flex items-center gap-2 text-slate-600">
          <span className={`h-3 w-3 rounded-full ${SEVERITY_BADGE_CLASSES[level]}`} />
          {SEVERITY_LABELS[level]}
        </div>
      ))}
    </div>
  );
}
