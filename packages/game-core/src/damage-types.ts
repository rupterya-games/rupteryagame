/**
 * damage-types.ts — Sistema de Tipos de Dano e Canais de Defesa (Rupterya V1)
 *
 * Todo ataque possui exatamente um Tipo de Dano.
 * Tipos: Cortante, Perfurante, Esmagador, Fogo, Natureza, Morte, Sagrado.
 * Sem "Neutro".
 *
 * Fraqueza: +30% dano (+0.30)
 * Normal: 100% dano (1.00)
 * Resistência: -30% dano (-0.30)
 *
 * Canal de Defesa: Física ou Mágica (independente do tipo de dano).
 * Ex: Espada de Paladino = Sagrado x Física; Magia de Clérigo = Sagrado x Mágica.
 */

export type DamageType =
  | "slashing"    // Cortante
  | "piercing"    // Perfurante
  | "bludgeoning" // Esmagador
  | "fire"        // Fogo
  | "nature"      // Natureza
  | "death"       // Morte
  | "holy";       // Sagrado

export type DefenseChannel = "physical" | "magical";

export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  slashing: "Cortante",
  piercing: "Perfurante",
  bludgeoning: "Esmagador",
  fire: "Fogo",
  nature: "Natureza",
  death: "Morte",
  holy: "Sagrado",
};

export const DEFENSE_CHANNEL_LABELS: Record<DefenseChannel, string> = {
  physical: "Defesa Física",
  magical: "Defesa Mágica",
};

export const WEAKNESS_MULTIPLIER = 1.3;  // +30%
export const RESISTANCE_MULTIPLIER = 0.7; // -30%
export const NORMAL_MULTIPLIER = 1.0;

export interface DamageAffinityProfile {
  weaknesses?: DamageType[];
  resistances?: DamageType[];
  immunities?: DamageType[];
}

/**
 * Calcula o multiplicador de afinidade elementar/física contra o alvo.
 */
export function calculateTypeAffinityMultiplier(
  damageType: DamageType,
  targetProfile?: DamageAffinityProfile,
): { multiplier: number; affinity: "weakness" | "resistance" | "immunity" | "normal" } {
  if (!targetProfile) return { multiplier: NORMAL_MULTIPLIER, affinity: "normal" };

  if (targetProfile.immunities?.includes(damageType)) {
    return { multiplier: 0, affinity: "immunity" };
  }
  if (targetProfile.weaknesses?.includes(damageType)) {
    return { multiplier: WEAKNESS_MULTIPLIER, affinity: "weakness" };
  }
  if (targetProfile.resistances?.includes(damageType)) {
    return { multiplier: RESISTANCE_MULTIPLIER, affinity: "resistance" };
  }
  return { multiplier: NORMAL_MULTIPLIER, affinity: "normal" };
}

/**
 * Mitigação de dano por canal de defesa (Física ou Mágica).
 * Fórmula universal: Dano = Bruto * (100 / (100 + Defesa))
 */
export function mitigateByChannel(
  rawDamage: number,
  channel: DefenseChannel,
  defenderDefense: { physicalDefense: number; magicalDefense: number },
): number {
  const defense = channel === "physical" ? defenderDefense.physicalDefense : defenderDefense.magicalDefense;
  const mitigated = Math.round(rawDamage * (100 / (100 + Math.max(0, defense))));
  return Math.max(1, mitigated);
}
