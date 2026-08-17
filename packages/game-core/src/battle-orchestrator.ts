/**
 * battle-orchestrator.ts — Loop de Turno e Estado de Batalha (Rupterya V1)
 *
 * Junta action-resolver.ts (resolução de UMA ação em 14 etapas) + turn-queue.ts
 * (relógio/iniciativa) + traits.ts (traços de formação) + bestiary-v1.ts (templates
 * de invocação) num único pipeline, usado igualmente por Player e IA:
 *
 *   declareAction → validate (recarga/carga de Ultimate/Atordoamento) → resolve
 *   → reações (Último Suspiro real, invocação) → penalidade de interrupção → deaths
 *   → fieldUpdate → avança pro próximo ator da fila de iniciativa
 *
 * O resolver (action-resolver.ts) permanece "puro": só resolve UMA ação já validada.
 * Este arquivo é o único lugar que decide SE uma ação pode acontecer neste turno.
 */

import type { Axial, BattlefieldState, HuntBattleLog } from "./domain";
import type { CombatantStateV1, SkillDefinitionV1 } from "./action-resolver";
import { resolveCombatActionV1 } from "./action-resolver";
import type { CombatantTurnClock } from "./turn-queue";
import { buildInitiativeQueue, tickCombatantTurnStart, resetUltimateCharge, setSkillCooldown } from "./turn-queue";
import { evaluateActiveTraits } from "./traits";
import { hexDistance, hexKey, boardCells, reachableCells } from "./battlefield";
import { SUMMON_TEMPLATES } from "./bestiary-v1";

export interface BattleRosterEntry {
  skills: SkillDefinitionV1[];
  ultimate?: SkillDefinitionV1;
  deathReactionSkill?: SkillDefinitionV1;
}

export interface RosterSeed {
  combatant: CombatantStateV1;
  skills: SkillDefinitionV1[];
  ultimate?: SkillDefinitionV1;
  deathReactionSkill?: SkillDefinitionV1;
}

export interface BattleStateV1 {
  battlefield: BattlefieldState;
  turn: number;
  combatants: Map<string, CombatantStateV1>;
  roster: Map<string, BattleRosterEntry>;
  clocks: Map<string, CombatantTurnClock>;
  initiativeQueue: string[];
  activeIndex: number;
  movementRemaining: number;
  logs: HuntBattleLog[];
  isOver: boolean;
  outcome?: "victory" | "defeat";
  nextSummonSeq: number;
}

export interface DeclareActionOptions {
  rng?: () => number;
  isChargeContinuation?: boolean;
}

function skillsById(entry: BattleRosterEntry): Map<string, SkillDefinitionV1> {
  const map = new Map<string, SkillDefinitionV1>();
  for (const skill of entry.skills) map.set(skill.id, skill);
  if (entry.ultimate) map.set(entry.ultimate.id, entry.ultimate);
  return map;
}

function recomputeTraits(combatants: Map<string, CombatantStateV1>): { player: Set<string>; enemy: Set<string> } {
  const all = [...combatants.values()];
  const toTags = (c: CombatantStateV1) => ({ id: c.id, isAlive: c.hpCurrent > 0, tags: c.tags });
  return {
    player: evaluateActiveTraits(all.filter((c) => c.team === "player").map(toTags)),
    enemy: evaluateActiveTraits(all.filter((c) => c.team === "enemy").map(toTags)),
  };
}

function checkOutcome(state: BattleStateV1): BattleStateV1 {
  if (state.isOver) return state;
  const alivePlayers = [...state.combatants.values()].some((c) => c.team === "player" && c.hpCurrent > 0);
  const aliveEnemies = [...state.combatants.values()].some((c) => c.team === "enemy" && c.hpCurrent > 0);
  if (!alivePlayers) return { ...state, isOver: true, outcome: "defeat" };
  if (!aliveEnemies) return { ...state, isOver: true, outcome: "victory" };
  return state;
}

function appendLog(state: BattleStateV1, log: HuntBattleLog): BattleStateV1 {
  return { ...state, logs: [...state.logs, log] };
}

export function createBattleV1(seeds: RosterSeed[], battlefield: BattlefieldState): BattleStateV1 {
  const combatants = new Map<string, CombatantStateV1>();
  const roster = new Map<string, BattleRosterEntry>();
  const clocks = new Map<string, CombatantTurnClock>();

  for (const seed of seeds) {
    combatants.set(seed.combatant.id, seed.combatant);
    roster.set(seed.combatant.id, { skills: seed.skills, ultimate: seed.ultimate, deathReactionSkill: seed.deathReactionSkill });
    clocks.set(seed.combatant.id, {
      combatantId: seed.combatant.id,
      cooldowns: {},
      ultimateCurrentCharge: 0,
      ultimateRequiredCharge: seed.ultimate?.cooldownTurns ?? 0,
      isUltimateReady: false,
    });
  }

  const initiativeQueue = buildInitiativeQueue([...combatants.values()]);
  const baseState: BattleStateV1 = {
    battlefield,
    turn: 1,
    combatants,
    roster,
    clocks,
    initiativeQueue,
    activeIndex: 0,
    movementRemaining: 0,
    logs: [{ turn: 1, tone: "system", text: "⚔️ A batalha começa!" }],
    isOver: false,
    nextSummonSeq: 1,
  };

  return initiativeQueue.length ? beginActorTurn(baseState, initiativeQueue[0]) : baseState;
}

/** Avança para o próximo combatente vivo na fila; ao voltar ao início, abre nova rodada e recalcula a fila (Speed pode ter mudado). */
function advanceToNextActor(state: BattleStateV1): BattleStateV1 {
  if (state.isOver) return state;
  let queue = state.initiativeQueue;
  let index = state.activeIndex;
  let turn = state.turn;

  for (let attempts = 0; attempts <= queue.length; attempts += 1) {
    index += 1;
    if (index >= queue.length) {
      index = 0;
      turn += 1;
      queue = buildInitiativeQueue([...state.combatants.values()]);
      if (!queue.length) return { ...state, initiativeQueue: queue, isOver: true };
    }
    const actorId = queue[index];
    const actor = state.combatants.get(actorId);
    if (actor && actor.hpCurrent > 0) {
      return beginActorTurn({ ...state, initiativeQueue: queue, activeIndex: index, turn }, actorId);
    }
  }
  return { ...state, initiativeQueue: queue, activeIndex: index, turn };
}

/** ETAPA 1 — início de turno: tick de relógio (recarga/carga de Ultimate), DoT, e carregamento pendente. */
function beginActorTurn(state: BattleStateV1, actorId: string): BattleStateV1 {
  const actor = state.combatants.get(actorId);
  const clock = state.clocks.get(actorId);
  if (!actor || !clock) return state;

  const tickResult = tickCombatantTurnStart(clock, actor.activeEffects);
  const updatedActor: CombatantStateV1 = { ...actor, activeEffects: tickResult.updatedEffects };
  let logs = state.logs;

  if (tickResult.dotDamage > 0 && updatedActor.hpCurrent > 0) {
    updatedActor.hpCurrent = Math.max(0, updatedActor.hpCurrent - tickResult.dotDamage);
    logs = [...logs, { turn: state.turn, tone: "system", text: `🩸 ${updatedActor.name} sofre ${tickResult.dotDamage} de dano contínuo. (HP: ${updatedActor.hpCurrent}/${updatedActor.hpMax})` }];
    if (updatedActor.hpCurrent === 0) {
      logs = [...logs, { turn: state.turn, tone: "defeat", text: `☠️ ${updatedActor.name} sucumbiu aos efeitos contínuos.` }];
    }
  }

  const combatants = new Map(state.combatants);
  combatants.set(actorId, updatedActor);
  const clocks = new Map(state.clocks);
  clocks.set(actorId, tickResult.clock);

  let nextState = checkOutcome({ ...state, combatants, clocks, logs, movementRemaining: updatedActor.movement });
  if (nextState.isOver || updatedActor.hpCurrent <= 0) {
    return nextState.isOver ? nextState : advanceToNextActor(nextState);
  }

  if (updatedActor.charging) {
    const turnsRemaining = updatedActor.charging.turnsRemaining - 1;
    if (turnsRemaining > 0) {
      const withCountdown = new Map(nextState.combatants);
      withCountdown.set(actorId, { ...updatedActor, charging: { ...updatedActor.charging, turnsRemaining } });
      return advanceToNextActor({ ...nextState, combatants: withCountdown }); // ainda carregando: sem ação disponível este turno
    }
    const rosterEntry = nextState.roster.get(actorId);
    const skill = rosterEntry ? skillsById(rosterEntry).get(updatedActor.charging.skillId) : undefined;
    if (skill) {
      return declareAction(nextState, actorId, skill.id, updatedActor.charging.targetCell, { isChargeContinuation: true });
    }
  }

  return nextState; // turno normal: aguarda declareAction/moveActor externo (Player) ou pickLabAction (IA)
}

/**
 * Ponto de entrada único para Player e IA: valida a ação contra o relógio do turno,
 * resolve via action-resolver, aplica reações (Último Suspiro, penalidade de interrupção)
 * e avança para o próximo ator. Habilidades de invocação são desviadas para `resolveSummon`.
 */
export function declareAction(
  state: BattleStateV1,
  actorId: string,
  skillId: string,
  targetCell: Axial,
  options: DeclareActionOptions = {},
): BattleStateV1 {
  if (state.isOver) return state;
  const actor = state.combatants.get(actorId);
  const rosterEntry = state.roster.get(actorId);
  const clock = state.clocks.get(actorId);
  if (!actor || !rosterEntry || !clock || actor.hpCurrent <= 0) return state;

  const skill = skillsById(rosterEntry).get(skillId);
  if (!skill) return state;

  const rng = options.rng ?? Math.random;
  const isChargeContinuation = Boolean(options.isChargeContinuation) && Boolean(actor.charging && actor.charging.skillId === skillId);

  if (!isChargeContinuation) {
    if ((clock.cooldowns[skillId] ?? 0) > 0) {
      return appendLog(state, { turn: state.turn, tone: "system", text: `${actor.name} tenta usar ${skill.name}, mas a habilidade está em recarga (${clock.cooldowns[skillId]} turno(s)).` });
    }
    if (skill.isUltimate && !clock.isUltimateReady) {
      return appendLog(state, { turn: state.turn, tone: "system", text: `${actor.name} tenta usar ${skill.name}, mas a Ultimate ainda não está carregada (${clock.ultimateCurrentCharge}/${clock.ultimateRequiredCharge}).` });
    }
  }

  if (skill.summon && !isChargeContinuation) {
    return resolveSummon(state, actor, skill, targetCell);
  }

  const traitsSnapshot = recomputeTraits(state.combatants);
  const activeTraits = actor.team === "player" ? traitsSnapshot.player : traitsSnapshot.enemy;

  const result = resolveCombatActionV1(actor, skill, targetCell, [...state.combatants.values()], state.battlefield, state.turn, activeTraits, rng);

  // Merge de combatentes (o resolver devolve cópias imutáveis dos afetados).
  let combatants = new Map(state.combatants);
  for (const defender of result.defenders) combatants.set(defender.id, defender);
  combatants.set(result.attacker.id, result.attacker);

  // Custo da ação no relógio: recarga comum OU carga de Ultimate. Continuações de carga não pagam de novo.
  let clocks = new Map(state.clocks);
  let updatedClock = clock;
  const justStartedCharging = Boolean(result.attacker.charging);
  if (justStartedCharging) {
    updatedClock = skill.isUltimate ? resetUltimateCharge(updatedClock) : (skill.cooldownTurns > 0 ? setSkillCooldown(updatedClock, skill.id, skill.cooldownTurns) : updatedClock);
  } else if (!isChargeContinuation) {
    updatedClock = skill.isUltimate ? resetUltimateCharge(updatedClock) : (skill.cooldownTurns > 0 ? setSkillCooldown(updatedClock, skill.id, skill.cooldownTurns) : updatedClock);
  }
  clocks.set(actorId, updatedClock);

  // Penalidade de interrupção: carregamento interrompido vai para recarga cheia (Ultimates perdem a carga, já zerada acima se foram elas mesmas interrompidas por outra via — aqui é o ALVO interrompido).
  for (const hit of result.hits) {
    if (hit.interrupted && hit.interruptedSkillId) {
      const defenderRoster = state.roster.get(hit.targetId);
      const defenderSkill = defenderRoster ? skillsById(defenderRoster).get(hit.interruptedSkillId) : undefined;
      const defenderClock = clocks.get(hit.targetId);
      if (defenderRoster && defenderSkill && defenderClock && !defenderSkill.isUltimate) {
        clocks.set(hit.targetId, setSkillCooldown(defenderClock, hit.interruptedSkillId, defenderSkill.cooldownTurns));
      } else if (defenderSkill?.isUltimate && defenderClock) {
        clocks.set(hit.targetId, resetUltimateCharge(defenderClock));
      }
    }
  }

  let logs = [...state.logs, ...result.logs];

  // Último Suspiro real: processa em passadas limitadas para permitir reação-em-cadeia sem risco de loop infinito.
  let pendingEvents: Array<{ unitId: string; aimAtCell: Axial }> = [];
  for (const hit of result.hits) {
    if (hit.lastBreathTriggered) pendingEvents.push({ unitId: hit.targetId, aimAtCell: result.attacker.position ?? targetCell });
  }
  if (result.attackerLastBreathTriggered) pendingEvents.push({ unitId: actorId, aimAtCell: targetCell });

  for (let pass = 0; pass < 4 && pendingEvents.length; pass += 1) {
    const nextEvents: Array<{ unitId: string; aimAtCell: Axial }> = [];
    for (const event of pendingEvents) {
      const dyingUnit = combatants.get(event.unitId);
      const reactionSkill = state.roster.get(event.unitId)?.deathReactionSkill;
      if (!dyingUnit || !reactionSkill) continue;

      const aimCell = (reactionSkill.range ?? 1) === 0 ? (dyingUnit.position ?? event.aimAtCell) : event.aimAtCell;
      const reactionTraitsSnapshot = recomputeTraits(combatants);
      const reactionTraits = dyingUnit.team === "player" ? reactionTraitsSnapshot.player : reactionTraitsSnapshot.enemy;
      const reactionResult = resolveCombatActionV1(dyingUnit, reactionSkill, aimCell, [...combatants.values()], state.battlefield, state.turn, reactionTraits, rng);

      for (const defender of reactionResult.defenders) combatants.set(defender.id, defender);
      combatants.set(event.unitId, { ...reactionResult.attacker, hpCurrent: 0 }); // a unidade permanece morta após a técnica final
      logs = [...logs, ...reactionResult.logs, { turn: state.turn, tone: "defeat", text: `☠️ ${dyingUnit.name} caiu após a técnica final.` }];

      for (const hit of reactionResult.hits) {
        if (hit.lastBreathTriggered) nextEvents.push({ unitId: hit.targetId, aimAtCell: dyingUnit.position ?? aimCell });
      }
    }
    pendingEvents = nextEvents;
  }

  if (typeof result.bonusMovementGranted === "number") {
    state = { ...state, movementRemaining: state.movementRemaining + result.bonusMovementGranted };
  }

  const merged = checkOutcome({ ...state, combatants, clocks, logs });
  return merged.isOver ? merged : advanceToNextActor(merged);
}

function resolveSummon(state: BattleStateV1, actor: CombatantStateV1, skill: SkillDefinitionV1, targetCell: Axial): BattleStateV1 {
  const template = skill.summon ? SUMMON_TEMPLATES[skill.summon.templateId] : undefined;
  if (!template) {
    return appendLog(state, { turn: state.turn, tone: "system", text: `${actor.name} tenta invocar, mas o template não existe.` });
  }

  const distance = hexDistance(actor.position ?? { q: 0, r: 0 }, targetCell);
  if (distance > (skill.range ?? 1)) {
    return appendLog(state, { turn: state.turn, tone: "system", text: `${actor.name} tenta usar ${skill.name} fora de alcance.` });
  }
  const occupied = new Set([...state.combatants.values()].filter((c) => c.hpCurrent > 0 && c.position).map((c) => hexKey(c.position!)));
  if (occupied.has(hexKey(targetCell))) {
    return appendLog(state, { turn: state.turn, tone: "system", text: `${actor.name} tenta usar ${skill.name}, mas a célula está ocupada.` });
  }

  const summonId = `${skill.summon!.templateId}_${state.nextSummonSeq}`;
  const summonedUnit = template(summonId, targetCell);

  const combatants = new Map(state.combatants);
  combatants.set(summonId, summonedUnit);
  const roster = new Map(state.roster);
  roster.set(summonId, { skills: summonedUnit.skills ?? [], ultimate: summonedUnit.ultimate, deathReactionSkill: summonedUnit.deathReactionSkill });
  const clocks = new Map(state.clocks);
  clocks.set(summonId, {
    combatantId: summonId,
    cooldowns: {},
    ultimateCurrentCharge: 0,
    ultimateRequiredCharge: summonedUnit.ultimate?.cooldownTurns ?? 0,
    isUltimateReady: false,
  });
  if (skill.cooldownTurns > 0) {
    const actorClock = clocks.get(actor.id);
    if (actorClock) clocks.set(actor.id, setSkillCooldown(actorClock, skill.id, skill.cooldownTurns));
  }

  const logs = [...state.logs, { turn: state.turn, tone: (actor.team === "player" ? "player" : "enemy") as HuntBattleLog["tone"], text: `✨ ${actor.name} invoca ${summonedUnit.name}!` }];
  const initiativeQueue = [...state.initiativeQueue, summonId];

  const merged = checkOutcome({ ...state, combatants, roster, clocks, logs, initiativeQueue, nextSummonSeq: state.nextSummonSeq + 1 });
  return merged.isOver ? merged : advanceToNextActor(merged);
}

/** Move o ator ativo dentro do orçamento de movimento do turno. Consome todo o orçamento (sem ação de mover+agir fracionado nesta versão de laboratório). */
export function moveActor(state: BattleStateV1, actorId: string, destination: Axial): BattleStateV1 {
  if (state.isOver) return state;
  const actor = state.combatants.get(actorId);
  if (!actor || actor.hpCurrent <= 0 || !actor.position) return state;
  if (state.movementRemaining <= 0) {
    return appendLog(state, { turn: state.turn, tone: "system", text: `${actor.name} não tem mais movimento neste turno.` });
  }

  const occupied = new Set([...state.combatants.values()].filter((c) => c.id !== actorId && c.hpCurrent > 0 && c.position).map((c) => hexKey(c.position!)));
  const reachable = new Set(reachableCells(actor.position, state.movementRemaining, boardCells(), occupied, state.battlefield).map(hexKey));
  if (!reachable.has(hexKey(destination))) {
    return appendLog(state, { turn: state.turn, tone: "system", text: `${actor.name} não consegue alcançar essa célula.` });
  }

  const combatants = new Map(state.combatants);
  combatants.set(actorId, { ...actor, position: destination });
  const logs = [...state.logs, { turn: state.turn, tone: (actor.team === "player" ? "player" : "enemy") as HuntBattleLog["tone"], text: `${actor.name} se move pelo campo.` }];
  return { ...state, combatants, movementRemaining: 0, logs };
}

/** Passa a vez sem agir (ex: sem alvo em alcance). */
export function passTurn(state: BattleStateV1, actorId: string): BattleStateV1 {
  if (state.isOver) return state;
  const actor = state.combatants.get(actorId);
  if (!actor || actor.hpCurrent <= 0) return state;
  const passed = appendLog(state, { turn: state.turn, tone: "system", text: `${actor.name} aguarda.` });
  return advanceToNextActor(passed);
}

/**
 * IA mínima de laboratório: prioriza a habilidade disponível de maior escala de dano
 * que alcance um alvo vivo do time adversário; usa a Ultimate assim que estiver pronta.
 * Não é a IA tática real (ai-tactical.ts, Fase 6) — serve só para validar o motor V1 isolado.
 */
export function pickLabAction(state: BattleStateV1, actorId: string): { skillId: string; targetCell: Axial } | null {
  const actor = state.combatants.get(actorId);
  const rosterEntry = state.roster.get(actorId);
  const clock = state.clocks.get(actorId);
  if (!actor || !rosterEntry || !clock || actor.hpCurrent <= 0 || !actor.position) return null;

  const enemyTeam = actor.team === "player" ? "enemy" : "player";
  const targets = [...state.combatants.values()].filter((c) => c.team === enemyTeam && c.hpCurrent > 0 && c.position);
  if (!targets.length) return null;

  const candidates: SkillDefinitionV1[] = [];
  if (rosterEntry.ultimate && clock.isUltimateReady) candidates.push(rosterEntry.ultimate);
  for (const skill of rosterEntry.skills) {
    if ((clock.cooldowns[skill.id] ?? 0) === 0) candidates.push(skill);
  }
  candidates.sort((a, b) => b.powerScaling - a.powerScaling);

  for (const skill of candidates) {
    if (skill.selfEffects?.length || skill.grantsBonusMovement) return { skillId: skill.id, targetCell: actor.position };
    const range = skill.range ?? 1;
    const reachableTarget = targets
      .filter((t) => hexDistance(actor.position!, t.position!) <= range)
      .sort((a, b) => hexDistance(actor.position!, a.position!) - hexDistance(actor.position!, b.position!))[0];
    if (reachableTarget) return { skillId: skill.id, targetCell: reachableTarget.position! };
  }
  return null;
}
