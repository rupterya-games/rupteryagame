export type DamageFamily = "physical" | "magical" | "hybrid";
export type StatusEffectKind = "bleed" | "burn" | "poison" | "blind";
export type AbilitySlotKind = "skill" | "ultimate" | "stance" | "passive";
export type SecretArtPath = "martial" | "mystic" | "arcane";
export type AbilitySource = "class" | "lineage" | "school" | "secret_art" | "creature";
export type EquipmentSlot = "weapon" | "head" | "chest" | "hands" | "feet" | "trinket";
export type ItemRarity = "common" | "rare" | "epic" | "legendary";

export interface AdventureAttributes {
  perception: number;
  knowledge: number;
  strength: number;
  agility: number;
}

export interface CharacterCombatStats {
  physicalDamage: number;
  magicalDamage: number;
  physicalDefense: number;
  magicalDefense: number;
  criticalChance: number;
  dodgeChance: number;
  bleedChance: number;
  burnChance: number;
  poisonChance: number;
  blindChance: number;
  bleedResistance: number;
  burnResistance: number;
  poisonResistance: number;
  blindResistance: number;
}

export interface StatusEffectApplication {
  kind: StatusEffectKind;
  chance: number;
  turns: number;
  percentMaxHp?: number;
}

export interface CombatStatusEffect extends StatusEffectApplication {
  sourceName: string;
}

export interface CharacterVitals {
  hpCurrent: number;
  hpMax: number;
  mpCurrent: number;
  mpMax: number;
  morale: number;
  gold: number;
}

export interface CharacterSummary extends CharacterVitals {
  name: string;
  className: string;
  kingdom: string;
  level: number;
  power: number;
  stats: CharacterCombatStats;
}

export interface ClassDefinition {
  id: string;
  name: string;
  description: string;
  role: string;
  portraitPath: string;
  baseVitals: Pick<CharacterVitals, "hpMax" | "mpMax" | "morale" | "gold">;
  baseStats: CharacterCombatStats;
  adventure: AdventureAttributes;
}

export interface AbilityDefinition {
  id: string;
  name: string;
  slotKind: AbilitySlotKind;
  description: string;
  damageFamily?: DamageFamily;
  physicalScaling?: number;
  magicalScaling?: number;
  manaCost?: number;
  cooldownTurns?: number;
  statusEffects?: StatusEffectApplication[];
  keywords?: string[];
  source: AbilitySource;
}

export interface SecretArtDefinition extends AbilityDefinition {
  source: "secret_art" | "creature";
  secretArtPath: SecretArtPath;
  discoveryText?: string;
}

export interface CombatLoadout {
  skill1: string | null;
  skill2: string | null;
  skill3: string | null;
  skill4: string | null;
  ultimate: string | null;
  stance: string | null;
  passive: string | null;
}

export type LoadoutSlot = keyof CombatLoadout;

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: ItemRarity;
  itemLevel: number;
  upgradeLevel: number;
  power: number;
  modifiers: Partial<CharacterCombatStats & Pick<CharacterVitals, "hpMax" | "mpMax">>;
  statusEffects?: StatusEffectApplication[];
  keywords?: string[];
  affixes?: string[];
}

export interface EquippedItems {
  weapon: string | null;
  head: string | null;
  chest: string | null;
  hands: string | null;
  feet: string | null;
  trinket: string | null;
}

export interface CharacterPreset {
  id: string;
  name: string;
  loadout: CombatLoadout;
  equipment: EquippedItems;
}

export interface CharacterBuild {
  characterId: string;
  lineageId?: string;
  schoolId?: string;
  loadout: CombatLoadout;
  equippedPetId?: string;
  equippedTrophyId?: string;
  skinId?: string;
}

export interface GameCharacter {
  id: string;
  name: string;
  classId: string;
  kingdom: string;
  lineageId: string | null;
  schoolId: string | null;
  skinId: string;
  vitals: CharacterVitals;
  equipment: EquippedItems;
  ownedAbilityIds: string[];
  presets: CharacterPreset[];
  activePresetId: string;
  inventoryItemIds: string[];
}

export interface DevAccount {
  id: string;
  globalLevel: number;
  globalXp: number;
  characterSlots: number;
  characters: GameCharacter[];
}

export interface HuntCreatureDefinition {
  id: string;
  name: string;
  description: string;
  portraitPath?: string;
  rarity: "common" | "rare" | "boss";
  regionId: string;
  level: number;
  hpMax: number;
  physicalDamage: number;
  physicalDefense: number;
  magicalDefense: number;
  xpReward: number;
  goldReward: number;
  statusEffects?: StatusEffectApplication[];
  equippedItem?: EquipmentItem;
}

export interface HuntRegionDefinition {
  id: string;
  name: string;
  kingdom: string;
  description: string;
  danger: string;
  creatureIds: string[];
}

export interface HuntCombatant {
  id: string;
  name: string;
  portraitPath?: string;
  hpCurrent: number;
  hpMax: number;
  mpCurrent: number;
  mpMax: number;
  stats: CharacterCombatStats;
  activeEffects: CombatStatusEffect[];
  onHitEffects: StatusEffectApplication[];
}

export interface HuntCompanion {
  id: string;
  name: string;
  portraitPath: string;
  description: string;
  magicalDamageScaling: number;
}

export interface HuntBattleLog {
  turn: number;
  text: string;
  tone: "system" | "player" | "enemy" | "victory" | "defeat";
}

export interface HuntBattleState {
  id: string;
  regionId: string;
  creatures: HuntCreatureDefinition[];
  player: HuntCombatant;
  companion: HuntCompanion | null;
  enemies: HuntCombatant[];
  lastPetTargetId: string | null;
  lastPetDamage: number;
  cooldowns: Record<string, number>;
  turn: number;
  status: "active" | "victory" | "defeat";
  log: HuntBattleLog[];
  reward: { xp: number; gold: number; itemIds: string[] } | null;
}

export type GridIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export interface BattleGridSide { slots: Partial<Record<GridIndex, string>>; }
export interface MirroredBattleGrid { player: BattleGridSide; enemy: BattleGridSide; }
