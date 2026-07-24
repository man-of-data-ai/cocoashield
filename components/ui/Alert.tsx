type AlertVariant = "error" | "info" | "success";

type AlertProps = {
  variant?: AlertVariant;
  children: React.ReactNode;
};

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

/** Bandeau d'information / erreur réutilisable dans toute l'application. */
export default function Alert({ variant = "info", children }: AlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </div>
  );
}
