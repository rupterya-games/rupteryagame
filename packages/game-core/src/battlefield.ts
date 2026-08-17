/**
 * battlefield.ts — Tabuleiro Hexagonal, Distâncias, Linha de Visão, Cobertura e Áreas (Rupterya V1)
 *
 * Regras do Tabuleiro:
 * - Coordenadas Axiais (q, r).
 * - Distância de Manhattan em hexágonos.
 * - Linha de Visão (LoS) interrompida por obstáculos.
 * - Cobertura para ataques à distância (distância > 1).
 * - Geometrias de Área: Single, Raio, Anel, Linha, Cone.
 * - REGRA DE FOGO AMIGO: Todas as habilidades de área possuem fogo amigo obrigatório por padrão.
 */

import type { Axial, BattleTerrainCell, BattlefieldState, VisionTrait } from "./domain";

export const BOARD_RADIUS = 3;

export const AXIAL_DIRECTIONS: Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export const hexKey = (cell: Axial): string => `${cell.q},${cell.r}`;

export function hexDistance(a: Axial, b: Axial): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export function boardCells(radius = BOARD_RADIUS): Axial[] {
  const cells: Axial[] = [];
  for (let q = -radius; q <= radius; q += 1) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r += 1) {
      cells.push({ q, r });
    }
  }
  return cells;
}

const battlefieldGridCache = new WeakMap<BattlefieldState, Map<string, BattleTerrainCell>>();

export function battlefieldGrid(battlefield: BattlefieldState): Map<string, BattleTerrainCell> {
  let grid = battlefieldGridCache.get(battlefield);
  if (!grid) {
    grid = new Map(battlefield.cells.map((cell) => [hexKey(cell.position), cell]));
    battlefieldGridCache.set(battlefield, grid);
  }
  return grid;
}

export function terrainCellAt(battlefield: BattlefieldState, cell: Axial): BattleTerrainCell | undefined {
  return battlefieldGrid(battlefield).get(hexKey(cell));
}

export function isBlockedCell(battlefield: BattlefieldState, cell: Axial): boolean {
  return Boolean(terrainCellAt(battlefield, cell)?.blocked);
}

export function terrainMovementCost(battlefield: BattlefieldState, cell: Axial): number {
  return Math.max(1, terrainCellAt(battlefield, cell)?.movementCost ?? 1);
}

export function terrainCoverPercent(battlefield: BattlefieldState, cell: Axial): number {
  return Math.max(0, Math.min(80, terrainCellAt(battlefield, cell)?.coverPercent ?? 0));
}

function axialRound(q: number, r: number): Axial {
  let x = q; let z = r; let y = -x - z;
  let rx = Math.round(x); let ry = Math.round(y); let rz = Math.round(z);
  const xDiff = Math.abs(rx - x); const yDiff = Math.abs(ry - y); const zDiff = Math.abs(rz - z);
  if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz;
  else if (yDiff > zDiff) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

export function hexLine(origin: Axial, target: Axial): Axial[] {
  const distance = hexDistance(origin, target);
  if (distance === 0) return [origin];
  const cells: Axial[] = [];
  for (let step = 0; step <= distance; step += 1) {
    const t = step / distance;
    const cell = axialRound(origin.q + (target.q - origin.q) * t, origin.r + (target.r - origin.r) * t);
    if (!cells.some((entry) => hexKey(entry) === hexKey(cell))) cells.push(cell);
  }
  return cells;
}

export function hasLineOfSight(origin: Axial, target: Axial, battlefield: BattlefieldState): boolean {
  const line = hexLine(origin, target);
  if (line.length <= 2) return true;
  return line.slice(1, -1).every((cell) => !terrainCellAt(battlefield, cell)?.blocksLineOfSight);
}

export function hexDirectionToward(from: Axial, to: Axial): number {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  const angle = Math.atan2(Math.sqrt(3) * (dr + dq / 2), (3 / 2) * dq);
  const normalized = (angle + 2 * Math.PI) % (2 * Math.PI);
  return Math.round((normalized / (2 * Math.PI)) * 6) % 6;
}

export function relativeArc(attacker: Axial, defender: Axial, defenderFacing = 0): "front" | "flank" | "back" {
  const incoming = hexDirectionToward(defender, attacker);
  const delta = Math.min((incoming - defenderFacing + 6) % 6, (defenderFacing - incoming + 6) % 6);
  if (delta <= 1) return "front";
  if (delta === 2) return "flank";
  return "back";
}

export function effectiveVisionRange(unit: { visionRange?: number; visionTraits?: VisionTrait[] }, battlefield: BattlefieldState): number {
  if (!battlefield.fog.enabled) return 99;
  const traits = new Set(unit.visionTraits ?? []);
  if (traits.has("fog_sight")) return 99;
  const base = unit.visionRange ?? battlefield.fog.baseVisionRange;
  return Math.max(1, base + (traits.has("keen_sight") ? 1 : 0) + (traits.has("darkvision") ? 1 : 0));
}

export function canUnitSeeCell(unit: { position?: Axial; visionRange?: number; visionTraits?: VisionTrait[] }, target: Axial, battlefield: BattlefieldState): boolean {
  const origin = unit.position ?? { q: 0, r: 0 };
  return hexDistance(origin, target) <= effectiveVisionRange(unit, battlefield) && hasLineOfSight(origin, target, battlefield);
}

export function rangedCoverPercent(attacker: Axial, target: Axial, battlefield: BattlefieldState): number {
  if (hexDistance(attacker, target) <= 1) return 0;
  return terrainCoverPercent(battlefield, target);
}

export function applyBattlefieldCover(rawDamage: number, attacker: Axial, target: Axial, battlefield: BattlefieldState): { rawDamage: number; coverPercent: number } {
  const coverPercent = rangedCoverPercent(attacker, target, battlefield);
  return { rawDamage: Math.max(1, Math.round(rawDamage * (1 - coverPercent / 100))), coverPercent };
}

export interface AreaDefinition {
  shape: "single" | "radius" | "ring" | "line" | "cone" | "all";
  radius?: number;
  friendlyFire?: boolean; // Padrão Rupterya: true (todas as áreas têm fogo amigo a menos que especificado)
}

/**
 * Calcula os hexágonos atingidos por uma habilidade no tabuleiro.
 */
export function calculateAreaCells(
  origin: Axial,
  target: Axial,
  area: AreaDefinition,
  range: number,
  board: Axial[] = boardCells(),
): Axial[] {
  const boardKeys = new Set(board.map(hexKey));
  const shape = area.shape ?? "single";

  if (shape === "all") return [...board];
  if (shape === "radius") {
    const radius = Math.max(0, area.radius ?? 1);
    return board.filter((cell) => hexDistance(cell, target) <= radius);
  }
  if (shape === "ring") {
    const radius = Math.max(1, area.radius ?? 1);
    return board.filter((cell) => hexDistance(cell, target) === radius);
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

/**
 * Alcance real de movimento com BFS por bucket queue (custos 1 e 2).
 */
export function reachableCells(
  start: Axial,
  range: number,
  board: Axial[],
  occupied: Set<string>,
  battlefield?: BattlefieldState,
): Axial[] {
  const boardKeys = new Set(board.map(hexKey));
  const costs = new Map<string, number>([[hexKey(start), 0]]);
  const buckets: Axial[][] = Array.from({ length: range + 1 }, () => []);
  buckets[0].push(start);
  let bucketIndex = 0;

  while (bucketIndex <= range) {
    while (bucketIndex <= range && !buckets[bucketIndex].length) bucketIndex += 1;
    if (bucketIndex > range) break;
    const current = buckets[bucketIndex].pop()!;
    const costSoFar = costs.get(hexKey(current));
    if (costSoFar === undefined || costSoFar < bucketIndex) continue;

    for (const direction of AXIAL_DIRECTIONS) {
      const next = { q: current.q + direction.q, r: current.r + direction.r };
      const nextKey = hexKey(next);
      if (!boardKeys.has(nextKey) || occupied.has(nextKey) || (battlefield && isBlockedCell(battlefield, next))) continue;
      const nextCost = costSoFar + (battlefield ? terrainMovementCost(battlefield, next) : 1);
      if (nextCost > range) continue;
      const previous = costs.get(nextKey);
      if (previous !== undefined && previous <= nextCost) continue;
      costs.set(nextKey, nextCost);
      buckets[nextCost].push(next);
    }
  }

  costs.delete(hexKey(start));
  return [...costs.keys()].map((entry) => {
    const [q, r] = entry.split(",").map(Number);
    return { q, r };
  });
}
