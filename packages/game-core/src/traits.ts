/**
 * traits.ts — Traços de Formação Dinâmicos (Rupterya V1)
 *
 * Traços de formação são propriedades ativadas pela composição atual de peças no campo.
 * Invocações contam para traços (ex: Esqueleto conta como Morto-vivo).
 * Quando a contagem cai abaixo do requisito, o traço desativa imediatamente.
 *
 * Exemplos V1:
 * - HONRA: Requer >= 2 Samurais. Samurai sem aliado adjacente recebe +3 dano em ataques.
 * - REFLEXO DO TROVÃO: Requer >= 2 Elementais. 20% de chance de retaliação com raio (fogo amigo não ativa).
 * - SANGRIA: Requer >= 3 Goblins. Ataques Goblins recebem +20% Sangramento (respeitando cap de 30%).
 * - LEGIÃO ÓSSEA: Requer >= 3 Mortos-vivos (invocações contam). Mortos-vivos recebem -15% de dano.
 */

import type { Axial } from "./domain";
import { hexDistance } from "./battlefield";

export interface FormationTraitDefinition {
  id: string;
  name: string;
  description: string;
  requiredTag: string; // Ex: "samurai", "goblin", "elemental", "undead"
  requiredCount: number;
}

export const FORMATION_TRAITS: Record<string, FormationTraitDefinition> = {
  honor: {
    id: "honor",
    name: "Honra",
    description: "Samurais sem aliados adjacentes causam +3 de dano em ataques.",
    requiredTag: "samurai",
    requiredCount: 2,
  },
  thunder_reflex: {
    id: "thunder_reflex",
    name: "Reflexo do Trovão",
    description: "Elementais têm 20% de chance de retaliar com um raio ao sofrerem dano hostil.",
    requiredTag: "elemental",
    requiredCount: 2,
  },
  bloodbath: {
    id: "bloodbath",
    name: "Sangria",
    description: "Goblins ganham +20% de chance de Sangramento enquanto houver 3 ou mais no campo.",
    requiredTag: "goblin",
    requiredCount: 3,
  },
  legion_of_bones: {
    id: "legion_of_bones",
    name: "Legião Óssea",
    description: "Mortos-vivos recebem -15% de dano enquanto houver 3 ou mais no campo (invocações contam).",
    requiredTag: "undead",
    requiredCount: 3,
  },
};

export const LEGION_OF_BONES_DAMAGE_REDUCTION = 0.15; // -15% de dano recebido por mortos-vivos

export interface CombatantTraitTags {
  id: string;
  isAlive: boolean;
  tags: string[]; // Ex: ["samurai", "human"], ["goblin"], ["undead", "skeleton"]
  position?: Axial;
}

/**
 * Avalia quais traços de formação estão ativos para um lado (Player ou Inimigo).
 */
export function evaluateActiveTraits(combatants: CombatantTraitTags[]): Set<string> {
  const activeTraits = new Set<string>();
  const aliveCombatants = combatants.filter((c) => c.isAlive);

  const tagCounts: Record<string, number> = {};
  for (const combatant of aliveCombatants) {
    for (const tag of combatant.tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  for (const trait of Object.values(FORMATION_TRAITS)) {
    const count = tagCounts[trait.requiredTag] ?? 0;
    if (count >= trait.requiredCount) {
      activeTraits.add(trait.id);
    }
  }

  return activeTraits;
}

/**
 * Verifica se o bônus de Honra se aplica a um Samurai específico (sem aliados adjacentes).
 */
export function isHonorActiveForUnit(
  unit: CombatantTraitTags,
  allies: CombatantTraitTags[],
  activeTraits: Set<string>,
): boolean {
  if (!activeTraits.has("honor") || !unit.tags.includes("samurai") || !unit.position) {
    return false;
  }
  const hasAdjacentAlly = allies.some((ally) => {
    if (ally.id === unit.id || !ally.isAlive || !ally.position) return false;
    return hexDistance(unit.position!, ally.position) <= 1;
  });
  return !hasAdjacentAlly;
}
