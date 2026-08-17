/**
 * ai-tactical.ts — Motor de decisão tática da IA
 *
 * Extraído de rules.ts para manter responsabilidades claras:
 * - Perfis de comportamento (Flanker, Enforcer, Artillery, Predator, Sentinel, Swarm, Controller)
 * - Scoring de hexes para movimento
 * - Seleção de habilidades com scoring tático
 * - Memória de alvo e neblina
 * - Intenção para HUD
 *
 * Todas as constantes de peso tático ficam agrupadas no topo do arquivo
 * para facilitar balanceamento sem caçar linha por linha.
 */

import type {
  AITacticalIntent,
  AITacticalProfile,
  Axial,
  BattlefieldState,
  CreatureAbilityDefinition,
  HuntCombatant,
} from "./domain";

import {
  AXIAL_DIRECTIONS,
  ENEMY_FRONT_SPAWN_CELLS,
  PLAYER_START_CELL,
  activeFrontLine,
  boardCells,
  canUnitSeeCell,
  creatureAbilityArea,
  creatureAbilityRange,
  hasLineOfSight,
  hexDirectionToward,
  hexDistance,
  positionLabelForDistance,
  reachableCells,
  terrainCoverPercent,
  terrainMovementCost,
} from "./rules";

// ---------------------------------------------------------------------------
// Pesos táticos — agrupados por perfil para facilitar balanceamento
// ---------------------------------------------------------------------------

/** Pesos compartilhados por todos os perfis. */
const COMMON_WEIGHTS = {
  /** Bônus por estar dentro do alcance da habilidade escolhida. */
  IN_RANGE: 24,
  /** Penalidade por cada hex fora do alcance. */
  OUT_OF_RANGE_PER_HEX: 12,
  /** Penalidade mínima quando fora do alcance. */
  OUT_OF_RANGE_MIN: 8,
  /** Bônus por ter LoS até o alvo quando ele é visível. */
  LOS_VISIBLE: 20,
  /** Penalidade por não ter LoS quando alvo é visível. */
  LOS_BLOCKED: -45,
  /** Penalidade por custo de terreno difícil acima de 1. */
  TERRAIN_COST_PER_EXTRA: 3,
  /** HP baixo: bônus de cobertura para perfis não-agressivos. */
  LOW_HP_COVER_FACTOR: 0.8,
  /** HP baixo: bônus por manter distância ≥ 2. */
  LOW_HP_DISTANCE_BONUS: 12,
  /** Limiar de HP baixo (% da vida máxima). */
  LOW_HP_THRESHOLD: 0.35,
  /** Histerese mínima de score para evitar "dança" de hex. */
  HYSTERESIS: 3,
  /** Jitter máximo para variância anti-previsibilidade (± este valor). */
  JITTER_MAX: 2,
  /** Penalidade por hex quando a IA sem memória se afasta do centro. */
  NO_MEMORY_CENTER_PENALTY: 3,
  /** Líder com tropa: penalidade por adjacência ao player. */
  LEADER_ADJACENCY_PENALTY: -28,
  /** Líder com tropa: bônus por distância 2-3 segura. */
  LEADER_SAFE_DISTANCE_BONUS: 14,
  /** Líder: fator de cobertura. */
  LEADER_COVER_FACTOR: 0.35,
} as const;

const FLANKER_WEIGHTS = {
  BACK_ARC: 38,
  FLANK_ARC: 24,
  FRONT_ARC: -8,
  IDEAL_DISTANCE_BONUS: 8,
} as const;

const ENFORCER_WEIGHTS = {
  ADJACENT: 42,
  DISTANCE_BONUS_BASE: 18,
  DISTANCE_PENALTY_PER_HEX: 6,
  FRONT_ARC: 8,
  COVER_PENALTY_FACTOR: 0.1,
} as const;

const ARTILLERY_WEIGHTS = {
  DISTANCE_OFF_IDEAL_PENALTY: 14,
  COVER_FACTOR: 0.9,
  TOO_CLOSE_PENALTY: -45,
  LOS_BONUS: 15,
  /** Distância mínima desejada. */
  MIN_DESIRED: 2,
  /** Distância máxima desejada (se range >= 90 usa 3). */
  MAX_DESIRED_DEFAULT: 4,
} as const;

const PREDATOR_WEIGHTS = {
  BACK_ARC: 42,
  FLANK_ARC: 25,
  FRONT_ARC: -4,
  HIDDEN_FROM_PLAYER: 18,
  TARGET_WOUNDED_BONUS: 18,
  /** Limiar para considerar alvo ferido. */
  TARGET_WOUNDED_THRESHOLD: 0.5,
  /** Bônus extra de agressividade quando alvo está crítico (< 30% HP). */
  TARGET_CRITICAL_EXTRA: 12,
  TARGET_CRITICAL_THRESHOLD: 0.3,
} as const;

const SENTINEL_WEIGHTS = {
  ALLY_ADJACENT: 34,
  ALLY_CLOSE: 15,
  ALLY_FAR_PENALTY_PER_HEX: 4,
  INTERCEPT_LINE: 24,
  FALLBACK_CLOSE: 18,
  COVER_FACTOR: 0.35,
} as const;

const SWARM_WEIGHTS = {
  ADJACENT: 34,
  DISTANCE_PENALTY_PER_HEX: 5,
  BACK_ARC: 25,
  FLANK_ARC: 18,
  /** Penalidade por dividir a mesma direção com outro aliado. */
  SAME_DIRECTION_PENALTY: -12,
  /** Bônus por ocupar direção não coberta. */
  UNIQUE_DIRECTION_BONUS: 20,
  /** Bônus quando cerco atinge 3+ direções cobertas. */
  SURROUND_COMPLETE_BONUS: 10,
} as const;

const CONTROLLER_WEIGHTS = {
  DISTANCE_OFF_IDEAL_PENALTY: 8,
  COVER_FACTOR: 0.45,
  AREA_BONUS: 15,
} as const;

/** Todos os pesos exportados para quem quiser ler/modificar de fora. */
export const TACTICAL_WEIGHTS = {
  COMMON: COMMON_WEIGHTS,
  FLANKER: FLANKER_WEIGHTS,
  ENFORCER: ENFORCER_WEIGHTS,
  ARTILLERY: ARTILLERY_WEIGHTS,
  PREDATOR: PREDATOR_WEIGHTS,
  SENTINEL: SENTINEL_WEIGHTS,
  SWARM: SWARM_WEIGHTS,
  CONTROLLER: CONTROLLER_WEIGHTS,
} as const;

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

const hexKey = (cell: Axial) => `${cell.q},${cell.r}`;

function enemyMoveRange(enemy: HuntCombatant): number {
  if (enemy.archetype === "caster" || enemy.archetype === "skirmisher" || enemy.archetype === "swarm") return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// Resolução de perfil tático
// ---------------------------------------------------------------------------

/** Deriva o perfil de comportamento espacial baseado em identidade, arquétipo e kit. */
export function resolveEnemyTacticalProfile(enemy: Pick<HuntCombatant, "creatureId" | "name" | "archetype" | "role" | "abilities" | "tacticalProfile">): AITacticalProfile {
  if (enemy.tacticalProfile) return enemy.tacticalProfile;
  const identity = `${enemy.creatureId ?? ""} ${enemy.name}`.toLowerCase();
  if (/vamp|bruma|mist-captain|barao-da-bruma|noiva-do-mausoleu/.test(identity)) return "predator";
  if (/goblin|catador-verde|cobrador-goblin/.test(identity) && enemy.archetype !== "caster") return "flanker";
  if (/orc|carrasco|minotauro|chifrudo/.test(identity)) return "enforcer";
  const hasZoneControl = (enemy.abilities ?? []).some((ability) => {
    const area = creatureAbilityArea(ability);
    return Boolean(ability.chargeTurns) || area.shape !== "single";
  });
  if (enemy.role === "leader" && hasZoneControl) return "controller";
  if (enemy.archetype === "tank") return "sentinel";
  if (enemy.archetype === "caster") return "artillery";
  if (enemy.archetype === "swarm") return "swarm";
  if (enemy.archetype === "brute") return "enforcer";
  return "flanker";
}

// ---------------------------------------------------------------------------
// Alvo e memória de neblina
// ---------------------------------------------------------------------------

export interface TacticalTargetInfo {
  position: Axial;
  visible: boolean;
  hasMemory: boolean;
}

/**
 * Resolve a posição-alvo percebida pela IA, respeitando neblina.
 *
 * Bug B3 corrigido: sem memória, a IA mantém a posição atual como referência
 * em vez de convergir cegamente para o centro {0,0}. Isso evita que toda a
 * horda se empilhe no centro do mapa.
 */
export function enemyTacticalTarget(self: HuntCombatant, player: HuntCombatant, battlefield: BattlefieldState): TacticalTargetInfo {
  const playerPosition = player.position ?? PLAYER_START_CELL;
  const visible = canUnitSeeCell(self, playerPosition, battlefield);
  if (visible) return { position: playerPosition, visible: true, hasMemory: true };
  if (self.lastKnownTargetPosition) return { position: self.lastKnownTargetPosition, visible: false, hasMemory: true };
  // B3: Sem memória, a IA usa sua posição ATUAL como referência em vez de
  // correr para o centro. Isso faz cada criatura se manter espalhada no campo
  // enquanto não ganha contato visual, em vez de se amontoar em {0,0}.
  const selfPos = self.position ?? ENEMY_FRONT_SPAWN_CELLS[0];
  return { position: selfPos, visible: false, hasMemory: false };
}

// ---------------------------------------------------------------------------
// Proteção de aliados (Sentinel)
// ---------------------------------------------------------------------------

/**
 * Encontra o aliado que mais precisa de proteção.
 * M3: aceita um Set de aliados já cobertos por outro Sentinel para distribuir.
 */
export function priorityProtectedAlly(
  self: HuntCombatant,
  enemies: HuntCombatant[],
  alreadyProtectedIds?: Set<string>,
): HuntCombatant | undefined {
  return activeFrontLine(enemies)
    .filter((entry) =>
      entry.id !== self.id
      && entry.hpCurrent > 0
      && entry.position
      && !(alreadyProtectedIds?.has(entry.id)),
    )
    .sort((a, b) => {
      const leaderDiff = Number(b.role === "leader") - Number(a.role === "leader");
      if (leaderDiff !== 0) return leaderDiff;
      const casterDiff = Number(b.archetype === "caster") - Number(a.archetype === "caster");
      if (casterDiff !== 0) return casterDiff;
      const aHp = a.hpCurrent / Math.max(1, a.hpMax);
      const bHp = b.hpCurrent / Math.max(1, b.hpMax);
      return aHp - bHp;
    })[0];
}

/**
 * M3: Detecta quais aliados já estão "cobertos" por outro Sentinel que
 * não é `self`, para que este Sentinel proteja um aliado diferente.
 */
function sentinelAlreadyProtectedIds(self: HuntCombatant, enemies: HuntCombatant[]): Set<string> {
  const protectedIds = new Set<string>();
  const front = activeFrontLine(enemies);
  for (const ally of front) {
    if (ally.id === self.id || ally.hpCurrent <= 0) continue;
    const profile = resolveEnemyTacticalProfile(ally);
    if (profile !== "sentinel") continue;
    // Se outro sentinel já está adjacente a um aliado, considera-o "coberto"
    const protectedByThis = priorityProtectedAlly(ally, enemies);
    if (protectedByThis) protectedIds.add(protectedByThis.id);
  }
  return protectedIds;
}

// ---------------------------------------------------------------------------
// Intenção tática (labels para HUD)
// ---------------------------------------------------------------------------

export function tacticalIntentFor(
  profile: AITacticalProfile,
  self: HuntCombatant,
  player: HuntCombatant,
  destination: Axial,
  battlefield: BattlefieldState,
  enemies: HuntCombatant[],
): AITacticalIntent {
  const playerPosition = player.position ?? PLAYER_START_CELL;
  const start = self.position ?? destination;
  const startDistance = hexDistance(start, playerPosition);
  const endDistance = hexDistance(destination, playerPosition);
  const arc = relativeArcLocal(destination, playerPosition, player.facing ?? 0);
  const alreadyProtected = profile === "sentinel" ? sentinelAlreadyProtectedIds(self, enemies) : undefined;
  const protectedAlly = profile === "sentinel" ? priorityProtectedAlly(self, enemies, alreadyProtected) : undefined;
  if (self.role !== "leader" && protectedAlly?.position && hexDistance(destination, protectedAlly.position) <= 1 && profile === "sentinel") {
    return { kind: "protect_leader", label: protectedAlly.role === "leader" ? "Proteger líder" : `Proteger ${protectedAlly.name}`, targetCell: destination };
  }
  if (profile === "flanker") return { kind: "flank", label: arc === "back" ? "Buscar costas" : "Flanquear", targetCell: destination };
  if (profile === "predator") return { kind: "hunt", label: arc === "back" ? "Caçar pelas costas" : "Caçar alvo", targetCell: destination };
  if (profile === "swarm") return { kind: "surround", label: "Cercar", targetCell: destination };
  if (profile === "artillery") {
    if (endDistance > startDistance) return { kind: "retreat", label: "Recuar", targetCell: destination };
    if (terrainCoverPercent(battlefield, destination) > 0) return { kind: "seek_cover", label: "Buscar cobertura", targetCell: destination };
    return { kind: "hold", label: "Manter distância", targetCell: destination };
  }
  if (profile === "sentinel") return { kind: "hold", label: protectedAlly ? "Proteger formação" : "Segurar linha", targetCell: destination };
  if (profile === "controller") return { kind: "control_zone", label: "Controlar zona", targetCell: destination };
  return { kind: "advance", label: endDistance < startDistance ? "Avançar" : "Pressionar", targetCell: destination };
}

// ---------------------------------------------------------------------------
// relativeArc local (evita dependência circular já que rules.ts também exporta)
// ---------------------------------------------------------------------------

type RelativeArc = "front" | "flank" | "back";

function relativeArcLocal(attacker: Axial, defender: Axial, defenderFacing = 0): RelativeArc {
  const incoming = hexDirectionToward(defender, attacker);
  const delta = Math.min((incoming - defenderFacing + 6) % 6, (defenderFacing - incoming + 6) % 6);
  if (delta <= 1) return "front";
  if (delta === 2) return "flank";
  return "back";
}

// ---------------------------------------------------------------------------
// Scoring de hex (célula candidata para movimento)
// ---------------------------------------------------------------------------

/**
 * Pontua um hex como destino de movimento para um combatente da IA.
 * Considera perfil tático, alcance, LoS, cobertura, terreno, HP, arco e sinergia.
 *
 * M2: Inclui variância anti-previsibilidade (jitter).
 * M3: Sentinelas distribuem proteção entre aliados distintos.
 * M4: Swarm com bônus de cerco completo.
 * M5: Predator com caça agressiva contra feridos.
 */
export function tacticalCellScore(
  self: HuntCombatant,
  player: HuntCombatant,
  enemies: HuntCombatant[],
  ability: CreatureAbilityDefinition,
  battlefield: BattlefieldState,
  cell: Axial,
  targetInfo: TacticalTargetInfo,
): number {
  const W = COMMON_WEIGHTS;
  const profile = resolveEnemyTacticalProfile(self);
  const target = targetInfo.position;
  const distance = hexDistance(cell, target);
  const abilityRange = creatureAbilityRange(ability, self);
  const simulatedSelf = { ...self, position: cell };
  const canSeeTarget = targetInfo.visible ? canUnitSeeCell(simulatedSelf, target, battlefield) : hasLineOfSight(cell, target, battlefield);
  const inRange = abilityRange >= 90 || distance <= abilityRange;
  const cover = terrainCoverPercent(battlefield, cell);
  const terrainCost = terrainMovementCost(battlefield, cell);
  const arc = relativeArcLocal(cell, target, player.facing ?? 0);
  const hpRatio = self.hpCurrent / Math.max(1, self.hpMax);
  const targetHpRatio = player.hpCurrent / Math.max(1, player.hpMax);
  let score = 0;

  // Regra comum: a IA quer terminar num lugar em que sua ação seja possível.
  if (targetInfo.visible) score += canSeeTarget ? W.LOS_VISIBLE : W.LOS_BLOCKED;
  if (inRange) score += W.IN_RANGE;
  else score -= Math.max(W.OUT_OF_RANGE_MIN, (distance - abilityRange) * W.OUT_OF_RANGE_PER_HEX);
  score -= Math.max(0, terrainCost - 1) * W.TERRAIN_COST_PER_EXTRA;

  // Risco: criaturas frágeis/feridas valorizam cobertura e distância.
  if (hpRatio < W.LOW_HP_THRESHOLD && !["enforcer", "swarm"].includes(profile)) {
    score += cover * W.LOW_HP_COVER_FACTOR;
    if (distance >= 2) score += W.LOW_HP_DISTANCE_BONUS;
  }

  // --- Scoring específico por perfil ---
  if (profile === "flanker") {
    const F = FLANKER_WEIGHTS;
    score += arc === "back" ? F.BACK_ARC : arc === "flank" ? F.FLANK_ARC : F.FRONT_ARC;
    if (distance === Math.min(abilityRange, 1)) score += F.IDEAL_DISTANCE_BONUS;
  } else if (profile === "enforcer") {
    const E = ENFORCER_WEIGHTS;
    score += distance === 1 ? E.ADJACENT : Math.max(0, E.DISTANCE_BONUS_BASE - distance * E.DISTANCE_PENALTY_PER_HEX);
    if (arc === "front") score += E.FRONT_ARC;
    score -= cover * E.COVER_PENALTY_FACTOR;
  } else if (profile === "artillery") {
    const A = ARTILLERY_WEIGHTS;
    const desired = Math.max(A.MIN_DESIRED, Math.min(abilityRange >= 90 ? 3 : abilityRange, A.MAX_DESIRED_DEFAULT));
    score -= Math.abs(distance - desired) * A.DISTANCE_OFF_IDEAL_PENALTY;
    score += cover * A.COVER_FACTOR;
    // M6: Artillery em adjacência severa penalidade
    if (distance <= 1) score += A.TOO_CLOSE_PENALTY;
    if (canSeeTarget) score += A.LOS_BONUS;
  } else if (profile === "predator") {
    const P = PREDATOR_WEIGHTS;
    score += arc === "back" ? P.BACK_ARC : arc === "flank" ? P.FLANK_ARC : P.FRONT_ARC;
    const hiddenFromPlayer = !canUnitSeeCell({ ...player, position: target }, cell, battlefield);
    if (hiddenFromPlayer && canSeeTarget) score += P.HIDDEN_FROM_PLAYER;
    // M5: Predator fica mais agressivo contra alvo ferido/crítico
    if (targetHpRatio < P.TARGET_WOUNDED_THRESHOLD) {
      score += distance <= Math.max(1, abilityRange) ? P.TARGET_WOUNDED_BONUS : 0;
    }
    if (targetHpRatio < P.TARGET_CRITICAL_THRESHOLD) {
      // Caça ativa: reduz penalidade de arco e aumenta bônus de proximidade
      score += P.TARGET_CRITICAL_EXTRA;
      if (distance <= 1) score += 8; // aceita riscos maiores para fechar a presa
    }
  } else if (profile === "sentinel") {
    const S = SENTINEL_WEIGHTS;
    const alreadyProtected = sentinelAlreadyProtectedIds(self, enemies);
    const protectedAlly = priorityProtectedAlly(self, enemies, alreadyProtected);
    if (protectedAlly?.position) {
      const allyDistance = hexDistance(cell, protectedAlly.position);
      score += allyDistance === 1 ? S.ALLY_ADJACENT : allyDistance === 2 ? S.ALLY_CLOSE : -allyDistance * S.ALLY_FAR_PENALTY_PER_HEX;
      const interceptLine = new Set(hexLineLocal(target, protectedAlly.position).map(hexKey));
      if (interceptLine.has(hexKey(cell))) score += S.INTERCEPT_LINE;
    } else {
      score += distance <= 2 ? S.FALLBACK_CLOSE : 0;
    }
    score += cover * S.COVER_FACTOR;
  } else if (profile === "swarm") {
    const SW = SWARM_WEIGHTS;
    score += distance === 1 ? SW.ADJACENT : -distance * SW.DISTANCE_PENALTY_PER_HEX;
    score += arc === "back" ? SW.BACK_ARC : arc === "flank" ? SW.FLANK_ARC : 0;
    if (distance === 1) {
      const occupiedDirections = new Set(activeFrontLine(enemies)
        .filter((entry) => entry.id !== self.id && entry.hpCurrent > 0 && entry.position && hexDistance(entry.position, target) === 1)
        .map((entry) => hexDirectionToward(target, entry.position!)));
      const ownDirection = hexDirectionToward(target, cell);
      score += occupiedDirections.has(ownDirection) ? SW.SAME_DIRECTION_PENALTY : SW.UNIQUE_DIRECTION_BONUS;
      // M4: Bônus extra quando o cerco atinge 3+ direções diferentes
      const totalDirections = new Set([...occupiedDirections, ownDirection]).size;
      if (totalDirections >= 3) score += SW.SURROUND_COMPLETE_BONUS;
    }
  } else if (profile === "controller") {
    const C = CONTROLLER_WEIGHTS;
    const area = creatureAbilityArea(ability);
    const desired = area.shape === "single" ? Math.max(2, Math.min(abilityRange, 3)) : Math.max(2, Math.min(abilityRange, 4));
    score -= Math.abs(distance - desired) * C.DISTANCE_OFF_IDEAL_PENALTY;
    score += cover * C.COVER_FACTOR;
    if (area.shape !== "single" || ability.chargeTurns) score += C.AREA_BONUS;
  }

  // Líderes preservam-se enquanto ainda há tropa.
  const supportingAllies = activeFrontLine(enemies).filter((entry) => entry.id !== self.id && entry.hpCurrent > 0).length;
  if (self.role === "leader" && supportingAllies > 0) {
    if (distance <= 1) score += W.LEADER_ADJACENCY_PENALTY;
    if (distance >= 2 && distance <= 3) score += W.LEADER_SAFE_DISTANCE_BONUS;
    score += cover * W.LEADER_COVER_FACTOR;
  }

  // Sem memória do alvo, patrulha conservadora em vez de perseguição.
  if (!targetInfo.visible && !targetInfo.hasMemory) {
    // B3 fix: sem convergir para centro, apenas leve penalidade por sair da posição atual
    const selfPos = self.position ?? ENEMY_FRONT_SPAWN_CELLS[0];
    score -= hexDistance(cell, selfPos) * W.NO_MEMORY_CENTER_PENALTY;
  }

  // M2: Variância anti-previsibilidade
  score += (Math.random() * 2 - 1) * W.JITTER_MAX;

  return score;
}

// ---------------------------------------------------------------------------
// hexLine local (evita dependência circular)
// ---------------------------------------------------------------------------

function axialRoundLocal(q: number, r: number): Axial {
  let x = q; let z = r; let y = -x - z;
  let rx = Math.round(x); let ry = Math.round(y); let rz = Math.round(z);
  const xDiff = Math.abs(rx - x); const yDiff = Math.abs(ry - y); const zDiff = Math.abs(rz - z);
  if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz;
  else if (yDiff > zDiff) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

function hexLineLocal(origin: Axial, target: Axial): Axial[] {
  const distance = hexDistance(origin, target);
  if (distance === 0) return [origin];
  const cells: Axial[] = [];
  for (let step = 0; step <= distance; step += 1) {
    const t = step / distance;
    const cell = axialRoundLocal(origin.q + (target.q - origin.q) * t, origin.r + (target.r - origin.r) * t);
    if (!cells.some((entry) => hexKey(entry) === hexKey(cell))) cells.push(cell);
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Decisão de destino de movimento
// ---------------------------------------------------------------------------

/** Decide o melhor hex de destino considerando perfil tático, scoring e histerese. */
export function chooseEnemyTacticalDestination(
  self: HuntCombatant,
  player: HuntCombatant,
  enemies: HuntCombatant[],
  ability: CreatureAbilityDefinition,
  battlefield: BattlefieldState,
): { destination: Axial; intent: AITacticalIntent; sawTarget: boolean } {
  const start = self.position ?? ENEMY_FRONT_SPAWN_CELLS[0];
  const profile = resolveEnemyTacticalProfile(self);
  if (self.activeEffects.some((effect) => effect.kind === "position_lock")) {
    return {
      destination: start,
      intent: { kind: "hold", label: "Imobilizado", targetCell: start },
      sawTarget: canUnitSeeCell(self, player.position ?? PLAYER_START_CELL, battlefield),
    };
  }
  const targetInfo = enemyTacticalTarget(self, player, battlefield);
  const occupied = new Set<string>([hexKey(player.position ?? PLAYER_START_CELL)]);
  activeFrontLine(enemies).forEach((enemy) => {
    if (enemy.id !== self.id && enemy.hpCurrent > 0 && enemy.position) occupied.add(hexKey(enemy.position));
  });
  const candidates = [start, ...reachableCells(start, enemyMoveRange(self), boardCells(), occupied, battlefield)];
  const scored = candidates.map((cell) => ({ cell, score: tacticalCellScore(self, player, enemies, ability, battlefield, cell, targetInfo) }));
  scored.sort((a, b) => b.score - a.score || hexKey(a.cell).localeCompare(hexKey(b.cell)));
  const startScore = scored.find((entry) => hexKey(entry.cell) === hexKey(start))?.score ?? -Infinity;
  const best = scored[0] ?? { cell: start, score: startScore };
  // Histerese: evita que a IA fique trocando de hex sem ganho tático real.
  const destination = best.score >= startScore + COMMON_WEIGHTS.HYSTERESIS ? best.cell : start;
  const intent = targetInfo.visible || targetInfo.hasMemory
    ? tacticalIntentFor(profile, self, player, destination, battlefield, enemies)
    : { kind: "hunt", label: "Procurar alvo", targetCell: destination } satisfies AITacticalIntent;
  return { destination, intent, sawTarget: targetInfo.visible };
}

// ---------------------------------------------------------------------------
// Seleção de habilidade com scoring tático
// ---------------------------------------------------------------------------

interface TriggerContext {
  turn: number;
  self: HuntCombatant;
  target: HuntCombatant;
  alliesAlive: number;
  distance: number;
}

function hasBuff(combatant: HuntCombatant): boolean {
  return combatant.activeEffects.some((effect) => effect.kind === "guard" || effect.kind === "evasion" || effect.kind === "enraged" || (effect.damageBonusPercent ?? 0) > 0);
}

const REACTION_TRIGGERS = new Set(["target_changed_position", "target_attempted_escape_or_position_change"]);

function triggerNeedsVisibleTarget(trigger: string): boolean {
  return /target_|distance|target_position|target_changed|target_attempted/.test(trigger);
}

function abilityNeedsPlayerTarget(ability: CreatureAbilityDefinition): boolean {
  return !["self", "all_allies", "battlefield"].includes(ability.target);
}

/**
 * Avalia as pequenas expressões de aiTrigger do bestiário.
 *
 * Bug B2 corrigido: triggers que dependem de informação do alvo (HP, status,
 * posição) agora verificam se a IA pode ver o alvo. Na neblina sem visão,
 * a IA não pode "saber" o HP do Player.
 */
export function evaluateTrigger(trigger: string, ctx: TriggerContext, targetVisible = true): boolean {
  const t = trigger.trim();
  if (t === "always") return true;
  if (t === "turn == 1") return ctx.turn === 1;
  const modMatch = t.match(/^turn % (\d+) == 0$/);
  if (modMatch) return ctx.turn % Number(modMatch[1]) === 0;
  if (t === "hp_self == 0") return ctx.self.hpCurrent === 0;

  // B2: triggers que dependem de informação do alvo requerem visibilidade
  const needsTargetInfo = /^(target_hp|target_has_|target_not_|target_used_|target_position)/.test(t);
  if (needsTargetInfo && !targetVisible) return false;

  const cmpMatch = t.match(/^(hp_self|target_hp|mp_self)\s*(<= |>=|<|>|==)\s*(\d+)%$/);
  if (cmpMatch) {
    const [, subject, op, valueStr] = cmpMatch;
    const value = Number(valueStr);
    const percent = subject === "hp_self" ? (ctx.self.hpCurrent / Math.max(1, ctx.self.hpMax)) * 100
      : subject === "target_hp" ? (ctx.target.hpCurrent / Math.max(1, ctx.target.hpMax)) * 100
      : (ctx.self.mpCurrent / Math.max(1, ctx.self.mpMax)) * 100;
    if (op === "<") return percent < value;
    if (op === "<=") return percent <= value;
    if (op === ">") return percent > value;
    if (op === ">=") return percent >= value;
    return Math.abs(percent - value) < 0.01;
  }
  const alliesMatch = t.match(/^(?:allies_alive|allies_same_species|enemy_count)\s*(<=|>=|<|>|==)\s*(\d+)$/);
  if (alliesMatch) {
    const [, op, valueStr] = alliesMatch;
    const value = Number(valueStr);
    if (op === "<") return ctx.alliesAlive < value;
    if (op === "<=") return ctx.alliesAlive <= value;
    if (op === ">") return ctx.alliesAlive > value;
    if (op === ">=") return ctx.alliesAlive >= value;
    return ctx.alliesAlive === value;
  }
  if (t === "target_not_poisoned") return !ctx.target.activeEffects.some((effect) => effect.kind === "poison");
  if (t === "target_not_blind") return !ctx.target.activeEffects.some((effect) => effect.kind === "blind");
  if (t === "target_not_burning") return !ctx.target.activeEffects.some((effect) => effect.kind === "burn");
  if (t === "target_has_poison") return ctx.target.activeEffects.some((effect) => effect.kind === "poison");
  if (t === "target_has_marked") return ctx.target.activeEffects.some((effect) => effect.kind === "marked");
  if (t === "target_has_buff") return hasBuff(ctx.target);
  if (t === "target_used_ability") return Boolean(ctx.target.lastAbilityUsed);
  if (t === "dodged_last_turn") return Boolean(ctx.self.dodgedLastTurn);
  if (t === "attacked_last_turn") return Boolean(ctx.self.attackedLastTurn);
  if (t === "distance > 1") return ctx.distance > 1;
  if (t === "target_adjacent") return ctx.distance <= 1;
  const posMatch = t.match(/^target_position == (front|center|back)$/);
  if (posMatch) return positionLabelForDistance(ctx.distance) === posMatch[1];
  if (t === "target_changed_position" || t === "target_attempted_escape_or_position_change") return Boolean(ctx.target.changedPositionThisTurn);
  // "resource_full" depende de um medidor de recurso que este motor não tem — nunca dispara.
  if (t === "resource_full") return false;
  return false;
}

/** Pontua uma habilidade como candidata considerando executabilidade espacial e contexto tático. */
export function abilityTacticalScore(
  self: HuntCombatant,
  ability: CreatureAbilityDefinition,
  ctx: TriggerContext,
  battlefield: BattlefieldState,
  enemies: HuntCombatant[],
  targetVisible: boolean,
): number {
  const conditional = ability.aiTrigger !== "always";
  let score = conditional ? 50 : 0;
  score += Math.min(12, Math.max(0, ability.scaling * 4));
  const profile = resolveEnemyTacticalProfile(self);
  const area = creatureAbilityArea(ability);
  if (profile === "controller" && (area.shape !== "single" || ability.chargeTurns)) score += 18;
  if (ability.oncePerBattle && conditional) score += 4;

  if (abilityNeedsPlayerTarget(ability)) {
    if (!targetVisible) return score - 80;
    const start = self.position ?? ENEMY_FRONT_SPAWN_CELLS[0];
    const targetPosition = ctx.target.position ?? PLAYER_START_CELL;
    const occupied = new Set<string>([hexKey(targetPosition)]);
    activeFrontLine(enemies).forEach((enemy) => {
      if (enemy.id !== self.id && enemy.hpCurrent > 0 && enemy.position) occupied.add(hexKey(enemy.position));
    });
    const possibleCells = [start, ...reachableCells(start, enemyMoveRange(self), boardCells(), occupied, battlefield)];
    const range = creatureAbilityRange(ability, self);
    const canUseAfterMove = possibleCells.some((cell) => {
      const simulated = { ...self, position: cell };
      return (range >= 90 || hexDistance(cell, targetPosition) <= range) && canUnitSeeCell(simulated, targetPosition, battlefield);
    });
    score += canUseAfterMove ? 32 : -55;
    const currentInRange = range >= 90 || ctx.distance <= range;
    if (currentInRange && canUnitSeeCell(self, targetPosition, battlefield)) score += 8;
  } else if (ability.target === "self") {
    const hpRatio = self.hpCurrent / Math.max(1, self.hpMax);
    if (hpRatio < 0.5 && (ability.statusEffects?.length || ability.selfStatusEffects?.length || ability.specialEffects?.length)) score += 18;
  } else if (ability.target === "all_allies") {
    score += ctx.alliesAlive > 0 ? 15 : -20;
  }

  // M6: Artillery em adjacência prefere habilidades melee/básicas
  if (profile === "artillery" && ctx.distance <= 1 && ability.damageFamily !== "none") {
    const abilRange = creatureAbilityRange(ability, self);
    if (abilRange <= 1) score += 15; // favorece ataque corpo-a-corpo de emergência
    else score -= 10; // penaliza ataques à distância à queima-roupa
  }

  return score;
}

const DEFAULT_BASIC_ATTACK: CreatureAbilityDefinition = {
  id: "basic-attack",
  name: "Ataque Básico",
  damageFamily: "physical",
  scaling: 1,
  cooldownTurns: 0,
  target: "single_enemy",
  description: "Ataque direto.",
  aiTrigger: "always",
};

/** Seleciona a melhor habilidade da IA considerando triggers, cooldowns e scoring. */
export function pickCreatureAbility(
  self: HuntCombatant,
  ctx: TriggerContext,
  battlefield: BattlefieldState,
  enemies: HuntCombatant[],
  targetVisible: boolean,
): CreatureAbilityDefinition {
  const pool = self.abilities?.length ? self.abilities : [DEFAULT_BASIC_ATTACK];
  const usedOnce = new Set(self.usedOncePerBattle ?? []);
  const usable = pool.filter((ability) =>
    !ability.reaction
    && (self.abilityCooldowns?.[ability.id] ?? 0) === 0
    && !(ability.oncePerBattle && usedOnce.has(ability.id))
    && !(ability.damageFamily === "magical" && self.activeEffects.some((effect) => effect.kind === "silence")),
  );
  const fallbackBasic: CreatureAbilityDefinition = self.stats.magicalDamage > self.stats.physicalDamage
    ? { ...DEFAULT_BASIC_ATTACK, damageFamily: "magical", name: "Ataque Mágico Básico", range: 3 }
    : DEFAULT_BASIC_ATTACK;
  const eligible = usable.filter((ability) => {
    if (ability.aiTrigger === "always") return true;
    if (!targetVisible && triggerNeedsVisibleTarget(ability.aiTrigger)) return false;
    return evaluateTrigger(ability.aiTrigger, ctx, targetVisible);
  });
  if (!eligible.length) return fallbackBasic;
  const ranked = eligible.map((ability, index) => ({
    ability,
    index,
    score: abilityTacticalScore(self, ability, ctx, battlefield, enemies, targetVisible),
  }));
  ranked.sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked[0]?.ability ?? fallbackBasic;
}

/** Re-exporta constantes usadas por rules.ts */
export { REACTION_TRIGGERS, DEFAULT_BASIC_ATTACK };
export type { TriggerContext };
