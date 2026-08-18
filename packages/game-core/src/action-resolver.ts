/**
 * action-resolver.ts — O Motor Unificado de Combate em 14 Etapas (Rupterya V1)
 *
 * Player e IA utilizam exatamente o mesmo resolver.
 *
 * ORDEM OFICIAL DE RESOLUÇÃO:
 * ETAPA 1 — Início do Turno (fora deste arquivo: ver turn-queue.ts / battle-orchestrator.ts)
 * ETAPA 2 — Declaração & Validação (Atordoamento, alcance, LoS)
 * ETAPA 3 — Preparação (início OU conclusão de carregamento — sempre a mesma habilidade/alvo)
 * ETAPA 3.5 — Auto-lançamento (habilidades utilitárias em si mesmo: buffs, movimento bônus)
 * ETAPA 3.6 — Avanço pré-golpe (ex: Iai — fecha distância antes de resolver o dano)
 * ETAPA 4a — Reação Preventiva (Interromper ao ser DECLARADO — ignora Esquiva)
 * ETAPA 5 — Esquiva (SOMENTE Single Target; ataques em área NÃO podem ser esquivados)
 * ETAPA 4b — Interromper ao ACERTAR (Esquiva bem-sucedida evita a interrupção)
 * ETAPA 6 — Bloqueio / Barreiras (reduz % do dano)
 * ETAPA 7 — Fraqueza / Resistência (+30% / -30%)
 * ETAPA 8 — Defesa Física / Mágica (mitigação por canal) + Cobertura à distância
 * ETAPA 9 — Dano (HP reduzido; multi-hits processados separadamente)
 * ETAPA 10 — Morte (HP <= 0)
 * ETAPA 11 — Exceções de Morte (Morte Pendente: Último Suspiro age antes de morrer)
 * ETAPA 12 — Reações Pós-Hit (Contra-golpe, Vampirismo — somente se vivo; morte por
 *            Contra-golpe interrompe imediatamente qualquer multi-hit/alvo restante)
 * ETAPA 13 — Status (Sangramento — probabilístico com cap OU garantido pela habilidade, Provocar)
 * ETAPA 14 — Atualização do Campo
 *
 * Cooldown, carga de Ultimate e Atordoamento por turno são responsabilidade do chamador
 * (battle-orchestrator.ts), que tem acesso ao relógio (turn-queue.ts) de cada combatente.
 * Este resolver assume que a ação já foi validada como legal pelo chamador nesse sentido.
 */

import type { Axial, BattlefieldState, HuntBattleLog } from "./domain";
import type { DamageType, DefenseChannel, DamageAffinityProfile } from "./damage-types";
import { calculateTypeAffinityMultiplier, mitigateByChannel } from "./damage-types";
import type { CombatKeywords } from "./keywords";
import { KEYWORD_PERCENT_CAP } from "./keywords";
import { applyBattlefieldCover, hexDistance, hexLine, canUnitSeeCell, calculateAreaCells, AreaDefinition, hexKey } from "./battlefield";
import { isHonorActiveForUnit, LEGION_OF_BONES_DAMAGE_REDUCTION } from "./traits";

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
  activeEffects: Array<{ kind: string; duration: number; value?: number; sourceId?: string; keyword?: keyof CombatKeywords }>;
  charging?: { skillId: string; targetCell: Axial; turnsRemaining: number } | null;
  lastBreathActive?: boolean; // Para evitar loop infinito de Último Suspiro
  isPendingDeath?: boolean;
  skills?: SkillDefinitionV1[]; // Kit de habilidades (usado por monstros de laboratório + orquestrador)
  ultimate?: SkillDefinitionV1;
  deathReactionSkill?: SkillDefinitionV1;
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
  interruptsCharging?: boolean;  // Interrompe o carregamento do alvo SE o golpe conectar (Esquiva evita)
  interruptOnDeclare?: boolean;  // Reação preventiva rara: interrompe ao ser declarado, ignora Esquiva
  appliesTaunt?: boolean;
  appliesBleed?: boolean;        // Sangramento GARANTIDO (ignora o cap de 30%; distinto de keywords.bleedChance)
  chargeTurnsRequired?: number;  // Se > 0, precisa de N turnos de preparação
  isUltimate?: boolean;          // Usa carga (turn-queue) em vez de recarga simples — gerido pelo orquestrador
  isMasterSkill?: boolean;       // Marcado dinamicamente pela Maestria (companions.ts), não no bestiário
  /** Buffs temporários aplicados ao PRÓPRIO usuário (ex: Égide +Bloqueio, Postura da Lua +Contra-golpe). */
  selfEffects?: Array<{ keyword: keyof CombatKeywords; amount: number; duration: number }>;
  /** Concede movimento extra neste turno (ex: Passo de Caça). Aplicado pelo orquestrador. */
  grantsBonusMovement?: number;
  /** Avança N hexágonos em direção ao alvo antes de resolver o golpe (ex: Iai). */
  advanceBeforeHit?: number;
  /** Invoca uma unidade a partir de um template — tratado inteiramente pelo orquestrador, nunca chega ao resolver. */
  summon?: { templateId: string; label: string };
}

export interface ActionResultHit {
  targetId: string;
  hitIndex: number;
  dodged: boolean;
  blocked: boolean;
  interrupted: boolean;
  interruptedSkillId?: string;
  affinity: "weakness" | "resistance" | "immunity" | "normal";
  rawDamage: number;
  mitigatedDamage: number;
  damageDealt: number;
  targetKilled: boolean;
  lastBreathTriggered?: boolean;
  counterAttacked?: boolean;
  counterDamageDealt?: number;
  vampirismHealed?: number;
  counterVampirismHealed?: number;
  bleedApplied?: boolean;
  bleedGuaranteed?: boolean;
}

export interface ActionResolutionResult {
  attacker: CombatantStateV1;
  defenders: CombatantStateV1[];
  hits: ActionResultHit[];
  logs: HuntBattleLog[];
  /** Movimento bônus concedido pela habilidade (ex: Passo de Caça) — o orquestrador soma ao orçamento do turno. */
  bonusMovementGranted?: number;
  /** true se o ATACANTE morreu durante esta ação (ex: Contra-golpe fatal). Interrompe multi-hit/alvos restantes. */
  attackerDied?: boolean;
  attackerLastBreathTriggered?: boolean;
}

/** Aplica bônus temporários (`buff_keyword` em activeEffects) sobre as Keywords base do combatente. */
function effectiveKeywords(entity: CombatantStateV1): CombatKeywords {
  let result = entity.keywords;
  for (const effect of entity.activeEffects) {
    if (effect.kind === "buff_keyword" && effect.keyword) {
      const current = (result[effect.keyword] as number | undefined) ?? 0;
      result = { ...result, [effect.keyword]: current + (effect.value ?? 0) };
    }
  }
  return result;
}

/** Marca a morte de um combatente, respeitando Último Suspiro. Retorna true se a morte foi adiada (last breath ativado). */
function markDeath(entity: CombatantStateV1, turn: number, logs: HuntBattleLog[]): boolean {
  if (entity.tags.includes("last_breath") && !entity.lastBreathActive) {
    entity.lastBreathActive = true;
    entity.isPendingDeath = true;
    logs.push({ turn, tone: "system", text: `💀 ÚLTIMO SUSPIRO: ${entity.name} ativa sua técnica final antes de sucumbir!` });
    return true;
  }
  logs.push({ turn, tone: "defeat", text: `☠️ ${entity.name} foi derrotado.` });
  return false;
}

/**
 * Resolve uma ação completa de combate (Single Target ou Área) em 14 Etapas.
 * `rng` é injetável para permitir testes determinísticos (padrão: Math.random).
 */
export function resolveCombatActionV1(
  attacker: CombatantStateV1,
  skill: SkillDefinitionV1,
  targetCell: Axial,
  allCombatants: CombatantStateV1[],
  battlefield: BattlefieldState,
  turn: number,
  activeTraits: Set<string>,
  rng: () => number = Math.random,
): ActionResolutionResult {
  const logs: HuntBattleLog[] = [];
  // Clona `activeEffects` (não só o objeto raso) — do contrário, .push() mais abaixo mutaria o
  // array original do chamador, vazando efeitos entre combates que compartilham o mesmo objeto-base
  // (ex: um template de criatura reusado em duas batalhas simultâneas).
  let updatedAttacker = { ...attacker, activeEffects: [...attacker.activeEffects] };
  let combatantsMap = new Map(allCombatants.map((c) => [c.id, { ...c, activeEffects: [...c.activeEffects] }]));
  let effectiveTargetCell = targetCell;

  const isResolvingChargeNow = Boolean(updatedAttacker.charging && updatedAttacker.charging.skillId === skill.id);

  if (isResolvingChargeNow) {
    // ETAPA 3 (conclusão): SEMPRE a mesma habilidade e o mesmo alvo congelados na declaração original.
    effectiveTargetCell = updatedAttacker.charging!.targetCell;
    updatedAttacker.charging = null;
    logs.push({ turn, tone: "system", text: `⚡ ${updatedAttacker.name} conclui o carregamento de ${skill.name}!` });
  } else {
    // ETAPA 2: Declaração & Validação
    if (updatedAttacker.activeEffects.some((effect) => effect.kind === "stunned")) {
      logs.push({ turn, tone: "system", text: `😵 ${updatedAttacker.name} está Atordoado e não pode agir.` });
      return { attacker: updatedAttacker, defenders: allCombatants, hits: [], logs };
    }

    const isSelfSkill = (skill.range === 0) || Boolean(skill.selfEffects?.length);
    const declaredAttackerPos = updatedAttacker.position ?? { q: 0, r: 0 };
    const declaredDistance = hexDistance(declaredAttackerPos, effectiveTargetCell);
    const declaredMaxRange = skill.range ?? 1;
    if (!isSelfSkill && declaredDistance > declaredMaxRange) {
      logs.push({ turn, tone: "system", text: `${updatedAttacker.name} tenta usar ${skill.name}, mas o alvo está fora de alcance (${declaredDistance}/${declaredMaxRange}).` });
      return { attacker: updatedAttacker, defenders: allCombatants, hits: [], logs };
    }
    if (!isSelfSkill && battlefield.fog.enabled && !canUnitSeeCell(updatedAttacker, effectiveTargetCell, battlefield)) {
      logs.push({ turn, tone: "system", text: `${updatedAttacker.name} tenta usar ${skill.name}, mas o alvo está fora de visão.` });
      return { attacker: updatedAttacker, defenders: allCombatants, hits: [], logs };
    }

    // ETAPA 3 (início): Preparação / Carregamento
    if (skill.chargeTurnsRequired && skill.chargeTurnsRequired > 0) {
      updatedAttacker.charging = { skillId: skill.id, targetCell: effectiveTargetCell, turnsRemaining: skill.chargeTurnsRequired };
      logs.push({ turn, tone: updatedAttacker.team === "player" ? "player" : "enemy", text: `⚠️ ${updatedAttacker.name} começa a carregar ${skill.name}! Resolverá no próximo turno.` });
      return { attacker: updatedAttacker, defenders: allCombatants, hits: [], logs };
    }
  }

  // ETAPA 3.5: Auto-lançamento (habilidades utilitárias em si mesmo — nunca passam pelo pipeline de dano)
  if (skill.selfEffects?.length || skill.grantsBonusMovement) {
    for (const effect of skill.selfEffects ?? []) {
      updatedAttacker.activeEffects.push({ kind: "buff_keyword", keyword: effect.keyword, value: effect.amount, duration: effect.duration });
    }
    if (skill.selfEffects?.length) {
      const desc = skill.selfEffects.map((effect) => `+${effect.amount} ${String(effect.keyword)}`).join(", ");
      logs.push({ turn, tone: updatedAttacker.team === "player" ? "player" : "enemy", text: `✨ ${updatedAttacker.name} usa ${skill.name} (${desc}).` });
    }
    if (skill.grantsBonusMovement) {
      logs.push({ turn, tone: "system", text: `🏃 ${updatedAttacker.name} ganha +${skill.grantsBonusMovement} de movimento com ${skill.name}.` });
    }
    combatantsMap.set(updatedAttacker.id, updatedAttacker);
    return { attacker: updatedAttacker, defenders: Array.from(combatantsMap.values()), hits: [], logs, bonusMovementGranted: skill.grantsBonusMovement };
  }

  const attackerPos = updatedAttacker.position ?? { q: 0, r: 0 };
  const maxRange = skill.range ?? 1;

  // ETAPA 3.6: Avanço pré-golpe (ex: Iai)
  if (skill.advanceBeforeHit) {
    const line = hexLine(attackerPos, effectiveTargetCell);
    const steps = Math.min(skill.advanceBeforeHit, Math.max(0, line.length - 2));
    const newPos = line[steps] ?? attackerPos;
    if (newPos.q !== attackerPos.q || newPos.r !== attackerPos.r) {
      updatedAttacker.position = newPos;
      logs.push({ turn, tone: "system", text: `💨 ${updatedAttacker.name} avança em direção ao alvo com ${skill.name}!` });
    }
  }
  const currentAttackerPos = updatedAttacker.position ?? attackerPos;

  // Identificação de alvos afetados (com Fogo Amigo em áreas, se habilitado pela habilidade)
  const isArea = !skill.isSingleTarget || Boolean(skill.area && skill.area.shape !== "single");
  const friendlyFireEnabled = !isArea || (skill.area?.friendlyFire ?? true);
  const affectedCells = isArea && skill.area
    ? calculateAreaCells(currentAttackerPos, effectiveTargetCell, skill.area, maxRange)
    : [effectiveTargetCell];

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
  const attackerKeywords = effectiveKeywords(updatedAttacker);

  let attackerAlive = true;
  let attackerLastBreathTriggered = false;

  for (const target of validTargets) {
    if (!attackerAlive) break;
    let currentTarget = combatantsMap.get(target.id)!;
    if (currentTarget.hpCurrent <= 0) continue;

    const isSelfOrAlly = currentTarget.team === updatedAttacker.team;
    if (isSelfOrAlly && isArea) {
      if (!friendlyFireEnabled) continue; // Área sem fogo amigo: aliados simplesmente não são afetados
      logs.push({ turn, tone: "system", text: `💥 FOGO AMIGO: ${currentTarget.name} está dentro da área de ${skill.name}!` });
    }

    const targetKeywords = effectiveKeywords(currentTarget);

    for (let hitIdx = 1; hitIdx <= hitsCount; hitIdx += 1) {
      if (!attackerAlive || currentTarget.hpCurrent <= 0) break;

      // ETAPA 4a: Reação Preventiva — interrompe ao ser DECLARADO, ignora Esquiva
      let interrupted = false;
      let interruptedSkillId: string | undefined;
      if (skill.interruptOnDeclare && currentTarget.charging && !targetKeywords.unstoppable) {
        interrupted = true;
        interruptedSkillId = currentTarget.charging.skillId;
        currentTarget.charging = null;
        logs.push({ turn, tone: "system", text: `⛔ ${updatedAttacker.name} INTERROMPE PREVENTIVAMENTE o carregamento de ${currentTarget.name}!` });
      }

      // ETAPA 5: Esquiva (SOMENTE Single Target)
      let dodged = false;
      if (skill.isSingleTarget && !isArea) {
        const dodgeChance = Math.min(KEYWORD_PERCENT_CAP, targetKeywords.dodgeChance ?? 0);
        if (dodgeChance > 0 && rng() * 100 < dodgeChance) {
          dodged = true;
          logs.push({ turn, tone: currentTarget.team === "player" ? "player" : "enemy", text: `💨 ${currentTarget.name} ESQUIVOU do ataque ${skill.name} de ${updatedAttacker.name}!` });
          hitsResult.push({
            targetId: currentTarget.id,
            hitIndex: hitIdx,
            dodged: true,
            blocked: false,
            interrupted,
            interruptedSkillId,
            affinity: "normal",
            rawDamage: 0,
            mitigatedDamage: 0,
            damageDealt: 0,
            targetKilled: false,
          });
          continue; // Esquivou: sem dano, sem contra-golpe, sem interrupção-por-acerto
        }
      }

      // ETAPA 4b: Interromper ao ACERTAR — Esquiva bem-sucedida já evitou este bloco
      if (skill.interruptsCharging && !interrupted && currentTarget.charging && !targetKeywords.unstoppable) {
        interrupted = true;
        interruptedSkillId = currentTarget.charging.skillId;
        currentTarget.charging = null;
        logs.push({ turn, tone: "system", text: `⛔ ${updatedAttacker.name} INTERROMPE o carregamento de ${currentTarget.name}!` });
      }

      // ETAPA 6: Bloqueio / Barreiras
      let blocked = false;
      let blockReductionFactor = 1.0;
      const blockChance = Math.min(KEYWORD_PERCENT_CAP, targetKeywords.blockChance ?? 0);
      if (blockChance > 0 && rng() * 100 < blockChance) {
        blocked = true;
        const reductionPct = targetKeywords.blockReductionPercent ?? 30;
        blockReductionFactor = 1.0 - reductionPct / 100;
        logs.push({ turn, tone: "system", text: `🛡️ ${currentTarget.name} BLOQUEOU parte do golpe (-${reductionPct}% de dano)!` });
      }

      // ETAPA 7: Fraqueza / Resistência
      const affinityRes = calculateTypeAffinityMultiplier(skill.damageType, currentTarget.damageAffinity);
      const affinityMult = affinityRes.multiplier;

      // ETAPA 8: Cálculo de Dano Bruto & Mitigação por Canal
      const basePowerDamage = updatedAttacker.power * skill.powerScaling + honorBonusDamage;
      let rawDamage = Math.round(basePowerDamage * affinityMult * blockReductionFactor);

      // Traço Legião Óssea: mortos-vivos recebem -15% de dano enquanto o traço estiver ativo
      if (activeTraits.has("legion_of_bones") && currentTarget.tags.includes("undead")) {
        rawDamage = Math.round(rawDamage * (1 - LEGION_OF_BONES_DAMAGE_REDUCTION));
      }

      // Cobertura à distância
      const distanceToTarget = hexDistance(currentAttackerPos, currentTarget.position ?? effectiveTargetCell);
      if (distanceToTarget > 1 && currentTarget.position) {
        const coverRes = applyBattlefieldCover(rawDamage, currentAttackerPos, currentTarget.position, battlefield);
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
        lastBreathTriggered = markDeath(currentTarget, turn, logs);
      }

      // ETAPA 12: Reações Pós-Hit (Vampirismo do atacante e Contra-golpe do defensor)
      let counterAttacked = false;
      let counterDamageDealt = 0;
      let vampirismHealed = 0;
      let counterVampirismHealed = 0;

      // Vampirismo geral do atacante (cura em QUALQUER dano causado, se possuir a Keyword)
      if (attackerKeywords.vampirismPercent && attackerKeywords.vampirismPercent > 0 && damageDealt > 0) {
        vampirismHealed = Math.round(damageDealt * (attackerKeywords.vampirismPercent / 100));
        updatedAttacker.hpCurrent = Math.min(updatedAttacker.hpMax, updatedAttacker.hpCurrent + vampirismHealed);
        logs.push({ turn, tone: "system", text: `🩸 Vampirismo: ${updatedAttacker.name} drena ${vampirismHealed} de vida.` });
      }

      // Contra-golpe do defensor (somente se VIVO e não esquivou)
      if (currentTarget.hpCurrent > 0 && !dodged && targetKeywords.counterAttackChance) {
        const counterChance = Math.min(KEYWORD_PERCENT_CAP, targetKeywords.counterAttackChance);
        if (rng() * 100 < counterChance && currentTarget.position && hexDistance(currentTarget.position, currentAttackerPos) <= 1) {
          counterAttacked = true;
          const counterScaling = targetKeywords.counterAttackScaling ?? 1.0;
          const counterRaw = Math.round(currentTarget.power * counterScaling);
          counterDamageDealt = mitigateByChannel(counterRaw, "physical", updatedAttacker);
          updatedAttacker.hpCurrent = Math.max(0, updatedAttacker.hpCurrent - counterDamageDealt);

          // Vampirismo do Contra-golpe (ex: Katana Vampírica) — específico, não usa vampirismPercent geral
          if (targetKeywords.counterVampirismPercent) {
            counterVampirismHealed = Math.round(counterDamageDealt * (targetKeywords.counterVampirismPercent / 100));
            currentTarget.hpCurrent = Math.min(currentTarget.hpMax, currentTarget.hpCurrent + counterVampirismHealed);
            logs.push({ turn, tone: "system", text: `🩸 ${currentTarget.name} converte o contra-golpe em ${counterVampirismHealed} de cura!` });
          }

          logs.push({
            turn,
            tone: currentTarget.team === "player" ? "player" : "enemy",
            text: `⚔️ CONTRA-GOLPE: ${currentTarget.name} contra-ataca ${updatedAttacker.name} causando ${counterDamageDealt} de dano!`,
          });

          // Morte por Contra-golpe interrompe IMEDIATAMENTE qualquer multi-hit/alvo restante desta ação.
          if (updatedAttacker.hpCurrent === 0) {
            attackerAlive = false;
            attackerLastBreathTriggered = markDeath(updatedAttacker, turn, logs);
          }
        }
      }

      // ETAPA 13: Status Effects (Sangramento, Provocar) — só se o alvo seguir vivo
      let bleedApplied = false;
      let bleedGuaranteed = false;
      if (damageDealt > 0 && currentTarget.hpCurrent > 0) {
        const goblinBleedBonus = (activeTraits.has("bloodbath") && updatedAttacker.tags.includes("goblin")) ? 20 : 0;
        const rolledBleedChance = Math.min(KEYWORD_PERCENT_CAP, (attackerKeywords.bleedChance ?? 0) + goblinBleedBonus);
        const bleedRolled = rolledBleedChance > 0 && rng() * 100 < rolledBleedChance;
        bleedGuaranteed = Boolean(skill.appliesBleed);

        if (bleedRolled || bleedGuaranteed) {
          bleedApplied = true;
          currentTarget.activeEffects.push({ kind: "bleed", duration: attackerKeywords.bleedDuration ?? 3, value: attackerKeywords.bleedDamagePerTurn ?? 8, sourceId: updatedAttacker.id });
          logs.push({ turn, tone: "system", text: bleedGuaranteed ? `🩸 ${currentTarget.name} está Sangrando (garantido por ${skill.name})!` : `🩸 ${currentTarget.name} está Sangrando!` });
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
        interruptedSkillId,
        affinity: affinityRes.affinity,
        rawDamage,
        mitigatedDamage: rawDamage - damageDealt,
        damageDealt,
        targetKilled,
        lastBreathTriggered,
        counterAttacked,
        counterDamageDealt,
        vampirismHealed,
        counterVampirismHealed,
        bleedApplied,
        bleedGuaranteed,
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
    attackerDied: !attackerAlive,
    attackerLastBreathTriggered,
  };
}
