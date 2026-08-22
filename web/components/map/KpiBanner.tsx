import { Clock3, Layers3, MapPin, Plane } from "lucide-react";
import { formatArea } from "@/lib/geo";

type KpiBannerProps = {
  missionsCount: number;
  activeZones: number;
  infectedSurfaceSquareMeters: number;
  freshnessLabel: string;
};

export default function KpiBanner({
  missionsCount,
  activeZones,
  infectedSurfaceSquareMeters,
  freshnessLabel,
}: KpiBannerProps) {
  const items = [
    { label: "Missions cartographiées", value: missionsCount.toString(), icon: Plane },
    { label: "Zones actives", value: activeZones.toString(), icon: MapPin },
    { label: "Surface infectée", value: formatArea(infectedSurfaceSquareMeters), icon: Layers3 },
    { label: "Fraîcheur", value: freshnessLabel, icon: Clock3 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-[#344E41]">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      ))}
    </div>
  );
}
