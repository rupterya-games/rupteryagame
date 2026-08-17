/**
 * test-combat-lab.ts — Laboratório Automatizado de Validação do Combate V1
 *
 * Determinístico: todo teste que depende de rolagem injeta `rng` explicitamente
 * (ALWAYS_ROLL_RNG / NEVER_ROLL_RNG / createSequenceRng), então o resultado nunca
 * depende de Math.random. Roda via `npm run test -w @rupterya/game-core`.
 *
 * Cobertura:
 *  1-2.  Traço Sangria ativa/desativa com a contagem de Goblins
 *  3-6.  Fraqueza/Resistência, Multi-hit, Fogo Amigo (ligado/desligado)
 *  7-8.  Exploração 1d20
 *  9-10. Esquiva e Bloqueio determinísticos
 *  11-12. Contra-golpe dispara ao sobreviver / NÃO dispara ao morrer no mesmo golpe
 *  13.   Sangramento garantido ignora rolagem e cap
 *  14.   Vampirismo de Contra-golpe é específico (não vaza pra ataques normais)
 *  15.   Interrupção só ocorre se ACERTAR (Esquiva evita)
 *  16.   Carregamento sempre resolve na MESMA habilidade/alvo declarados originalmente
 *  17.   Cap universal de 30% é respeitado mesmo com valor bruto acima do teto
 *  18-19. Invocação real: ativa Traço Legião Óssea, valida alcance/ocupação
 *  20.   Último Suspiro real executa a habilidade de reação contra quem matou
 *  21.   Recarga bloqueia reuso imediato e libera após tick
 *  22.   Ultimate exige carga completa e reseta após o uso
 *  23.   Interromper carregamento envia a habilidade pra recarga cheia
 *  24.   Lealdade: pontos só afetam a Keyword alocada; orçamento nunca é ultrapassado
 *  25.   Escala de nível: bestiário é o teto de Lv.50, não multiplicado de novo
 *  26.   Maestria: marcos cumulativos + bônus extra da habilidade ★ Mestre
 */

import {
  PALADIN_ALDREN,
  SAMURAI_KAEL,
  ARCHER_ELYRA,
  createTestMonsters,
} from "./bestiary-v1";
import { resolveCombatActionV1, CombatantStateV1, SkillDefinitionV1 } from "./action-resolver";
import {
  buildCompanionCombatantStats,
  buildCompanionSkillLoadout,
  calculateLoyaltyBonus,
  clampLoyaltyAllocation,
  applyMasteryToSkills,
  levelScalingFactor,
  masteryMilestonesReached,
  MASTERY_MILESTONE_POWER_BONUS,
  MASTERY_MASTER_POWER_BONUS,
  MASTERY_MASTER_COOLDOWN_REDUCTION,
} from "./companions";
import { evaluateActiveTraits } from "./traits";
import { performExplorationCheck } from "./exploration";
import { createBattlefield } from "./rules";
import { createBattleV1, declareAction, passTurn, BattleStateV1, RosterSeed } from "./battle-orchestrator";
import { ALWAYS_ROLL_RNG, NEVER_ROLL_RNG, createSequenceRng } from "./rng";

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

  const paladinStats = buildCompanionCombatantStats(PALADIN_ALDREN, 50);
  const samuraiStats = buildCompanionCombatantStats(SAMURAI_KAEL, 50);
  const archerStats = buildCompanionCombatantStats(ARCHER_ELYRA, 50);

  const paladin: CombatantStateV1 = {
    id: "paladin_1", name: PALADIN_ALDREN.name, team: "player",
    hpCurrent: paladinStats.hpMax, hpMax: paladinStats.hpMax, power: paladinStats.power,
    physicalDefense: paladinStats.physicalDefense, magicalDefense: paladinStats.magicalDefense,
    speed: paladinStats.speed, movement: 3, position: { q: 0, r: 1 },
    keywords: paladinStats.keywords, tags: ["paladin", "human", "last_breath"], activeEffects: [],
  };

  const samurai: CombatantStateV1 = {
    id: "samurai_1", name: SAMURAI_KAEL.name, team: "player",
    hpCurrent: samuraiStats.hpMax, hpMax: samuraiStats.hpMax, power: samuraiStats.power,
    physicalDefense: samuraiStats.physicalDefense, magicalDefense: samuraiStats.magicalDefense,
    speed: samuraiStats.speed, movement: 3, position: { q: 0, r: 2 },
    keywords: { ...samuraiStats.keywords, counterAttackChance: 30 }, tags: ["samurai", "human"], activeEffects: [],
  };

  const archer: CombatantStateV1 = {
    id: "archer_1", name: ARCHER_ELYRA.name, team: "player",
    hpCurrent: archerStats.hpMax, hpMax: archerStats.hpMax, power: archerStats.power,
    physicalDefense: archerStats.physicalDefense, magicalDefense: archerStats.magicalDefense,
    speed: archerStats.speed, movement: 3, position: { q: -1, r: 2 },
    keywords: archerStats.keywords, tags: ["archer", "human"], activeEffects: [],
  };

  const monsters = createTestMonsters();
  const goblinCutter = monsters.find((m) => m.id === "goblin_cutter_1")!;
  const goblinHarpooner = monsters.find((m) => m.id === "goblin_harpooner_1")!;
  const goblinChief = monsters.find((m) => m.id === "goblin_chief_1")!;
  const stoneGuardian = monsters.find((m) => m.id === "stone_guardian_1")!;
  const necromancer = monsters.find((m) => m.id === "ossuary_necromancer_1")!;
  const skeleton = monsters.find((m) => m.id === "explosive_skeleton_1")!;

  // ==========================================
  // 1-2. TRAÇOS DE FORMAÇÃO (ativação/desativação dinâmica)
  // ==========================================
  const threeGoblins = [goblinCutter, goblinHarpooner, goblinChief].map((m) => ({ id: m.id, isAlive: true, tags: m.tags }));
  assert(evaluateActiveTraits(threeGoblins).has("bloodbath"), "1. Traço Sangria ativa quando há >= 3 Goblins vivos");

  const twoGoblinsOneDead = [
    { id: goblinCutter.id, isAlive: true, tags: goblinCutter.tags },
    { id: goblinHarpooner.id, isAlive: true, tags: goblinHarpooner.tags },
    { id: goblinChief.id, isAlive: false, tags: goblinChief.tags },
  ];
  assert(!evaluateActiveTraits(twoGoblinsOneDead).has("bloodbath"), "2. Traço Sangria desativa quando a contagem cai abaixo de 3");

  // ==========================================
  // 3-6. FRAQUEZA / RESISTÊNCIA / MULTI-HIT / FOGO AMIGO
  // ==========================================
  const slashSkill = SAMURAI_KAEL.skills.find((s) => s.id === "slash")!;
  const adjacentGoblin = { ...goblinCutter, position: { q: 0, r: 1 } };
  const slashRes = resolveCombatActionV1(samurai, slashSkill, adjacentGoblin.position!, [samurai, adjacentGoblin], battlefield, 1, new Set(), NEVER_ROLL_RNG);
  assert(slashRes.hits.length > 0 && slashRes.hits[0].affinity === "weakness", "3. Samurai explorou Fraqueza Cortante do Goblin (+30% dano)");
  assert(slashRes.hits.length > 0 && slashRes.hits[0].damageDealt > 0, "3b. Dano causado com sucesso");

  const adjacentStone = { ...stoneGuardian, position: { q: 0, r: 1 } };
  const stoneRes = resolveCombatActionV1(samurai, slashSkill, adjacentStone.position!, [samurai, adjacentStone], battlefield, 1, new Set(), NEVER_ROLL_RNG);
  assert(stoneRes.hits.length > 0 && stoneRes.hits[0].affinity === "resistance", "4. Guardião de Pedra resiste a Dano Cortante (-30% dano)");

  const oathSkill = PALADIN_ALDREN.skills.find((s) => s.id === "oath_strike")!;
  const adjacentNecro = { ...necromancer, position: { q: 0, r: 0 } };
  const holyRes = resolveCombatActionV1(paladin, oathSkill, adjacentNecro.position!, [paladin, adjacentNecro], battlefield, 1, new Set(), NEVER_ROLL_RNG);
  assert(holyRes.hits.length > 0 && holyRes.hits[0].affinity === "weakness", "5. Paladino explora Fraqueza Sagrada do Necromante");

  const tripleSkill = ARCHER_ELYRA.skills.find((s) => s.id === "triple_shot")!;
  const tripleRes = resolveCombatActionV1(archer, tripleSkill, stoneGuardian.position!, [archer, stoneGuardian], battlefield, 1, new Set(), NEVER_ROLL_RNG);
  assert(tripleRes.hits.length === 3, "6. Tríplice Disparo gerou exatamente 3 rolagens e hits independentes");

  const circleSkill = PALADIN_ALDREN.skills.find((s) => s.id === "consecrated_circle")!;
  const circleRes = resolveCombatActionV1(paladin, circleSkill, paladin.position!, [paladin, samurai, adjacentGoblin], battlefield, 1, new Set(), NEVER_ROLL_RNG);
  assert(circleRes.hits.some((h) => h.targetId === samurai.id), "6b. Fogo amigo atingiu o aliado Samurai dentro da área do Círculo Consagrado");

  const circleNoFriendlyFire: SkillDefinitionV1 = { ...circleSkill, area: { ...circleSkill.area!, friendlyFire: false } };
  const noFfRes = resolveCombatActionV1(paladin, circleNoFriendlyFire, paladin.position!, [paladin, samurai, adjacentGoblin], battlefield, 1, new Set(), NEVER_ROLL_RNG);
  assert(!noFfRes.hits.some((h) => h.targetId === samurai.id), "6c. Com friendlyFire:false, área NÃO atinge o aliado Samurai");
  assert(noFfRes.hits.some((h) => h.targetId === adjacentGoblin.id), "6d. ...mas ainda atinge o inimigo dentro da mesma área");

  // ==========================================
  // 7-8. EXPLORAÇÃO 1D20
  // ==========================================
  const partyExploration = [
    { id: paladin.id, name: paladin.name, isConscious: true, specialty: "strength" as const },
    { id: samurai.id, name: samurai.name, isConscious: true, specialty: "agility" as const },
    { id: archer.id, name: archer.name, isConscious: true, specialty: "perception" as const, itemBonus: 1 },
  ];
  const explCheck = performExplorationCheck("perception", 15, partyExploration, 14);
  assert(explCheck.bestCompanionName === "Elyra", "7. Seleção automática escolheu a Arqueira para teste de Percepção");
  assert(explCheck.success === true, "7b. Teste de exploração venceu com bônus de especialista e item");

  const nat1Check = performExplorationCheck("perception", 5, partyExploration, 1);
  assert(nat1Check.isNatural1 === true && nat1Check.success === false, "8. 1 natural em exploração sempre falha, mesmo contra CD baixa");

  // ==========================================
  // 9-10. ESQUIVA E BLOQUEIO DETERMINÍSTICOS
  // ==========================================
  const harpoonerAdjacent = { ...goblinHarpooner, position: { q: 0, r: 1 } }; // só dodgeChance:10, isolado
  const dodgeHit = resolveCombatActionV1(samurai, slashSkill, harpoonerAdjacent.position!, [samurai, harpoonerAdjacent], battlefield, 1, new Set(), ALWAYS_ROLL_RNG);
  assert(dodgeHit.hits[0].dodged === true && dodgeHit.hits[0].damageDealt === 0, "9. Esquiva dispara com ALWAYS_ROLL_RNG e zera o dano");
  const noDodgeHit = resolveCombatActionV1(samurai, slashSkill, harpoonerAdjacent.position!, [samurai, harpoonerAdjacent], battlefield, 1, new Set(), NEVER_ROLL_RNG);
  assert(noDodgeHit.hits[0].dodged === false && noDodgeHit.hits[0].damageDealt > 0, "9b. Sem Esquiva (NEVER_ROLL_RNG), o golpe conecta normalmente");

  const chiefAdjacent = { ...goblinChief, position: { q: 0, r: 1 } }; // blockChance:10, reduction:30
  const blockHit = resolveCombatActionV1(samurai, slashSkill, chiefAdjacent.position!, [samurai, chiefAdjacent], battlefield, 1, new Set(), ALWAYS_ROLL_RNG);
  const noBlockHit = resolveCombatActionV1(samurai, slashSkill, chiefAdjacent.position!, [samurai, chiefAdjacent], battlefield, 1, new Set(), NEVER_ROLL_RNG);
  assert(blockHit.hits[0].blocked === true, "10. Bloqueio dispara com ALWAYS_ROLL_RNG");
  assert(blockHit.hits[0].damageDealt < noBlockHit.hits[0].damageDealt, "10b. Dano bloqueado é menor que o dano sem bloqueio");

  // ==========================================
  // 11-12. CONTRA-GOLPE — só quando o defensor sobrevive
  // ==========================================
  const guardianWithCounter: CombatantStateV1 = { ...stoneGuardian, position: { q: 0, r: 1 }, keywords: { counterAttackChance: 20, counterAttackScaling: 1.0 } };
  const survivingSamurai = { ...samurai, hpCurrent: samurai.hpMax };
  const counterRes = resolveCombatActionV1(survivingSamurai, slashSkill, guardianWithCounter.position!, [survivingSamurai, guardianWithCounter], battlefield, 1, new Set(), ALWAYS_ROLL_RNG);
  assert(counterRes.hits[0].targetKilled === false, "11. Guardião (350 HP) sobrevive ao golpe do Samurai");
  assert(counterRes.hits[0].counterAttacked === true && (counterRes.hits[0].counterDamageDealt ?? 0) > 0, "11b. Contra-golpe dispara quando o defensor permanece vivo");
  assert(counterRes.attacker.hpCurrent < survivingSamurai.hpCurrent, "11c. O atacante realmente perde HP pelo Contra-golpe");

  const fragileTargetWithCounter: CombatantStateV1 = { ...goblinCutter, position: { q: 0, r: 1 }, hpCurrent: 1, keywords: { counterAttackChance: 100, counterAttackScaling: 1.0 } };
  const lethalRes = resolveCombatActionV1(survivingSamurai, slashSkill, fragileTargetWithCounter.position!, [survivingSamurai, fragileTargetWithCounter], battlefield, 1, new Set(), ALWAYS_ROLL_RNG);
  assert(lethalRes.hits[0].targetKilled === true, "12. Alvo com 1 HP morre no golpe");
  assert(lethalRes.hits[0].counterAttacked === false, "12b. Contra-golpe NÃO dispara quando o defensor morre no mesmo golpe (mesmo com chance 100%)");

  // ==========================================
  // 13. SANGRAMENTO GARANTIDO ignora rolagem e cap
  // ==========================================
  const crimsonSlash = SAMURAI_KAEL.skills.find((s) => s.id === "crimson_slash")!;
  const cleanTarget: CombatantStateV1 = { ...goblinCutter, position: { q: 0, r: 1 }, keywords: {} }; // sem bleedChance nenhum
  const guaranteedBleedRes = resolveCombatActionV1(survivingSamurai, crimsonSlash, cleanTarget.position!, [{ ...survivingSamurai, keywords: {} }, cleanTarget], battlefield, 1, new Set(), NEVER_ROLL_RNG);
  assert(guaranteedBleedRes.hits[0].bleedApplied === true && guaranteedBleedRes.hits[0].bleedGuaranteed === true, "13. Corte Carmesim aplica Sangramento garantido mesmo com NEVER_ROLL_RNG e sem Keyword de Sangramento");

  // ==========================================
  // 14. VAMPIRISMO DE CONTRA-GOLPE é específico (não vaza pra ataques normais)
  // ==========================================
  const counterVampireDefender: CombatantStateV1 = { ...stoneGuardian, position: { q: 0, r: 1 }, hpCurrent: 100, hpMax: 350, keywords: { counterAttackChance: 100, counterAttackScaling: 1.0, counterVampirismPercent: 100 } };
  const counterVampRes = resolveCombatActionV1(survivingSamurai, slashSkill, counterVampireDefender.position!, [survivingSamurai, counterVampireDefender], battlefield, 1, new Set(), ALWAYS_ROLL_RNG);
  const hit14 = counterVampRes.hits[0];
  assert((hit14.counterVampirismHealed ?? 0) > 0 && hit14.counterVampirismHealed === Math.round((hit14.counterDamageDealt ?? 0) * 1.0), "14. Vampirismo de Contra-golpe cura exatamente 100% do dano do Contra-golpe");
  assert((hit14.vampirismHealed ?? 0) === 0, "14b. O ataque normal do Samurai (sem vampirismPercent geral) não cura nada");

  // ==========================================
  // 15. INTERRUPÇÃO só ocorre se ACERTAR — Esquiva evita a interrupção
  // ==========================================
  const ruptureArrow = ARCHER_ELYRA.skills.find((s) => s.id === "rupture_arrow")!;
  const dodgyCharger: CombatantStateV1 = {
    ...goblinCutter, position: { q: -1, r: 3 }, keywords: { dodgeChance: 20 },
    charging: { skillId: "dirty_cut", targetCell: { q: 0, r: 0 }, turnsRemaining: 1 },
  };
  const dodgedInterruptRes = resolveCombatActionV1(archer, ruptureArrow, dodgyCharger.position!, [archer, dodgyCharger], battlefield, 1, new Set(), ALWAYS_ROLL_RNG);
  assert(dodgedInterruptRes.hits[0].dodged === true && dodgedInterruptRes.hits[0].interrupted === false, "15. Esquiva bem-sucedida evita a interrupção de Flecha de Ruptura");

  const steadyCharger: CombatantStateV1 = { ...dodgyCharger, keywords: {} };
  const hitInterruptRes = resolveCombatActionV1(archer, ruptureArrow, steadyCharger.position!, [archer, steadyCharger], battlefield, 1, new Set(), NEVER_ROLL_RNG);
  assert(hitInterruptRes.hits[0].dodged === false && hitInterruptRes.hits[0].interrupted === true, "15b. Sem Esquiva, Flecha de Ruptura interrompe normalmente ao acertar");

  // ==========================================
  // 16. CARREGAMENTO sempre resolve na MESMA habilidade/alvo declarados originalmente
  // ==========================================
  const chargeSkill: SkillDefinitionV1 = { ...crimsonSlash, id: "test_charge", chargeTurnsRequired: 1, range: 5 };
  const originalTargetCell = { q: 0, r: 1 };
  const decoyTargetCell = { q: 0, r: 2 };
  const chargingSamurai: CombatantStateV1 = { ...survivingSamurai, position: { q: 0, r: 0 } };
  const startCharge = resolveCombatActionV1(chargingSamurai, chargeSkill, originalTargetCell, [chargingSamurai], battlefield, 1, new Set(), NEVER_ROLL_RNG);
  assert(Boolean(startCharge.attacker.charging) && startCharge.attacker.charging!.targetCell.q === originalTargetCell.q && startCharge.attacker.charging!.targetCell.r === originalTargetCell.r, "16. Carregamento congela o alvo original ao ser declarado");

  const decoyDefender: CombatantStateV1 = { ...goblinCutter, id: "decoy", position: decoyTargetCell, keywords: {} };
  const originalDefender: CombatantStateV1 = { ...goblinCutter, id: "original_target", position: originalTargetCell, keywords: {} };
  const continuedAttacker = { ...startCharge.attacker, position: { q: 0, r: 0 } };
  const continueCharge = resolveCombatActionV1(continuedAttacker, chargeSkill, decoyTargetCell, [continuedAttacker, decoyDefender, originalDefender], battlefield, 2, new Set(), NEVER_ROLL_RNG);
  assert(continueCharge.hits.length > 0 && continueCharge.hits[0].targetId === "original_target", "16b. Ao concluir, o golpe atinge o alvo ORIGINAL mesmo que outra célula tenha sido passada na continuação");
  assert(!continueCharge.hits.some((h) => h.targetId === "decoy"), "16c. O alvo chamariz (decoy) NÃO é afetado");

  // ==========================================
  // 17. CAP UNIVERSAL DE 30% é respeitado mesmo com valor bruto acima do teto
  // ==========================================
  const overCapTarget: CombatantStateV1 = { ...goblinCutter, position: { q: 0, r: 1 }, keywords: { dodgeChance: 80 } }; // bruto muito acima do teto
  const boundaryRng = createSequenceRng([0.5]); // 50% — entre o cap (30) e o valor bruto (80)
  const cappedRes = resolveCombatActionV1(survivingSamurai, slashSkill, overCapTarget.position!, [survivingSamurai, overCapTarget], battlefield, 1, new Set(), boundaryRng);
  assert(cappedRes.hits[0].dodged === false, "17. Uma rolagem de 50% NÃO esquiva mesmo com dodgeChance bruto de 80%, porque o resolver aplica o teto de 30%");

  // ==========================================
  // 18-19. INVOCAÇÃO real via orquestrador — ativa Legião Óssea, valida alcance/ocupação
  // ==========================================
  const necroSeed: RosterSeed = { combatant: { ...necromancer, position: { q: 0, r: 0 } }, skills: necromancer.skills!, ultimate: necromancer.ultimate };
  const skeletonAllySeed: RosterSeed = { combatant: { ...skeleton, id: "skeleton_ally", position: { q: 1, r: 0 } }, skills: skeleton.skills!, deathReactionSkill: skeleton.deathReactionSkill };
  const dummyPlayerSeed: RosterSeed = { combatant: dummyCombatant("dummy_player", "player", { q: 3, r: 3 }, 1), skills: [] };

  let summonState = createBattleV1([necroSeed, skeletonAllySeed, dummyPlayerSeed], battlefield);
  const beforeSummonTraits = evaluateActiveTraits([...summonState.combatants.values()].filter((c) => c.team === "enemy").map((c) => ({ id: c.id, isAlive: c.hpCurrent > 0, tags: c.tags })));
  assert(!beforeSummonTraits.has("legion_of_bones"), "18. Legião Óssea NÃO está ativa com apenas 2 mortos-vivos");

  // força o Necromante a agir agora mesmo (ignora ordem de iniciativa pra isolar o teste)
  const occupiedCellState: BattleStateV1 = { ...summonState, activeIndex: summonState.initiativeQueue.indexOf("ossuary_necromancer_1") };
  const occupiedSummon = declareAction(occupiedCellState, "ossuary_necromancer_1", "bone_call", { q: 0, r: 0 }, { rng: ALWAYS_ROLL_RNG }); // própria célula, ocupada
  assert(occupiedSummon.combatants.size === occupiedCellState.combatants.size, "19. Invocação em célula ocupada é rejeitada (nenhum combatente novo)");

  const summonResult = declareAction(occupiedCellState, "ossuary_necromancer_1", "bone_call", { q: 1, r: -1 }, { rng: ALWAYS_ROLL_RNG });
  assert(summonResult.combatants.size === occupiedCellState.combatants.size + 1, "19b. Invocação em célula livre e dentro de alcance adiciona um novo combatente");
  const afterSummonTraits = evaluateActiveTraits([...summonResult.combatants.values()].filter((c) => c.team === "enemy").map((c) => ({ id: c.id, isAlive: c.hpCurrent > 0, tags: c.tags })));
  assert(afterSummonTraits.has("legion_of_bones"), "18b. Legião Óssea ativa assim que a invocação atinge 3 mortos-vivos");

  // ==========================================
  // 20. ÚLTIMO SUSPIRO real executa a habilidade de reação contra quem matou
  // ==========================================
  const dyingPaladinSeed: RosterSeed = {
    combatant: { ...paladin, id: "dying_paladin", hpCurrent: 1, position: { q: 0, r: 0 } },
    skills: PALADIN_ALDREN.skills, ultimate: PALADIN_ALDREN.ultimate, deathReactionSkill: PALADIN_ALDREN.deathReactionSkill,
  };
  const killerGoblinSeed: RosterSeed = { combatant: { ...goblinCutter, id: "killer_goblin", position: { q: 0, r: 1 }, hpCurrent: 140 }, skills: GOBLIN_SKILLS(goblinCutter) };
  let lastBreathState = createBattleV1([dyingPaladinSeed, killerGoblinSeed], battlefield);
  lastBreathState = { ...lastBreathState, activeIndex: lastBreathState.initiativeQueue.indexOf("killer_goblin") };
  const afterLastBreath = declareAction(lastBreathState, "killer_goblin", "dirty_cut", { q: 0, r: 0 }, { rng: ALWAYS_ROLL_RNG });
  const deadPaladin = afterLastBreath.combatants.get("dying_paladin")!;
  const killerAfter = afterLastBreath.combatants.get("killer_goblin")!;
  assert(deadPaladin.hpCurrent === 0, "20. Paladino morre normalmente após o Último Suspiro se resolver");
  assert(killerAfter.hpCurrent < 140, "20b. A habilidade de reação (Golpe do Juramento) realmente atingiu quem o matou");
  assert(afterLastBreath.logs.some((l) => l.text.includes("ÚLTIMO SUSPIRO")), "20c. Log registra o Último Suspiro");

  // ==========================================
  // 21. RECARGA bloqueia reuso imediato e libera após tick
  // ==========================================
  const cdSamuraiSeed: RosterSeed = { combatant: { ...samurai, id: "cd_samurai", position: { q: 0, r: 0 } }, skills: SAMURAI_KAEL.skills, ultimate: SAMURAI_KAEL.ultimate };
  const cdDummySeed: RosterSeed = { combatant: dummyCombatant("cd_dummy", "enemy", { q: 3, r: 3 }, 1), skills: [] };
  let cdState = createBattleV1([cdSamuraiSeed, cdDummySeed], battlefield);
  cdState = runUntilActive(cdState, "cd_samurai");
  cdState = declareAction(cdState, "cd_samurai", "moon_stance", { q: 0, r: 0 }, { rng: NEVER_ROLL_RNG });
  assert((cdState.clocks.get("cd_samurai")?.cooldowns["moon_stance"] ?? 0) === 4, "21. Postura da Lua entra em recarga de 4 turnos ao ser usada");

  cdState = runUntilActive(cdState, "cd_samurai");
  const cooldownBefore = cdState.clocks.get("cd_samurai")!.cooldowns["moon_stance"] ?? 0;
  cdState = declareAction(cdState, "cd_samurai", "moon_stance", { q: 0, r: 0 }, { rng: NEVER_ROLL_RNG });
  assert((cdState.clocks.get("cd_samurai")?.cooldowns["moon_stance"] ?? 0) === cooldownBefore, "21b. Reuso enquanto em recarga é rejeitado (a recarga não reinicia)");

  for (let i = 0; i < 6 && (cdState.clocks.get("cd_samurai")?.cooldowns["moon_stance"] ?? 0) > 0; i += 1) {
    cdState = runUntilActive(cdState, "cd_samurai");
    if ((cdState.clocks.get("cd_samurai")?.cooldowns["moon_stance"] ?? 0) > 0) cdState = passTurn(cdState, "cd_samurai");
  }
  cdState = runUntilActive(cdState, "cd_samurai");
  const readyAgain = declareAction(cdState, "cd_samurai", "moon_stance", { q: 0, r: 0 }, { rng: NEVER_ROLL_RNG });
  assert((readyAgain.clocks.get("cd_samurai")?.cooldowns["moon_stance"] ?? 0) === 4, "21c. Após a recarga zerar, a habilidade pode ser usada de novo (recarga volta a 4)");

  // ==========================================
  // 22. ULTIMATE exige carga completa e reseta após o uso
  // ==========================================
  const ultSamuraiSeed: RosterSeed = { combatant: { ...samurai, id: "ult_samurai", position: { q: 0, r: 0 } }, skills: SAMURAI_KAEL.skills, ultimate: SAMURAI_KAEL.ultimate };
  const ultTargetSeed: RosterSeed = { combatant: { ...goblinCutter, id: "ult_target", position: { q: 0, r: 1 }, hpCurrent: 500, hpMax: 500 }, skills: [] };
  let ultState = createBattleV1([ultSamuraiSeed, ultTargetSeed], battlefield);
  ultState = runUntilActive(ultState, "ult_samurai");
  const earlyUltimate = declareAction(ultState, "ult_samurai", "blade_eclipse", { q: 0, r: 1 }, { rng: NEVER_ROLL_RNG });
  assert(earlyUltimate.combatants.get("ult_target")!.hpCurrent === 500, "22. Ultimate recusada antes da carga completa (alvo não sofre dano)");

  for (let i = 0; i < 10 && !ultState.clocks.get("ult_samurai")!.isUltimateReady; i += 1) {
    ultState = runUntilActive(ultState, "ult_samurai");
    if (!ultState.clocks.get("ult_samurai")!.isUltimateReady) ultState = passTurn(ultState, "ult_samurai");
  }
  ultState = runUntilActive(ultState, "ult_samurai");
  assert(ultState.clocks.get("ult_samurai")!.isUltimateReady === true, "22b. Após acumular carga suficiente, a Ultimate fica pronta");
  const ultimateUsed = declareAction(ultState, "ult_samurai", "blade_eclipse", { q: 0, r: 1 }, { rng: NEVER_ROLL_RNG });
  assert(ultimateUsed.combatants.get("ult_target")!.hpCurrent < 500, "22c. Ultimate pronta resolve dano normalmente");
  assert(ultimateUsed.clocks.get("ult_samurai")!.ultimateCurrentCharge === 0 && ultimateUsed.clocks.get("ult_samurai")!.isUltimateReady === false, "22d. Carga da Ultimate reseta pra 0 imediatamente após o uso");

  // ==========================================
  // 23. INTERROMPER CARREGAMENTO envia a habilidade pra recarga cheia
  // ==========================================
  const testChargeSkillForSeed: SkillDefinitionV1 = { id: "test_charge_strike", name: "Golpe de Teste (Carregado)", description: "", damageType: "slashing", defenseChannel: "physical", powerScaling: 1.5, cooldownTurns: 3, range: 5, isSingleTarget: true, chargeTurnsRequired: 1 };
  const chargerSeed: RosterSeed = { combatant: { ...samurai, id: "charger", team: "enemy", position: { q: 0, r: 0 }, keywords: {} }, skills: [testChargeSkillForSeed] };
  const interrupterSeed: RosterSeed = { combatant: { ...archer, id: "interrupter", position: { q: 0, r: 3 } }, skills: ARCHER_ELYRA.skills };
  let interruptState = createBattleV1([chargerSeed, interrupterSeed], battlefield);
  interruptState = runUntilActive(interruptState, "charger");
  interruptState = declareAction(interruptState, "charger", "test_charge_strike", { q: 0, r: 3 }, { rng: NEVER_ROLL_RNG });
  assert(Boolean(interruptState.combatants.get("charger")!.charging), "23. Golpe de Teste começou a carregar");

  interruptState = runUntilActive(interruptState, "interrupter");
  interruptState = declareAction(interruptState, "interrupter", "rupture_arrow", { q: 0, r: 0 }, { rng: NEVER_ROLL_RNG });
  assert(!interruptState.combatants.get("charger")!.charging, "23b. Flecha de Ruptura interrompeu o carregamento");
  // A penalidade é fixada em cooldownTurns (3) no instante da interrupção; como só há 2 combatentes,
  // o turno do "charger" começa imediatamente em seguida e já tica a recarga uma vez (3 -> 2) antes
  // que este teste consiga observar o estado. O importante: NÃO ficou livre (0) — foi pra recarga cheia.
  assert((interruptState.clocks.get("charger")?.cooldowns["test_charge_strike"] ?? 0) === 2, "23c. A habilidade interrompida vai para a recarga CHEIA (3 turnos, já com 1 tick decorrido = 2), não continua livre");

  // ==========================================
  // 24. LEALDADE — pontos só afetam a Keyword alocada; orçamento nunca é ultrapassado
  // ==========================================
  assert(calculateLoyaltyBonus(30) === 10, "24. Orçamento máximo de Lealdade é 10 pontos no Lv.30");
  const overBudget = clampLoyaltyAllocation({ dodgeChance: 7, blockChance: 7 }, 10);
  assert((overBudget.dodgeChance ?? 0) + (overBudget.blockChance ?? 0) <= 10, "24b. Alocação além do orçamento (7+7=14) é cortada para não passar de 10");
  assert(overBudget.dodgeChance === 7 && overBudget.blockChance === 3, "24c. O corte respeita a ordem declarada (dodge recebe os 7 pedidos, block recebe só o restante: 3)");

  const loyalStats = buildCompanionCombatantStats(ARCHER_ELYRA, 50, { companionId: ARCHER_ELYRA.id, masteryLevel: 1, loyaltyLevel: 30, loyaltyAllocation: { dodgeChance: 10 } });
  const baseStats = buildCompanionCombatantStats(ARCHER_ELYRA, 50);
  assert(loyalStats.keywords.dodgeChance === (baseStats.keywords.dodgeChance ?? 0) + 10, "24d. Pontos alocados em Esquiva aumentam SOMENTE a Esquiva");
  assert(loyalStats.keywords.bleedChance === baseStats.keywords.bleedChance, "24e. Keywords NÃO alocadas (Sangramento) não recebem bônus automático");

  // ==========================================
  // 25. ESCALA DE NÍVEL — bestiário é o teto de Lv.50, nunca multiplicado de novo
  // ==========================================
  const lv50 = buildCompanionCombatantStats(PALADIN_ALDREN, 50);
  const lv1 = buildCompanionCombatantStats(PALADIN_ALDREN, 1);
  assert(lv50.hpMax === PALADIN_ALDREN.baseHp && lv50.power === PALADIN_ALDREN.basePower, "25. No Lv.50, os stats são EXATAMENTE o valor cadastrado no bestiário (teto, não multiplicado de novo)");
  assert(lv1.hpMax < lv50.hpMax && lv1.hpMax === Math.round(PALADIN_ALDREN.baseHp * levelScalingFactor(1)), "25b. No Lv.1, os stats são o piso interpolado (40% do teto), não um valor arbitrário");

  // ==========================================
  // 26. MAESTRIA — marcos cumulativos + bônus extra da habilidade ★ Mestre
  // ==========================================
  const { skills: masteredSkills, ultimate: masteredUltimate } = buildCompanionSkillLoadout(SAMURAI_KAEL, { companionId: SAMURAI_KAEL.id, masteryLevel: 50, loyaltyLevel: 1, masterSkillId: "slash" });
  const masteredSlash = masteredSkills.find((s) => s.id === "slash")!;
  const milestones = masteryMilestonesReached(50);
  const expectedSlashScaling = SAMURAI_KAEL.skills.find((s) => s.id === "slash")!.powerScaling + milestones * MASTERY_MILESTONE_POWER_BONUS + MASTERY_MASTER_POWER_BONUS;
  assert(Math.abs(masteredSlash.powerScaling - expectedSlashScaling) < 1e-9, "26. Habilidade ★ Mestre recebe o bônus de marco cumulativo E o bônus extra de Mestre");
  assert(masteredSlash.isMasterSkill === true, "26b. Habilidade ★ Mestre fica marcada (isMasterSkill)");
  assert(masteredSlash.cooldownTurns === Math.max(0, SAMURAI_KAEL.skills.find((s) => s.id === "slash")!.cooldownTurns - MASTERY_MASTER_COOLDOWN_REDUCTION), "26c. Habilidade ★ Mestre recebe redução de recarga");

  const nonMasterSkill = masteredSkills.find((s) => s.id === "crimson_slash")!;
  const originalCrimson = SAMURAI_KAEL.skills.find((s) => s.id === "crimson_slash")!;
  assert(Math.abs(nonMasterSkill.powerScaling - (originalCrimson.powerScaling + milestones * MASTERY_MILESTONE_POWER_BONUS)) < 1e-9, "26d. Habilidades NÃO escolhidas como Mestre só recebem o bônus de marco, sem o extra");
  assert(!nonMasterSkill.isMasterSkill, "26e. Habilidades não escolhidas não ficam marcadas como Mestre");
  assert(masteredUltimate.id === SAMURAI_KAEL.ultimate.id, "26f. buildCompanionSkillLoadout preserva a identidade da Ultimate");

  return { passed, failed, report };
}

function dummyCombatant(id: string, team: "player" | "enemy", position: { q: number; r: number }, speed: number): CombatantStateV1 {
  return {
    id, name: "Dummy", team, hpCurrent: 9999, hpMax: 9999, power: 1, physicalDefense: 999, magicalDefense: 999,
    speed, movement: 1, position, keywords: {}, tags: ["dummy"], activeEffects: [],
  };
}

function GOBLIN_SKILLS(monster: CombatantStateV1): SkillDefinitionV1[] {
  return monster.skills ?? [];
}

/** Avança o estado até que `actorId` esteja ativo, passando a vez de qualquer outro ator no caminho. */
function runUntilActive(state: BattleStateV1, actorId: string, maxSteps = 20): BattleStateV1 {
  let current = state;
  for (let i = 0; i < maxSteps; i += 1) {
    if (current.isOver) return current;
    const activeId = current.initiativeQueue[current.activeIndex];
    if (activeId === actorId) return current;
    current = passTurn(current, activeId);
  }
  return current;
}

const labResults = runCombatLabTests();
console.log(labResults.report.join("\n"));
console.log(`\nResumo: ${labResults.passed} testes passaram com sucesso! (Falhas: ${labResults.failed})`);
if (labResults.failed > 0) {
  process.exit(1);
}
