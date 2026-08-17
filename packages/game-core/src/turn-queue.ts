/**
 * turn-queue.ts — Relógio de Turnos Próprios e Fila de Iniciativa (Rupterya V1)
 *
 * REGRAS DO RELÓGIO:
 * - O relógio de cada combatente tica EXCLUSIVAMENTE no início do seu turno verdadeiro.
 * - Ao iniciar o turno do combatente:
 *     1. Recargas de habilidades reduzem em 1 (CD - 1).
 *     2. Carga da Ultimate ganha +1 ponto (currentCharge + 1 até chargeRequired).
 *     3. Durações de buffs/DoTs pessoais avançam.
 *     4. Carregamentos pendentes avançam ou resolvem.
 * - AÇÕES RÁPIDAS / REAÇÕES (Contra-golpe, Ataque de Oportunidade, Último Suspiro)
 *   NÃO contam como turno e NÃO disparam ticks de relógio.
 */

import type { CombatantStateV1 } from "./action-resolver";

export interface CombatantTurnClock {
  combatantId: string;
  cooldowns: Record<string, number>;
  ultimateCurrentCharge: number;
  ultimateRequiredCharge: number;
  isUltimateReady: boolean;
}

/**
 * Constrói a fila de iniciativa ordenada por Speed (descendente).
 * Empates favorecem a equipe do Player.
 */
export function buildInitiativeQueue(combatants: CombatantStateV1[]): string[] {
  return combatants
    .filter((c) => c.hpCurrent > 0)
    .sort((a, b) => {
      const speedDiff = b.speed - a.speed;
      if (speedDiff !== 0) return speedDiff;
      if (a.team === "player" && b.team !== "player") return -1;
      if (b.team === "player" && a.team !== "player") return 1;
      return a.id.localeCompare(b.id);
    })
    .map((c) => c.id);
}

/**
 * Tique do Relógio Pessoal no início do turno verdadeiro de um combatente.
 */
export function tickCombatantTurnStart(
  clock: CombatantTurnClock,
  effects: Array<{ kind: string; duration: number; value?: number; sourceId?: string }>,
): {
  clock: CombatantTurnClock;
  updatedEffects: Array<{ kind: string; duration: number; value?: number; sourceId?: string }>;
  dotDamage: number;
} {
  // 1. Redução de recargas
  const updatedCooldowns: Record<string, number> = {};
  for (const [skillId, cd] of Object.entries(clock.cooldowns)) {
    if (cd > 1) {
      updatedCooldowns[skillId] = cd - 1;
    }
  }

  // 2. Avanço da carga da Ultimate
  const nextCharge = Math.min(clock.ultimateRequiredCharge, clock.ultimateCurrentCharge + 1);
  const isUltimateReady = nextCharge >= clock.ultimateRequiredCharge;

  // 3. Resolução de DoTs e avanço de efeitos
  let dotDamage = 0;
  const updatedEffects: Array<{ kind: string; duration: number; value?: number; sourceId?: string }> = [];

  for (const effect of effects) {
    if (effect.kind === "bleed" || effect.kind === "burn" || effect.kind === "poison") {
      dotDamage += effect.value ?? 8;
    }
    if (effect.duration > 1) {
      updatedEffects.push({ ...effect, duration: effect.duration - 1 });
    }
  }

  return {
    clock: {
      ...clock,
      cooldowns: updatedCooldowns,
      ultimateCurrentCharge: nextCharge,
      isUltimateReady,
    },
    updatedEffects,
    dotDamage,
  };
}

/** Zera a carga da Ultimate após o uso (volta pra 0/N, nunca fica pronta de novo até acumular). */
export function resetUltimateCharge(clock: CombatantTurnClock): CombatantTurnClock {
  return { ...clock, ultimateCurrentCharge: 0, isUltimateReady: false };
}

/** Define a recarga de uma habilidade explicitamente (ex: recarga cheia ao interromper um carregamento). */
export function setSkillCooldown(clock: CombatantTurnClock, skillId: string, turns: number): CombatantTurnClock {
  if (turns <= 0) {
    const { [skillId]: _removed, ...rest } = clock.cooldowns;
    return { ...clock, cooldowns: rest };
  }
  return { ...clock, cooldowns: { ...clock.cooldowns, [skillId]: turns } };
}
