"use client";

import { useMemo, useState } from "react";

/**
 * Protótipo experimental isolado: tabuleiro hexagonal com movimento, alcance,
 * turnos e flanco (ataque furtivo "pelas costas" + invisibilidade). Não toca
 * em HuntBattleState, conta ou personagem — é uma caixa de areia pra sentir a
 * mecânica antes de decidir se ela entra de verdade no jogo.
 *
 * Os inimigos nunca são controláveis pelo jogador: agem sozinhos (IA simples
 * de perseguir-e-atacar) quando o jogador encerra o turno.
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
const BACKSTAB_MULTIPLIER = 2;

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

function rollDamage(backstab: boolean): number {
  const base = 6 + Math.floor(Math.random() * 5);
  return backstab ? base * BACKSTAB_MULTIPLIER : base;
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

/**
 * IA inimiga: perseguir e atacar. Cada inimigo vivo mira o jogador vivo mais
 * próximo — ataca se estiver no alcance (e visível), senão anda pra mais
 * perto (respeitando o próprio moveRange e o tabuleiro). Roda inteira de uma
 * vez (sem estado assíncrono) porque cada passo já é determinístico.
 */
function resolveEnemyTurn(startUnits: HexUnit[], board: Set<string>): { units: HexUnit[]; messages: string[] } {
  let working = startUnits.map((unit) => ({ ...unit }));
  const messages: string[] = [];
  const enemyIds = working.filter((unit) => unit.side === "enemy" && unit.hp > 0).map((unit) => unit.id);

  for (const id of enemyIds) {
    const unit = working.find((entry) => entry.id === id);
    if (!unit || unit.hp <= 0) continue;
    const alivePlayers = working.filter((entry) => entry.side === "player" && entry.hp > 0);
    if (!alivePlayers.length) break;
    let nearest = alivePlayers[0];
    for (const candidate of alivePlayers) {
      if (hexDistance(unit.position, candidate.position) < hexDistance(unit.position, nearest.position)) nearest = candidate;
    }
    const distance = hexDistance(unit.position, nearest.position);
    const canSee = !(nearest.invisible && distance > 1);

    if (distance <= unit.attackRange && canSee) {
      const backstab = isBackstab(unit.position, nearest.position, nearest.facing);
      const dealt = rollDamage(backstab);
      working = working.map((entry) => (entry.id === nearest.id ? { ...entry, hp: Math.max(0, entry.hp - dealt) } : entry));
      messages.push(backstab ? `⚔ ${unit.name} pega ${nearest.name} pelas costas e causa ${dealt} de dano!` : `${unit.name} ataca ${nearest.name} e causa ${dealt} de dano.`);
    } else {
      const occupied = new Set(working.filter((entry) => entry.hp > 0 && entry.id !== unit.id).map((entry) => key(entry.position)));
      const options = reachableCells(unit.position, unit.moveRange, board, occupied);
      if (options.length) {
        options.sort((a, b) => hexDistance(a, nearest.position) - hexDistance(b, nearest.position));
        const destination = options[0];
        const direction = directionIndexFromDelta({ q: Math.sign(destination.q - unit.position.q), r: Math.sign(destination.r - unit.position.r) });
        working = working.map((entry) => (entry.id === unit.id ? { ...entry, position: destination, facing: direction >= 0 ? direction : entry.facing } : entry));
        messages.push(`${unit.name} se aproxima.`);
      } else {
        messages.push(`${unit.name} não tem pra onde ir.`);
      }
    }
  }
  return { units: working, messages };
}

export function HexBattlePrototype() {
  const [units, setUnits] = useState<HexUnit[]>(seedUnits);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actedIds, setActedIds] = useState<Set<string>>(new Set());
  const [round, setRound] = useState(1);
  const [message, setMessage] = useState("Sua rodada: cada unidade age uma vez (mover OU atacar). Depois, encerre o turno.");

  const cells = useMemo(boardCells, []);
  const boardKeys = useMemo(() => new Set(cells.map(key)), [cells]);
  const selected = units.find((unit) => unit.id === selectedId) ?? null;
  const canAct = Boolean(selected && selected.side === "player" && selected.hp > 0 && !actedIds.has(selected.id));

  const occupied = useMemo(() => new Set(units.filter((unit) => unit.hp > 0).map((unit) => key(unit.position))), [units]);
  const moveTargets = useMemo(() => {
    if (!selected || !canAct) return new Set<string>();
    const withoutSelf = new Set(occupied);
    withoutSelf.delete(key(selected.position));
    return new Set(reachableCells(selected.position, selected.moveRange, boardKeys, withoutSelf).map(key));
  }, [selected, canAct, occupied, boardKeys]);
  const attackTargets = useMemo(() => {
    if (!selected || !canAct) return new Set<string>();
    const targets = new Set<string>();
    for (const unit of units) {
      if (unit.hp <= 0 || unit.side === selected.side) continue;
      if (hexDistance(selected.position, unit.position) > selected.attackRange) continue;
      if (unit.invisible && hexDistance(selected.position, unit.position) > 1) continue;
      targets.add(key(unit.position));
    }
    return targets;
  }, [selected, canAct, units]);

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

  const alivePlayerUnits = units.filter((unit) => unit.side === "player" && unit.hp > 0);

  const markActed = (unitId: string, nextActed: Set<string>) => {
    if (alivePlayerUnits.every((unit) => unit.id === unitId || nextActed.has(unit.id))) {
      // todo mundo já agiu — encerra o turno automaticamente
      window.setTimeout(() => endTurn(), 350);
    }
    setActedIds(nextActed);
  };

  const moveSelectedTo = (cell: Axial) => {
    if (!selected || !canAct || !moveTargets.has(key(cell))) return;
    const delta = { q: Math.sign(cell.q - selected.position.q), r: Math.sign(cell.r - selected.position.r) };
    const facingIndex = directionIndexFromDelta(delta);
    setUnits((previous) => previous.map((unit) => (unit.id === selected.id ? { ...unit, position: cell, facing: facingIndex >= 0 ? facingIndex : unit.facing } : unit)));
    setMessage(`${selected.name} se move.`);
    setSelectedId(null);
    markActed(selected.id, new Set(actedIds).add(selected.id));
  };

  const attackTarget = (defender: HexUnit) => {
    if (!selected || !canAct || !attackTargets.has(key(defender.position))) return;
    const backstab = isBackstab(selected.position, defender.position, defender.facing);
    const dealt = rollDamage(backstab);
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
    setSelectedId(null);
    markActed(selected.id, new Set(actedIds).add(selected.id));
  };

  const toggleInvisible = () => {
    if (!selected || !canAct) return;
    const goingInvisible = !selected.invisible;
    setUnits((previous) => previous.map((unit) => (unit.id === selected.id ? { ...unit, invisible: goingInvisible } : unit)));
    setMessage(goingInvisible ? `${selected.name} fica invisível — só pode ser atacada de perto.` : `${selected.name} sai da invisibilidade.`);
    setSelectedId(null);
    markActed(selected.id, new Set(actedIds).add(selected.id));
  };

  const endTurn = () => {
    setUnits((currentUnits) => {
      const result = resolveEnemyTurn(currentUnits, boardKeys);
      setMessage(`Turno dos inimigos: ${result.messages.join(" ")}`);
      return result.units;
    });
    setActedIds(new Set());
    setSelectedId(null);
    setRound((value) => value + 1);
  };

  return (
    <section className="hexlab">
      <p className="hexlab-note">Protótipo experimental — não afeta sua conta, seu personagem nem seu progresso. Inimigos agem sozinhos ao fim do seu turno.</p>
      <div className="hexlab-turnbar">
        <span>Rodada {round}</span>
        <button type="button" onClick={() => endTurn()}>Encerrar Turno</button>
      </div>
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
          const acted = unit.side === "player" && actedIds.has(unit.id);
          return (
            <button
              key={unit.id}
              type="button"
              className={`hexlab-unit ${unit.side} ${unit.id === selectedId ? "selected" : ""} ${unit.invisible ? "hexlab-stealth" : ""} ${acted ? "acted" : ""}`}
              style={{ left, top }}
              onClick={() => {
                if (selected && canAct && attackTargets.has(key(unit.position)) && unit.id !== selected.id) attackTarget(unit);
                else setSelectedId(unit.id === selectedId ? null : unit.id);
              }}
              aria-label={`${unit.name} · HP ${unit.hp}/${unit.hpMax}${unit.invisible ? " · invisível" : ""}`}
            >
              <i className="hexlab-facing" style={{ transform: `translate(-50%,-50%) rotate(${angle}deg)` }} aria-hidden="true" />
              {unit.invisible && <span className="hexlab-invisible-badge" aria-hidden="true">👁</span>}
              <span className="hexlab-glyph" aria-hidden="true">{unit.glyph}</span>
              <b className="hexlab-hp"><em style={{ width: `${Math.max(0, (unit.hp / unit.hpMax) * 100)}%` }} /></b>
              <small>{unit.name}</small>
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="hexlab-actions">
          <strong>{selected.name} {selected.side === "enemy" && <em className="hexlab-enemy-tag">Inimigo · IA</em>}</strong>
          <span>HP {selected.hp}/{selected.hpMax} · Movimento {selected.moveRange} · Alcance {selected.attackRange}</span>
          {selected.side === "player" && (
            canAct ? (
              <button type="button" onClick={toggleInvisible} className={selected.invisible ? "active" : ""}>
                {selected.invisible ? "Sair da invisibilidade" : "Ficar Invisível"}
              </button>
            ) : (
              <span className="hexlab-acted-note">Já agiu nesta rodada.</span>
            )
          )}
        </div>
      )}
    </section>
  );
}
