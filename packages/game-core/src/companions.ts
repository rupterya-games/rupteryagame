/**
 * companions.ts — Sistema de Companions e Progressão (Rupterya V1)
 *
 * REGRAS DE PROGRESSÃO:
 * 1. Level Global da Conta (1 a 50):
 *    - O nível pertence à conta. Se a conta for Lv.37, todos os companions entram Lv.37.
 * 2. Maestria Individual (1 a 50):
 *    - Marcos a cada 5 níveis desbloqueiam e aprimoram o kit de habilidades.
 *    - Maestria 50: Escolhe uma habilidade para se tornar ★ MESTRE com propriedade estratégica.
 * 3. Lealdade Individual (1 a 30):
 *    - Aprimora as Keywords naturais do personagem (+1 ponto percentual a cada 3 níveis, máx +10pp).
 * 4. Party:
 *    - Até 3 personagens ativos controlados pelo jogador no combate.
 */

import type { DamageType } from "./damage-types";
import type { CombatKeywords } from "./keywords";
import type { SkillDefinitionV1 } from "./action-resolver";

export interface CompanionProgress {
  companionId: string;
  masteryLevel: number; // 1-50
  loyaltyLevel: number; // 1-30
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
}

export interface PlayerAccountV1 {
  accountLevel: number; // 1-50 (Global)
  unlockedCompanionIds: string[];
  companionProgress: Record<string, CompanionProgress>;
  activePartyCompanionIds: string[]; // Até 3 companions ativos
}

/**
 * Calcula o bônus de Lealdade (+1pp a cada 3 níveis, máximo +10pp no nível 30).
 */
export function calculateLoyaltyBonus(loyaltyLevel: number): number {
  const cappedLevel = Math.min(30, Math.max(1, loyaltyLevel));
  return Math.floor(cappedLevel / 3);
}

/**
 * Calcula os stats efetivos de um Companion no nível da conta com sua Maestria e Lealdade.
 */
export function buildCompanionCombatantStats(
  companion: CompanionDefinitionV1,
  accountLevel: number,
  progress?: CompanionProgress,
) {
  const levelFactor = 1 + (accountLevel - 1) * 0.05; // Crescimento balanceado e moderado
  const loyaltyBonusPoints = calculateLoyaltyBonus(progress?.loyaltyLevel ?? 1);

  const keywords: CombatKeywords = {
    ...companion.naturalKeywords,
    dodgeChance: companion.naturalKeywords.dodgeChance ? companion.naturalKeywords.dodgeChance + loyaltyBonusPoints : undefined,
    counterAttackChance: companion.naturalKeywords.counterAttackChance ? companion.naturalKeywords.counterAttackChance + loyaltyBonusPoints : undefined,
    blockChance: companion.naturalKeywords.blockChance ? companion.naturalKeywords.blockChance + loyaltyBonusPoints : undefined,
    bleedChance: companion.naturalKeywords.bleedChance ? companion.naturalKeywords.bleedChance + loyaltyBonusPoints : undefined,
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
