import type { AbilityAreaDefinition, AbilityDefinition, AITacticalIntent, AITacticalProfile, Axial, BattleTerrainCell, BattlefieldState, CharacterCombatStats, CharacterPreset, ClassDefinition, CombatLoadout, CombatPosition, CombatStatusEffect, CreatureAbilityDefinition, CreatureSpecialEffect, EquippedItems, EquipmentItem, GameCharacter, HuntBattleLog, HuntBattleState, HuntCombatant, HuntCompanion, HuntCreatureDefinition, LoadoutSlot, StatusEffectApplication, StatusEffectKind } from "./domain";

import {
  resolveEnemyTacticalProfile,
  chooseEnemyTacticalDestination,
  evaluateTrigger,
  abilityTacticalScore,
  pickCreatureAbility,
  REACTION_TRIGGERS,
  DEFAULT_BASIC_ATTACK,
  TACTICAL_WEIGHTS,
} from "./ai-tactical";
import type { TriggerContext } from "./ai-tactical";
import { PALADIN_ALDREN, SAMURAI_KAEL, ARCHER_ELYRA } from "./bestiary-v1";
import { companionToHuntCombatant } from "./companions";
import { resolveCombatActionV1 } from "./action-resolver";
import { evaluateActiveTraits } from "./traits";

export {
  resolveEnemyTacticalProfile,
  chooseEnemyTacticalDestination,
  evaluateTrigger,
  abilityTacticalScore,
  pickCreatureAbility,
  REACTION_TRIGGERS,
  DEFAULT_BASIC_ATTACK,
  TACTICAL_WEIGHTS,
};
export type { TriggerContext };

export const LOADOUT_SLOTS: ReadonlyArray<{ key: LoadoutSlot; label: string; kind: AbilityDefinition["slotKind"] }> = [
  { key: "skill1", label: "Habilidade 1", kind: "skill" }, { key: "skill2", label: "Habilidade 2", kind: "skill" }, { key: "skill3", label: "Habilidade 3", kind: "skill" }, { key: "skill4", label: "Habilidade 4", kind: "skill" }, { key: "ultimate", label: "Ultimate", kind: "ultimate" }, { key: "stance", label: "Postura", kind: "stance" }, { key: "passive", label: "Passiva", kind: "passive" },
];

export const emptyLoadout = (): CombatLoadout => ({ skill1: null, skill2: null, skill3: null, skill4: null, ultimate: null, stance: null, passive: null });
export const emptyEquipment = (): EquippedItems => ({ weapon: null, secondary: null, head: null, chest: null, hands: null, feet: null, trinket: null });
export const statusEffectLabels: Record<StatusEffectKind, string> = {
  bleed: "Sangramento", burn: "Queimadura", poison: "Envenenamento", blind: "Cegueira",
  stun: "Atordoamento", silence: "Silêncio", marked: "Marcado", taunted: "Provocado",
  guard: "Guarda", evasion: "Evasão", position_lock: "Imobilizado", enraged: "Fúria",
};
export function abilityRawDamage(ability: AbilityDefinition, stats: CharacterCombatStats): number { return Math.max(0, Math.round(stats.physicalDamage * (ability.physicalScaling ?? 0) + stats.magicalDamage * (ability.magicalScaling ?? 0))); }
export function mitigateDamage(rawDamage: number, kind: "physical" | "magical", defender: CharacterCombatStats): number { const defense = kind === "physical" ? defender.physicalDefense : defender.magicalDefense; return Math.max(1, Math.round(rawDamage * (100 / (100 + Math.max(0, defense))))); }

export function applyEquipment(base: ClassDefinition, equipment: EquippedItems, items: EquipmentItem[]) {
  const selected = Object.values(equipment).flatMap((id) => items.filter((item) => item.id === id));
  const stats = { ...base.baseStats };
  let hpMax = base.baseVitals.hpMax; let mpMax = base.baseVitals.mpMax; let power = 0;
  for (const item of selected) {
    power += item.power; hpMax += item.modifiers.hpMax ?? 0; mpMax += item.modifiers.mpMax ?? 0;
    (Object.keys(stats) as Array<keyof CharacterCombatStats>).forEach((key) => { stats[key] += item.modifiers[key] ?? 0; });
  }
  return { stats, hpMax, mpMax, power };
}

export function characterPower(base: ClassDefinition, equipment: EquippedItems, items: EquipmentItem[]): number { const result = applyEquipment(base, equipment, items); return Math.round(result.power + result.stats.physicalDamage * 3 + result.stats.magicalDamage * 3 + result.stats.physicalDefense * 2 + result.stats.magicalDefense * 2 + result.stats.criticalChance * 3 + result.stats.dodgeChance * 3 + result.hpMax * 0.35 + result.mpMax * 0.2); }
export function validateLoadoutSlot(slot: LoadoutSlot, ability: AbilityDefinition | undefined): string | null { const definition = LOADOUT_SLOTS.find((entry) => entry.key === slot); if (!definition || !ability) return "Habilidade invalida."; if (definition.kind !== ability.slotKind) return `${ability.name} nao pode ocupar ${definition.label}.`; return null; }
export function setLoadoutAbility(loadout: CombatLoadout, slot: LoadoutSlot, ability: AbilityDefinition): CombatLoadout { const issue = validateLoadoutSlot(slot, ability); if (issue) throw new Error(issue); return { ...loadout, [slot]: ability.id }; }
export function activePreset(character: GameCharacter): CharacterPreset { return character.presets.find((preset) => preset.id === character.activePresetId) ?? character.presets[0]; }


export const PLAYER_MP_REGEN_PER_TURN = 6;
/** Até 5 inimigos ativos simultâneos em campo (Party de 3 vs até 5 IA). */
export const FRONT_LINE_SIZE = 5;
export function activeFrontLine(enemies: HuntCombatant[]): HuntCombatant[] {
  return enemies.filter((enemy) => enemy.hpCurrent > 0).slice(0, FRONT_LINE_SIZE);
}
/** Teto de criaturas por encontro, incluindo reservas fora da linha de frente e invocações em combate. */
export const ENGINE_MAX_ENCOUNTER_SIZE = 8;

// ---------------------------------------------------------------------------
// Tabuleiro hexagonal do campo de batalha
// ---------------------------------------------------------------------------

import {
  BOARD_RADIUS,
  AXIAL_DIRECTIONS,
  hexKey,
  hexDistance,
  hexDirectionToward,
  relativeArc,
  boardCells,
  terrainCellAt,
  isBlockedCell,
  terrainMovementCost,
  terrainCoverPercent,
  hasLineOfSight,
  effectiveVisionRange,
  canUnitSeeCell,
  rangedCoverPercent,
  applyBattlefieldCover,
  hexLine,
  reachableCells,
} from "./battlefield";

export {
  BOARD_RADIUS,
  AXIAL_DIRECTIONS,
  hexKey,
  hexDistance,
  hexDirectionToward,
  relativeArc,
  boardCells,
  terrainCellAt,
  isBlockedCell,
  terrainMovementCost,
  terrainCoverPercent,
  hasLineOfSight,
  effectiveVisionRange,
  canUnitSeeCell,
  rangedCoverPercent,
  applyBattlefieldCover,
  hexLine,
  reachableCells,
};

export const PLAYER_START_CELL: Axial = { q: 0, r: 2 };
export const ENEMY_FRONT_SPAWN_CELLS: Axial[] = [
  { q: 0, r: -1 }, { q: 1, r: -2 }, { q: -1, r: -1 }, { q: 2, r: -2 }, { q: -2, r: 0 },
];
export const ENEMY_BACK_SPAWN_CELLS: Axial[] = [
  { q: 0, r: -3 }, { q: 1, r: -3 }, { q: -1, r: -2 }, { q: 2, r: -3 }, { q: -2, r: -1 },
];
export const ENEMY_SLOT_CELLS: Axial[] = ENEMY_FRONT_SPAWN_CELLS.slice(0, FRONT_LINE_SIZE);
export const PLAYER_MOVE_RANGE = 2;

export function isAdjacent(a: Axial, b: Axial): boolean { return hexDistance(a, b) === 1; }
export function isInZoneOfControl(cell: Axial, enemies: HuntCombatant[]): boolean {
  return enemies.some((enemy) => enemy.hpCurrent > 0 && enemy.position && isAdjacent(cell, enemy.position));
}

const terrainKey = (q: number, r: number) => `${q},${r}`;

const REGION_OBSTACLES: Record<string, Record<string, Partial<BattleTerrainCell>>> = {
  fiordevalle: {
    "-2,1": { obstacle: "tree", blocked: true, blocksLineOfSight: true },
    "2,0": { obstacle: "tree", blocked: true, blocksLineOfSight: true },
    "-1,0": { obstacle: "wall", blocked: true, blocksLineOfSight: true },
    "1,1": { obstacle: "rock", blocked: true, blocksLineOfSight: false },
  },
  eldravia: {
    "-2,1": { obstacle: "crystal", blocked: true, blocksLineOfSight: true },
    "2,0": { obstacle: "crystal", blocked: true, blocksLineOfSight: true },
    "-1,0": { obstacle: "pillar", blocked: true, blocksLineOfSight: true },
    "1,1": { obstacle: "pillar", blocked: true, blocksLineOfSight: true },
  },
  dustfall: {
    "-2,1": { obstacle: "rock", blocked: true, blocksLineOfSight: true },
    "2,0": { obstacle: "rock", blocked: true, blocksLineOfSight: true },
    "-1,0": { obstacle: "wall", blocked: true, blocksLineOfSight: true },
    "1,1": { obstacle: "rock", blocked: true, blocksLineOfSight: false },
  },
};

export function createBattlefield(regionId: string, variant = 0): BattlefieldState {
  const normalizedRegion = regionId in REGION_OBSTACLES ? regionId : "fiordevalle";
  const obstacles = REGION_OBSTACLES[normalizedRegion] ?? {};
  const cells: BattleTerrainCell[] = boardCells().map((position) => {
    const key = terrainKey(position.q, position.r);
    const parity = Math.abs(position.q * 3 + position.r * 5 + variant) % 5;
    let terrain: BattleTerrainCell["terrain"] = "plain";
    let movementCost = 1;
    let coverPercent = 0;
    if (normalizedRegion === "fiordevalle") {
      if (parity === 0) { terrain = "forest"; movementCost = 2; coverPercent = 15; }
      else if (parity === 1) { terrain = "ruins"; coverPercent = 20; }
      else if (parity === 3) { terrain = "forest"; movementCost = 2; }
      else if (parity === 4) { terrain = "swamp"; movementCost = 2; }
    } else if (normalizedRegion === "eldravia") {
      if (parity === 0) { terrain = "glass"; coverPercent = 8; }
      else if (parity === 1) { terrain = "glass"; }
      else if (parity === 2) { terrain = "ruins"; coverPercent = 20; }
      else if (parity === 4) { terrain = "rift"; movementCost = 2; }
    } else {
      terrain = parity <= 2 ? "sand" : parity === 3 ? "ruins" : "swamp";
      movementCost = terrain === "swamp" ? 2 : 1;
      coverPercent = terrain === "ruins" ? 20 : 0;
    }
    return { position, terrain, movementCost, coverPercent, ...(obstacles[key] ?? {}) };
  });
  const fogEnabled = normalizedRegion === "fiordevalle" ? variant % 2 === 0 : normalizedRegion === "eldravia" ? variant % 3 === 0 : variant % 4 === 0;
  const fogLabel = normalizedRegion === "dustfall" ? "Bruma de Escória" : normalizedRegion === "eldravia" ? "Névoa de Ruptura" : "Neblina";
  return { cells, fog: { enabled: fogEnabled, baseVisionRange: fogEnabled ? 3 : 99, label: fogLabel } };
}

export function visibleCellsForUnit(unit: HuntCombatant, battlefield: BattlefieldState): Axial[] {
  return boardCells().filter((cell) => canUnitSeeCell(unit, cell, battlefield));
}

/** Resolve a geometria de uma habilidade para preview e dano real. */
export function abilityAreaCells(origin: Axial, target: Axial, area: AbilityAreaDefinition | undefined, range: number, board = boardCells()): Axial[] {
  const shape = area?.shape ?? "single";
  const boardKeys = new Set(board.map(hexKey));
  if (shape === "all") return [...board];
  if (shape === "radius") {
    const radius = Math.max(0, area?.radius ?? 1);
    return board.filter((cell) => hexDistance(cell, target) <= radius);
  }
  if (shape === "ring") {
    const radius = Math.max(1, area?.radius ?? 1);
    return board.filter((cell) => hexDistance(cell, target) === radius);
  }
  if (shape === "connected") {
    const offsets = area?.offsets?.length ? area.offsets : [{ q: 0, r: 0 }];
    return offsets
      .map((offset) => ({ q: target.q + offset.q, r: target.r + offset.r }))
      .filter((cell) => boardKeys.has(hexKey(cell)));
  }
  if (shape === "line") {
    return hexLine(origin, target).slice(1, Math.max(1, range) + 1).filter((cell) => boardKeys.has(hexKey(cell)));
  }
  if (shape === "cone") {
    const facing = hexDirectionToward(origin, target);
    const allowedDirections = new Set([(facing + 5) % 6, facing, (facing + 1) % 6]);
    return board.filter((cell) => {
      const distance = hexDistance(origin, cell);
      return distance > 0 && distance <= range && allowedDirections.has(hexDirectionToward(origin, cell));
    });
  }
  return boardKeys.has(hexKey(target)) ? [target] : [];
}

export function creatureAbilityArea(ability: CreatureAbilityDefinition): AbilityAreaDefinition {
  if (ability.area) return ability.area;
  const normalized = `${ability.name} ${ability.description}`.toLowerCase();
  if (ability.target === "all_enemies" || ability.target === "battlefield") {
    if (normalized.includes("linha") || normalized.includes("varrer")) return { shape: "line" };
    if (normalized.includes("cone") || normalized.includes("frente")) return { shape: "cone" };
    if (normalized.includes("campo inteiro") || normalized.includes("todo o campo")) return { shape: "all" };
    return { shape: "radius", radius: normalized.includes("cratera") || normalized.includes("desmoron") ? 2 : 1 };
  }
  return { shape: "single" };
}

function enemyMoveRange(enemy: HuntCombatant): number {
  if (enemy.archetype === "caster" || enemy.archetype === "skirmisher" || enemy.archetype === "swarm") return 2;
  return 1;
}

const DEFAULT_COMBAT_SPEED = 10;
const ARCHETYPE_SPEED_FALLBACK: Record<string, number> = { swarm: 13, skirmisher: 14, brute: 8, caster: 10, tank: 7 };

export function combatantSpeed(combatant: HuntCombatant): number {
  return Math.max(1, Math.round(combatant.stats.speed ?? ARCHETYPE_SPEED_FALLBACK[combatant.archetype ?? ""] ?? DEFAULT_COMBAT_SPEED));
}

/** Ordem real da rodada. Ordena todos os membros vivos da Party e da Linha de Frente por Velocidade. */
export function buildInitiativeOrder(partyOrPlayer: HuntCombatant | HuntCombatant[], enemies: HuntCombatant[]): string[] {
  const party = Array.isArray(partyOrPlayer) ? partyOrPlayer : [partyOrPlayer];
  const activeHeroes = party.filter((hero) => hero.hpCurrent > 0);
  const activeEnemies = activeFrontLine(enemies).filter((enemy) => enemy.hpCurrent > 0);
  return [...activeHeroes, ...activeEnemies]
    .sort((a, b) => {
      const speedDiff = combatantSpeed(b) - combatantSpeed(a);
      if (speedDiff !== 0) return speedDiff;
      if (a.isPartyMember && !b.isPartyMember) return -1;
      if (b.isPartyMember && !a.isPartyMember) return 1;
      return a.id.localeCompare(b.id);
    })
    .map((entry) => entry.id);
}

/** Alcance da habilidade. Preserva 0 para auto-conjuramento / buffs / posturas. */
export function playerAbilityRange(ability: AbilityDefinition, player: HuntCombatant): number | undefined {
  if (ability.range === undefined) return undefined;
  if (ability.range === 0 || ability.slotKind === "stance") return 0;
  return Math.max(1, ability.range + (player.rangeBonus ?? 0));
}

export function creatureAbilityRange(ability: CreatureAbilityDefinition, self?: HuntCombatant): number {
  if (ability.range !== undefined) return ability.range;
  if (ability.damageFamily === "none" || ability.target === "self" || ability.target === "all_allies" || ability.target === "battlefield") return 99;
  if ((ability.specialEffects ?? []).some((effect) => effect.kind === "gap_close")) return 3;
  if (ability.damageFamily === "magical") return 3;
  if (self?.archetype === "caster") return 3;
  if (self?.archetype === "skirmisher") return 2;
  return 1;
}

function preferredEnemySpawnCells(enemy: HuntCombatant): Axial[] {
  return enemy.archetype === "caster"
    ? [...ENEMY_BACK_SPAWN_CELLS, ...ENEMY_FRONT_SPAWN_CELLS]
    : [...ENEMY_FRONT_SPAWN_CELLS, ...ENEMY_BACK_SPAWN_CELLS];
}

/** Garante posição única para toda IA ativa. Reservas recebem posição apenas ao entrar na linha ativa. */
/** B1 fix: fallback seguro que nunca empilha inimigos na mesma célula. */
function ensureActiveEnemyPositions(enemies: HuntCombatant[], playerPosition: Axial, battlefield: BattlefieldState): HuntCombatant[] {
  const activeIds = new Set(activeFrontLine(enemies).map((enemy) => enemy.id));
  const validCells = new Set(boardCells().map(hexKey));
  const occupied = new Set<string>([hexKey(playerPosition)]);
  return enemies.map((enemy) => {
    if (!activeIds.has(enemy.id) || enemy.hpCurrent <= 0) return enemy;
    let position = enemy.position;
    if (!position || !validCells.has(hexKey(position)) || occupied.has(hexKey(position)) || isBlockedCell(battlefield, position)) {
      position = preferredEnemySpawnCells(enemy).find((cell) => !occupied.has(hexKey(cell)) && !isBlockedCell(battlefield, cell))
        ?? boardCells().filter((cell) => !occupied.has(hexKey(cell)) && !isBlockedCell(battlefield, cell)).sort((a, b) => hexDistance(b, playerPosition) - hexDistance(a, playerPosition))[0];
      // B1: Se absolutamente nenhuma célula estiver livre (edge case extremo),
      // manter a posição original em vez de forçar colisão em ENEMY_FRONT_SPAWN_CELLS[0].
      if (!position) {
        position = enemy.position ?? ENEMY_FRONT_SPAWN_CELLS[0];
      }
    }
    occupied.add(hexKey(position));
    return { ...enemy, position, facing: hexDirectionToward(position, playerPosition) };
  });
}



type ForcedMoveMode = "push" | "pull" | "force";

function forcedMoveDestination(target: Axial, source: Axial, occupied: Set<string>, mode: ForcedMoveMode, distance = 1, battlefield?: BattlefieldState): Axial {
  const validKeys = new Set(boardCells().map(hexKey));
  let current = target;
  for (let step = 0; step < Math.max(1, distance); step += 1) {
    const candidates = AXIAL_DIRECTIONS
      .map((direction) => ({ q: current.q + direction.q, r: current.r + direction.r }))
      .filter((cell) => validKeys.has(hexKey(cell)) && !occupied.has(hexKey(cell)) && (!battlefield || !isBlockedCell(battlefield, cell)));
    if (!candidates.length) break;
    candidates.sort((a, b) => {
      const da = hexDistance(a, source); const db = hexDistance(b, source);
      if (mode === "push") return db - da;
      if (mode === "pull") return da - db;
      return hexKey(a).localeCompare(hexKey(b));
    });
    const next = candidates[0] ?? current;
    occupied.delete(hexKey(current));
    occupied.add(hexKey(next));
    current = next;
  }
  return current;
}

/** Classifica uma distância em rótulo, só pra avaliar gatilhos "target_position == front/center/back" do bestiário. */
export function positionLabelForDistance(distance: number): CombatPosition {
  return distance <= 1 ? "front" : distance === 2 ? "center" : "back";
}

function preparePlayerTurn(player: HuntCombatant, cooldowns: Record<string, number>) {
  const nextCooldowns = Object.fromEntries(
    Object.entries(cooldowns)
      .map(([id, turns]): [string, number] => [id, Math.max(0, turns - 1)])
      .filter(([, turns]) => turns > 0),
  ) as Record<string, number>;
  return {
    player: {
      ...player,
      mpCurrent: Math.min(player.mpMax, player.mpCurrent + PLAYER_MP_REGEN_PER_TURN),
    },
    cooldowns: nextCooldowns,
  };
}
const battleId = () => globalThis.crypto?.randomUUID?.() ?? `hunt-${Date.now()}`;
const emptyEffects = (): CombatStatusEffect[] => [];
const statusResistance = (stats: CharacterCombatStats, kind: StatusEffectKind) => (stats as unknown as Record<string, number>)[`${kind}Resistance`] ?? 0;
const effectDotDamage = (effect: CombatStatusEffect, maxHp: number) => {
  if (effect.flatDamage !== undefined) return Math.max(1, effect.flatDamage);
  // Condições precisam importar mesmo em lutas curtas. O valor fixo é a regra
  // padrão; percentMaxHp permanece apenas como compatibilidade de conteúdo legado.
  const severity = effect.percentMaxHp ?? 2;
  if (severity >= 5) return 25;
  if (severity >= 4) return 20;
  if (severity >= 3) return 15;
  return 10;
};
/** Só esses três status causam dano contínuo; os demais são controle/buff/debuff sem tick. */
const DOT_KINDS = new Set<StatusEffectKind>(["bleed", "burn", "poison"]);
/** Teto rígido de atordoamento: no máximo 1 rodada, depois 2 rodadas de imunidade. */
const STUN_MAX_TURNS = 1;
const STUN_IMMUNITY_TURNS = 2;

function finishOwnerTurnEffects(combatant: HuntCombatant, turn: number, logs: HuntBattleLog[]): HuntCombatant {
  const activeEffects: CombatStatusEffect[] = [];
  let stunImmuneTurns = combatant.stunImmuneTurns ?? 0;
  let startedStunImmunity = false;

  for (const effect of combatant.activeEffects) {
    if (DOT_KINDS.has(effect.kind)) {
      activeEffects.push(effect);
      continue;
    }

    // Efeito aplicado pelo próprio combatente durante esta ação começa a contar
    // a partir do próximo turno do dono; assim um buff de 1T não expira antes
    // de produzir qualquer efeito defensivo/reacional.
    const selfAppliedThisTurn = effect.appliedTurn === turn && effect.sourceId === combatant.id;
    if (selfAppliedThisTurn && effect.kind !== "stun") {
      activeEffects.push(effect);
      continue;
    }

    if (effect.turns > 1) {
      activeEffects.push({ ...effect, turns: effect.turns - 1 });
      continue;
    }

    logs.push({ turn, tone: "system", text: `${statusEffectLabels[effect.kind]} em ${combatant.name} terminou.` });
    if (effect.kind === "stun") {
      stunImmuneTurns = Math.max(stunImmuneTurns, STUN_IMMUNITY_TURNS);
      startedStunImmunity = true;
    }
  }

  // A imunidade de 2 turnos começa DEPOIS do turno perdido por stun. Ela só
  // consome um contador nos turnos seguintes do próprio dono.
  if (!startedStunImmunity && stunImmuneTurns > 0) stunImmuneTurns -= 1;
  return { ...combatant, activeEffects, stunImmuneTurns, changedPositionThisTurn: false };
}

function tickEndOfRoundDots(combatant: HuntCombatant, turn: number, logs: HuntBattleLog[]): HuntCombatant {
  let hpCurrent = combatant.hpCurrent;
  const activeEffects: CombatStatusEffect[] = [];
  for (const effect of combatant.activeEffects) {
    if (!DOT_KINDS.has(effect.kind)) {
      activeEffects.push(effect);
      continue;
    }

    // Regra de Rupterya: um DoT aplicado na rodada N começa a ticar somente no
    // fim da rodada N+1. A duração conta ticks reais, não o momento de aplicação.
    if ((effect.appliedTurn ?? Number.NEGATIVE_INFINITY) >= turn) {
      activeEffects.push(effect);
      continue;
    }

    const damage = effectDotDamage(effect, combatant.hpMax);
    hpCurrent = Math.max(0, hpCurrent - damage);
    logs.push({ turn, tone: "system", text: `${combatant.name} sofre ${damage} de ${statusEffectLabels[effect.kind].toLowerCase()}.` });
    if (effect.turns > 1) activeEffects.push({ ...effect, turns: effect.turns - 1 });
    else logs.push({ turn, tone: "system", text: `${statusEffectLabels[effect.kind]} em ${combatant.name} terminou.` });
  }
  return { ...combatant, hpCurrent, activeEffects };
}

function applyEffects(target: HuntCombatant, applications: StatusEffectApplication[], sourceName: string, turn: number, logs: HuntBattleLog[], sourceId?: string): HuntCombatant {
  let activeEffects = [...target.activeEffects];
  for (const application of applications) {
    if (application.kind === "stun" && (target.stunImmuneTurns ?? 0) > 0) {
      logs.push({ turn, tone: "system", text: `${target.name} está imune a atordoamento e resiste.` });
      continue;
    }
    const resistance = Math.max(0, Math.min(95, statusResistance(target.stats, application.kind)));
    const finalChance = application.chance * (1 - resistance / 100);
    if (Math.random() * 100 >= finalChance) continue;
    const turns = application.kind === "stun" ? Math.min(STUN_MAX_TURNS, application.turns) : application.turns;
    const existing = activeEffects.findIndex((entry) => entry.kind === application.kind);
    const previous = existing >= 0 ? activeEffects[existing] : undefined;
    const effect: CombatStatusEffect = {
      ...application,
      turns,
      sourceName,
      sourceId: sourceId ?? application.sourceId,
      appliedTurn: previous?.appliedTurn ?? turn,
    };
    if (existing >= 0) activeEffects[existing] = {
      ...previous,
      ...effect,
      turns: Math.max(effect.turns, previous!.turns),
      appliedTurn: previous!.appliedTurn ?? effect.appliedTurn,
      flatDamage: Math.max(effect.flatDamage ?? 0, previous!.flatDamage ?? 0) || undefined,
      percentMaxHp: Math.max(effect.percentMaxHp ?? 0, previous!.percentMaxHp ?? 0),
    };
    else activeEffects.push(effect);
    logs.push({ turn, tone: "system", text: `${sourceName} aplica ${statusEffectLabels[application.kind]} em ${target.name} por ${effect.turns} turno(s).` });
  }
  return { ...target, activeEffects };
}

/** Chance de um golpe que acertou sair fraco: nunca vira erro, nunca causa dano extra ao autor — só reduz o próprio golpe. */
export const FUMBLE_CHANCE = 8;
export const FUMBLE_DAMAGE_MULTIPLIER = 0.5;
/** Bônus de dano contra uma espécie dominada no Bestiário (abates >= meta do codex). */
export const MASTERY_DAMAGE_BONUS = 0.1;
/** Tropa sem líder vivo perde parte do dano — regra de moral de bando, independente do kit de habilidades. */
const MORALE_BROKEN_DAMAGE_PENALTY = 0.25;
/** Bloqueio reduz parte de um golpe físico (escudo/arma); dano mágico ignora bloqueio. */
const BLOCK_DAMAGE_MULTIPLIER = 0.6;

function effectiveDodge(defender: HuntCombatant): number {
  const bonus = defender.activeEffects.filter((effect) => effect.kind === "evasion").reduce((sum, effect) => sum + (effect.dodgeBonus ?? 0), 0);
  return defender.stats.dodgeChance + bonus;
}
function guardMultiplier(defender: HuntCombatant): number {
  const temporaryReduction = defender.activeEffects.filter((effect) => effect.kind === "guard").reduce((sum, effect) => sum + (effect.damageReductionPercent ?? 0), 0);
  const reduction = temporaryReduction + (defender.permanentDamageReductionPercent ?? 0);
  return Math.max(0.1, 1 - Math.min(90, reduction) / 100);
}

function attack(input: { attacker: HuntCombatant; defender: HuntCombatant; rawDamage: number; kind: "physical" | "magical"; effects: StatusEffectApplication[]; sourceName: string; turn: number; logs: HuntBattleLog[]; sourceId?: string }) {
  const blinded = input.attacker.activeEffects.some((effect) => effect.kind === "blind");
  const damageBonusPercent = input.attacker.activeEffects.reduce((sum, effect) => sum + (effect.damageBonusPercent ?? 0), 0);
  const criticalChanceBonus = input.attacker.activeEffects.reduce((sum, effect) => sum + (effect.criticalChanceBonus ?? 0), 0);
  const statusChanceBonus = input.attacker.activeEffects.reduce((sum, effect) => sum + (effect.statusChanceBonus ?? 0), 0);
  const hitChance = Math.max(10, 100 - effectiveDodge(input.defender) - (blinded ? 35 : 0));
  if (Math.random() * 100 >= hitChance) {
    input.logs.push({ turn: input.turn, tone: "system", text: `${input.sourceName} erra ${input.defender.name}${blinded ? " por cegueira" : " por esquiva"}.` });
    return { defender: { ...input.defender, dodgedLastTurn: true, attackedLastTurn: false }, dealt: 0, critical: false, fumble: false, blocked: false };
  }
  // Sorte de mesa: um golpe que acerta pode sair "fraco" (fumble), mas nunca vira erro nem pune o atacante.
  const fumble = Math.random() * 100 < FUMBLE_CHANCE;
  const critical = !fumble && Math.random() * 100 < input.attacker.stats.criticalChance + criticalChanceBonus;
  const blocked = input.kind === "physical" && Math.random() * 100 < input.defender.stats.blockChance;
  const multiplier = (fumble ? FUMBLE_DAMAGE_MULTIPLIER : critical ? 1.5 : 1) * (blocked ? BLOCK_DAMAGE_MULTIPLIER : 1) * guardMultiplier(input.defender);
  const dealt = mitigateDamage(Math.round(input.rawDamage * (1 + damageBonusPercent / 100) * multiplier), input.kind, input.defender.stats);
  let defender: HuntCombatant = { ...input.defender, hpCurrent: Math.max(0, input.defender.hpCurrent - dealt), dodgedLastTurn: false, attackedLastTurn: true };
  const enhancedEffects = statusChanceBonus
    ? input.effects.map((effect) => ({ ...effect, chance: Math.min(100, effect.chance + statusChanceBonus) }))
    : input.effects;
  if (!fumble) defender = applyEffects(defender, enhancedEffects, input.sourceName, input.turn, input.logs, input.sourceId);
  return { defender, dealt, critical, fumble, blocked };
}

/** Uma vez por batalha, ao chegar a 0 de Vida com uma habilidade "revive" disponível, volta com HP parcial. */
function maybeRevive(combatant: HuntCombatant, logs: HuntBattleLog[], turn: number): HuntCombatant {
  if (combatant.hpCurrent > 0) return combatant;
  const reviveAbility = combatant.abilities?.find((ability) => ability.specialEffects?.some((effect) => effect.kind === "revive"));
  if (!reviveAbility) return combatant;
  const used = combatant.usedOncePerBattle ?? [];
  if (used.includes(reviveAbility.id)) return combatant;
  const reviveEffect = reviveAbility.specialEffects!.find((effect) => effect.kind === "revive")!;
  const hpPercent = Number(reviveEffect.hpPercent ?? 20);
  const hpCurrent = Math.max(1, Math.round(combatant.hpMax * (hpPercent / 100)));
  logs.push({ turn, tone: "system", text: `${combatant.name} recusa cair e retorna com ${hpCurrent} de Vida.` });
  return { ...combatant, hpCurrent, usedOncePerBattle: [...used, reviveAbility.id] };
}

export const featuredItemAppearanceByRarity = { common: 55, rare: 30, epic: 15, legendary: 7, mythic: 2 } as const;
export const dropBreakChanceByRarity = { common: 15, rare: 25, epic: 40, legendary: 60, mythic: 75 } as const;
export const featuredItemXpBonusByRarity = { common: 5, rare: 10, epic: 20, legendary: 40, mythic: 75 } as const;
const memorySurvivalBonusByRarity = { common: 0, rare: 0, epic: 5, legendary: 10, mythic: 15 } as const;

function materialReward(item: EquipmentItem) {
  const ranges = { common: [1, 1], rare: [1, 2], epic: [2, 3], legendary: [3, 5], mythic: [4, 6] } as const;
  const [min, max] = ranges[item.rarity];
  return min + Math.floor(Math.random() * (max - min + 1));
}

function featuredItemsFor(creature: HuntCreatureDefinition, memories: Record<string, number>) {
  const cap = ["elite", "boss", "worldboss"].includes(creature.rarity) ? 2 : 1;
  const candidates = creature.featuredItemCandidates ?? (creature.equippedItem ? [creature.equippedItem] : []);
  return candidates
    .filter((item) => !item.allowedProfiles?.length || item.allowedProfiles.includes(creature.equipmentProfileId ?? ""))
    .filter((item) => Math.random() * 100 < (item.appearanceChance ?? featuredItemAppearanceByRarity[item.rarity]))
    .slice(0, cap)
    .map((item) => {
      const memoryStacks = Math.min(3, memories[item.id] ?? 0);
      const baseBreakChance = item.breakChance ?? dropBreakChanceByRarity[item.rarity];
      const survivalBonus = memoryStacks * memorySurvivalBonusByRarity[item.rarity];
      return { ...item, breakChance: Math.max(0, baseBreakChance - survivalBonus) };
    });
}

function rewardFor(state: HuntBattleState, turn: number) {
  const itemIds: string[] = [];
  const logs: HuntBattleLog[] = [];
  const fragments: Array<{ rarity: EquipmentItem["rarity"]; amount: number }> = [];
  const memoryUpdates: Array<{ itemId: string; stacks: number }> = [];
  state.creatures.forEach((creature) => {
    (creature.equippedItems ?? (creature.equippedItem ? [creature.equippedItem] : [])).forEach((item) => {
      const chance = item.breakChance ?? dropBreakChanceByRarity[item.rarity];
      if (Math.random() * 100 < chance) {
        const amount = materialReward(item);
        fragments.push({ rarity: item.rarity, amount });
        if (item.rarity === "epic" || item.rarity === "legendary" || item.rarity === "mythic") {
          memoryUpdates.push({ itemId: item.id, stacks: 1 });
        }
        logs.push({ turn, tone: "system", text: `${item.name} foi danificado. +${amount} Fragmento${amount > 1 ? "s" : ""} ${item.rarity}.` });
        return;
      }
      itemIds.push(item.id);
      memoryUpdates.push({ itemId: item.id, stacks: 0 });
      logs.push({ turn, tone: "victory", text: `Drop intacto: ${item.name}.` });
    });
  });
  const xp = state.creatures.reduce((sum, creature) => {
    const bonus = (creature.equippedItems ?? []).reduce((total, item) => total + featuredItemXpBonusByRarity[item.rarity], 0);
    return sum + Math.round(creature.xpReward * (1 + bonus / 100));
  }, 0);
  return { reward: { xp, gold: state.creatures.reduce((sum, creature) => sum + creature.goldReward, 0), itemIds, fragments, memoryUpdates }, logs };
}

export function createHuntBattle(input: { regionId: string; player: HuntCombatant; party?: HuntCombatant[]; creatures: HuntCreatureDefinition[]; companion?: HuntCompanion | null; itemMemories?: Record<string, number>; masteredCreatureIds?: string[]; battlefield?: BattlefieldState; accountLevel?: number }): HuntBattleState {
  const id = battleId();
  const variant = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const battlefield = input.battlefield ?? createBattlefield(input.regionId, variant);
  const creatures = input.creatures.map((creature) => {
    const equippedItems = featuredItemsFor(creature, input.itemMemories ?? {});
    return { ...creature, equippedItems, equippedItem: equippedItems[0] };
  });
  const enemies: HuntCombatant[] = creatures.map((creature, index) => {
    const itemModifiers = creature.equippedItems?.reduce((total, item) => ({ ...total, ...Object.fromEntries(Object.entries(item.modifiers).map(([key, value]) => [key, (total[key as keyof typeof total] ?? 0) + (value ?? 0)])) }), {} as EquipmentItem["modifiers"]) ?? {};
    const hpMax = creature.hpMax + (itemModifiers.hpMax ?? 0);
    const itemEffects = creature.equippedItems?.flatMap((item) => item.statusEffects ?? []) ?? [];
    const highRarity = ["elite", "boss", "worldboss"].includes(creature.rarity);
    return {
      id: `${creature.id}-${index}`, creatureId: creature.id, archetype: creature.archetype, role: creature.role, tacticalProfile: creature.tacticalProfile ?? resolveEnemyTacticalProfile(creature), name: creature.name, portraitPath: creature.portraitPath,
      hpCurrent: hpMax, hpMax, mpCurrent: 0, mpMax: 0, activeEffects: emptyEffects(), onHitEffects: [...(creature.abilities?.length ? [] : (creature.statusEffects ?? [])), ...itemEffects],
      abilities: creature.abilities ?? [], abilityCooldowns: {}, charging: null, stunImmuneTurns: 0, usedOncePerBattle: [], changedPositionThisTurn: false,
      visionRange: creature.archetype === "caster" || creature.archetype === "skirmisher" ? 4 : 3,
      visionTraits: /vampire|mist|bruma|wolf|crow|corvo|specter|echo/i.test(`${creature.id} ${creature.name}`) ? ["fog_sight"] : [],
      stats: { speed: (creature.speed ?? ARCHETYPE_SPEED_FALLBACK[creature.archetype ?? ""] ?? DEFAULT_COMBAT_SPEED) + (itemModifiers.speed ?? 0), physicalDamage: creature.physicalDamage + (itemModifiers.physicalDamage ?? 0), magicalDamage: (creature.magicalDamage ?? 0) + (itemModifiers.magicalDamage ?? 0), physicalDefense: creature.physicalDefense + (itemModifiers.physicalDefense ?? 0), magicalDefense: creature.magicalDefense + (itemModifiers.magicalDefense ?? 0), criticalChance: (highRarity ? 12 : creature.rarity === "rare" ? 7 : 4) + (itemModifiers.criticalChance ?? 0), dodgeChance: (creature.rarity === "rare" ? 5 : 2) + (itemModifiers.dodgeChance ?? 0), blockChance: (creature.blockChance ?? 0) + (itemModifiers.blockChance ?? 0), bleedChance: itemModifiers.bleedChance ?? 0, burnChance: itemModifiers.burnChance ?? 0, poisonChance: itemModifiers.poisonChance ?? 0, blindChance: itemModifiers.blindChance ?? 0, bleedResistance: itemModifiers.bleedResistance ?? 0, burnResistance: itemModifiers.burnResistance ?? 0, poisonResistance: itemModifiers.poisonResistance ?? 0, blindResistance: itemModifiers.blindResistance ?? 0 },
    };
  });

  const accountLevel = input.accountLevel ?? 50;
  // Monta a Party dos 3 Companions V1 com suas identidades e kits oficiais
  let party: HuntCombatant[];
  if (input.party && input.party.length > 0) {
    party = input.party;
  } else {
    const paladin = companionToHuntCombatant(PALADIN_ALDREN, accountLevel, undefined, 0);
    const samurai = companionToHuntCombatant(SAMURAI_KAEL, accountLevel, undefined, 1);
    const archer = companionToHuntCombatant(ARCHER_ELYRA, accountLevel, undefined, 2);
    party = [paladin, samurai, archer];
  }

  const primaryHero = party[0];
  const positionedEnemies = ensureActiveEnemyPositions(enemies, primaryHero.position ?? PLAYER_START_CELL, battlefield);
  const baseState: HuntBattleState = {
    id,
    regionId: input.regionId,
    creatures,
    battlefield,
    player: primaryHero,
    party,
    activeHeroId: primaryHero.id,
    companion: input.companion ?? null,
    enemies: positionedEnemies,
    masteredCreatureIds: input.masteredCreatureIds ?? [],
    lastPetTargetId: null,
    lastPetDamage: 0,
    cooldowns: {},
    movementUsed: false,
    initiativeOrder: [],
    initiativeIndex: 0,
    currentActorId: null,
    turn: 1,
    status: "active",
    reward: null,
    log: [
      { turn: 0, tone: "system", text: `Party de 3 Companions entra em campo: ${party.map((p) => `${p.name} (${p.className})`).join(" · ")}.` },
      { turn: 0, tone: "system", text: creatures.length > 1 ? `Emboscada: ${creatures.length} inimigos ocupam o campo.` : `${creatures[0].name} bloqueia o caminho.` },
      { turn: 0, tone: "system", text: battlefield.fog.enabled ? `${battlefield.fog.label} ativa: visão e linha de visão passam a limitar alvos.` : `Campo sem neblina: obstáculos ainda bloqueiam linha de visão e concedem cobertura.` },
    ],
  };
  return initializeInitiative(baseState);
}


interface SpecialEffectContext {
  self: HuntCombatant;
  player: HuntCombatant;
  enemies: HuntCombatant[];
  battlefield: BattlefieldState;
  turn: number;
  logs: HuntBattleLog[];
  damageDealt?: number;
  frontLineIds: string[];
}

function cloneAsMinion(source: HuntCombatant, index: number): HuntCombatant {
  // O catálogo completo vive em apps/web e não pode ser importado pelo game-core.
  // O fallback precisa ser seguro: uma cria NUNCA herda kit/fases/invocações de boss.
  const hpMax = Math.max(1, Math.round(source.hpMax * 0.45));
  const magical = source.stats.magicalDamage > source.stats.physicalDamage;
  const basicAbility: CreatureAbilityDefinition = {
    id: `${source.id}-summoned-basic`,
    name: magical ? "Rajada da Cria" : "Golpe da Cria",
    damageFamily: magical ? "magical" : "physical",
    scaling: 0.75,
    cooldownTurns: 0,
    target: "single_enemy",
    description: "Ataque simples do reforço invocado.",
    aiTrigger: "always",
    range: magical ? 3 : 1,
  };
  return {
    ...source,
    id: `${source.id}-cria-${index}-${Date.now()}`,
    creatureId: undefined,
    name: `${source.name} (cria)`,
    hpCurrent: hpMax,
    hpMax,
    stats: {
      ...source.stats,
      physicalDamage: Math.max(1, Math.round(source.stats.physicalDamage * 0.6)),
      magicalDamage: Math.max(0, Math.round(source.stats.magicalDamage * 0.6)),
      physicalDefense: Math.max(0, Math.round(source.stats.physicalDefense * 0.7)),
      magicalDefense: Math.max(0, Math.round(source.stats.magicalDefense * 0.7)),
    },
    role: "fodder",
    activeEffects: [],
    onHitEffects: [],
    abilities: [basicAbility],
    abilityCooldowns: {},
    charging: null,
    usedOncePerBattle: [],
    position: undefined,
    nextDamageBonusPercent: 0,
    permanentDamageReductionPercent: 0,
  };
}

/** Interpreta os `specialEffects` de uma habilidade de criatura. Efeitos que dependem de
 * posição (force_position_change/gap_close) já são cobertos pelo sistema de posição, e
 * copy_last_ability é aproximado como um golpe simples — o catálogo de habilidades do
 * jogador vive em apps/web, fora do alcance deste pacote. */
function applySpecialEffects(effects: CreatureSpecialEffect[] | undefined, ctx: SpecialEffectContext): { self: HuntCombatant; player: HuntCombatant; enemies: HuntCombatant[] } {
  let { self, player, enemies } = ctx;
  for (const effect of effects ?? []) {
    switch (effect.kind) {
      case "lifesteal": {
        if (ctx.damageDealt) {
          const heal = Math.round(ctx.damageDealt * (Number(effect.percentOfDamage ?? 0) / 100));
          if (heal > 0) { self = { ...self, hpCurrent: Math.min(self.hpMax, self.hpCurrent + heal) }; ctx.logs.push({ turn: ctx.turn, tone: "enemy", text: `${self.name} rouba ${heal} de Vida.` }); }
        }
        break;
      }
      case "drain_mp": {
        const drained = Math.min(player.mpCurrent, Math.round((player.mpMax || 0) * (Number(effect.percentMaxMp ?? 0) / 100)));
        player = { ...player, mpCurrent: player.mpCurrent - drained };
        const heal = Math.round(drained * (Number(effect.healPercentOfDrained ?? 0) / 100));
        if (heal > 0) self = { ...self, hpCurrent: Math.min(self.hpMax, self.hpCurrent + heal) };
        ctx.logs.push({ turn: ctx.turn, tone: "enemy", text: `${self.name} drena ${drained} de MP${heal ? ` e recupera ${heal} de Vida` : ""}.` });
        break;
      }
      case "warband_buff":
      case "ally_damage_buff": {
        const bonus: StatusEffectApplication = { kind: "enraged", chance: 100, turns: Number(effect.turns ?? 2), damageBonusPercent: Number(effect.damageBonusPercent ?? effect.bonusPercent ?? 0), criticalChanceBonus: Number(effect.criticalChanceBonus ?? 0), statusChanceBonus: Number(effect.statusChanceBonus ?? effect.bleedChanceBonus ?? 0) };
        enemies = enemies.map((entry) => (ctx.frontLineIds.includes(entry.id) && entry.hpCurrent > 0 ? applyEffects(entry, [bonus], self.name, ctx.turn, ctx.logs, self.id) : entry));
        ctx.logs.push({ turn: ctx.turn, tone: "system", text: `${self.name} fortalece o bando.` });
        break;
      }
      case "summon":
      case "summon_minions":
      case "summon_from_warband": {
        const count = Number(effect.count ?? 1);
        let spawned = 0;
        for (let i = 0; i < count && enemies.length < ENGINE_MAX_ENCOUNTER_SIZE; i += 1) { enemies = [...enemies, cloneAsMinion(self, enemies.length)]; spawned += 1; }
        ctx.logs.push({ turn: ctx.turn, tone: "enemy", text: spawned > 0 ? `${self.name} invoca ${spawned} reforço(s).` : `${self.name} tenta invocar reforços, mas o encontro já está cheio.` });
        break;
      }
      case "remove_buff": {
        const idx = player.activeEffects.findIndex((entry) => entry.kind === "guard" || entry.kind === "evasion" || entry.kind === "enraged");
        if (idx >= 0) {
          const removed = player.activeEffects[idx];
          player = { ...player, activeEffects: player.activeEffects.filter((_, index) => index !== idx) };
          ctx.logs.push({ turn: ctx.turn, tone: "enemy", text: `${self.name} remove ${statusEffectLabels[removed.kind]} de ${player.name}.` });
        }
        break;
      }
      case "permanent_phase_buff":
      case "permanent_damage_buff": {
        // A trava de repetição pertence à habilidade (`oncePerBattle`), não ao
        // tipo genérico do efeito. Assim um boss pode ter Fase 2 e Fase 3 com
        // `permanent_phase_buff` sem uma bloquear a outra por engano.
        const genericDamageBonus = Number(effect.bonusPercent ?? effect.damageBonusPercent ?? 0) / 100;
        const physicalDamageBonus = Number(effect.physicalDamageBonusPercent ?? 0) / 100;
        const magicalDamageBonus = Number(effect.magicalDamageBonusPercent ?? 0) / 100;
        const defensePenalty = Number(effect.selfDefensePenaltyPercent ?? 0) / 100;
        const damageReduction = Number(effect.damageReductionPercent ?? 0);
        self = {
          ...self,
          permanentDamageReductionPercent: Math.min(90, Math.max(0, (self.permanentDamageReductionPercent ?? 0) + damageReduction)),
          stats: {
            ...self.stats,
            physicalDamage: Math.round(self.stats.physicalDamage * (1 + genericDamageBonus + physicalDamageBonus)),
            magicalDamage: Math.round(self.stats.magicalDamage * (1 + genericDamageBonus + magicalDamageBonus)),
            physicalDefense: Math.max(0, Math.round(self.stats.physicalDefense * (1 - defensePenalty))),
            magicalDefense: Math.max(0, Math.round(self.stats.magicalDefense * (1 - defensePenalty))),
            criticalChance: self.stats.criticalChance + Number(effect.criticalChanceBonus ?? 0),
          },
        };
        ctx.logs.push({ turn: ctx.turn, tone: "enemy", text: `${self.name} entra em fúria: bônus permanente de combate ativado.` });
        break;
      }
      case "self_hp_cost_after_cast": {
        const cost = Math.round(self.hpMax * (Number(effect.percentMaxHp ?? 0) / 100));
        if (cost > 0) { self = { ...self, hpCurrent: Math.max(0, self.hpCurrent - cost) }; ctx.logs.push({ turn: ctx.turn, tone: "enemy", text: `${self.name} perde ${cost} de Vida pelo próprio golpe.` }); }
        break;
      }
      case "cleanse_self": {
        const statuses = Array.isArray(effect.statuses) ? (effect.statuses as unknown as string[]) : [];
        self = { ...self, activeEffects: self.activeEffects.filter((entry) => !statuses.includes(entry.kind)) };
        break;
      }
      case "reset_cooldown": {
        const abilityId = String(effect.abilityId ?? "");
        if (abilityId) self = { ...self, abilityCooldowns: { ...self.abilityCooldowns, [abilityId]: 0 } };
        break;
      }
      case "empower_next_damage": {
        self = { ...self, nextDamageBonusPercent: Number(effect.bonusPercent ?? 0) };
        break;
      }
      case "copy_last_ability": {
        // Aproximação: sem acesso ao catálogo de habilidades do jogador, resolve como um golpe simples.
        const percent = Number(effect.effectPercent ?? 60) / 100;
        const rawDamage = Math.round(Math.max(self.stats.physicalDamage, self.stats.magicalDamage) * percent);
        const kind = self.stats.magicalDamage > self.stats.physicalDamage ? "magical" : "physical";
        const echo = attack({ attacker: self, defender: player, rawDamage, kind, effects: [], sourceName: `${self.name} (eco)`, turn: ctx.turn, logs: ctx.logs, sourceId: self.id });
        player = echo.defender;
        if (echo.dealt) ctx.logs.push({ turn: ctx.turn, tone: "enemy", text: `${self.name} ecoa a última ação e causa ${echo.dealt} de dano.` });
        break;
      }
      case "force_position_change":
      case "push":
      case "pull": {
        if (player.position && self.position && !player.activeEffects.some((entry) => entry.kind === "position_lock")) {
          const occupied = new Set(activeFrontLine(enemies).flatMap((entry) => entry.position ? [hexKey(entry.position)] : []));
          const mode: ForcedMoveMode = effect.kind === "push" ? "push" : effect.kind === "pull" ? "pull" : "force";
          const destination = forcedMoveDestination(player.position, self.position, occupied, mode, Number(effect.distance ?? 1), ctx.battlefield);
          if (hexKey(destination) !== hexKey(player.position)) {
            player = { ...player, position: destination, changedPositionThisTurn: true };
            const label = mode === "push" ? "empurra" : mode === "pull" ? "puxa" : "desloca";
            ctx.logs.push({ turn: ctx.turn, tone: "enemy", text: `${self.name} ${label} ${player.name} para outro hexágono.` });
          }
        }
        break;
      }
      default:
        break; // damage_bonus_per_ally / conditional_damage_bonus / turn_scaling_damage: aplicados no cálculo de dano. gap_close é tratado pela movimentação tática da IA.
    }
  }
  return { self, player, enemies };
}


/** Dano bruto de uma habilidade de criatura, já com moral de bando, bônus condicional
 * por aliados vivos e o consumo de um eventual `empower_next_damage` pendente. */
function creatureAbilityRawDamage(ability: CreatureAbilityDefinition, self: HuntCombatant, player: HuntCombatant, ctx: TriggerContext, moraleMultiplier: number): number {
  const empower = self.nextDamageBonusPercent ?? 0;
  let raw = (ability.damageFamily === "magical" ? self.stats.magicalDamage : self.stats.physicalDamage) * ability.scaling * moraleMultiplier * (1 + empower / 100);
  for (const effect of ability.specialEffects ?? []) {
    if (effect.kind === "conditional_damage_bonus" && evaluateTrigger(String(effect.condition ?? ""), ctx)) raw *= 1 + Number(effect.bonusPercent ?? 0) / 100;
    if (effect.kind === "damage_bonus_per_ally") { const bonus = Math.min(Number(effect.capPercent ?? 100), ctx.alliesAlive * Number(effect.bonusPercent ?? 0)); if (bonus > 0) raw *= 1 + bonus / 100; }
    if (effect.kind === "turn_scaling_damage") { const startTurn = Number(effect.startTurn ?? 1); if (ctx.turn >= startTurn) { const bonus = Math.min(Number(effect.capPercent ?? 100), (ctx.turn - startTurn) * Number(effect.bonusPerTurnPercent ?? 0)); if (bonus > 0) raw *= 1 + bonus / 100; } }
  }
  return Math.round(raw);
}

// ---------------------------------------------------------------------------
// Resolução de rodada
// ---------------------------------------------------------------------------

function runEnemyPhase(turn: number, player0: HuntCombatant, enemies0: HuntCombatant[], battlefield: BattlefieldState, logs: HuntBattleLog[], masteryMultiplier: (creatureId?: string) => number, actorIds?: Set<string>): { player: HuntCombatant; enemies: HuntCombatant[]; defeated: boolean } {
  let player = player0;
  let enemies = ensureActiveEnemyPositions(enemies0, player.position ?? PLAYER_START_CELL, battlefield);
  const slots = activeFrontLine(enemies);
  for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
    const enemyRef = slots[slotIndex];
    if (actorIds && !actorIds.has(enemyRef.id)) continue;
    let workingEnemy = enemies.find((entry) => entry.id === enemyRef.id) ?? enemyRef;
    if (workingEnemy.hpCurrent <= 0) continue;

    if (workingEnemy.abilityCooldowns && Object.keys(workingEnemy.abilityCooldowns).length) {
      const nextCooldowns = Object.fromEntries(Object.entries(workingEnemy.abilityCooldowns).map(([id, turns]): [string, number] => [id, Math.max(0, turns - 1)]).filter(([, turns]) => turns > 0));
      workingEnemy = { ...workingEnemy, abilityCooldowns: nextCooldowns };
    }
    if (workingEnemy.activeEffects.some((effect) => effect.kind === "stun")) {
      logs.push({ turn, tone: "system", text: `${workingEnemy.name} está atordoado e perde o turno.` });
      workingEnemy = finishOwnerTurnEffects({ ...workingEnemy, dodgedLastTurn: false, attackedLastTurn: false }, turn, logs);
      enemies = enemies.map((entry) => (entry.id === workingEnemy.id ? workingEnemy : entry));
      continue;
    }

    const frontIds = activeFrontLine(enemies).map((entry) => entry.id);
    const alliesAlive = frontIds.filter((id) => id !== workingEnemy.id).length;
    const playerPosition = player.position ?? PLAYER_START_CELL;
    const enemyPosition = workingEnemy.position ?? ENEMY_FRONT_SPAWN_CELLS[0];
    const couldSeeAtTurnStart = canUnitSeeCell(workingEnemy, playerPosition, battlefield);
    if (couldSeeAtTurnStart) workingEnemy = { ...workingEnemy, lastKnownTargetPosition: { ...playerPosition } };
    let ctx: TriggerContext = { turn, self: workingEnemy, target: player, alliesAlive, distance: hexDistance(enemyPosition, playerPosition) };

    let chosenAbility: CreatureAbilityDefinition;
    let isChargeResolution = false;
    if (workingEnemy.charging) {
      chosenAbility = workingEnemy.abilities?.find((entry) => entry.id === workingEnemy.charging?.abilityId) ?? DEFAULT_BASIC_ATTACK;
      isChargeResolution = true;
    } else {
      chosenAbility = pickCreatureAbility(workingEnemy, ctx, battlefield, enemies, couldSeeAtTurnStart);
    }

    // `dodged_last_turn` / `attacked_last_turn` são eventos de janela única.
    // A habilidade atual ainda enxerga o snapshot em `ctx`, mas os flags são
    // consumidos antes da ação. Se um contra-golpe ou outro ataque ocorrer DURANTE
    // esta ação, `attack()` os marca novamente e o próximo turno poderá reagir.
    workingEnemy = { ...workingEnemy, dodgedLastTurn: false, attackedLastTurn: false };
    enemies = enemies.map((entry) => (entry.id === workingEnemy.id ? workingEnemy : entry));

    // A IA agora possui seu próprio recurso de movimento antes da ação. Golpes já
    // carregados não reposicionam: a posição anunciada faz parte do telegraph.
    if (!isChargeResolution && chosenAbility.damageFamily !== "none") {
      const tactical = chooseEnemyTacticalDestination(workingEnemy, player, enemies, chosenAbility, battlefield);
      const destination = tactical.destination;
      const startPosition = workingEnemy.position ?? enemyPosition;
      if (hexKey(destination) !== hexKey(startPosition)) {
        workingEnemy = { ...workingEnemy, position: destination, facing: hexDirectionToward(destination, playerPosition), changedPositionThisTurn: true, tacticalIntent: tactical.intent };
        enemies = enemies.map((entry) => (entry.id === workingEnemy.id ? workingEnemy : entry));
        logs.push({ turn, tone: "enemy", text: `${workingEnemy.name}: ${tactical.intent.label.toLowerCase()} — reposiciona-se pelo campo.` });
      } else {
        workingEnemy = { ...workingEnemy, changedPositionThisTurn: false, facing: hexDirectionToward(startPosition, playerPosition), tacticalIntent: tactical.intent };
      }
      const seesAfterMove = canUnitSeeCell(workingEnemy, playerPosition, battlefield);
      if (seesAfterMove) {
        workingEnemy = { ...workingEnemy, lastKnownTargetPosition: { ...playerPosition } };
        enemies = enemies.map((entry) => (entry.id === workingEnemy.id ? workingEnemy : entry));
      }
      ctx = { ...ctx, self: workingEnemy, distance: hexDistance(workingEnemy.position ?? startPosition, playerPosition) };
      // Se a IA começou sem visão e encontrou o Player durante a busca, ela escolhe a melhor
      // ação disponível agora, sem usar informação escondida antes do movimento.
      if (!couldSeeAtTurnStart && seesAfterMove) chosenAbility = pickCreatureAbility(workingEnemy, ctx, battlefield, enemies, true);
    } else {
      const chargeIntent: AITacticalIntent | undefined = isChargeResolution ? { kind: "control_zone", label: "Resolver ameaça", targetCell: workingEnemy.charging?.targetCell } : workingEnemy.tacticalIntent;
      workingEnemy = { ...workingEnemy, facing: hexDirectionToward(workingEnemy.position ?? enemyPosition, playerPosition), tacticalIntent: chargeIntent };
      ctx = { ...ctx, self: workingEnemy };
    }

    const actionRange = creatureAbilityRange(chosenAbility, workingEnemy);
    const chargedCells = workingEnemy.charging?.affectedCells ?? [];
    const playerInsideChargedArea = chargedCells.some((cell) => hexKey(cell) === hexKey(playerPosition));
    const canSeePlayer = canUnitSeeCell(workingEnemy, playerPosition, battlefield);
    const requiresPlayerTarget = !["self", "all_allies", "battlefield"].includes(chosenAbility.target);
    const spatiallyInvalid = requiresPlayerTarget && (!canSeePlayer || ctx.distance > actionRange);
    if ((chosenAbility.damageFamily !== "none" || requiresPlayerTarget) && (isChargeResolution ? !playerInsideChargedArea : spatiallyInvalid)) {
      if (isChargeResolution) {
        workingEnemy = { ...workingEnemy, charging: null };
        logs.push({ turn, tone: "system", text: `${workingEnemy.name} resolve ${chosenAbility.name}, mas ${player.name} saiu dos hexágonos telegrafados.` });
      } else {
        logs.push({ turn, tone: "enemy", text: canSeePlayer ? `${workingEnemy.name} não alcança ${player.name} nesta rodada.` : `${workingEnemy.name} perde ${player.name} de vista entre a neblina/obstáculos.` });
      }
      workingEnemy = finishOwnerTurnEffects(workingEnemy, turn, logs);
      enemies = enemies.map((entry) => (entry.id === workingEnemy.id ? workingEnemy : entry));
      continue;
    }

    if (!isChargeResolution && chosenAbility.chargeTurns) {
      const targetCell = { ...playerPosition };
      const affectedCells = abilityAreaCells(workingEnemy.position ?? enemyPosition, targetCell, creatureAbilityArea(chosenAbility), actionRange);
      workingEnemy = {
        ...workingEnemy,
        charging: { abilityId: chosenAbility.id, targetCell, affectedCells, startedTurn: turn },
        abilityCooldowns: { ...workingEnemy.abilityCooldowns, [chosenAbility.id]: chosenAbility.cooldownTurns },
        usedOncePerBattle: chosenAbility.oncePerBattle
          ? [...new Set([...(workingEnemy.usedOncePerBattle ?? []), chosenAbility.id])]
          : workingEnemy.usedOncePerBattle,
      };
      logs.push({ turn, tone: "enemy", text: `${workingEnemy.name} prepara ${chosenAbility.name}: ${affectedCells.length} hexágono(s) ficam ameaçados. ${chosenAbility.description}` });
      workingEnemy = finishOwnerTurnEffects(workingEnemy, turn, logs);
      enemies = enemies.map((entry) => (entry.id === workingEnemy.id ? workingEnemy : entry));
      continue;
    }
    workingEnemy = isChargeResolution
      ? { ...workingEnemy, charging: null }
      : {
          ...workingEnemy,
          ...(chosenAbility.cooldownTurns ? { abilityCooldowns: { ...workingEnemy.abilityCooldowns, [chosenAbility.id]: chosenAbility.cooldownTurns } } : {}),
          ...(chosenAbility.oncePerBattle ? { usedOncePerBattle: [...new Set([...(workingEnemy.usedOncePerBattle ?? []), chosenAbility.id])] } : {}),
        };

    const hadLeader = enemies.some((entry) => entry.role === "leader");
    const leaderAlive = enemies.some((entry) => entry.role === "leader" && entry.hpCurrent > 0);
    const moraleMult = workingEnemy.role === "fodder" && hadLeader && !leaderAlive ? 1 - MORALE_BROKEN_DAMAGE_PENALTY : 1;

    if (chosenAbility.damageFamily === "none") {
      if (chosenAbility.statusEffects?.length) {
        if (chosenAbility.target === "self") workingEnemy = applyEffects(workingEnemy, chosenAbility.statusEffects, workingEnemy.name, turn, logs, workingEnemy.id);
        else if (chosenAbility.target === "all_allies") enemies = enemies.map((entry) => (frontIds.includes(entry.id) && entry.hpCurrent > 0 ? applyEffects(entry, chosenAbility.statusEffects!, workingEnemy.name, turn, logs, workingEnemy.id) : entry));
        else player = applyEffects(player, chosenAbility.statusEffects, workingEnemy.name, turn, logs, workingEnemy.id);
      }
      const special = applySpecialEffects(chosenAbility.specialEffects, { self: workingEnemy, player, enemies, battlefield, turn, logs, frontLineIds: frontIds });
      workingEnemy = special.self; player = special.player; enemies = special.enemies;
      enemies = enemies.map((entry) => (entry.id === workingEnemy.id ? workingEnemy : entry));
      logs.push({ turn, tone: "enemy", text: `${workingEnemy.name} usa ${chosenAbility.name}.` });
    } else {
      const rawDamage = creatureAbilityRawDamage(chosenAbility, workingEnemy, player, ctx, moraleMult);
      const cover = applyBattlefieldCover(rawDamage, workingEnemy.position ?? enemyPosition, playerPosition, battlefield);
      if (workingEnemy.nextDamageBonusPercent) workingEnemy = { ...workingEnemy, nextDamageBonusPercent: 0 };
      const counter = attack({ attacker: workingEnemy, defender: player, rawDamage: cover.rawDamage, kind: chosenAbility.damageFamily, effects: chosenAbility.statusEffects ?? [], sourceName: workingEnemy.name, turn, logs, sourceId: workingEnemy.id });
      if (cover.coverPercent > 0) logs.push({ turn, tone: "system", text: `${player.name} recebe ${cover.coverPercent}% de cobertura do terreno contra o ataque à distância.` });
      player = counter.defender;
      const moraleNote = moraleMult < 1 ? ", com a moral quebrada," : isChargeResolution ? ", com o golpe carregado," : "";
      if (counter.dealt) logs.push({ turn, tone: "enemy", text: `${workingEnemy.name}${moraleNote} usa ${chosenAbility.name} e causa ${counter.dealt} de dano${counter.critical ? " crítico" : counter.fumble ? " (golpe fraco)" : ""}${counter.blocked ? " · bloqueado" : ""}.` });
      else logs.push({ turn, tone: "enemy", text: `${workingEnemy.name} usa ${chosenAbility.name}, mas erra.` });

      if (chosenAbility.selfStatusEffects?.length) {
        workingEnemy = applyEffects(workingEnemy, chosenAbility.selfStatusEffects, workingEnemy.name, turn, logs, workingEnemy.id);
      }
      const special = applySpecialEffects(chosenAbility.specialEffects, { self: workingEnemy, player, enemies, battlefield, turn, logs, damageDealt: counter.dealt, frontLineIds: frontIds });
      workingEnemy = special.self; player = special.player; enemies = special.enemies;
      enemies = enemies.map((entry) => (entry.id === workingEnemy.id ? workingEnemy : entry));

      if (player.hpCurrent === 0) { logs.push({ turn, tone: "defeat", text: `${player.name} caiu. HP permanece em 0 até receber cura.` }); return { player, enemies: ensureActiveEnemyPositions(enemies, player.position ?? PLAYER_START_CELL, battlefield), defeated: true }; }

      // Reação do Samurai: reação não consome ação e não dispara outra reação.
      if (counter.dealt > 0 && player.counterAttack && Math.random() * 100 < player.counterAttack.chance) {
        const retaliation = attack({ attacker: player, defender: workingEnemy, rawDamage: Math.round(Math.max(1, Math.round(player.stats.physicalDamage * player.counterAttack.scaling)) * masteryMultiplier(workingEnemy.creatureId)), kind: "physical", effects: [], sourceName: player.counterAttack.sourceName, turn, logs, sourceId: player.id });
        enemies = enemies.map((entry) => (entry.id === workingEnemy.id ? retaliation.defender : entry));
        logs.push({ turn, tone: "player", text: retaliation.dealt ? `${player.counterAttack.sourceName}: ${player.name} contra-ataca ${workingEnemy.name} e causa ${retaliation.dealt} de dano${retaliation.critical ? " crítico" : retaliation.fumble ? " (golpe fraco)" : ""}${retaliation.blocked ? " · bloqueado" : ""}.` : `${player.counterAttack.sourceName}: ${player.name} tenta contra-atacar, mas não acerta.` });
      }
    }
    workingEnemy = enemies.find((entry) => entry.id === workingEnemy.id) ?? workingEnemy;
    workingEnemy = finishOwnerTurnEffects(workingEnemy, turn, logs);
    enemies = enemies.map((entry) => (entry.id === workingEnemy.id ? workingEnemy : entry));
    enemies = enemies.map((entry) => maybeRevive(entry, logs, turn));
  }
  enemies = ensureActiveEnemyPositions(enemies, player.position ?? PLAYER_START_CELL, battlefield);
  return { player, enemies, defeated: false };
}

function runInitiativeActor(turn: number, actorId: string, player: HuntCombatant, enemies: HuntCombatant[], battlefield: BattlefieldState, logs: HuntBattleLog[], masteryMultiplier: (creatureId?: string) => number) {
  const result = runEnemyPhase(turn, player, enemies, battlefield, logs, masteryMultiplier, new Set([actorId]));
  return result;
}

function companionEndOfRound(state: HuntBattleState, player: HuntCombatant, enemies: HuntCombatant[], cooldowns: Record<string, number>, logs: HuntBattleLog[]) {
  if (!state.companion || enemies.every((enemy) => enemy.hpCurrent === 0)) {
    return { player, enemies, cooldowns, lastPetTargetId: null as string | null, lastPetDamage: 0 };
  }
  const masteredCreatureIds = state.masteredCreatureIds ?? [];
  const masteryMultiplier = (creatureId?: string) => (creatureId && masteredCreatureIds.includes(creatureId) ? 1 + MASTERY_DAMAGE_BONUS : 1);
  const petTarget = activeFrontLine(enemies)
    .filter((enemy) => enemy.position && canUnitSeeCell(player, enemy.position, state.battlefield))
    .sort((a, b) => a.hpCurrent - b.hpCurrent)[0];
  if (!petTarget) return { player, enemies, cooldowns, lastPetTargetId: null as string | null, lastPetDamage: 0 };
  const petFumble = Math.random() * 100 < FUMBLE_CHANCE;
  const petRawDamage = Math.max(1, Math.round(player.stats.magicalDamage * state.companion.magicalDamageScaling * masteryMultiplier(petTarget.creatureId) * (petFumble ? FUMBLE_DAMAGE_MULTIPLIER : 1)));
  const petCover = applyBattlefieldCover(petRawDamage, player.position ?? PLAYER_START_CELL, petTarget.position ?? ENEMY_FRONT_SPAWN_CELLS[0], state.battlefield);
  const petDamage = mitigateDamage(petCover.rawDamage, "magical", petTarget.stats);
  if (petCover.coverPercent > 0) logs.push({ turn: state.turn, tone: "system", text: `${petTarget.name} recebe ${petCover.coverPercent}% de cobertura contra ${state.companion.name}.` });
  enemies = enemies.map((enemy) => (enemy.id === petTarget.id ? maybeRevive({ ...enemy, hpCurrent: Math.max(0, enemy.hpCurrent - petDamage) }, logs, state.turn) : enemy));
  logs.push({ turn: state.turn, tone: "player", text: `${state.companion.name} lança Bola de Fogo em ${petTarget.name} e causa ${petDamage} de dano mágico${petFumble ? " (golpe fraco)" : ""}.` });
  return { player, enemies, cooldowns, lastPetTargetId: petTarget.id, lastPetDamage: petDamage };
}

// ---------------------------------------------------------------------------
// Ponte Oficial: HuntCombatant <-> CombatantStateV1 & AbilityDefinition <-> SkillDefinitionV1
// ---------------------------------------------------------------------------

function huntCombatantToCombatantStateV1(c: HuntCombatant, team: "player" | "enemy"): import("./action-resolver").CombatantStateV1 {
  const kw = c.keywords ?? {
    blockChance: c.stats.blockChance,
    dodgeChance: c.stats.dodgeChance,
    bleedChance: c.stats.bleedChance,
    counterAttackChance: c.counterAttack?.chance,
    counterAttackScaling: c.counterAttack?.scaling,
  };
  return {
    id: c.id,
    name: c.name,
    team,
    hpCurrent: c.hpCurrent,
    hpMax: c.hpMax,
    power: c.power ?? c.stats.physicalDamage,
    physicalDefense: c.stats.physicalDefense,
    magicalDefense: c.stats.magicalDefense,
    speed: combatantSpeed(c),
    movement: PLAYER_MOVE_RANGE,
    position: c.position,
    facing: c.facing,
    keywords: kw,
    tags: c.tags ?? [c.creatureId ?? c.id, c.className ?? ""],
    damageAffinity: c.damageAffinity,
    activeEffects: (c.activeEffects ?? []).map((e) => ({
      kind: e.kind,
      duration: e.turns ?? 1,
      value: (e as any).potency ?? (e as any).damageBonusPercent,
      sourceId: e.sourceId,
      keyword: (e as any).keyword,
    })),
    charging: c.charging ? { skillId: c.charging.abilityId, targetCell: c.charging.targetCell ?? c.position ?? { q: 0, r: 0 }, turnsRemaining: 1 } : null,
  };
}

function updateHuntCombatantFromV1(c: HuntCombatant, v1: import("./action-resolver").CombatantStateV1): HuntCombatant {
  return {
    ...c,
    hpCurrent: Math.max(0, Math.min(c.hpMax, v1.hpCurrent)),
    position: v1.position ?? c.position,
    facing: v1.facing ?? c.facing,
    charging: v1.charging ? { abilityId: v1.charging.skillId, targetCell: v1.charging.targetCell, affectedCells: [] } : null,
    activeEffects: v1.activeEffects.map((e) => ({
      kind: e.kind as StatusEffectKind,
      turns: e.duration,
      chance: 100,
      sourceName: e.sourceId ?? "Sistema",
      potency: e.value,
      sourceId: e.sourceId,
    })),
  };
}

function abilityToSkillDefinitionV1(ability: AbilityDefinition | CreatureAbilityDefinition): import("./action-resolver").SkillDefinitionV1 {
  const isArea = Boolean(ability.area && ability.area.shape !== "single");
  const anyAbility = ability as any;
  return {
    id: ability.id,
    name: ability.name,
    description: ability.description ?? "",
    damageType: (anyAbility.damageType ?? (ability.damageFamily === "magical" ? "fire" : "slashing")) as any,
    defenseChannel: (anyAbility.defenseChannel ?? (ability.damageFamily === "magical" ? "magical" : "physical")) as any,
    powerScaling: anyAbility.powerScaling ?? (ability as CreatureAbilityDefinition).scaling ?? anyAbility.physicalScaling ?? 1.0,
    cooldownTurns: ability.cooldownTurns ?? 0,
    hitsCount: anyAbility.hitsCount ?? 1,
    range: ability.range,
    isSingleTarget: anyAbility.isSingleTarget !== undefined ? anyAbility.isSingleTarget : !isArea,
    area: ability.area ? {
      shape: ability.area.shape as any,
      radius: ability.area.radius ?? 1,
      friendlyFire: true,
    } : undefined,
    interruptsCharging: anyAbility.interruptsCharging ?? (ability.specialEffects?.some((e) => e.kind === "interrupt") || ability.id === "rupture_arrow"),
    interruptOnDeclare: anyAbility.interruptOnDeclare,
    appliesTaunt: anyAbility.appliesTaunt ?? ability.statusEffects?.some((e) => e.kind === "taunted"),
    appliesBleed: anyAbility.appliesBleed ?? ability.statusEffects?.some((e) => e.kind === "bleed"),
    grantsBonusMovement: anyAbility.grantsBonusMovement,
    advanceBeforeHit: anyAbility.advanceBeforeHit ?? (ability.id === "iai" ? 2 : undefined),
    isUltimate: anyAbility.isUltimate,
    isMasterSkill: anyAbility.isMasterSkill,
    selfEffects: anyAbility.selfEffects as any,
  };
}

/** Escolhe o melhor alvo da Party para a IA atacar (Taunt > Fraqueza/Menor HP > Proximidade). */
function pickTargetHeroForEnemy(enemy: HuntCombatant, livingHeroes: HuntCombatant[], battlefield: BattlefieldState): HuntCombatant {
  const tauntEffect = enemy.activeEffects.find((e) => e.kind === "taunted");
  if (tauntEffect?.sourceId) {
    const taunter = livingHeroes.find((h) => h.id === tauntEffect.sourceId);
    if (taunter && taunter.hpCurrent > 0) return taunter;
  }
  const visibleHeroes = livingHeroes.filter((h) => h.position && canUnitSeeCell(enemy, h.position, battlefield));
  const pool = visibleHeroes.length ? visibleHeroes : livingHeroes;

  const enemyDmgType = enemy.damageType ?? "slashing";
  const scored = pool.map((hero) => {
    const dist = enemy.position && hero.position ? hexDistance(enemy.position, hero.position) : 4;
    const hpRatio = hero.hpCurrent / Math.max(1, hero.hpMax);
    const isWeak = hero.damageAffinity?.weakness?.includes(enemyDmgType as any) ? -0.5 : 0;
    const score = dist * 1.5 + hpRatio * 2 + isWeak;
    return { hero, score };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored[0].hero;
}

/** Executa o turno de uma criatura IA via ActionResolver V1. */
function runInitiativeActorV1(
  turn: number,
  actorId: string,
  party: HuntCombatant[],
  enemies: HuntCombatant[],
  battlefield: BattlefieldState,
  logs: HuntBattleLog[],
): { party: HuntCombatant[]; enemies: HuntCombatant[]; defeated: boolean } {
  let workingEnemy = enemies.find((e) => e.id === actorId);
  if (!workingEnemy || workingEnemy.hpCurrent <= 0) {
    return { party, enemies, defeated: false };
  }

  // Ticks de DoT no turno próprio do monstro
  workingEnemy = tickEndOfRoundDots(workingEnemy, turn, logs);
  if (workingEnemy.hpCurrent <= 0) {
    enemies = enemies.map((e) => (e.id === workingEnemy!.id ? workingEnemy! : e));
    return { party, enemies, defeated: false };
  }

  // Redução de recargas da IA
  if (workingEnemy.abilityCooldowns && Object.keys(workingEnemy.abilityCooldowns).length) {
    const nextCooldowns = Object.fromEntries(
      Object.entries(workingEnemy.abilityCooldowns)
        .map(([id, t]): [string, number] => [id, Math.max(0, t - 1)])
        .filter(([, t]) => t > 0),
    );
    workingEnemy = { ...workingEnemy, abilityCooldowns: nextCooldowns };
  }

  if (workingEnemy.activeEffects.some((e) => e.kind === "stun")) {
    logs.push({ turn, tone: "system", text: `${workingEnemy.name} está atordoado e perde o turno.` });
    enemies = enemies.map((e) => (e.id === workingEnemy!.id ? workingEnemy! : e));
    return { party, enemies, defeated: false };
  }

  const livingHeroes = party.filter((h) => h.hpCurrent > 0);
  if (!livingHeroes.length) {
    return { party, enemies, defeated: true };
  }

  const targetHero = pickTargetHeroForEnemy(workingEnemy, livingHeroes, battlefield);
  const targetPos = targetHero.position ?? PLAYER_START_CELL;
  const startPos = workingEnemy.position ?? ENEMY_FRONT_SPAWN_CELLS[0];

  // Escolhe habilidade da IA
  let chosenAbility: CreatureAbilityDefinition;
  if (workingEnemy.charging) {
    chosenAbility = workingEnemy.abilities?.find((a) => a.id === workingEnemy!.charging?.abilityId) ?? DEFAULT_BASIC_ATTACK;
  } else {
    const ctx: TriggerContext = {
      turn,
      self: workingEnemy,
      target: targetHero,
      alliesAlive: enemies.filter((e) => e.hpCurrent > 0 && e.id !== workingEnemy!.id).length,
      distance: hexDistance(startPos, targetPos),
    };
    chosenAbility = pickCreatureAbility(workingEnemy, ctx, battlefield, enemies, canUnitSeeCell(workingEnemy, targetPos, battlefield));
  }

  // Movimento tático pré-ação
  if (!workingEnemy.charging && chosenAbility.damageFamily !== "none") {
    const tactical = chooseEnemyTacticalDestination(workingEnemy, targetHero, enemies, chosenAbility, battlefield);
    const dest = tactical.destination;
    if (hexKey(dest) !== hexKey(startPos)) {
      workingEnemy = { ...workingEnemy, position: dest, facing: hexDirectionToward(dest, targetPos), changedPositionThisTurn: true };
      enemies = enemies.map((e) => (e.id === workingEnemy!.id ? workingEnemy! : e));
    }
  }

  // Executa pelo Action Resolver V1
  const attackerV1 = huntCombatantToCombatantStateV1(workingEnemy, "enemy");
  const allCombatantsV1: import("./action-resolver").CombatantStateV1[] = [
    ...party.filter((h) => h.hpCurrent > 0).map((h) => huntCombatantToCombatantStateV1(h, "player")),
    ...activeFrontLine(enemies).filter((e) => e.hpCurrent > 0).map((e) => huntCombatantToCombatantStateV1(e, "enemy")),
  ];
  const skillV1 = abilityToSkillDefinitionV1(chosenAbility);
  const activeTraits = evaluateActiveTraits(allCombatantsV1.map((c) => ({ id: c.id, tags: c.tags, team: c.team, isAlive: c.hpCurrent > 0 })));

  const actionResult = resolveCombatActionV1(attackerV1, skillV1, targetPos, allCombatantsV1, battlefield, turn, activeTraits);

  party = party.map((h) => {
    const v1 = actionResult.attacker.id === h.id ? actionResult.attacker : actionResult.defenders.find((d) => d.id === h.id);
    return v1 ? updateHuntCombatantFromV1(h, v1) : h;
  });

  enemies = enemies.map((e) => {
    const v1 = actionResult.attacker.id === e.id ? actionResult.attacker : actionResult.defenders.find((d) => d.id === e.id);
    return v1 ? updateHuntCombatantFromV1(e, v1) : e;
  });

  logs.push(...actionResult.logs);

  const defeated = party.every((h) => h.hpCurrent === 0);
  return { party, enemies, defeated };
}

/**
 * Avança a fila de iniciativa até encontrar o próximo Herói vivo da Party.
 * Executa as ações das IAs intermediárias através do ActionResolver V1.
 */
function advanceInitiativeQueue(state: HuntBattleState, currentParty: HuntCombatant[], currentEnemies: HuntCombatant[], logs: HuntBattleLog[], startIndex?: number): HuntBattleState {
  let party = [...currentParty];
  let enemies = ensureActiveEnemyPositions(currentEnemies, party.find((p) => p.hpCurrent > 0)?.position ?? PLAYER_START_CELL, state.battlefield);
  let order = state.initiativeOrder?.length ? state.initiativeOrder : buildInitiativeOrder(party, enemies);
  let idx = startIndex !== undefined ? startIndex : (state.initiativeIndex ?? 0);
  let turn = state.turn;

  while (true) {
    idx += 1;
    if (idx >= order.length) {
      if (party.every((hero) => hero.hpCurrent === 0)) {
        return { ...state, turn, player: party[0], party, enemies, status: "defeat", log: [...logs, { turn, tone: "defeat", text: "Todos os membros da Party caíram." }] };
      }
      if (enemies.every((enemy) => enemy.hpCurrent === 0)) {
        const loot = rewardFor(state, turn);
        return { ...state, turn, player: party[0], party, enemies, status: "victory", reward: loot.reward, log: [...logs, ...loot.logs, { turn, tone: "victory", text: `Vitória! A emboscada foi derrotada. +${loot.reward.xp} XP global · +${loot.reward.gold} ouro.` }] };
      }

      turn += 1;
      order = buildInitiativeOrder(party, enemies);
      idx = 0;
      logs.push({ turn, tone: "system", text: `Rodada ${turn}: iniciativa recalculada por Velocidade.` });
    }

    const currentActorId = order[idx];
    const heroActor = party.find((h) => h.id === currentActorId);

    if (heroActor && heroActor.hpCurrent > 0) {
      // Ticks de DoT no turno próprio do herói
      const tickedHero = tickEndOfRoundDots(heroActor, turn, logs);
      if (tickedHero.hpCurrent === 0) {
        party = party.map((h) => (h.id === tickedHero.id ? tickedHero : h));
        continue;
      }

      // Turno do Herói: tica recargas e ultimate no relógio próprio
      const nextCooldowns = Object.fromEntries(
        Object.entries(tickedHero.abilityCooldowns ?? {})
          .map(([id, t]): [string, number] => [id, Math.max(0, t - 1)])
          .filter(([, t]) => t > 0),
      );
      const reqCharge = tickedHero.ultimateRequiredCharge ?? 4;
      const curCharge = Math.min(reqCharge, (tickedHero.ultimateCurrentCharge ?? 0) + 1);

      const activeHero: HuntCombatant = {
        ...tickedHero,
        abilityCooldowns: nextCooldowns,
        ultimateCurrentCharge: curCharge,
      };
      party = party.map((h) => (h.id === activeHero.id ? activeHero : h));

      logs.push({
        turn,
        tone: "system",
        text: `Turno de ${activeHero.name} (${activeHero.className}) · ⚡ Vel ${combatantSpeed(activeHero)} · Ultimate ${curCharge}/${reqCharge}.`,
      });

      return {
        ...state,
        turn,
        player: activeHero,
        party,
        activeHeroId: activeHero.id,
        enemies,
        initiativeOrder: order,
        initiativeIndex: idx,
        currentActorId: activeHero.id,
        cooldowns: nextCooldowns,
        movementUsed: false,
        log: logs,
      };
    }

    // Turno de IA Inimiga via ActionResolver V1
    const enemyActor = enemies.find((e) => e.id === currentActorId);
    if (enemyActor && enemyActor.hpCurrent > 0) {
      const result = runInitiativeActorV1(turn, enemyActor.id, party, enemies, state.battlefield, logs);
      party = result.party;
      enemies = result.enemies;

      if (party.every((h) => h.hpCurrent === 0)) {
        return { ...state, turn, player: party[0], party, enemies, status: "defeat", log: logs };
      }
      if (enemies.every((e) => e.hpCurrent === 0)) {
        const loot = rewardFor(state, turn);
        return { ...state, turn, player: party[0], party, enemies, status: "victory", reward: loot.reward, log: [...logs, ...loot.logs, { turn, tone: "victory", text: `Vitória! A emboscada foi derrotada. +${loot.reward.xp} XP global · +${loot.reward.gold} ouro.` }] };
      }
    }
  }
}

/** Inicializa a luta e deixa IAs mais rápidas agirem antes do primeiro Herói da Party. */
function initializeInitiative(state: HuntBattleState): HuntBattleState {
  let party = state.party ?? [state.player];
  let enemies = ensureActiveEnemyPositions(state.enemies, party[0].position ?? PLAYER_START_CELL, state.battlefield);
  const logs = [...state.log];
  const order = buildInitiativeOrder(party, enemies);

  const nameMap = (id: string) => {
    const hero = party.find((h) => h.id === id);
    if (hero) return `${hero.name} (${combatantSpeed(hero)})`;
    const enemy = enemies.find((e) => e.id === id);
    return enemy ? `${enemy.name} (${combatantSpeed(enemy)})` : id;
  };

  logs.push({ turn: 1, tone: "system", text: `Iniciativa: ${order.map(nameMap).join(" → ")}.` });

  const initialState: HuntBattleState = {
    ...state,
    party,
    enemies,
    initiativeOrder: order,
    initiativeIndex: -1,
  };

  return advanceInitiativeQueue(initialState, party, enemies, logs, -1);
}

export function resolveHuntTurn(state: HuntBattleState, ability: AbilityDefinition, targetId?: string): HuntBattleState {
  if (state.status !== "active") return state;
  const logs = [...state.log];
  let party = state.party ?? [state.player];
  const activeHero = party.find((h) => h.id === (state.activeHeroId ?? state.currentActorId ?? state.player.id)) ?? party[0];
  let enemies = ensureActiveEnemyPositions(state.enemies, activeHero.position ?? PLAYER_START_CELL, state.battlefield);

  const heroStunned = activeHero.activeEffects.some((effect) => effect.kind === "stun");
  const heroSilenced = activeHero.activeEffects.some((effect) => effect.kind === "silence");

  if (heroStunned) {
    logs.push({ turn: state.turn, tone: "system", text: `${activeHero.name} está atordoado e perde o turno.` });
  } else {
    // Validação de Recarga e Ultimate
    if (ability.isUltimate) {
      const required = activeHero.ultimateRequiredCharge ?? ability.requiredChargeTurns ?? 4;
      const current = activeHero.ultimateCurrentCharge ?? 0;
      if (current < required) {
        return { ...state, log: [...logs, { turn: state.turn, tone: "system", text: `Ultimate ${ability.name} ainda carregando (${current}/${required} turnos).` }] };
      }
    } else {
      const cd = activeHero.abilityCooldowns?.[ability.id] ?? state.cooldowns[ability.id] ?? 0;
      if (cd > 0) {
        return { ...state, log: [...logs, { turn: state.turn, tone: "system", text: `${ability.name} em recarga por mais ${cd} turno(s).` }] };
      }
    }

    if (heroSilenced && ability.defenseChannel === "magical") {
      return { ...state, log: [...logs, { turn: state.turn, tone: "system", text: `${activeHero.name} está silenciado e não pode conjurar magia.` }] };
    }

    const isSelfCast = (ability.range === 0) || (ability.slotKind === "stance");
    const frontLine = activeFrontLine(enemies);
    const tauntEffect = activeHero.activeEffects.find((effect) => effect.kind === "taunted");
    const taunter = tauntEffect?.sourceId ? frontLine.find((entry) => entry.id === tauntEffect.sourceId) : undefined;
    const primaryEnemy = isSelfCast ? undefined : (taunter ?? frontLine.find((entry) => entry.id === targetId) ?? frontLine[0]);
    const heroCell = activeHero.position ?? PLAYER_START_CELL;
    const targetCell = isSelfCast ? heroCell : (primaryEnemy?.position ?? ENEMY_FRONT_SPAWN_CELLS[0]);
    const distanceToTarget = hexDistance(heroCell, targetCell);

    if (!isSelfCast && primaryEnemy && !canUnitSeeCell(activeHero, targetCell, state.battlefield)) {
      return { ...state, log: [...logs, { turn: state.turn, tone: "system", text: `${primaryEnemy.name} não está na sua linha de visão.` }] };
    }

    const abilityRange = isSelfCast ? 0 : playerAbilityRange(ability, activeHero);
    if (!isSelfCast && abilityRange !== undefined && distanceToTarget > abilityRange) {
      return { ...state, log: [...logs, { turn: state.turn, tone: "system", text: `${ability.name} fora de alcance (${distanceToTarget}/${abilityRange} hex).` }] };
    }

    // Execução Unificada pelo Action Resolver V1 (14 Etapas Oficiais)
    const attackerV1 = huntCombatantToCombatantStateV1(activeHero, "player");
    const allCombatantsV1: import("./action-resolver").CombatantStateV1[] = [
      ...party.filter((h) => h.hpCurrent > 0).map((h) => huntCombatantToCombatantStateV1(h, "player")),
      ...frontLine.filter((e) => e.hpCurrent > 0).map((e) => huntCombatantToCombatantStateV1(e, "enemy")),
    ];
    const skillV1 = abilityToSkillDefinitionV1(ability);
    const activeTraits = evaluateActiveTraits(allCombatantsV1.map((c) => ({ id: c.id, tags: c.tags, team: c.team, isAlive: c.hpCurrent > 0 })));

    const actionResult = resolveCombatActionV1(attackerV1, skillV1, targetCell, allCombatantsV1, state.battlefield, state.turn, activeTraits);

    party = party.map((h) => {
      const v1 = actionResult.attacker.id === h.id ? actionResult.attacker : actionResult.defenders.find((d) => d.id === h.id);
      return v1 ? updateHuntCombatantFromV1(h, v1) : h;
    });

    enemies = enemies.map((e) => {
      const v1 = actionResult.attacker.id === e.id ? actionResult.attacker : actionResult.defenders.find((d) => d.id === e.id);
      return v1 ? updateHuntCombatantFromV1(e, v1) : e;
    });

    logs.push(...actionResult.logs);

    // Consumo de Recarga / Carga de Ultimate
    const updatedHeroCooldowns = { ...(activeHero.abilityCooldowns ?? {}) };
    let updatedHeroCharge = activeHero.ultimateCurrentCharge ?? 0;

    if (ability.isUltimate) {
      updatedHeroCharge = 0;
    } else if (ability.cooldownTurns) {
      updatedHeroCooldowns[ability.id] = ability.cooldownTurns;
    }

    const currentHeroAfterAction = party.find((h) => h.id === activeHero.id) ?? activeHero;
    const updatedHero: HuntCombatant = {
      ...currentHeroAfterAction,
      abilityCooldowns: updatedHeroCooldowns,
      ultimateCurrentCharge: updatedHeroCharge,
      lastAbilityUsed: ability.id,
    };
    party = party.map((h) => (h.id === updatedHero.id ? updatedHero : h));
  }

  // Verifica vitória imediata
  if (enemies.every((e) => e.hpCurrent === 0)) {
    const loot = rewardFor(state, state.turn);
    return { ...state, party, enemies, status: "victory", reward: loot.reward, log: [...logs, ...loot.logs, { turn: state.turn, tone: "victory", text: `Vitória! A emboscada foi derrotada. +${loot.reward.xp} XP global · +${loot.reward.gold} ouro.` }] };
  }

  return advanceInitiativeQueue(state, party, enemies, logs, state.initiativeIndex);
}

export function resolveMoveTurn(state: HuntBattleState, destination: Axial): HuntBattleState {
  if (state.status !== "active") return state;
  const logs = [...state.log];
  let party = state.party ?? [state.player];
  const activeHero = party.find((h) => h.id === (state.activeHeroId ?? state.currentActorId ?? state.player.id)) ?? party[0];

  if (state.movementUsed) {
    return { ...state, log: [...logs, { turn: state.turn, tone: "system", text: `${activeHero.name} já usou o movimento desta rodada.` }] };
  }

  const previousPosition = activeHero.position ?? PLAYER_START_CELL;
  let enemies = ensureActiveEnemyPositions(state.enemies, previousPosition, state.battlefield);
  const occupiedCells = new Set([
    ...activeFrontLine(enemies).flatMap((e) => (e.position ? [hexKey(e.position)] : [])),
    ...party.filter((h) => h.id !== activeHero.id && h.hpCurrent > 0).flatMap((h) => (h.position ? [hexKey(h.position)] : [])),
  ]);

  const reachable = new Set(reachableCells(previousPosition, PLAYER_MOVE_RANGE, boardCells(), occupiedCells, state.battlefield).map(hexKey));
  const validMove = reachable.has(hexKey(destination));
  const changed = validMove && (destination.q !== previousPosition.q || destination.r !== previousPosition.r);

  if (!changed) {
    logs.push({ turn: state.turn, tone: "system", text: `${activeHero.name} não pode se mover para esse hexágono.` });
    return { ...state, log: logs };
  }

  const updatedHero: HuntCombatant = {
    ...activeHero,
    position: destination,
    facing: hexDirectionToward(previousPosition, destination),
    changedPositionThisTurn: true,
  };
  party = party.map((h) => (h.id === updatedHero.id ? updatedHero : h));
  logs.push({ turn: state.turn, tone: "system", text: `${activeHero.name} reposiciona-se no campo e ainda pode agir.` });

  return {
    ...state,
    player: updatedHero,
    party,
    movementUsed: true,
    log: logs,
  };
}

export function resolveWaitTurn(state: HuntBattleState): HuntBattleState {
  if (state.status !== "active") return state;
  const logs = [...state.log];
  const party = state.party ?? [state.player];
  const activeHero = party.find((h) => h.id === (state.activeHeroId ?? state.currentActorId ?? state.player.id)) ?? party[0];
  logs.push({ turn: state.turn, tone: "system", text: `${activeHero.name} aguarda e encerra seu turno.` });
  return advanceInitiativeQueue(state, party, state.enemies, logs, state.initiativeIndex);
}
