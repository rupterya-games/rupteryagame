/**
 * keywords.ts — Sistema de Keywords de Combate (Rupterya V1)
 *
 * Keywords são mecânicas características de especialização.
 * Teto universal para keywords percentuais: 30%.
 *
 * Keywords V1:
 * - Esquiva (dodgeChance) — Funciona SOMENTE contra ataques Single Target.
 * - Contra-golpe (counterAttackChance) — Reação pós-hit quando vivo e sem esquiva.
 * - Bloqueio (blockChance) — Reduz parte do dano recebido.
 * - Sangramento (bleedChance) — Aplica DoT ao causar hit.
 * - Provocar (taunt) — Força a unidade a mirar no provocador.
 * - Ataque de Oportunidade (opportunityAttack) — Reação rápida ao movimento adjacente.
 * - Interromper (interrupt) — Cancela habilidades em carregamento.
 * - Vampirismo (vampirism) — Converte dano causado em cura.
 * - Ataque pelas Costas (backstab) — Bônus de dano ao atacar o arco traseiro.
 */

export const KEYWORD_PERCENT_CAP = 30; // Teto universal de 30% para todas as keywords percentuais

export interface CombatKeywords {
  /** Chance de Esquiva (0-30%). Válido APENAS para Single Target. */
  dodgeChance?: number;
  /** Chance de Contra-golpe (0-30%). */
  counterAttackChance?: number;
  /** Escala de dano do contra-golpe (ex: 1.0 = 100% da Potência). */
  counterAttackScaling?: number;
  /** Chance de Bloqueio (0-30%). */
  blockChance?: number;
  /** Redução percentual ao bloquear (ex: 40 = 40% do dano mitigado extra). */
  blockReductionPercent?: number;
  /** Chance de Sangramento (0-30%). */
  bleedChance?: number;
  /** Dano por tick do sangramento. */
  bleedDamagePerTurn?: number;
  /** Duração em turnos do sangramento. */
  bleedDuration?: number;
  /** Tem Vampirismo (ex: cura % do dano causado em ataques normais). */
  vampirismPercent?: number;
  /** Cura % do dano causado ESPECIFICAMENTE por Contra-golpe (ex: Katana Vampírica). Não afeta ataques normais. */
  counterVampirismPercent?: number;
  /** É imune a interrupção. */
  unstoppable?: boolean;
  /** Provoca alvos ao acertar certas habilidades. */
  tauntDuration?: number;
  /** Bônus de Ataque pelas Costas (%). */
  backstabBonusPercent?: number;
}

/**
 * Aplica o teto universal de 30% a todas as chances de Keywords percentuais.
 */
export function clampKeywordChances(keywords: CombatKeywords): CombatKeywords {
  return {
    ...keywords,
    dodgeChance: Math.min(KEYWORD_PERCENT_CAP, Math.max(0, keywords.dodgeChance ?? 0)),
    counterAttackChance: Math.min(KEYWORD_PERCENT_CAP, Math.max(0, keywords.counterAttackChance ?? 0)),
    blockChance: Math.min(KEYWORD_PERCENT_CAP, Math.max(0, keywords.blockChance ?? 0)),
    bleedChance: Math.min(KEYWORD_PERCENT_CAP, Math.max(0, keywords.bleedChance ?? 0)),
  };
}

/**
 * Combina keywords base de um personagem com bônus de Lealdade e Equipamentos, respeitando o cap de 30%.
 */
export function aggregateKeywords(
  base: CombatKeywords,
  loyaltyBonus: Partial<CombatKeywords> = {},
  equipmentBonus: Partial<CombatKeywords> = {},
  temporaryBuffs: Partial<CombatKeywords> = {},
): CombatKeywords {
  const combined: CombatKeywords = {
    dodgeChance: (base.dodgeChance ?? 0) + (loyaltyBonus.dodgeChance ?? 0) + (equipmentBonus.dodgeChance ?? 0) + (temporaryBuffs.dodgeChance ?? 0),
    counterAttackChance: (base.counterAttackChance ?? 0) + (loyaltyBonus.counterAttackChance ?? 0) + (equipmentBonus.counterAttackChance ?? 0) + (temporaryBuffs.counterAttackChance ?? 0),
    counterAttackScaling: (base.counterAttackScaling ?? 1.0) + (equipmentBonus.counterAttackScaling ?? 0),
    blockChance: (base.blockChance ?? 0) + (loyaltyBonus.blockChance ?? 0) + (equipmentBonus.blockChance ?? 0) + (temporaryBuffs.blockChance ?? 0),
    blockReductionPercent: Math.max(30, (base.blockReductionPercent ?? 30) + (equipmentBonus.blockReductionPercent ?? 0)),
    bleedChance: (base.bleedChance ?? 0) + (loyaltyBonus.bleedChance ?? 0) + (equipmentBonus.bleedChance ?? 0) + (temporaryBuffs.bleedChance ?? 0),
    bleedDamagePerTurn: (base.bleedDamagePerTurn ?? 8) + (equipmentBonus.bleedDamagePerTurn ?? 0),
    bleedDuration: (base.bleedDuration ?? 3),
    vampirismPercent: (base.vampirismPercent ?? 0) + (equipmentBonus.vampirismPercent ?? 0) + (temporaryBuffs.vampirismPercent ?? 0),
    counterVampirismPercent: (base.counterVampirismPercent ?? 0) + (equipmentBonus.counterVampirismPercent ?? 0) + (temporaryBuffs.counterVampirismPercent ?? 0),
    unstoppable: Boolean(base.unstoppable || temporaryBuffs.unstoppable),
    tauntDuration: base.tauntDuration ?? 1,
    backstabBonusPercent: (base.backstabBonusPercent ?? 20) + (equipmentBonus.backstabBonusPercent ?? 0),
  };

  return clampKeywordChances(combined);
}
