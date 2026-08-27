"use client";

import { Check } from "lucide-react";
import {
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  type Severity,
} from "@/lib/severity";

const LEVELS: Severity[] = ["faible", "modere", "eleve", "critique"];

export default function SeverityLayerSelector({
  value,
  onChange,
  compact = false,
}: {
  value: Severity[];
  onChange: (levels: Severity[]) => void;
  compact?: boolean;
}) {
  function toggle(level: Severity) {
    onChange(
      value.includes(level)
        ? value.filter((item) => item !== level)
        : [...value, level],
    );
  }
  return (
    <div className={compact ? "flex flex-wrap gap-2" : "space-y-2"}>
      {LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => toggle(level)}
          className={`flex items-center gap-2 rounded-xl ${compact ? "border border-slate-200 bg-white px-2.5 py-1.5" : "w-full px-1 py-1.5"} text-left text-sm text-slate-700 transition hover:bg-slate-50`}
        >
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-md border ${value.includes(level) ? "border-[#6E9C50] bg-[#6E9C50] text-white" : "border-slate-300 bg-white text-transparent"}`}
          >
            <Check className="h-3.5 w-3.5" />
          </span>
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: SEVERITY_COLORS[level] }}
          />
          <span>{SEVERITY_LABELS[level]}</span>
        </button>
      ))}
    </div>
  );
}
