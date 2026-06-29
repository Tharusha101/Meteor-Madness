/**
 * Lightweight hover/focus tooltip for explaining technical terms.
 * Full "tooltip on every term" coverage is phase 5; this is the reusable primitive.
 */
import { useState, type ReactNode } from "react";

interface TooltipProps {
  /** The explanatory text shown on hover/focus. */
  content: ReactNode;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span
        tabIndex={0}
        className="cursor-help border-b border-dotted border-slate-500 text-slate-200 outline-none focus-visible:border-accent-cyan"
      >
        {children}
      </span>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-md border border-mission-border bg-mission-panel-2 px-3 py-2 text-xs leading-relaxed text-slate-300 shadow-lg shadow-black/50"
        >
          {content}
        </span>
      )}
    </span>
  );
}

export default Tooltip;
