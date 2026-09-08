import {
  SEVERITY_BADGE_CLASSES,
  SEVERITY_LABELS,
  type SeverityLevel,
} from "@/lib/severity";

type SeverityBadgeProps = {
  level: SeverityLevel;
  className?: string;
};

export default function SeverityBadge({ level, className = "" }: SeverityBadgeProps) {
  if (level === "inconnu") return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-white ${SEVERITY_BADGE_CLASSES[level]} ${className}`}
    >
      {SEVERITY_LABELS[level]}
    </span>
  );
}
