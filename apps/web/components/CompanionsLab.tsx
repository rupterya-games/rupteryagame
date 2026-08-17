"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PALADIN_ALDREN,
  SAMURAI_KAEL,
  ARCHER_ELYRA,
  createTestMonsters,
  buildCompanionCombatantStats,
  buildCompanionSkillLoadout,
  calculateLoyaltyBonus,
  createBattlefield,
  createBattleV1,
  declareAction,
  moveActor,
  passTurn,
  pickLabAction,
  boardCells,
  reachableCells,
  hexDistance,
  hexKey,
  type BattleStateV1,
  type RosterSeed,
  type CombatantStateV1,
  type CompanionDefinitionV1,
  type CompanionProgress,
} from "@rupterya/game-core";

/**
 * Laboratório de Companions: sandbox isolado do motor de combate V1 (Keywords,
 * tipos de dano, carregamento/Ultimate por carga, invocação, Último Suspiro,
 * Maestria e Lealdade). Não toca em HuntBattleState, conta ou personagem real —
 * mesma filosofia do Laboratório Hex: provar a mecânica antes de decidir se ela
 * entra de verdade no jogo (ver docs/ROADMAP_RUPTERYA.md, Fase 7).
 */

type CompanionKey = "aldren" | "kael" | "elyra";
const COMPANIONS: Record<CompanionKey, CompanionDefinitionV1> = { aldren: PALADIN_ALDREN, kael: SAMURAI_KAEL, elyra: ARCHER_ELYRA };
const GLYPHS: Record<CompanionKey, string> = { aldren: "🛡️", kael: "⚔️", elyra: "🏹" };
const DEFAULT_MASTER_SKILL: Record<CompanionKey, string> = { aldren: "judgment", kael: "crimson_slash", elyra: "triple_shot" };

interface EncounterPreset {
  id: string;
  label: string;
  description: string;
  monsterIds: string[];
}

const ENCOUNTER_PRESETS: EncounterPreset[] = [
  { id: "goblins", label: "Bando de Goblins", description: "3 Goblins — ativa o Traço Sangria (+20% chance de Sangramento).", monsterIds: ["goblin_cutter_1", "goblin_harpooner_1", "goblin_chief_1"] },
  { id: "witch_guardian", label: "Bruxa & Guardião", description: "Fogo em área com fogo amigo e Bloqueio pesado — testa Fraqueza/Resistência.", monsterIds: ["barrel_witch_1", "stone_guardian_1"] },
  { id: "necromancer", label: "Necromante & Esqueleto", description: "Invocação real de reforços e Último Suspiro — pode ativar o Traço Legião Óssea.", monsterIds: ["ossuary_necromancer_1", "explosive_skeleton_1"] },
];

function glyphForEnemy(id: string): string {
  if (id.startsWith("goblin_cutter")) return "🗡️";
  if (id.startsWith("goblin_harpooner")) return "🎣";
  if (id.startsWith("goblin_chief")) return "👹";
  if (id.startsWith("barrel_witch")) return "🧙";
  if (id.startsWith("stone_guardian")) return "🗿";
  if (id.startsWith("ossuary_necromancer")) return "💀";
  if (id.startsWith("explosive_skeleton") || id.startsWith("skeleton_minion")) return "☠️";
  return "👾";
}

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  return (
    <div className="companions-lab-hpbar">
      <div style={{ width: `${pct}%` }} />
      <span>{current}/{max}</span>
    </div>
  );
}

export function CompanionsLab() {
  const [masteryByCompanion, setMasteryByCompanion] = useState<Record<CompanionKey, number>>({ aldren: 1, kael: 1, elyra: 1 });
  const [loyaltyByCompanion, setLoyaltyByCompanion] = useState<Record<CompanionKey, number>>({ aldren: 1, kael: 1, elyra: 1 });
  const [presetId, setPresetId] = useState(ENCOUNTER_PRESETS[0].id);
  const [battle, setBattle] = useState<BattleStateV1 | null>(null);
  const [preparedSkillId, setPreparedSkillId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const battlefield = useMemo(() => createBattlefield("fiordevalle", 1), []);

  useEffect(() => () => { if (aiTimer.current) clearTimeout(aiTimer.current); }, []);

  function startBattle() {
    const preset = ENCOUNTER_PRESETS.find((p) => p.id === presetId) ?? ENCOUNTER_PRESETS[0];
    const partySeeds: RosterSeed[] = (Object.keys(COMPANIONS) as CompanionKey[]).map((key, index) => {
      const companion = COMPANIONS[key];
      const progress: CompanionProgress = {
        companionId: companion.id,
        masteryLevel: masteryByCompanion[key],
        loyaltyLevel: loyaltyByCompanion[key],
        loyaltyAllocation: companion.naturalKeywords.dodgeChance !== undefined ? { dodgeChance: calculateLoyaltyBonus(loyaltyByCompanion[key]) }
          : companion.naturalKeywords.counterAttackChance !== undefined ? { counterAttackChance: calculateLoyaltyBonus(loyaltyByCompanion[key]) }
          : { blockChance: calculateLoyaltyBonus(loyaltyByCompanion[key]) },
        masterSkillId: DEFAULT_MASTER_SKILL[key],
      };
      const stats = buildCompanionCombatantStats(companion, 50, progress);
      const { skills, ultimate } = buildCompanionSkillLoadout(companion, progress);
      const combatant: CombatantStateV1 = {
        id: `party_${key}`,
        name: companion.name,
        team: "player",
        hpCurrent: stats.hpMax,
        hpMax: stats.hpMax,
        power: stats.power,
        physicalDefense: stats.physicalDefense,
        magicalDefense: stats.magicalDefense,
        speed: stats.speed,
        movement: 3,
        position: { q: -2 + index, r: 2 },
        keywords: stats.keywords,
        tags: [companion.className.toLowerCase(), companion.family, ...(companion.deathReactionSkill ? ["last_breath"] : [])],
        activeEffects: [],
      };
      return { combatant, skills, ultimate, deathReactionSkill: companion.deathReactionSkill };
    });

    const monsterTemplates = createTestMonsters();
    const enemySeeds: RosterSeed[] = preset.monsterIds.map((id) => {
      const monster = monsterTemplates.find((m) => m.id === id)!;
      return { combatant: monster, skills: monster.skills ?? [], ultimate: monster.ultimate, deathReactionSkill: monster.deathReactionSkill };
    });

    setBattle(createBattleV1([...partySeeds, ...enemySeeds], battlefield));
    setPreparedSkillId(null);
    setSelectedTargetId(null);
  }

  const activeId = battle ? battle.initiativeQueue[battle.activeIndex] ?? null : null;
  const activeCombatant = activeId && battle ? battle.combatants.get(activeId) ?? null : null;
  const activeIsPlayerControlled = activeCombatant?.team === "player";

  // IA automática do inimigo. O jogador controla os 3 Companions manualmente, um por vez.
  useEffect(() => {
    if (!battle || battle.isOver || !activeId || activeIsPlayerControlled) return;
    aiTimer.current = setTimeout(() => {
      setBattle((current) => {
        if (!current || current.isOver) return current;
        const currentActiveId = current.initiativeQueue[current.activeIndex];
        if (currentActiveId !== activeId) return current;
        const action = pickLabAction(current, activeId);
        if (!action) return passTurn(current, activeId);
        return declareAction(current, activeId, action.skillId, action.targetCell);
      });
    }, 650);
    return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
  }, [battle, activeId, activeIsPlayerControlled]);

  function handleSkillClick(skillId: string) {
    setPreparedSkillId((current) => (current === skillId ? null : skillId));
  }

  function handleTargetClick(targetId: string) {
    setSelectedTargetId(targetId);
    if (!battle || !activeId || !preparedSkillId) return;
    const target = battle.combatants.get(targetId);
    if (!target?.position) return;
    setBattle(declareAction(battle, activeId, preparedSkillId, target.position));
    setPreparedSkillId(null);
    setSelectedTargetId(null);
  }

  function handleSelfCast() {
    if (!battle || !activeId || !activeCombatant?.position || !preparedSkillId) return;
    setBattle(declareAction(battle, activeId, preparedSkillId, activeCombatant.position));
    setPreparedSkillId(null);
  }

  function handleSummon() {
    if (!battle || !activeId || !activeCombatant?.position || !preparedSkillId) return;
    const skill = [...(battle.roster.get(activeId)?.skills ?? [])].find((s) => s.id === preparedSkillId);
    if (!skill?.summon) return;
    const occupied = new Set([...battle.combatants.values()].filter((c) => c.hpCurrent > 0 && c.position).map((c) => hexKey(c.position!)));
    const freeCell = boardCells().find((cell) => hexDistance(activeCombatant.position!, cell) <= (skill.range ?? 1) && !occupied.has(hexKey(cell)));
    if (!freeCell) return;
    setBattle(declareAction(battle, activeId, preparedSkillId, freeCell));
    setPreparedSkillId(null);
  }

  function handleWait() {
    if (!battle || !activeId) return;
    setBattle(passTurn(battle, activeId));
    setPreparedSkillId(null);
  }

  function handleApproach(targetId: string) {
    if (!battle || !activeId || !activeCombatant?.position) return;
    const target = battle.combatants.get(targetId);
    if (!target?.position) return;
    const occupied = new Set([...battle.combatants.values()].filter((c) => c.id !== activeId && c.hpCurrent > 0 && c.position).map((c) => hexKey(c.position!)));
    const options = reachableCells(activeCombatant.position, battle.movementRemaining, boardCells(), occupied, battle.battlefield);
    if (!options.length) return;
    const best = options.reduce((closest, cell) => (hexDistance(cell, target.position!) < hexDistance(closest, target.position!) ? cell : closest), options[0]);
    setBattle(moveActor(battle, activeId, best));
  }

  if (!battle) {
    return (
      <div className="companions-lab">
        <p className="companions-lab-intro">
          Testa o motor V1 isolado: Keywords (Esquiva/Bloqueio/Contra-golpe/Vampirismo/Sangramento),
          tipos de dano com Fraqueza/Resistência, carregamento e Ultimate por carga, invocação real
          e Último Suspiro. Não afeta a Caça de verdade.
        </p>
        <div className="companions-lab-setup">
          {(Object.keys(COMPANIONS) as CompanionKey[]).map((key) => (
            <div key={key} className="companions-lab-setup-card">
              <span className="companions-lab-glyph">{GLYPHS[key]}</span>
              <strong>{COMPANIONS[key].name}</strong>
              <span className="companions-lab-class">{COMPANIONS[key].className}</span>
              <label>
                Maestria: {masteryByCompanion[key]}
                <input type="range" min={1} max={50} value={masteryByCompanion[key]} onChange={(event) => setMasteryByCompanion((state) => ({ ...state, [key]: Number(event.target.value) }))} />
              </label>
              <label>
                Lealdade: {loyaltyByCompanion[key]} (+{calculateLoyaltyBonus(loyaltyByCompanion[key])}pp)
                <input type="range" min={1} max={30} value={loyaltyByCompanion[key]} onChange={(event) => setLoyaltyByCompanion((state) => ({ ...state, [key]: Number(event.target.value) }))} />
              </label>
            </div>
          ))}
        </div>
        <div className="companions-lab-presets">
          {ENCOUNTER_PRESETS.map((preset) => (
            <button key={preset.id} type="button" className={presetId === preset.id ? "active" : ""} onClick={() => setPresetId(preset.id)}>
              <strong>{preset.label}</strong>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>
        <button type="button" className="primary companions-lab-start" onClick={startBattle}>Iniciar combate de teste</button>
      </div>
    );
  }

  const party = [...battle.combatants.values()].filter((c) => c.team === "player");
  const enemies = [...battle.combatants.values()].filter((c) => c.team === "enemy");
  const activeRoster = activeId ? battle.roster.get(activeId) : undefined;
  const activeClock = activeId ? battle.clocks.get(activeId) : undefined;
  const preparedSkill = activeRoster ? [...activeRoster.skills, ...(activeRoster.ultimate ? [activeRoster.ultimate] : [])].find((s) => s.id === preparedSkillId) : undefined;

  return (
    <div className="companions-lab">
      <div className="companions-lab-header">
        <span>Turno {battle.turn}</span>
        <span className="companions-lab-order">
          Ordem: {battle.initiativeQueue.filter((id) => (battle.combatants.get(id)?.hpCurrent ?? 0) > 0).map((id) => battle.combatants.get(id)?.name).join(" → ")}
        </span>
      </div>

      <div className="companions-lab-side companions-lab-enemies">
        {enemies.map((enemy) => (
          <button
            key={enemy.id}
            type="button"
            disabled={enemy.hpCurrent <= 0}
            className={`companions-lab-card ${enemy.hpCurrent <= 0 ? "dead" : ""} ${enemy.id === activeId ? "active-turn" : ""} ${enemy.id === selectedTargetId ? "selected" : ""}`}
            onClick={() => handleTargetClick(enemy.id)}
          >
            <span className="companions-lab-glyph">{glyphForEnemy(enemy.id)}</span>
            <strong>{enemy.name}</strong>
            <HpBar current={enemy.hpCurrent} max={enemy.hpMax} />
            {enemy.charging && <span className="companions-lab-charging">⚡ carregando…</span>}
          </button>
        ))}
      </div>

      <div className="companions-lab-side companions-lab-party">
        {party.map((member) => (
          <div key={member.id} className={`companions-lab-card ${member.hpCurrent <= 0 ? "dead" : ""} ${member.id === activeId ? "active-turn" : ""}`}>
            <span className="companions-lab-glyph">{GLYPHS[member.id.replace("party_", "") as CompanionKey]}</span>
            <strong>{member.name}</strong>
            <HpBar current={member.hpCurrent} max={member.hpMax} />
            {member.activeEffects.length > 0 && <span className="companions-lab-effects">{member.activeEffects.map((e) => e.kind).join(", ")}</span>}
            {member.charging && <span className="companions-lab-charging">⚡ carregando…</span>}
          </div>
        ))}
      </div>

      {activeIsPlayerControlled && activeId && activeCombatant && !battle.isOver && (
        <div className="companions-lab-actions">
          <p>Ação de {activeCombatant.name} · movimento restante: {battle.movementRemaining}</p>
          <div className="companions-lab-skill-grid">
            {(activeRoster?.skills ?? []).map((skill) => {
              const cd = activeClock?.cooldowns[skill.id] ?? 0;
              return (
                <button key={skill.id} type="button" disabled={cd > 0} className={preparedSkillId === skill.id ? "active" : ""} onClick={() => handleSkillClick(skill.id)}>
                  {skill.name}{skill.isMasterSkill ? " ★" : ""} {cd > 0 ? `(CD ${cd})` : ""}
                </button>
              );
            })}
            {activeRoster?.ultimate && (
              <button
                type="button"
                disabled={!activeClock?.isUltimateReady}
                className={`companions-lab-ultimate ${preparedSkillId === activeRoster.ultimate.id ? "active" : ""}`}
                onClick={() => handleSkillClick(activeRoster.ultimate!.id)}
              >
                ★ {activeRoster.ultimate.name} {activeClock?.isUltimateReady ? "" : `(${activeClock?.ultimateCurrentCharge ?? 0}/${activeClock?.ultimateRequiredCharge ?? 0})`}
              </button>
            )}
          </div>

          {preparedSkill?.summon && <button type="button" onClick={handleSummon}>Invocar {preparedSkill.summon.label}</button>}
          {preparedSkill && !preparedSkill.summon && (preparedSkill.range ?? 1) === 0 && <button type="button" onClick={handleSelfCast}>Usar em si mesmo</button>}

          <div className="companions-lab-move-row">
            <button type="button" onClick={handleWait}>Aguardar</button>
            {enemies.filter((e) => e.hpCurrent > 0).map((e) => (
              <button key={e.id} type="button" onClick={() => handleApproach(e.id)} disabled={battle.movementRemaining <= 0}>Aproximar de {e.name}</button>
            ))}
          </div>
          <p className="companions-lab-hint">
            {preparedSkill?.summon ? "Invoca na célula livre mais próxima dentro do alcance."
              : preparedSkill && (preparedSkill.range ?? 1) === 0 ? "Habilidade de auto-buff — confirme em si mesmo."
              : "Escolha uma habilidade e toque num inimigo pra usar nele."}
          </p>
        </div>
      )}

      {battle.isOver && (
        <div className="companions-lab-outcome">
          <strong>{battle.outcome === "victory" ? "Vitória do laboratório!" : "Derrota no laboratório."}</strong>
          <button type="button" onClick={() => setBattle(null)}>Novo combate</button>
        </div>
      )}

      <details className="companions-lab-log" open>
        <summary>Registro de combate</summary>
        {battle.logs.slice(-40).map((log, index) => (
          <p key={index} className={`companions-lab-log-${log.tone}`}>{log.text}</p>
        ))}
      </details>

      {!battle.isOver && <button type="button" className="companions-lab-reset" onClick={() => setBattle(null)}>Cancelar e reconfigurar</button>}
    </div>
  );
}
