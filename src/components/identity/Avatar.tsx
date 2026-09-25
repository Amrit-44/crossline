import { getAvatar } from "@/lib/identity";

export function Avatar({ id, size = 40, label }: { id: string; size?: number; label?: string }) {
  const def = getAvatar(id);
  return (
    <span
      role="img"
      aria-label={label ?? `${def.label} avatar`}
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line"
      style={{ width: size, height: size, background: def.bg }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" stroke={def.fg} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {def.paths.map((d) => (
          <path key={d} d={d} />
        ))}
        {(def.circles ?? []).map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />
        ))}
      </svg>
    </span>
  );
}
