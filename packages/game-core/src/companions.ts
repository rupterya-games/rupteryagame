/**
 * companions.ts — Sistema de Companions e Progressão (Rupterya V1)
 *
 * REGRAS DE PROGRESSÃO:
 * 1. Level Global da Conta (1 a 50):
 *    - O nível pertence à conta. Se a conta for Lv.37, todos os companions entram Lv.37.
 *    - Os stats base cadastrados no bestiário representam o teto de Lv.50; níveis menores
 *      interpolam entre um piso (LEVEL_SCALING_FLOOR) e esse teto — não multiplicam o teto de novo.
 * 2. Maestria Individual (1 a 50):
 *    - A cada marco de 5 níveis (10 marcos), todas as habilidades do kit recebem
 *      +MASTERY_MILESTONE_POWER_BONUS de escala de Potência (aditivo).
 *    - Maestria 50: o jogador escolhe 1 habilidade para virar ★ Mestre, recebendo bônus
 *      adicional de escala e redução de recarga.
 * 3. Lealdade Individual (1 a 30):
 *    - Concede um orçamento de pontos (1pp a cada 3 níveis, máx 10pp em Lv.30).
 *    - O jogador ALOCA esses pontos entre as Keywords naturais do personagem — não são
 *      aplicados automaticamente a todas ao mesmo tempo.
 * 4. Party:
 *    - Até 3 personagens ativos controlados pelo jogador no combate.
 */

import type { DamageType } from "./damage-types";
import type { CombatKeywords } from "./keywords";
import { KEYWORD_PERCENT_CAP } from "./keywords";
import type { SkillDefinitionV1 } from "./action-resolver";

export interface CompanionProgress {
  companionId: string;
  masteryLevel: number; // 1-50
  loyaltyLevel: number; // 1-30 — define o ORÇAMENTO de pontos disponível, não o efeito em si
  loyaltyAllocation?: Partial<Record<LoyaltyKeyword, number>>; // onde o jogador gastou o orçamento
  masterSkillId?: string; // Habilidade escolhida como ★ Mestre no Lv.50
}

export interface CompanionDefinitionV1 {
  id: string;
  name: string;
  className: string;
  family: string; // Ex: "human", "elemental", "undead"
  damageType: DamageType;
  basePower: number;
  baseHp: number;
  basePhysicalDefense: number;
  baseMagicalDefense: number;
  baseSpeed: number;
  explorationAttribute: "strength" | "agility" | "perception" | "knowledge"; // Especialidade +1
  naturalKeywords: CombatKeywords;
  skills: SkillDefinitionV1[];
  ultimate: SkillDefinitionV1;
  /** Habilidade que a Última Suspiro (last_breath) dispara automaticamente antes de morrer, se houver. */
  deathReactionSkill?: SkillDefinitionV1;
}

export interface PlayerAccountV1 {
  accountLevel: number; // 1-50 (Global)
  unlockedCompanionIds: string[];
  companionProgress: Record<string, CompanionProgress>;
  activePartyCompanionIds: string[]; // Até 3 companions ativos
}

// ==========================================
// LEALDADE — orçamento de pontos alocáveis
// ==========================================

export const LOYALTY_KEYWORDS = ["dodgeChance", "counterAttackChance", "blockChance", "bleedChance"] as const;
export type LoyaltyKeyword = (typeof LOYALTY_KEYWORDS)[number];

export const LOYALTY_MAX_LEVEL = 30;
export const LOYALTY_MAX_POINTS = 10;

/**
 * Calcula o orçamento TOTAL de pontos de Lealdade disponíveis (+1pp a cada 3 níveis, máximo 10pp no nível 30).
 * Isso é só o orçamento — onde os pontos vão é decisão do jogador via `loyaltyAllocation`.
 */
export function calculateLoyaltyBonus(loyaltyLevel: number): number {
  const cappedLevel = Math.min(LOYALTY_MAX_LEVEL, Math.max(1, loyaltyLevel));
  return Math.min(LOYALTY_MAX_POINTS, Math.floor(cappedLevel / 3));
}

/**
 * Garante que a alocação de pontos do jogador nunca ultrapasse o orçamento disponível.
 * Se o total alocado exceder o orçamento, os pontos são cortados na ordem declarada
 * (o que já foi somado até o limite fica; o excedente é descartado).
 */
export function clampLoyaltyAllocation(
  allocation: Partial<Record<LoyaltyKeyword, number>>,
  totalPoints: number,
): Partial<Record<LoyaltyKeyword, number>> {
  const clamped: Partial<Record<LoyaltyKeyword, number>> = {};
  let remaining = Math.max(0, totalPoints);
  for (const key of LOYALTY_KEYWORDS) {
    const requested = Math.max(0, Math.floor(allocation[key] ?? 0));
    const granted = Math.min(requested, remaining);
    if (granted > 0) clamped[key] = granted;
    remaining -= granted;
  }
  return clamped;
}

// ==========================================
// ESCALA DE NÍVEL — bestiário é o teto de Lv.50
// ==========================================

export const LEVEL_SCALING_FLOOR = 0.4; // stats no Lv.1 = 40% do teto cadastrado
export const LEVEL_SCALING_MAX_LEVEL = 50;

/**
 * Interpola linearmente entre o piso (Lv.1) e o teto cadastrado no bestiário (Lv.50).
 * Os valores em `CompanionDefinitionV1` (baseHp, basePower, ...) JÁ SÃO o teto de Lv.50 —
 * este fator nunca deve multiplicar o teto de novo, só reduzi-lo para níveis menores.
 */
export function levelScalingFactor(accountLevel: number): number {
  const level = Math.min(LEVEL_SCALING_MAX_LEVEL, Math.max(1, accountLevel));
  const t = (level - 1) / (LEVEL_SCALING_MAX_LEVEL - 1);
  return LEVEL_SCALING_FLOOR + (1 - LEVEL_SCALING_FLOOR) * t;
}

// ==========================================
// MAESTRIA — marcos a cada 5 níveis + ★ Mestre no 50
// ==========================================

export const MASTERY_MAX_LEVEL = 50;
export const MASTERY_MILESTONE_STEP = 5;
export const MASTERY_MILESTONE_POWER_BONUS = 0.03; // +3% de escala de Potência por marco
export const MASTERY_MASTER_POWER_BONUS = 0.25; // +25% de escala extra na habilidade ★ Mestre
export const MASTERY_MASTER_COOLDOWN_REDUCTION = 1; // -1 turno de recarga na habilidade ★ Mestre

export function masteryMilestonesReached(masteryLevel: number): number {
  const level = Math.min(MASTERY_MAX_LEVEL, Math.max(1, masteryLevel));
  return Math.floor(level / MASTERY_MILESTONE_STEP);
}

/**
 * Aplica os bônus de Maestria (marcos cumulativos + ★ Mestre) sobre uma cópia do kit de habilidades.
 * Não muta as definições originais do bestiário.
 */
export function applyMasteryToSkills(
  skills: SkillDefinitionV1[],
  masteryLevel: number,
  masterSkillId?: string,
): SkillDefinitionV1[] {
  const milestones = masteryMilestonesReached(masteryLevel);
  const milestoneBonus = milestones * MASTERY_MILESTONE_POWER_BONUS;
  const masterUnlocked = masteryLevel >= MASTERY_MAX_LEVEL && Boolean(masterSkillId);

  return skills.map((skill) => {
    const isMaster = masterUnlocked && skill.id === masterSkillId;
    const powerScaling = skill.powerScaling > 0 ? skill.powerScaling + milestoneBonus + (isMaster ? MASTERY_MASTER_POWER_BONUS : 0) : skill.powerScaling;
    const cooldownTurns = isMaster ? Math.max(0, skill.cooldownTurns - MASTERY_MASTER_COOLDOWN_REDUCTION) : skill.cooldownTurns;
    if (powerScaling === skill.powerScaling && cooldownTurns === skill.cooldownTurns && !isMaster) return skill;
    return { ...skill, powerScaling, cooldownTurns, isMasterSkill: isMaster || undefined };
  });
}

// ==========================================
// STATS EFETIVOS DE COMBATE
// ==========================================

/**
 * Calcula os stats efetivos de um Companion no nível da conta com sua Maestria e Lealdade.
 */
export function buildCompanionCombatantStats(
  companion: CompanionDefinitionV1,
  accountLevel: number,
  progress?: CompanionProgress,
) {
  const levelFactor = levelScalingFactor(accountLevel);
  const totalLoyaltyPoints = calculateLoyaltyBonus(progress?.loyaltyLevel ?? 1);
  const allocation = clampLoyaltyAllocation(progress?.loyaltyAllocation ?? {}, totalLoyaltyPoints);

  const rawKeywords: CombatKeywords = {
    ...companion.naturalKeywords,
    dodgeChance: companion.naturalKeywords.dodgeChance !== undefined ? companion.naturalKeywords.dodgeChance + (allocation.dodgeChance ?? 0) : undefined,
    counterAttackChance: companion.naturalKeywords.counterAttackChance !== undefined ? companion.naturalKeywords.counterAttackChance + (allocation.counterAttackChance ?? 0) : undefined,
    blockChance: companion.naturalKeywords.blockChance !== undefined ? companion.naturalKeywords.blockChance + (allocation.blockChance ?? 0) : undefined,
    bleedChance: companion.naturalKeywords.bleedChance !== undefined ? companion.naturalKeywords.bleedChance + (allocation.bleedChance ?? 0) : undefined,
  };
  // Aplica o teto de 30% mantendo `undefined` (Keyword ausente) distinto de `0` (Keyword em 0%).
  const keywords: CombatKeywords = {
    ...rawKeywords,
    dodgeChance: rawKeywords.dodgeChance !== undefined ? Math.min(KEYWORD_PERCENT_CAP, Math.max(0, rawKeywords.dodgeChance)) : undefined,
    counterAttackChance: rawKeywords.counterAttackChance !== undefined ? Math.min(KEYWORD_PERCENT_CAP, Math.max(0, rawKeywords.counterAttackChance)) : undefined,
    blockChance: rawKeywords.blockChance !== undefined ? Math.min(KEYWORD_PERCENT_CAP, Math.max(0, rawKeywords.blockChance)) : undefined,
    bleedChance: rawKeywords.bleedChance !== undefined ? Math.min(KEYWORD_PERCENT_CAP, Math.max(0, rawKeywords.bleedChance)) : undefined,
  };

  return {
    hpMax: Math.round(companion.baseHp * levelFactor),
    power: Math.round(companion.basePower * levelFactor),
    physicalDefense: Math.round(companion.basePhysicalDefense * levelFactor),
    magicalDefense: Math.round(companion.baseMagicalDefense * levelFactor),
    speed: companion.baseSpeed,
    keywords,
  };
}

/**
 * Calcula o kit de habilidades efetivo (com Maestria aplicada) de um Companion.
 */
export function buildCompanionSkillLoadout(
  companion: CompanionDefinitionV1,
  progress?: CompanionProgress,
): { skills: SkillDefinitionV1[]; ultimate: SkillDefinitionV1 } {
  const masteryLevel = progress?.masteryLevel ?? 1;
  const allSkills = applyMasteryToSkills([...companion.skills, companion.ultimate], masteryLevel, progress?.masterSkillId);
  return {
    skills: allSkills.slice(0, companion.skills.length),
    ultimate: allSkills[allSkills.length - 1],
  };
}

export function skillV1ToAbilityDefinition(skill: SkillDefinitionV1, companionClass: string): import("./domain").AbilityDefinition {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    slotKind: skill.isUltimate ? "ultimate" : "skill",
    damageFamily: skill.defenseChannel === "magical" ? "magical" : "physical",
    source: "class",
    range: skill.range,
    area: skill.area ? {
      shape: skill.area.shape,
      radius: skill.area.radius,
    } : { shape: "single" },
    damageType: skill.damageType,
    powerScaling: skill.powerScaling,
    defenseChannel: skill.defenseChannel,
    isUltimate: skill.isUltimate,
    requiredChargeTurns: skill.isUltimate ? (skill.cooldownTurns ?? 4) : undefined,
    cooldownTurns: skill.isUltimate ? 0 : skill.cooldownTurns,
  };
}

export function companionToHuntCombatant(
  companion: CompanionDefinitionV1,
  accountLevel: number,
  progress?: CompanionProgress,
  positionIndex: number = 0,
): import("./domain").HuntCombatant {
  const stats = buildCompanionCombatantStats(companion, accountLevel, progress);
  const startCells: import("./domain").Axial[] = [
    { q: 0, r: 2 },  // Posição 0 (Centro - Aldren)
    { q: 1, r: 2 },  // Posição 1 (Direita - Kael)
    { q: -1, r: 2 }, // Posição 2 (Esquerda - Elyra)
  ];
  const portraitMap: Record<string, string> = {
    paladin_aldren: "/art/characters/paladin.png",
    samurai_kael: "/art/characters/samurai.png",
    archer_elyra: "/art/characters/archer.png",
  };
  const abilities = [
    ...companion.skills.map((s) => skillV1ToAbilityDefinition(s, companion.className)),
    skillV1ToAbilityDefinition(companion.ultimate, companion.className),
  ];
  const creatureAbilities: import("./domain").CreatureAbilityDefinition[] = abilities.map((a) => ({
    id: a.id,
    name: a.name,
    damageFamily: a.defenseChannel === "magical" ? "magical" : "physical",
    scaling: a.powerScaling ?? 1.0,
    cooldownTurns: a.cooldownTurns ?? 0,
    target: a.area && a.area.shape !== "single" ? "all_enemies" : "single_enemy",
    description: a.description,
    aiTrigger: "always",
    range: a.range,
    area: a.area,
  }));
  const requiredCharge = companion.ultimate.cooldownTurns || 4;

  return {
    id: companion.id,
    name: companion.name,
    className: companion.className,
    portraitPath: portraitMap[companion.id] ?? "/art/characters/paladin.png",
    hpCurrent: stats.hpMax,
    hpMax: stats.hpMax,
    mpCurrent: 0,
    mpMax: 0,
    power: stats.power,
    damageType: companion.damageType,
    defenseChannel: companion.skills[0]?.defenseChannel ?? "physical",
    tags: [companion.id.split("_")[0], companion.family],
    position: startCells[positionIndex] ?? { q: 0, r: 2 },
    facing: 2,
    visionRange: 4,
    visionTraits: [],
    isPartyMember: true,
    ultimateCurrentCharge: 0,
    ultimateRequiredCharge: requiredCharge,
    activeEffects: [],
    onHitEffects: [],
    abilities: creatureAbilities,
    abilityCooldowns: {},
    counterAttack: stats.keywords.counterAttackChance
      ? { chance: stats.keywords.counterAttackChance, scaling: stats.keywords.counterAttackScaling ?? 1.0, sourceName: "Contra-golpe" }
      : undefined,
    stats: {
      speed: stats.speed,
      physicalDamage: stats.power,
      magicalDamage: stats.power,
      physicalDefense: stats.physicalDefense,
      magicalDefense: stats.magicalDefense,
      criticalChance: 10,
      dodgeChance: stats.keywords.dodgeChance ?? 0,
      blockChance: stats.keywords.blockChance ?? 0,
      bleedChance: stats.keywords.bleedChance ?? 0,
      burnChance: 0,
      poisonChance: 0,
      blindChance: 0,
      bleedResistance: 15,
      burnResistance: 15,
      poisonResistance: 15,
      blindResistance: 15,
    },
  };
}
