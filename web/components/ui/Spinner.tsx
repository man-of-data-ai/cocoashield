type SpinnerProps = {
  label?: string;
  className?: string;
};

export default function Spinner({ label, className = "" }: SpinnerProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {label && <span className="text-sm">{label}</span>}
    </span>
  );
}
