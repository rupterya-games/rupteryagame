import type { ReactNode } from "react";

export type CreatureFamilyId = "beast" | "undead" | "humanoid" | "aberration" | "construct" | "elemental" | "insect" | "dragonkin";
export type CreatureRarityId = "common" | "rare" | "elite" | "boss" | "worldboss";

export const creatureFamilyLabels: Record<CreatureFamilyId, string> = {
  beast: "Feras", undead: "Mortos-Vivos", humanoid: "Humanoides", aberration: "Aberrações",
  construct: "Constructos", elemental: "Elementais", insect: "Insetos", dragonkin: "Dracônicos",
};
export const creatureRarityLabels: Record<CreatureRarityId, string> = {
  common: "Comum", rare: "Raro", elite: "Elite", boss: "Boss", worldboss: "World Boss",
};
const isFamily = (value?: string): value is CreatureFamilyId => Boolean(value && value in creatureFamilyLabels);
const isRarity = (value?: string): value is CreatureRarityId => Boolean(value && value in creatureRarityLabels);
export function resolveCreatureFamily(value?: string): CreatureFamilyId { return isFamily(value) ? value : "humanoid"; }
export function resolveCreatureRarity(value?: string): CreatureRarityId { return isRarity(value) ? value : "common"; }
export function creatureFrameClassName(family?: string, rarity?: string) { return `creature-family-frame family-${resolveCreatureFamily(family)} rarity-${resolveCreatureRarity(rarity)}`; }

function FamilyGlyph({ family }: { family: CreatureFamilyId }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const glyphs: Record<CreatureFamilyId, ReactNode> = {
    beast: <><path {...common} d="M8 15c0-3 2-5 4-5s4 2 4 5c0 2-1.7 3-4 3s-4-1-4-3Z"/><circle cx="6.5" cy="9" r="1.5" fill="currentColor"/><circle cx="10" cy="6.5" r="1.5" fill="currentColor"/><circle cx="14" cy="6.5" r="1.5" fill="currentColor"/><circle cx="17.5" cy="9" r="1.5" fill="currentColor"/></>,
    undead: <><path {...common} d="M6.5 11a5.5 5.5 0 1 1 11 0v4l-2 1.5V19h-2v-2h-3v2h-2v-2.5L6.5 15v-4Z"/><circle cx="10" cy="12" r="1.2" fill="currentColor"/><circle cx="14" cy="12" r="1.2" fill="currentColor"/><path {...common} d="M12 4c-1-2 1-3 1-4 2 2 2 4 0 6"/></>,
    humanoid: <><path {...common} d="M8 12V8a4 4 0 0 1 8 0v4l-2 2h-4l-2-2Z"/><path {...common} d="M9 10h6M6 18l12-12M18 18 6 6"/></>,
    aberration: <><path {...common} d="M3 12s3.4-5 9-5 9 5 9 5-3.4 5-9 5-9-5-9-5Z"/><circle cx="12" cy="12" r="2.3" fill="currentColor"/><path {...common} d="M12 9.7c3 1 3 4 1 5"/></>,
    construct: <><circle {...common} cx="12" cy="12" r="5"/><path {...common} d="M12 3v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.8 2.8m7.2 7.2 2.8 2.8m0-12.8-2.8 2.8m-7.2 7.2-2.8 2.8"/><rect x="10" y="10" width="4" height="4" fill="currentColor" rx=".6"/></>,
    elemental: <><path {...common} d="M12 3c2 3 3 4.5 3 6.5A3 3 0 0 1 9 9c0-2 1-3.5 3-6Z"/><path {...common} d="M5 12c3 0 4.5 1 4.5 3A2.5 2.5 0 0 1 5 16c-1-1-1-2.5 0-4Z"/><path {...common} d="M19 12c-3 0-4.5 1-4.5 3A2.5 2.5 0 0 0 19 16c1-1 1-2.5 0-4Z"/><path {...common} d="m12 15 3 4-3 2-3-2 3-4Z"/></>,
    insect: <><ellipse {...common} cx="12" cy="13" rx="4" ry="6"/><path {...common} d="M12 7V4m-2 3L8 5m6 2 2-2m-8 6H4m4 4H4m12-4h4m-4 4h4M12 7v12"/></>,
    dragonkin: <><path {...common} d="M5 17c2-6 1-10 7-12l1 3 4-1-1 3 3 2-3 1 1 4-4-2-3 3-5-1Z"/><path {...common} d="M10 12c2-2 4-2 6 0m-2 0h.1"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{glyphs[family]}</svg>;
}

export function CreatureFamilyBadge({ family, rarity, className = "" }: { family?: string; rarity?: string; className?: string }) {
  const resolvedFamily = resolveCreatureFamily(family);
  const resolvedRarity = resolveCreatureRarity(rarity);
  const label = `${creatureFamilyLabels[resolvedFamily]} · ${creatureRarityLabels[resolvedRarity]}`;
  return <span className={`creature-family-badge family-${resolvedFamily} rarity-${resolvedRarity} ${className}`.trim()} aria-label={label} title={label}><FamilyGlyph family={resolvedFamily} /></span>;
}
