"use client";

/** Modale générique réutilisable : overlay + panneau centré. */

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClassName?: string;
};

export default function Dialog({ open, onClose, title, children, maxWidthClassName = "max-w-2xl" }: DialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 px-4">
      <div className={`max-h-[90vh] w-full ${maxWidthClassName} overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl`}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
