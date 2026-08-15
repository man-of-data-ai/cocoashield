import { LineChart } from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import ComingSoonPanel from "@/components/layout/ComingSoonPanel";

export default function AnalyseTemporellePage() {
  return (
    <AppShell
      title="Analyse temporelle"
      description="L'évolution de la sévérité par parcelle au fil des missions."
    >
      <ComingSoonPanel
        icon={LineChart}
        message="Cet écran n'est pas encore branché sur les données réelles. Il affichera l'évolution du taux d'infection par parcelle, mission après mission."
      />
    </AppShell>
  );
}
