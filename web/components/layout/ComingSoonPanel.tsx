import type { LucideIcon } from "lucide-react";

type ComingSoonPanelProps = {
  icon: LucideIcon;
  message: string;
};

/**
 * Placeholder honnête pour les écrans de la maquette pas encore branchés
 * sur une vraie fonctionnalité backend. Évite un 404 sur les liens de la
 * sidebar tout en étant clair sur l'état d'avancement.
 */
export default function ComingSoonPanel({ icon: Icon, message }: ComingSoonPanelProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <Icon className="mx-auto mb-3 h-8 w-8 text-slate-300" />
      <p className="text-sm font-medium text-slate-600">Bientôt disponible</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">{message}</p>
    </div>
  );
}
