"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";

export type ModernSelectOption = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
};

type ModernSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: ModernSelectOption[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
};

type FloatingPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export default function ModernSelect({
  value,
  onChange,
  options,
  placeholder = "Sélectionner",
  searchable = false,
  disabled = false,
  className = "",
}: ModernSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) =>
      `${option.label} ${option.description ?? ""}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [options, query]);

  useEffect(() => {
    function close(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      )
        setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 12;
      const menuMaxHeight = Math.min(
        320,
        Math.max(180, window.innerHeight - 40),
      );
      const estimatedHeight = Math.min(
        menuMaxHeight,
        (searchable ? 58 : 8) + filtered.length * 48 + 16,
      );
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const shouldOpenAbove =
        spaceBelow < Math.min(estimatedHeight, 240) && rect.top > spaceBelow;
      const top = shouldOpenAbove
        ? Math.max(viewportPadding, rect.top - estimatedHeight - 8)
        : Math.min(window.innerHeight - viewportPadding - 80, rect.bottom + 8);
      setPosition({
        top,
        left: Math.min(
          rect.left,
          Math.max(
            viewportPadding,
            window.innerWidth - Math.max(rect.width, 240) - viewportPadding,
          ),
        ),
        width: Math.max(rect.width, 240),
        maxHeight: menuMaxHeight,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, searchable, filtered.length]);

  const menu =
    open && !disabled && position ? (
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          top: position.top,
          left: position.left,
          width: position.width,
          zIndex: 10000,
        }}
        className="overflow-hidden rounded-2xl border border-[#DFE7DB] bg-white p-2 shadow-[0_22px_60px_rgba(31,61,40,0.22)]"
      >
        {searchable && (
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-[#87B940] focus:bg-white"
            />
          </div>
        )}
        <div
          className="space-y-1 overflow-auto"
          style={{ maxHeight: position.maxHeight - (searchable ? 58 : 8) }}
        >
          {filtered.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setQuery("");
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? "bg-[#EEF5E9]" : "hover:bg-slate-50"}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active ? "bg-[#244B32] text-white" : "bg-slate-100 text-slate-400"}`}
                >
                  {active ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-current" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800">
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="block truncate text-[11px] text-slate-400">
                      {option.description}
                    </span>
                  )}
                </span>
                {option.badge && (
                  <span className="rounded-full bg-[#F2F7EE] px-2 py-1 text-[10px] font-bold text-[#5A7D42]">
                    {option.badge}
                  </span>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-3 py-5 text-center text-xs text-slate-400">
              Aucun résultat
            </p>
          )}
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-[#DDE6D9] bg-white px-3.5 py-2.5 text-left text-sm text-slate-800 shadow-sm outline-none transition hover:border-[#A8C399] focus:ring-4 focus:ring-[#6FA33E]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">
            {selected?.label ?? placeholder}
          </span>
          {selected?.description && (
            <span className="mt-0.5 block truncate text-[11px] text-slate-400">
              {selected.description}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {selected?.badge && (
            <span className="rounded-full bg-[#EEF5E9] px-2 py-0.5 text-[10px] font-bold text-[#4F753B]">
              {selected.badge}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {typeof document !== "undefined" && menu
        ? createPortal(menu, document.body)
        : null}
    </div>
  );
}
