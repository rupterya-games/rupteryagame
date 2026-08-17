/**
 * exploration.ts — Testes de Exploração 1d20 (Rupterya V1)
 *
 * REGRAS DE EXPLORAÇÃO:
 * - Rolagem: 1d20 + bônus contra Dificuldade 1–20.
 * - 1 natural: SEMPRE FALHA.
 * - 20 natural: SEMPRE VENCE (sucesso crítico).
 * - Bônus: Especialidade natural do personagem (+1 fixo) + Itens (+1 cada).
 * - Teto de Bônus: Máximo +5.
 * - Seleção Automática: O jogo escolhe automaticamente o maior bônus disponível no grupo de 3 companions.
 */

export type ExplorationAttribute = "strength" | "agility" | "perception" | "knowledge";

export interface ExplorationCandidate {
  id: string;
  name: string;
  isConscious: boolean;
  specialty: ExplorationAttribute;
  itemBonus?: number; // Máximo +1 por item
}

export interface ExplorationCheckResult {
  attribute: ExplorationAttribute;
  difficulty: number;
  bestCompanionName: string;
  d20Roll: number;
  isNatural1: boolean;
  isNatural20: boolean;
  bonus: number;
  totalScore: number;
  success: boolean;
}

export function performExplorationCheck(
  attribute: ExplorationAttribute,
  difficulty: number,
  party: ExplorationCandidate[],
  fixedRoll?: number, // Para testes determinísticos
): ExplorationCheckResult {
  // Filtra companions conscientes
  const eligible = party.filter((c) => c.isConscious);

  // Calcula o melhor bônus do grupo
  let bestCompanion = party[0];
  let bestBonus = 0;

  for (const companion of eligible) {
    let bonus = companion.specialty === attribute ? 1 : 0;
    bonus += Math.min(4, companion.itemBonus ?? 0);
    const totalBonus = Math.min(5, bonus); // Teto de +5

    if (totalBonus > bestBonus || !bestCompanion) {
      bestBonus = totalBonus;
      bestCompanion = companion;
    }
  }

  const d20Roll = fixedRoll ?? (Math.floor(Math.random() * 20) + 1);
  const isNatural1 = d20Roll === 1;
  const isNatural20 = d20Roll === 20;

  let success = false;
  if (isNatural20) {
    success = true;
  } else if (isNatural1) {
    success = false;
  } else {
    success = (d20Roll + bestBonus) >= difficulty;
  }

  return {
    attribute,
    difficulty,
    bestCompanionName: bestCompanion?.name ?? "Nenhum",
    d20Roll,
    isNatural1,
    isNatural20,
    bonus: bestBonus,
    totalScore: d20Roll + bestBonus,
    success,
  };
}
