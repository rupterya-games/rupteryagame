import type { ReactNode } from "react";
import type { StatusEffectKind } from "@rupterya/game-core";

export const statusEffectColors: Record<StatusEffectKind, string> = {
  bleed: "#e5535a",
  burn: "#f0973d",
  poison: "#7fc25a",
  blind: "#c7cdd4",
  stun: "#f0d95a",
  silence: "#9a8fd6",
  marked: "#e8724c",
  taunted: "#e0a63a",
  guard: "#6fa8e0",
  evasion: "#7fd6c2",
  position_lock: "#8a94a6",
  enraged: "#e5533a",
};

function EffectGlyph({ kind }: { kind: StatusEffectKind }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const glyphs: Record<StatusEffectKind, ReactNode> = {
    bleed: <path {...common} d="M12 3c3 4.2 6 8 6 11.2A6 6 0 1 1 6 14.2C6 11 9 7.2 12 3Z" fill="currentColor" fillOpacity=".22" />,
    burn: <path {...common} d="M12 2.5c1 2.6 3.4 4 3.4 7.2A3.4 3.4 0 0 1 12 13c-1 0-1.6-.6-1.6-1.4 0-1 .8-1.4.8-2.4-1.6 1-2.6 3-2.6 4.9A4.4 4.4 0 0 0 12 18.4a4.4 4.4 0 0 0 4.4-4.4c0-4.4-2.6-6.4-4.4-11.5Z" fill="currentColor" fillOpacity=".2" />,
    poison: <><path {...common} d="M9.5 3h5v3.4c1.8 1.2 3 3.3 3 5.7A5.5 5.5 0 0 1 12 17.6a5.5 5.5 0 0 1-5.5-5.5c0-2.4 1.2-4.5 3-5.7V3Z" fill="currentColor" fillOpacity=".18" /><circle cx="10" cy="12.5" r="1" fill="currentColor" /><circle cx="13.4" cy="14" r="1" fill="currentColor" /></>,
    blind: <><path {...common} d="M3 12s3.4-5 9-5 9 5 9 5-3.4 5-9 5-9-5-9-5Z" /><circle cx="12" cy="12" r="2.4" fill="currentColor" /><path {...common} d="M4 4l16 16" /></>,
    stun: <path {...common} d="M13 2 5 13h5l-1 9 8-11h-5l1-9Z" fill="currentColor" fillOpacity=".22" />,
    silence: <><path {...common} d="M5 8h5l5-4v16l-5-4H5V8Z" fill="currentColor" fillOpacity=".2" /><path {...common} d="M3 3l18 18" /></>,
    marked: <><circle {...common} cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><path {...common} d="M12 3v3M12 18v3M3 12h3M18 12h3" /></>,
    taunted: <><path {...common} d="M12 3 4 6.5v5C4 16.5 7.4 20 12 21c4.6-1 8-4.5 8-9.5v-5L12 3Z" fill="currentColor" fillOpacity=".18" /><path {...common} d="M12 8v4.5" /><circle cx="12" cy="16" r="1" fill="currentColor" /></>,
    guard: <path {...common} d="M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6l-7-3Z" fill="currentColor" fillOpacity=".2" />,
    evasion: <><path {...common} d="M3 9c3-3 6-3 9 0M6 14c3-3 6-3 9 0M9 19c3-3 6-3 9 0" /></>,
    position_lock: <><circle {...common} cx="12" cy="6" r="3" /><path {...common} d="M12 9v5M8 20l4-6 4 6M8 14h8" /></>,
    enraged: <path {...common} d="M12 2.5c1 2.6 3.4 4 3.4 7.2A3.4 3.4 0 0 1 12 13c-1 0-1.6-.6-1.6-1.4 0-1 .8-1.4.8-2.4-1.6 1-2.6 3-2.6 4.9A4.4 4.4 0 0 0 12 18.4a4.4 4.4 0 0 0 4.4-4.4c0-4.4-2.6-6.4-4.4-11.5Z" fill="currentColor" fillOpacity=".35" />,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{glyphs[kind]}</svg>;
}

export function StatusEffectIcon({ kind, className = "" }: { kind: StatusEffectKind; className?: string }) {
  return (
    <span className={`status-effect-icon status-effect-${kind} ${className}`.trim()} style={{ color: statusEffectColors[kind] }}>
      <EffectGlyph kind={kind} />
    </span>
  );
}
