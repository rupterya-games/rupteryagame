import type { EquipmentItem, StatusEffectApplication, StatusEffectKind } from "./domain";

// ---------------------------------------------------------------------------
// RNG determinístico e resolução de loot
// ---------------------------------------------------------------------------

/**
 * Responde diretamente "estas duas criaturas lutariam juntas?".
 * Solitárias nunca lutam acompanhadas. As demais precisam de bando em comum
 * ou de uma aliança declarada entre os bandos.
 */
export function canFightTogether(
  a: Pick<BestiaryCreature, "warbandIds" | "solitary">,
  b: Pick<BestiaryCreature, "warbandIds" | "solitary">,
  warbands: Map<string, Warband>,
): boolean {
  if (a.solitary || b.solitary) return false;
  if (a.warbandIds.some((id) => b.warbandIds.includes(id))) return true;
  return a.warbandIds.some((id) => {
    const band = warbands.get(id);
    if (!band) return false;
    return band.allies.some((allyId) => b.warbandIds.includes(allyId));
  });
}

/** PRNG determinístico. A mesma seed sempre produz o mesmo loot — auditável. */
export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rollAmount(entry: LootEntry, random: () => number) {
  const min = entry.min ?? 1;
  const max = entry.max ?? min;
  if (max <= min) return min;
  return min + Math.floor(random() * (max - min + 1));
}

/**
 * Resolve a tabela de drop de uma criatura.
 * `luckBonus` é percentual aditivo aplicado apenas às rolagens de chance
 * (Percepção, Troféu de caça, pet, bônus de evento).
 */
export function rollLoot(table: LootTable, seed: number, luckBonus = 0): LootResult {
  const random = mulberry32(seed);
  const drops: LootResult["drops"] = [];
  const gold = table.goldMin + Math.floor(random() * (table.goldMax - table.goldMin + 1));

  for (const entry of table.guaranteed) {
    drops.push({ id: entry.id, kind: entry.kind, amount: rollAmount(entry, random) });
  }

  for (const entry of table.rolls) {
    const chance = entry.chance * (1 + luckBonus / 100);
    if (random() * 100 < chance) {
      drops.push({ id: entry.id, kind: entry.kind, amount: rollAmount(entry, random) });
    }
  }

  if (table.signature) {
    const chance = table.signature.chance * (1 + luckBonus / 100);
    if (random() * 100 < chance) {
      drops.push({ id: table.signature.id, kind: table.signature.kind, amount: 1 });
    }
  }

  return { gold, drops };
}

/** Resolve o loot de um encontro inteiro, uma seed por criatura abatida. */
export function rollEncounterLoot(
  creatures: Array<Pick<BestiaryCreature, "id" | "loot">>,
  battleSeed: number,
  luckBonus = 0,
): LootResult {
  const merged = new Map<string, { id: string; kind: LootEntryKind; amount: number }>();
  let gold = 0;
  creatures.forEach((creature, index) => {
    const result = rollLoot(creature.loot, (battleSeed + index * 7919) >>> 0, luckBonus);
    gold += result.gold;
    for (const drop of result.drops) {
      const existing = merged.get(drop.id);
      if (existing) existing.amount += drop.amount;
      else merged.set(drop.id, { ...drop });
    }
  });
  return { gold, drops: [...merged.values()] };
}

// ---------------------------------------------------------------------------
// Taxonomia
// ---------------------------------------------------------------------------

export type CreatureFamily =
  | "beast"
  | "undead"
  | "humanoid"
  | "aberration"
  | "construct"
  | "elemental"
  | "insect"
  | "dragonkin";

export type BestiaryRarity = "common" | "rare" | "elite" | "boss" | "worldboss";

export type CreatureArchetype = "swarm" | "skirmisher" | "brute" | "caster" | "tank";

export type LootRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

/** Palavras-chave míticas canônicas de Rupterya. Só itens míticos as concedem. */
export type MythicKeyword =
  | "reflexo"
  | "ruptura"
  | "devorar"
  | "tempestade"
  | "perseguicao"
  | "eco"
  | "retorno"
  | "propagacao"
  | "fortaleza"
  | "cacador"
  | "sacrificio"
  | "convergencia";

export const mythicKeywordText: Record<MythicKeyword, string> = {
  reflexo: "Ao esquivar de um ataque direto, realiza um contra-golpe básico sem consumir cargas naturais.",
  ruptura: "Ao destruir uma Barreira, causa dano adicional ao portador dela.",
  devorar: "Ao derrotar um inimigo, recupera Vida.",
  tempestade: "Um Crítico também atinge inimigos adjacentes.",
  perseguicao: "Ataca o inimigo que tentar trocar de posição.",
  eco: "A primeira habilidade utilizada na batalha pode ser repetida com efeito reduzido.",
  retorno: "Uma vez por batalha, sobrevive a um golpe fatal com 1 de Vida.",
  propagacao: "Veneno ou Sangramento aplicado passa para um inimigo adjacente.",
  fortaleza: "Parte da Barreira perdida é convertida em Defesa Física.",
  cacador: "Causa dano adicional contra inimigos marcados.",
  sacrificio: "Pode gastar Vida para reduzir a recarga de uma habilidade.",
  convergencia: "Ao chegar ao máximo de um recurso, fortalece a próxima carta usada.",
};

// ---------------------------------------------------------------------------
// Derivação de estatísticas
// ---------------------------------------------------------------------------

export interface CreatureStatBlock {
  hpMax: number;
  physicalDamage: number;
  magicalDamage: number;
  physicalDefense: number;
  magicalDefense: number;
  criticalChance: number;
  dodgeChance: number;
  blockChance: number;
}

interface ArchetypeProfile {
  hp: number;
  phys: number;
  magic: number;
  pdef: number;
  mdef: number;
  crit: number;
  dodge: number;
  block: number;
}

/** Perfis de combate. Ajustar aqui rebalanceia o bestiário inteiro. */
export const archetypeProfiles: Record<CreatureArchetype, ArchetypeProfile> = {
  swarm: { hp: 0.55, phys: 0.7, magic: 0.0, pdef: 0.6, mdef: 0.6, crit: 3, dodge: 8, block: 0 },
  skirmisher: { hp: 0.85, phys: 1.25, magic: 0.0, pdef: 0.8, mdef: 0.8, crit: 12, dodge: 14, block: 0 },
  brute: { hp: 1.35, phys: 1.15, magic: 0.0, pdef: 1.05, mdef: 0.7, crit: 6, dodge: 3, block: 5 },
  caster: { hp: 0.75, phys: 0.25, magic: 1.35, pdef: 0.6, mdef: 1.4, crit: 8, dodge: 6, block: 0 },
  tank: { hp: 1.8, phys: 0.75, magic: 0.0, pdef: 1.5, mdef: 1.2, crit: 3, dodge: 2, block: 16 },
};

interface RarityProfile {
  hp: number;
  damage: number;
  defense: number;
  xp: number;
  gold: number;
  dropMultiplier: number;
}

export const rarityProfiles: Record<BestiaryRarity, RarityProfile> = {
  common: { hp: 1, damage: 1, defense: 1, xp: 1, gold: 1, dropMultiplier: 1 },
  rare: { hp: 1.4, damage: 1.15, defense: 1.1, xp: 2.4, gold: 2.8, dropMultiplier: 2.2 },
  elite: { hp: 1.9, damage: 1.3, defense: 1.25, xp: 4, gold: 4.5, dropMultiplier: 4 },
  boss: { hp: 3.4, damage: 1.55, defense: 1.4, xp: 9, gold: 10, dropMultiplier: 9 },
  worldboss: { hp: 6.5, damage: 1.85, defense: 1.6, xp: 22, gold: 26, dropMultiplier: 14 },
};

export function deriveCreatureStats(
  level: number,
  archetype: CreatureArchetype,
  rarity: BestiaryRarity,
): CreatureStatBlock {
  const a = archetypeProfiles[archetype];
  const r = rarityProfiles[rarity];
  const round = (value: number) => Math.round(value);
  return {
    hpMax: round((190 + level * 15) * a.hp * r.hp),
    physicalDamage: round((6 + level * 1.6) * a.phys * r.damage),
    magicalDamage: round((6 + level * 1.6) * a.magic * r.damage),
    physicalDefense: round((2 + level * 0.9) * a.pdef * r.defense),
    magicalDefense: round((2 + level * 0.8) * a.mdef * r.defense),
    criticalChance: a.crit,
    dodgeChance: a.dodge,
    blockChance: round(a.block * r.defense),
  };
}

/**
 * XP e ouro por criatura. Calibrado para que um monstro comum de nível baixo
 * valha por volta de 5 XP, mantendo a referência de design ("3 goblins = 15 XP").
 */
export function deriveRewards(level: number, rarity: BestiaryRarity) {
  const r = rarityProfiles[rarity];
  return {
    xpReward: Math.round((2 + level * 0.9) * r.xp),
    goldReward: Math.round((3 + level * 1.4) * r.gold),
  };
}

/**
 * Penalidade de farm em zona fraca: caçar muito abaixo do nível da conta
 * derruba o XP, impedindo evolução repetindo a mesma região.
 */
export function xpAfterLevelGap(baseXp: number, accountLevel: number, creatureLevel: number) {
  const gap = accountLevel - creatureLevel;
  if (gap <= 4) return baseXp;
  if (gap <= 8) return Math.round(baseXp * 0.6);
  if (gap <= 14) return Math.round(baseXp * 0.25);
  return Math.max(1, Math.round(baseXp * 0.05));
}

// ---------------------------------------------------------------------------
// Itens de loot
// ---------------------------------------------------------------------------

/**
 * Estende EquipmentItem com a raridade Mítica e a palavra-chave.
 * Quando `ItemRarity` do domain.ts receber "mythic", este tipo pode ser fundido.
 */
export interface LootItemDefinition extends Omit<EquipmentItem, "rarity"> {
  rarity: LootRarity;
  keyword?: MythicKeyword;
  /** Texto exibido na ficha do item quando a palavra-chave é única do item. */
  keywordText?: string;
}

export interface MaterialDefinition {
  id: string;
  name: string;
  rarity: LootRarity;
  family: CreatureFamily | "universal";
  description: string;
  /** Materiais de venda direta não entram em receitas. */
  vendorValue: number;
}

/** Curva base de drop por raridade do item, antes do multiplicador da criatura. */
export const baseDropRateByLootRarity: Record<LootRarity, number> = {
  common: 22,
  rare: 11,
  epic: 3.2,
  legendary: 0.6,
  mythic: 0.05,
};

// ---------------------------------------------------------------------------
// Tabelas de drop
// ---------------------------------------------------------------------------

export type LootEntryKind = "material" | "gear";

export interface LootEntry {
  id: string;
  kind: LootEntryKind;
  /** Percentual de 0 a 100 já resolvido para esta criatura. */
  chance: number;
  min?: number;
  max?: number;
}

export interface LootTable {
  goldMin: number;
  goldMax: number;
  /** Sempre cai. Materiais de esfola/coleta. */
  guaranteed: LootEntry[];
  /** Rolagens independentes. */
  rolls: LootEntry[];
  /** Drop assinatura: só esta criatura o concede no jogo inteiro. */
  signature?: LootEntry;
}

export interface LootResult {
  gold: number;
  drops: Array<{ id: string; kind: LootEntryKind; amount: number }>;
}

// ---------------------------------------------------------------------------
// Definição da criatura
// ---------------------------------------------------------------------------

export type DamageChannel = "physical" | "magical";

/** Papel da criatura dentro do bando ao qual pertence. */
export type WarbandRole = "fodder" | "regular" | "leader";

export interface WarbandComposition {
  /** No máximo um por encontro. */
  leaders: string[];
  regulars: string[];
  fodder: string[];
}

/**
 * Um bando define quem luta ao lado de quem.
 * Duas criaturas só aparecem no mesmo encontro se compartilham um bando,
 * ou se os bandos delas constam como aliados.
 */
export interface Warband {
  id: string;
  name: string;
  description: string;
  kingdoms: string[];
  /** Peso de aparição da facção dentro da região. */
  weight: number;
  minSize: number;
  maxSize: number;
  /** Chance de o encontro trazer um líder. */
  leaderChance: number;
  /** Bandos que podem reforçar este. Relação declarada nos dois lados. */
  allies: string[];
  allyChance: number;
  composition: WarbandComposition;
}

export interface BestiaryCreature {
  id: string;
  name: string;
  description: string;
  portraitPath?: string;
  family: CreatureFamily;
  archetype: CreatureArchetype;
  rarity: BestiaryRarity;
  level: number;
  regionId: string;
  kingdom: string;
  stats: CreatureStatBlock;
  xpReward: number;
  goldReward: number;
  /** Efeitos que a criatura aplica ao acertar. */
  statusEffects: StatusEffectApplication[];
  /** Redução percentual de dano recebido, por canal ou por efeito. */
  resistances: Partial<Record<DamageChannel | StatusEffectKind, number>>;
  /** Dano adicional recebido, por canal ou por efeito. */
  weaknesses: Partial<Record<DamageChannel | StatusEffectKind, number>>;
  /**
   * Lista de prioridade da IA, avaliada de cima para baixo.
   * Mesma estrutura usada pela defesa da Arena assíncrona.
   */
  aiPriority: string[];
  /** Bandos aos quais a criatura pertence. Vazio implica solitária. */
  warbandIds: string[];
  /** Papel dentro do bando. */
  role: WarbandRole;
  /** Solitária: nunca aparece acompanhada, nem do próprio tipo. */
  solitary: boolean;
  /** Quantidade típica no encontro de caça. */
  packMin: number;
  packMax: number;
  loot: LootTable;
  /** Texto de bestiário, revelado ao atingir a contagem de abates. */
  loreEntry?: string;
  /** Abates necessários para completar a página do bestiário. */
  codexKills: number;
}

export interface BestiaryRegion {
  id: string;
  name: string;
  kingdom: string;
  description: string;
  levelMin: number;
  levelMax: number;
  danger: string;
  creatureIds: string[];
}
