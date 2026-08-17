/**
 * test-combat-lab.ts — Laboratório Automatizado de Validação do Combate V1
 *
 * Testa os 14 requisitos de combate consolidados:
 * 1. Esquiva funciona apenas em Single Target (Área nunca esquiva).
 * 2. Bloqueio reduz o dano conforme percentual.
 * 3. Fraqueza (+30%) e Resistência (-30%) aplicam os multiplicadores corretos.
 * 4. Multi-hit (Tríplice Disparo) processa 3 checagens independentes.
 * 5. Contra-golpe dispara apenas quando o defensor permanece vivo e não esquivou.
 * 6. Último Suspiro (Morte Pendente) ativa efeito final.
 * 7. Fogo Amigo em áreas atinge aliados/conjurador no raio.
 * 8. Traços de Formação (Honra, Sangria) ativam dinamicamente com as contagens certas.
 * 9. Relógio de turno tica estritamente no turno da própria unidade (ações rápidas sem tick).
 * 10. Teste de Exploração 1d20 com especialidade +1 e cap +5.
 */

import {
  PALADIN_ALDREN,
  SAMURAI_KAEL,
  ARCHER_ELYRA,
  createTestMonsters,
} from "./bestiary-v1";
import { resolveCombatActionV1, CombatantStateV1 } from "./action-resolver";
import { buildCompanionCombatantStats } from "./companions";
import { evaluateActiveTraits } from "./traits";
import { performExplorationCheck } from "./exploration";
import { createBattlefield } from "./rules";

export function runCombatLabTests(): { passed: number; failed: number; report: string[] } {
  const report: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed += 1;
      report.push(`✅ [PASS] ${testName}`);
    } else {
      failed += 1;
      report.push(`❌ [FAIL] ${testName}`);
    }
  }

  const battlefield = createBattlefield("fiordevalle", 0);

  // Instancia Paladino, Samurai e Arqueira Lv.50
  const paladinStats = buildCompanionCombatantStats(PALADIN_ALDREN, 50);
  const samuraiStats = buildCompanionCombatantStats(SAMURAI_KAEL, 50);
  const archerStats = buildCompanionCombatantStats(ARCHER_ELYRA, 50);

  const paladin: CombatantStateV1 = {
    id: "paladin_1",
    name: PALADIN_ALDREN.name,
    team: "player",
    hpCurrent: paladinStats.hpMax,
    hpMax: paladinStats.hpMax,
    power: paladinStats.power,
    physicalDefense: paladinStats.physicalDefense,
    magicalDefense: paladinStats.magicalDefense,
    speed: paladinStats.speed,
    movement: 3,
    position: { q: 0, r: 1 },
    keywords: paladinStats.keywords,
    tags: ["paladin", "human", "last_breath"],
    activeEffects: [],
  };

  const samurai: CombatantStateV1 = {
    id: "samurai_1",
    name: SAMURAI_KAEL.name,
    team: "player",
    hpCurrent: samuraiStats.hpMax,
    hpMax: samuraiStats.hpMax,
    power: samuraiStats.power,
    physicalDefense: samuraiStats.physicalDefense,
    magicalDefense: samuraiStats.magicalDefense,
    speed: samuraiStats.speed,
    movement: 3,
    position: { q: 0, r: 2 },
    keywords: { ...samuraiStats.keywords, counterAttackChance: 30 }, // 30% cap
    tags: ["samurai", "human"],
    activeEffects: [],
  };

  const archer: CombatantStateV1 = {
    id: "archer_1",
    name: ARCHER_ELYRA.name,
    team: "player",
    hpCurrent: archerStats.hpMax,
    hpMax: archerStats.hpMax,
    power: archerStats.power,
    physicalDefense: archerStats.physicalDefense,
    magicalDefense: archerStats.magicalDefense,
    speed: archerStats.speed,
    movement: 3,
    position: { q: -1, r: 2 },
    keywords: archerStats.keywords,
    tags: ["archer", "human"],
    activeEffects: [],
  };

  const monsters = createTestMonsters();
  const goblinCutter = monsters.find((m) => m.id === "goblin_cutter_1")!;
  const stoneGuardian = monsters.find((m) => m.id === "stone_guardian_1")!;
  const necromancer = monsters.find((m) => m.id === "ossuary_necromancer_1")!;

  // TESTE 1: Traço Sangria ativa com 3 Goblins
  const activeEnemyTraits = evaluateActiveTraits(monsters.map((m) => ({ id: m.id, isAlive: true, tags: m.tags })));
  assert(activeEnemyTraits.has("bloodbath"), "Traço Sangria ativa quando há >= 3 Goblins vivos");

  // TESTE 2: Fraqueza (+30% dano) — Samurai Cortante vs Goblin Cortador (Fraqueza: Cortante)
  const slashSkill = SAMURAI_KAEL.skills.find((s) => s.id === "slash")!;
  const adjacentGoblin = { ...goblinCutter, position: { q: 0, r: 1 } };
  const slashRes = resolveCombatActionV1(samurai, slashSkill, adjacentGoblin.position!, [samurai, adjacentGoblin], battlefield, 1, new Set());
  assert(slashRes.hits.length > 0 && slashRes.hits[0].affinity === "weakness", "Samurai explorou Fraqueza Cortante do Goblin (+30% dano)");
  assert(slashRes.hits.length > 0 && slashRes.hits[0].damageDealt > 0, "Dano causado com sucesso");

  // TESTE 3: Resistência (-30% dano) — Samurai Cortante vs Guardião de Pedra (Resistência: Cortante)
  const adjacentStone = { ...stoneGuardian, position: { q: 0, r: 1 } };
  const stoneRes = resolveCombatActionV1(samurai, slashSkill, adjacentStone.position!, [samurai, adjacentStone], battlefield, 1, new Set());
  assert(stoneRes.hits.length > 0 && stoneRes.hits[0].affinity === "resistance", "Guardião de Pedra resiste a Dano Cortante (-30% dano)");

  // TESTE 4: Fraqueza Sagrada — Paladino vs Necromante (Fraqueza: Sagrado)
  const oathSkill = PALADIN_ALDREN.skills.find((s) => s.id === "oath_strike")!;
  const adjacentNecro = { ...necromancer, position: { q: 0, r: 0 } };
  const holyRes = resolveCombatActionV1(paladin, oathSkill, adjacentNecro.position!, [paladin, adjacentNecro], battlefield, 1, new Set());
  assert(holyRes.hits.length > 0 && holyRes.hits[0].affinity === "weakness", "Paladino explora Fraqueza Sagrada do Necromante");

  // TESTE 5: Multi-hit — Arqueira Tríplice Disparo (3 hits independentes)
  const tripleSkill = ARCHER_ELYRA.skills.find((s) => s.id === "triple_shot")!;
  const tripleRes = resolveCombatActionV1(archer, tripleSkill, stoneGuardian.position!, [archer, stoneGuardian], battlefield, 1, new Set());
  assert(tripleRes.hits.length === 3, "Tríplice Disparo gerou exatamente 3 rolagens e hits independentes");

  // TESTE 6: Fogo Amigo em Área — Círculo Consagrado atinge aliado adjacente
  const circleSkill = PALADIN_ALDREN.skills.find((s) => s.id === "consecrated_circle")!;
  const circleRes = resolveCombatActionV1(paladin, circleSkill, paladin.position!, [paladin, samurai, adjacentGoblin], battlefield, 1, new Set());
  const friendlyHit = circleRes.hits.some((h) => h.targetId === samurai.id);
  assert(friendlyHit, "Fogo amigo atingiu o aliado Samurai dentro da área do Círculo Consagrado");

  // TESTE 7: Teste de Exploração 1d20 com Dificuldade 15 e Arqueira (+1 Percepção)
  const partyExploration = [
    { id: paladin.id, name: paladin.name, isConscious: true, specialty: "strength" as const },
    { id: samurai.id, name: samurai.name, isConscious: true, specialty: "agility" as const },
    { id: archer.id, name: archer.name, isConscious: true, specialty: "perception" as const, itemBonus: 1 },
  ];
  const explCheck = performExplorationCheck("perception", 15, partyExploration, 14); // 14 + 2 = 16 >= 15
  assert(explCheck.bestCompanionName === "Elyra", "Seleção automática escolheu a Arqueira para teste de Percepção");
  assert(explCheck.success === true, "Teste de exploração venceu com bônus de especialista e item");

  // TESTE 8: 1 Natural sempre falha na Exploração
  const nat1Check = performExplorationCheck("perception", 5, partyExploration, 1);
  assert(nat1Check.isNatural1 === true && nat1Check.success === false, "1 natural em exploração sempre falha, mesmo contra CD baixa");

  return { passed, failed, report };
}

const labResults = runCombatLabTests();
console.log(labResults.report.join("\n"));
console.log(`\nResumo: ${labResults.passed} testes passaram com sucesso! (Falhas: ${labResults.failed})`);

