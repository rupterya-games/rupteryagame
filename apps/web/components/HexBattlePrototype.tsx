"use client";

import { useMemo, useState } from "react";

/**
 * Protótipo experimental isolado: tabuleiro hexagonal com movimento, alcance
 * e flanco (ataque furtivo "pelas costas" + invisibilidade). Não toca em
 * HuntBattleState, conta ou personagem — é uma caixa de areia pra sentir a
 * mecânica antes de decidir se ela entra de verdade no jogo.
 */

type Axial = { q: number; r: number };
type Side = "player" | "enemy";

interface HexUnit {
  id: string;
  name: string;
  side: Side;
  glyph: string;
  hp: number;
  hpMax: number;
  position: Axial;
  /** Índice 0-5 na lista AXIAL_DIRECTIONS: pra onde a unidade está olhando. */
  facing: number;
  moveRange: number;
  attackRange: number;
  invisible: boolean;
}

const BOARD_RADIUS = 2;
const HEX_SIZE = 34;

const AXIAL_DIRECTIONS: Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

const key = (cell: Axial) => `${cell.q},${cell.r}`;

function hexDistance(a: Axial, b: Axial): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

function axialToPixel(cell: Axial): { x: number; y: number } {
  return { x: HEX_SIZE * Math.sqrt(3) * (cell.q + cell.r / 2), y: HEX_SIZE * 1.5 * cell.r };
}

function hexCorners(cx: number, cy: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    points.push(`${cx + HEX_SIZE * Math.cos(angle)},${cy + HEX_SIZE * Math.sin(angle)}`);
  }
  return points.join(" ");
}

function boardCells(): Axial[] {
  const cells: Axial[] = [];
  for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q += 1) {
    const rMin = Math.max(-BOARD_RADIUS, -q - BOARD_RADIUS);
    const rMax = Math.min(BOARD_RADIUS, -q + BOARD_RADIUS);
    for (let r = rMin; r <= rMax; r += 1) cells.push({ q, r });
  }
  return cells;
}

/** Flood-fill respeitando o tabuleiro e células ocupadas — alcance de movimento real, não só distância. */
function reachableCells(start: Axial, range: number, board: Set<string>, occupied: Set<string>): Axial[] {
  const distances = new Map<string, number>([[key(start), 0]]);
  const queue: Axial[] = [start];
  while (queue.length) {
    const current = queue.shift()!;
    const distance = distances.get(key(current))!;
    if (distance >= range) continue;
    for (const direction of AXIAL_DIRECTIONS) {
      const next = { q: current.q + direction.q, r: current.r + direction.r };
      const nextKey = key(next);
      if (!board.has(nextKey) || occupied.has(nextKey) || distances.has(nextKey)) continue;
      distances.set(nextKey, distance + 1);
      queue.push(next);
    }
  }
  distances.delete(key(start));
  return [...distances.keys()].map((entry) => {
    const [q, r] = entry.split(",").map(Number);
    return { q, r };
  });
}

function directionIndexFromDelta(delta: Axial): number {
  return AXIAL_DIRECTIONS.findIndex((direction) => direction.q === delta.q && direction.r === delta.r);
}

/** Ângulo (em graus) de cada direção hexagonal, calculado a partir da própria conversão pra pixel — funciona pra qualquer orientação de hexágono. */
const DIRECTION_ANGLES = AXIAL_DIRECTIONS.map((direction) => {
  const origin = axialToPixel({ q: 0, r: 0 });
  const tip = axialToPixel(direction);
  return (Math.atan2(tip.y - origin.y, tip.x - origin.x) * 180) / Math.PI;
});

function angleDiff(a: number, b: number): number {
  let diff = Math.abs(a - b) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/** Ataque vem "pelas costas" se a direção defensor→atacante estiver a menos de 90° do oposto exato da direção que o defensor encara. */
function isBackstab(attacker: Axial, defender: Axial, defenderFacing: number): boolean {
  const origin = axialToPixel(defender);
  const target = axialToPixel(attacker);
  if (origin.x === target.x && origin.y === target.y) return false;
  const attackAngle = (Math.atan2(target.y - origin.y, target.x - origin.x) * 180) / Math.PI;
  const behindAngle = DIRECTION_ANGLES[defenderFacing] + 180;
  return angleDiff(attackAngle, behindAngle) < 90;
}

function seedUnits(): HexUnit[] {
  return [
    { id: "p-guardiao", name: "Guardião", side: "player", glyph: "🛡", hp: 42, hpMax: 42, position: { q: -2, r: 1 }, facing: 0, moveRange: 1, attackRange: 1, invisible: false },
    { id: "p-arqueira", name: "Arqueira", side: "player", glyph: "🏹", hp: 30, hpMax: 30, position: { q: -2, r: 0 }, facing: 0, moveRange: 2, attackRange: 3, invisible: false },
    { id: "p-ladina", name: "Ladina", side: "player", glyph: "🗡", hp: 26, hpMax: 26, position: { q: -1, r: -1 }, facing: 0, moveRange: 3, attackRange: 1, invisible: false },
    { id: "e-orc", name: "Orc Guerreiro", side: "enemy", glyph: "🪓", hp: 38, hpMax: 38, position: { q: 2, r: -1 }, facing: 3, moveRange: 1, attackRange: 1, invisible: false },
    { id: "e-xama", name: "Xamã Goblin", side: "enemy", glyph: "🔥", hp: 24, hpMax: 24, position: { q: 2, r: 0 }, facing: 3, moveRange: 1, attackRange: 3, invisible: false },
    { id: "e-lobo", name: "Lobo da Cinza", side: "enemy", glyph: "🐺", hp: 22, hpMax: 22, position: { q: 1, r: 1 }, facing: 3, moveRange: 2, attackRange: 1, invisible: false },
  ];
}

const BACKSTAB_MULTIPLIER = 2;

export function HexBattlePrototype() {
  const [units, setUnits] = useState<HexUnit[]>(seedUnits);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("Selecione uma unidade pra ver movimento (dourado) e alcance de ataque (vermelho).");

  const cells = useMemo(boardCells, []);
  const boardKeys = useMemo(() => new Set(cells.map(key)), [cells]);
  const selected = units.find((unit) => unit.id === selectedId) ?? null;

  const occupied = useMemo(() => new Set(units.filter((unit) => unit.hp > 0).map((unit) => key(unit.position))), [units]);
  const moveTargets = useMemo(() => {
    if (!selected) return new Set<string>();
    const withoutSelf = new Set(occupied);
    withoutSelf.delete(key(selected.position));
    return new Set(reachableCells(selected.position, selected.moveRange, boardKeys, withoutSelf).map(key));
  }, [selected, occupied, boardKeys]);
  const attackTargets = useMemo(() => {
    if (!selected) return new Set<string>();
    const targets = new Set<string>();
    for (const unit of units) {
      if (unit.hp <= 0 || unit.side === selected.side) continue;
      if (hexDistance(selected.position, unit.position) > selected.attackRange) continue;
      if (unit.invisible && hexDistance(selected.position, unit.position) > 1) continue;
      targets.add(key(unit.position));
    }
    return targets;
  }, [selected, units]);

  const { minX, minY, width, height } = useMemo(() => {
    const points = cells.map(axialToPixel);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const pad = HEX_SIZE * 1.15;
    const left = Math.min(...xs) - pad;
    const top = Math.min(...ys) - pad;
    return { minX: left, minY: top, width: Math.max(...xs) - left + pad, height: Math.max(...ys) - top + pad };
  }, [cells]);

  const toPercent = (cell: Axial) => {
    const { x, y } = axialToPixel(cell);
    return { left: `${((x - minX) / width) * 100}%`, top: `${((y - minY) / height) * 100}%` };
  };

  const moveSelectedTo = (cell: Axial) => {
    if (!selected || !moveTargets.has(key(cell))) return;
    const delta = { q: cell.q - selected.position.q, r: cell.r - selected.position.r };
    const stepQ = Math.sign(delta.q);
    const stepR = Math.sign(delta.r);
    const facingIndex = directionIndexFromDelta({ q: stepQ, r: stepR });
    setUnits((previous) => previous.map((unit) => (unit.id === selected.id ? { ...unit, position: cell, facing: facingIndex >= 0 ? facingIndex : unit.facing } : unit)));
    setMessage(`${selected.name} se move.`);
  };

  const attackTarget = (defender: HexUnit) => {
    if (!selected || !attackTargets.has(key(defender.position))) return;
    const backstab = isBackstab(selected.position, defender.position, defender.facing);
    const base = 6 + Math.floor(Math.random() * 5);
    const dealt = backstab ? base * BACKSTAB_MULTIPLIER : base;
    setUnits((previous) =>
      previous.map((unit) => {
        if (unit.id === defender.id) return { ...unit, hp: Math.max(0, unit.hp - dealt) };
        if (unit.id === selected.id && unit.invisible) return { ...unit, invisible: false };
        return unit;
      }),
    );
    setMessage(
      backstab
        ? `⚔ Ataque Furtivo! ${selected.name} pega ${defender.name} pelas costas e causa ${dealt} de dano.`
        : `${selected.name} ataca ${defender.name} e causa ${dealt} de dano.`,
    );
  };

  const toggleInvisible = () => {
    if (!selected) return;
    setUnits((previous) => previous.map((unit) => (unit.id === selected.id ? { ...unit, invisible: !unit.invisible } : unit)));
    setMessage(selected.invisible ? `${selected.name} sai da invisibilidade.` : `${selected.name} fica invisível — só pode ser atacada de perto.`);
  };

  return (
    <section className="hexlab">
      <p className="hexlab-note">Protótipo experimental — não afeta sua conta, seu personagem nem seu progresso.</p>
      <p className="hexlab-message">{message}</p>
      <div className="hexlab-board" style={{ aspectRatio: `${width} / ${height}` }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="hexlab-svg">
          {cells.map((cell) => {
            const { x, y } = axialToPixel(cell);
            const cx = x - minX;
            const cy = y - minY;
            const cellKey = key(cell);
            const isMove = moveTargets.has(cellKey);
            const isAttack = attackTargets.has(cellKey);
            const className = `hexlab-cell${isMove ? " move" : ""}${isAttack ? " attack" : ""}`;
            const occupant = units.find((unit) => unit.hp > 0 && key(unit.position) === cellKey);
            return (
              <polygon
                key={cellKey}
                points={hexCorners(cx, cy)}
                className={className}
                onClick={() => {
                  if (isAttack && occupant) attackTarget(occupant);
                  else if (isMove) moveSelectedTo(cell);
                }}
              />
            );
          })}
        </svg>
        {units.filter((unit) => unit.hp > 0).map((unit) => {
          const { left, top } = toPercent(unit.position);
          const angle = DIRECTION_ANGLES[unit.facing];
          return (
            <button
              key={unit.id}
              type="button"
              className={`hexlab-unit ${unit.side} ${unit.id === selectedId ? "selected" : ""} ${unit.invisible ? "invisible" : ""}`}
              style={{ left, top }}
              onClick={() => {
                if (selected && attackTargets.has(key(unit.position)) && unit.id !== selected.id) attackTarget(unit);
                else setSelectedId(unit.id === selectedId ? null : unit.id);
              }}
              aria-label={`${unit.name} · HP ${unit.hp}/${unit.hpMax}`}
            >
              <i className="hexlab-facing" style={{ transform: `translate(-50%,-50%) rotate(${angle}deg)` }} aria-hidden="true" />
              <span className="hexlab-glyph" aria-hidden="true">{unit.glyph}</span>
              <b className="hexlab-hp"><em style={{ width: `${Math.max(0, (unit.hp / unit.hpMax) * 100)}%` }} /></b>
              <small>{unit.name}</small>
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="hexlab-actions">
          <strong>{selected.name}</strong>
          <span>HP {selected.hp}/{selected.hpMax} · Movimento {selected.moveRange} · Alcance {selected.attackRange}</span>
          <button type="button" onClick={toggleInvisible} className={selected.invisible ? "active" : ""}>
            {selected.invisible ? "Sair da invisibilidade" : "Ficar Invisível"}
          </button>
        </div>
      )}
    </section>
  );
}
