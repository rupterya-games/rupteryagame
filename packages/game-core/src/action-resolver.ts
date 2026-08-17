/**
 * action-resolver.ts — O Motor Unificado de Combate em 14 Etapas (Rupterya V1)
 *
 * Player e IA utilizam exatamente o mesmo resolver.
 *
 * ORDEM OFICIAL DE RESOLUÇÃO:
 * ETAPA 1 — Início do Turno (ticks da própria unidade)
 * ETAPA 2 — Declaração & Validação (alcance, LoS, estado)
 * ETAPA 3 — Preparação (carregamentos e telegrafados)
 * ETAPA 4 — Reações Preventivas (Interrupção)
 * ETAPA 5 — Esquiva (SOMENTE Single Target; ataques em área NÃO podem ser esquivados)
 * ETAPA 6 — Bloqueio / Barreiras (reduz % do dano)
 * ETAPA 7 — Fraqueza / Resistência (+30% / -30%)
 * ETAPA 8 — Defesa Física / Mágica (mitigação por canal)
 * ETAPA 9 — Dano (HP reduzido; multi-hits processados separadamente)
 * ETAPA 10 — Morte (HP <= 0)
 * ETAPA 11 — Exceções de Morte (Morte Pendente: Último Suspiro age antes de morrer)
 * ETAPA 12 — Reações Pós-Hit (Contra-golpe, Vampirismo, etc. somente se vivo)
 * ETAPA 13 — Status (Sangramento, Provocar, etc.)
 * ETAPA 14 — Atualização do Campo (Traços recalculados, remoção final de mortos)
 */

import type { Axial, BattlefieldState, HuntBattleLog } from "./domain";
import type { DamageType, DefenseChannel, DamageAffinityProfile } from "./damage-types";
import { calculateTypeAffinityMultiplier, mitigateByChannel } from "./damage-types";
import type { CombatKeywords } from "./keywords";
import { applyBattlefieldCover, hexDistance, canUnitSeeCell, calculateAreaCells, AreaDefinition, hexKey } from "./battlefield";
import { isHonorActiveForUnit, FORMATION_TRAITS } from "./traits";

export interface CombatantStateV1 {
  id: string;
  name: string;
  team: "player" | "enemy";
  hpCurrent: number;
  hpMax: number;
  power: number;              // Potência
  physicalDefense: number;
  magicalDefense: number;
  speed: number;              // Iniciativa
  movement: number;           // Padrão 3
  position?: Axial;
  facing?: number;
  keywords: CombatKeywords;
  tags: string[];             // Ex: ["paladin", "human"], ["samurai", "human"], ["goblin"]
  damageAffinity?: DamageAffinityProfile;
  activeEffects: Array<{ kind: string; duration: number; value?: number; sourceId?: string }>;
  charging?: { skillId: string; targetCell: Axial; turnsRemaining: number } | null;
  lastBreathActive?: boolean; // Para evitar loop infinito de Último Suspiro
  isPendingDeath?: boolean;
}

export interface SkillDefinitionV1 {
  id: string;
  name: string;
  description: string;
  damageType: DamageType;
  defenseChannel: DefenseChannel;
  powerScaling: number;       // Ex: 1.0 = 100%, 1.25 = 125%
  cooldownTurns: number;
  hitsCount?: number;         // Multi-hit: padrão 1 (ex: Tríplice Disparo = 3)
  range?: number;             // Alcance em hexágonos
  isSingleTarget: boolean;    // Se false, Esquiva é estritamente proibida
  area?: AreaDefinition;      // Fogo amigo padrão: true
  interruptsCharging?: boolean;
  appliesTaunt?: boolean;
  appliesBleed?: boolean;
  chargeTurnsRequired?: number; // Se > 0, precisa de N turnos de preparação
}

export interface ActionResultHit {
  targetId: string;
  hitIndex: number;
  dodged: boolean;
  blocked: boolean;
  interrupted: boolean;
  affinity: "weakness" | "resistance" | "immunity" | "normal";
  rawDamage: number;
  mitigatedDamage: number;
  damageDealt: number;
  targetKilled: boolean;
  lastBreathTriggered?: boolean;
  counterAttacked?: boolean;
  counterDamageDealt?: number;
  vampirismHealed?: number;
}

export interface ActionResolutionResult {
  attacker: CombatantStateV1;
  defenders: CombatantStateV1[];
  hits: ActionResultHit[];
  logs: HuntBattleLog[];
}

/**
 * Resolve uma ação completa de combate (Single Target ou Área) em 14 Etapas.
 */
export function resolveCombatActionV1(
  attacker: CombatantStateV1,
  skill: SkillDefinitionV1,
  targetCell: Axial,
  allCombatants: CombatantStateV1[],
  battlefield: BattlefieldState,
  turn: number,
  activeTraits: Set<string>,
): ActionResolutionResult {
  const logs: HuntBattleLog[] = [];
  let updatedAttacker = { ...attacker };
  let combatantsMap = new Map(allCombatants.map((c) => [c.id, { ...c }]));

  // ETAPA 2: Declaração & Validação
  const attackerPos = updatedAttacker.position ?? { q: 0, r: 0 };
  const distance = hexDistance(attackerPos, targetCell);
  const maxRange = skill.range ?? 1;

  if (distance > maxRange) {
    logs.push({ turn, tone: "system", text: `${updatedAttacker.name} tenta usar ${skill.name}, mas o alvo está fora de alcance (${distance}/${maxRange}).` });
    return { attacker: updatedAttacker, defenders: allCombatants, hits: [], logs };
  }

  // ETAPA 3: Preparação / Carregamento
  if (skill.chargeTurnsRequired && skill.chargeTurnsRequired > 0 && !updatedAttacker.charging) {
    updatedAttacker.charging = { skillId: skill.id, targetCell, turnsRemaining: skill.chargeTurnsRequired };
    logs.push({ turn, tone: updatedAttacker.team === "player" ? "player" : "enemy", text: `⚠️ ${updatedAttacker.name} começa a carregar ${skill.name}! Resolverá no próximo turno.` });
    return { attacker: updatedAttacker, defenders: allCombatants, hits: [], logs };
  }

  // Identificação de alvos afetados (com Fogo Amigo em áreas)
  const isArea = !skill.isSingleTarget || Boolean(skill.area && skill.area.shape !== "single");
  const affectedCells = isArea && skill.area
    ? calculateAreaCells(attackerPos, targetCell, skill.area, maxRange)
    : [targetCell];

  const affectedCellKeys = new Set(affectedCells.map(hexKey));
  const validTargets = Array.from(combatantsMap.values()).filter(
    (c) => c.hpCurrent > 0 && c.position && affectedCellKeys.has(hexKey(c.position))
  );

  const hitsResult: ActionResultHit[] = [];
  const hitsCount = Math.max(1, skill.hitsCount ?? 1);

  // Verificação de bônus de Honra para Samurai
  const isHonorActive = isHonorActiveForUnit(
    { id: updatedAttacker.id, isAlive: true, tags: updatedAttacker.tags, position: updatedAttacker.position },
    Array.from(combatantsMap.values()).filter((c) => c.team === updatedAttacker.team).map((c) => ({ id: c.id, isAlive: c.hpCurrent > 0, tags: c.tags, position: c.position })),
    activeTraits
  );
  const honorBonusDamage = isHonorActive ? 3 : 0;

  for (const target of validTargets) {
    let currentTarget = combatantsMap.get(target.id)!;
    if (currentTarget.hpCurrent <= 0) continue;

    const isSelfOrAlly = currentTarget.team === updatedAttacker.team;
    if (isSelfOrAlly && isArea) {
      logs.push({ turn, tone: "system", text: `💥 FOGO AMIGO: ${currentTarget.name} está dentro da área de ${skill.name}!` });
    }

    for (let hitIdx = 1; hitIdx <= hitsCount; hitIdx += 1) {
      if (currentTarget.hpCurrent <= 0) break; // Se morreu no golpe anterior, multi-hit subsequente cessa

      // ETAPA 4: Reações Preventivas (Interrupção de Carregamento)
      let interrupted = false;
      if (skill.interruptsCharging && currentTarget.charging && !currentTarget.keywords.unstoppable) {
        interrupted = true;
        currentTarget.charging = null;
        logs.push({ turn, tone: "system", text: `⛔ ${updatedAttacker.name} INTERROMPE o carregamento de ${currentTarget.name}!` });
      }

      // ETAPA 5: Esquiva (SOMENTE Single Target)
      let dodged = false;
      if (skill.isSingleTarget && !isArea) {
        const dodgeChance = currentTarget.keywords.dodgeChance ?? 0;
        if (dodgeChance > 0 && Math.random() * 100 < dodgeChance) {
          dodged = true;
          logs.push({ turn, tone: currentTarget.team === "player" ? "player" : "enemy", text: `💨 ${currentTarget.name} ESQUIVOU do ataque ${skill.name} de ${updatedAttacker.name}!` });
          hitsResult.push({
            targetId: currentTarget.id,
            hitIndex: hitIdx,
            dodged: true,
            blocked: false,
            interrupted,
            affinity: "normal",
            rawDamage: 0,
            mitigatedDamage: 0,
            damageDealt: 0,
            targetKilled: false,
          });
          continue; // Esquivou: sem dano, sem contra-golpe
        }
      }

      // ETAPA 6: Bloqueio / Barreiras
      let blocked = false;
      let blockReductionFactor = 1.0;
      const blockChance = currentTarget.keywords.blockChance ?? 0;
      if (blockChance > 0 && Math.random() * 100 < blockChance) {
        blocked = true;
        const reductionPct = currentTarget.keywords.blockReductionPercent ?? 30;
        blockReductionFactor = 1.0 - reductionPct / 100;
        logs.push({ turn, tone: "system", text: `🛡️ ${currentTarget.name} BLOQUEOU parte do golpe (-${reductionPct}% de dano)!` });
      }

      // ETAPA 7: Fraqueza / Resistência
      const affinityRes = calculateTypeAffinityMultiplier(skill.damageType, currentTarget.damageAffinity);
      const affinityMult = affinityRes.multiplier;

      // ETAPA 8: Cálculo de Dano Bruto & Mitigação por Canal
      const basePowerDamage = updatedAttacker.power * skill.powerScaling + honorBonusDamage;
      let rawDamage = Math.round(basePowerDamage * affinityMult * blockReductionFactor);

      // Cobertura à distância
      if (distance > 1 && currentTarget.position) {
        const coverRes = applyBattlefieldCover(rawDamage, attackerPos, currentTarget.position, battlefield);
        rawDamage = coverRes.rawDamage;
      }

      const damageDealt = mitigateByChannel(rawDamage, skill.defenseChannel, currentTarget);

      // ETAPA 9: Dano (HP Reduzido)
      currentTarget.hpCurrent = Math.max(0, currentTarget.hpCurrent - damageDealt);

      const affinityNote = affinityRes.affinity === "weakness" ? " (💥 FRAQUEZA +30%)" : affinityRes.affinity === "resistance" ? " (🛡️ RESISTÊNCIA -30%)" : "";
      logs.push({
        turn,
        tone: updatedAttacker.team === "player" ? "player" : "enemy",
        text: `${updatedAttacker.name} acerta ${skill.name} em ${currentTarget.name} causando ${damageDealt} de dano ${skill.damageType}${affinityNote}. (HP: ${currentTarget.hpCurrent}/${currentTarget.hpMax})`,
      });

      // ETAPA 10 & 11: Morte & Exceções (Último Suspiro)
      let targetKilled = false;
      let lastBreathTriggered = false;

      if (currentTarget.hpCurrent === 0) {
        targetKilled = true;
        // Verifica se possui Último Suspiro
        if (currentTarget.tags.includes("last_breath") && !currentTarget.lastBreathActive) {
          currentTarget.lastBreathActive = true;
          currentTarget.isPendingDeath = true;
          lastBreathTriggered = true;
          logs.push({ turn, tone: "system", text: `💀 ÚLTIMO SUSPIRO: ${currentTarget.name} ativa sua técnica final antes de sucumbir!` });
        } else {
          logs.push({ turn, tone: "defeat", text: `☠️ ${currentTarget.name} foi derrotado.` });
        }
      }

      // ETAPA 12: Reações Pós-Hit (Contra-golpe e Vampirismo)
      let counterAttacked = false;
      let counterDamageDealt = 0;
      let vampirismHealed = 0;

      // Vampirismo do atacante
      if (updatedAttacker.keywords.vampirismPercent && updatedAttacker.keywords.vampirismPercent > 0 && damageDealt > 0) {
        vampirismHealed = Math.round(damageDealt * (updatedAttacker.keywords.vampirismPercent / 100));
        updatedAttacker.hpCurrent = Math.min(updatedAttacker.hpMax, updatedAttacker.hpCurrent + vampirismHealed);
        logs.push({ turn, tone: "system", text: `🩸 Vampirismo: ${updatedAttacker.name} drena ${vampirismHealed} de vida.` });
      }

      // Contra-golpe do defensor (somente se VIVO e não esquivou)
      if (currentTarget.hpCurrent > 0 && !dodged && currentTarget.keywords.counterAttackChance) {
        const counterChance = currentTarget.keywords.counterAttackChance;
        if (Math.random() * 100 < counterChance && currentTarget.position && hexDistance(currentTarget.position, attackerPos) <= 1) {
          counterAttacked = true;
          const counterScaling = currentTarget.keywords.counterAttackScaling ?? 1.0;
          const counterRaw = Math.round(currentTarget.power * counterScaling);
          counterDamageDealt = mitigateByChannel(counterRaw, "physical", updatedAttacker);
          updatedAttacker.hpCurrent = Math.max(0, updatedAttacker.hpCurrent - counterDamageDealt);

          // Vampirismo na Katana Vampírica do Samurai
          if (currentTarget.keywords.vampirismPercent) {
            const counterHeal = counterDamageDealt;
            currentTarget.hpCurrent = Math.min(currentTarget.hpMax, currentTarget.hpCurrent + counterHeal);
            logs.push({ turn, tone: "system", text: `🩸 ${currentTarget.name} converte o contra-golpe em ${counterHeal} de cura!` });
          }

          logs.push({
            turn,
            tone: currentTarget.team === "player" ? "player" : "enemy",
            text: `⚔️ CONTRA-GOLPE: ${currentTarget.name} contra-ataca ${updatedAttacker.name} causando ${counterDamageDealt} de dano!`,
          });
        }
      }

      // ETAPA 13: Status Effects (Sangramento, Provocar)
      if (damageDealt > 0 && currentTarget.hpCurrent > 0) {
        // Sangramento (bônus de Sangria de Goblins entra aqui se ativo)
        const goblinBleedBonus = (activeTraits.has("bloodbath") && updatedAttacker.tags.includes("goblin")) ? 20 : 0;
        const totalBleedChance = Math.min(30, (updatedAttacker.keywords.bleedChance ?? 0) + goblinBleedBonus + (skill.appliesBleed ? 100 : 0));

        if (totalBleedChance > 0 && Math.random() * 100 < totalBleedChance) {
          currentTarget.activeEffects.push({ kind: "bleed", duration: updatedAttacker.keywords.bleedDuration ?? 3, value: updatedAttacker.keywords.bleedDamagePerTurn ?? 8, sourceId: updatedAttacker.id });
          logs.push({ turn, tone: "system", text: `🩸 ${currentTarget.name} está Sangrando!` });
        }

        if (skill.appliesTaunt) {
          currentTarget.activeEffects.push({ kind: "taunted", duration: 1, sourceId: updatedAttacker.id });
          logs.push({ turn, tone: "system", text: `🎯 ${currentTarget.name} foi Provocado por ${updatedAttacker.name}!` });
        }
      }

      hitsResult.push({
        targetId: currentTarget.id,
        hitIndex: hitIdx,
        dodged,
        blocked,
        interrupted,
        affinity: affinityRes.affinity,
        rawDamage,
        mitigatedDamage: rawDamage - damageDealt,
        damageDealt,
        targetKilled,
        lastBreathTriggered,
        counterAttacked,
        counterDamageDealt,
        vampirismHealed,
      });

      combatantsMap.set(currentTarget.id, currentTarget);
    }
  }

  // ETAPA 14: Atualização do Campo
  combatantsMap.set(updatedAttacker.id, updatedAttacker);

  return {
    attacker: updatedAttacker,
    defenders: Array.from(combatantsMap.values()),
    hits: hitsResult,
    logs,
  };
}
