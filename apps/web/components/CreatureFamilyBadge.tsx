export type CreatureFamilyId = "beast" | "undead" | "humanoid" | "aberration" | "construct" | "elemental" | "insect" | "dragonkin";
export type CreatureRarityId = "common" | "rare" | "elite" | "boss" | "worldboss";

export const creatureFamilyLabels: Record<CreatureFamilyId, string> = {
  beast: "Feras", undead: "Mortos-Vivos", humanoid: "Humanoides", aberration: "Aberrações",
  construct: "Constructos", elemental: "Elementais", insect: "Insetos", dragonkin: "Dracônicos",
};
export const creatureRarityLabels: Record<CreatureRarityId, string> = {
  common: "Comum", rare: "Raro", elite: "Elite", boss: "Boss", worldboss: "World Boss",
};
export const creatureFrameImageByFamily: Record<CreatureFamilyId, string> = {
  beast: "/art/frames/beast.png",
  undead: "/art/frames/undead.png",
  humanoid: "/art/frames/humanoid.png",
  aberration: "/art/frames/aberration.png",
  construct: "/art/frames/construct.png",
  elemental: "/art/frames/elemental.png",
  insect: "/art/frames/insect.png",
  dragonkin: "/art/frames/dragonkin.png",
};
/** Só existe arte própria para raro+; comum usa a moldura de família (mais discreta por design). */
export const creatureFrameImageByRarity: Partial<Record<CreatureRarityId, string>> = {
  rare: "/art/frames/rarity/rare.png",
  elite: "/art/frames/rarity/elite.png",
  boss: "/art/frames/rarity/boss.png",
  worldboss: "/art/frames/rarity/worldboss.png",
};
const isFamily = (value?: string): value is CreatureFamilyId => Boolean(value && value in creatureFamilyLabels);
const isRarity = (value?: string): value is CreatureRarityId => Boolean(value && value in creatureRarityLabels);
export function resolveCreatureFamily(value?: string): CreatureFamilyId { return isFamily(value) ? value : "humanoid"; }
export function resolveCreatureRarity(value?: string): CreatureRarityId { return isRarity(value) ? value : "common"; }
export function creatureFrameClassName(family?: string, rarity?: string) { return `creature-family-frame family-${resolveCreatureFamily(family)} rarity-${resolveCreatureRarity(rarity)}`; }

/**
 * Moldura ornamentada real. Criaturas raras ou acima usam a moldura de raridade
 * (caveira + cor por perigo) — a moldura sozinha já avisa "isso é forte". Comuns
 * usam a moldura de família (símbolo do tipo de criatura, sem o drama extra).
 */
export function CreatureFrameOverlay({ family, rarity, className = "" }: { family?: string; rarity?: string; className?: string }) {
  const resolvedFamily = resolveCreatureFamily(family);
  const resolvedRarity = resolveCreatureRarity(rarity);
  const label = `${creatureFamilyLabels[resolvedFamily]} · ${creatureRarityLabels[resolvedRarity]}`;
  const frameSrc = creatureFrameImageByRarity[resolvedRarity] ?? creatureFrameImageByFamily[resolvedFamily];
  return (
    <img
      className={`creature-frame-overlay ${className}`.trim()}
      src={frameSrc}
      alt=""
      role="presentation"
      aria-label={label}
    />
  );
}
