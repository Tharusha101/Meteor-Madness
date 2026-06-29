/**
 * Shared "coming soon" panel used by the not-yet-built view slots
 * (3D orbit, impact map) so the layout reads as a finished shell.
 */
interface PlaceholderProps {
  title: string;
  phase: string;
  icon: string;
  blurb: string;
}

export function Placeholder({ title, phase, icon, blurb }: PlaceholderProps) {
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-mission-border bg-mission-panel/40 p-6 text-center">
      <div className="text-4xl opacity-70">{icon}</div>
      <h3 className="mt-3 text-sm font-semibold uppercase tracking-widest text-slate-300">
        {title}
      </h3>
      <span className="mt-1 rounded-full border border-mission-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
        {phase}
      </span>
      <p className="mt-3 max-w-xs text-xs leading-relaxed text-slate-500">{blurb}</p>
    </div>
  );
}

export default Placeholder;
