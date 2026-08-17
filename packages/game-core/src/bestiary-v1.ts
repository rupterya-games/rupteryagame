/**
 * bestiary-v1.ts — Companions do Player e Monstros de Teste (Rupterya V1)
 *
 * PLAYERS DE TESTE (Lv.50):
 * 1. Aldren — Guardião do Juramento (Paladino • Humano • Sagrado)
 * 2. Kael — Lâmina Errante (Samurai • Humano • Cortante)
 * 3. Elyra — Olho do Norte (Arqueira • Humana • Perfurante)
 *
 * MONSTROS DO LABORATÓRIO:
 * 1. Goblin Cortador (Cortante / Fraqueza: Cortante / Sangramento)
 * 2. Goblin Arpoador (Perfurante / Fraqueza: Cortante / Single Target)
 * 3. Goblin Chefe (Esmagador / Fraqueza: Cortante / Bloqueio)
 *    -> Ativam Traço SANGRIA (+20% Sangramento com 3 Goblins)
 * 4. Bruxa dos Barris (Fogo / Fraqueza: Perfurante / Resistência: Fogo / Área com Fogo Amigo)
 * 5. Guardião de Pedra (Esmagador / Fraqueza: Esmagador / Resistência: Cortante)
 * 6. Necromante Ossário (Morte / Fraqueza: Sagrado / Resistência: Morte / Carregamento & Invocação)
 * 7. Esqueleto (Morte / Fraqueza: Sagrado / Resistência: Morte / Último Suspiro: Ruptura Cadavérica)
 */

import type { CompanionDefinitionV1 } from "./companions";
import type { CombatantStateV1 } from "./action-resolver";

// ==========================================
// 1. PALADINO — Aldren (Guardião do Juramento)
// ==========================================
export const PALADIN_ALDREN: CompanionDefinitionV1 = {
  id: "paladin_aldren",
  name: "Aldren",
  className: "Paladino",
  family: "human",
  damageType: "holy",
  basePower: 36,
  baseHp: 360,
  basePhysicalDefense: 27,
  baseMagicalDefense: 24,
  baseSpeed: 10,
  explorationAttribute: "strength",
  naturalKeywords: {
    blockChance: 15,
    blockReductionPercent: 40,
    tauntDuration: 1,
  },
  skills: [
    {
      id: "oath_strike",
      name: "Golpe do Juramento",
      description: "Ataque direto infundido com luz sagrada.",
      damageType: "holy",
      defenseChannel: "physical",
      powerScaling: 1.0,
      cooldownTurns: 0,
      range: 1,
      isSingleTarget: true,
    },
    {
      id: "aegis",
      name: "Égide",
      description: "Ergue o escudo aumentando o Bloqueio em +15% por 1 turno.",
      damageType: "holy",
      defenseChannel: "physical",
      powerScaling: 0,
      cooldownTurns: 3,
      range: 0,
      isSingleTarget: true,
    },
    {
      id: "judgment",
      name: "Julgamento",
      description: "Golpe fulminante que provoca o alvo por 1 turno.",
      damageType: "holy",
      defenseChannel: "physical",
      powerScaling: 1.3,
      cooldownTurns: 3,
      range: 1,
      isSingleTarget: true,
      appliesTaunt: true,
    },
    {
      id: "consecrated_circle",
      name: "Círculo Consagrado",
      description: "Explosão sagrada em área ao redor. Possui fogo amigo!",
      damageType: "holy",
      defenseChannel: "magical",
      powerScaling: 0.9,
      cooldownTurns: 4,
      range: 0,
      isSingleTarget: false,
      area: { shape: "radius", radius: 1, friendlyFire: true },
    },
  ],
  ultimate: {
    id: "first_oath_decree",
    name: "Decreto do Primeiro Juramento",
    description: "Convocação avassaladora em cone frontal. Aplica Provocar e possui fogo amigo.",
    damageType: "holy",
    defenseChannel: "magical",
    powerScaling: 1.6,
    cooldownTurns: 5,
    range: 2,
    isSingleTarget: false,
    area: { shape: "cone", friendlyFire: true },
    appliesTaunt: true,
  },
};

// ==========================================
// 2. SAMURAI — Kael (Lâmina Errante)
// ==========================================
export const SAMURAI_KAEL: CompanionDefinitionV1 = {
  id: "samurai_kael",
  name: "Kael",
  className: "Samurai",
  family: "human",
  damageType: "slashing",
  basePower: 42,
  baseHp: 315,
  basePhysicalDefense: 21,
  baseMagicalDefense: 17,
  baseSpeed: 12,
  explorationAttribute: "agility",
  naturalKeywords: {
    counterAttackChance: 15,
    counterAttackScaling: 1.0,
    bleedChance: 10,
    bleedDamagePerTurn: 10,
  },
  skills: [
    {
      id: "slash",
      name: "Corte",
      description: "Corte básico com a katana.",
      damageType: "slashing",
      defenseChannel: "physical",
      powerScaling: 1.0,
      cooldownTurns: 0,
      range: 1,
      isSingleTarget: true,
    },
    {
      id: "iai",
      name: "Iai",
      description: "Avança 1 hexágono em direção ao alvo e desfere um golpe de saque rápido.",
      damageType: "slashing",
      defenseChannel: "physical",
      powerScaling: 1.25,
      cooldownTurns: 3,
      range: 2,
      isSingleTarget: true,
    },
    {
      id: "moon_stance",
      name: "Postura da Lua",
      description: "Aumenta a chance de Contra-golpe em +10% por 2 turnos.",
      damageType: "slashing",
      defenseChannel: "physical",
      powerScaling: 0,
      cooldownTurns: 4,
      range: 0,
      isSingleTarget: true,
    },
    {
      id: "crimson_slash",
      name: "Corte Carmesim",
      description: "Golpe dilacerante que aplica Sangramento garantido.",
      damageType: "slashing",
      defenseChannel: "physical",
      powerScaling: 1.1,
      cooldownTurns: 2,
      range: 1,
      isSingleTarget: true,
      appliesBleed: true,
    },
  ],
  ultimate: {
    id: "blade_eclipse",
    name: "Eclipse da Lâmina",
    description: "Corte definitivo contra alvo único. Pode ser esquivado.",
    damageType: "slashing",
    defenseChannel: "physical",
    powerScaling: 1.75,
    cooldownTurns: 4,
    range: 1,
    isSingleTarget: true,
  },
};

// ==========================================
// 3. ARQUEIRA — Elyra (Olho do Norte)
// ==========================================
export const ARCHER_ELYRA: CompanionDefinitionV1 = {
  id: "archer_elyra",
  name: "Elyra",
  className: "Arqueira",
  family: "human",
  damageType: "piercing",
  basePower: 39,
  baseHp: 285,
  basePhysicalDefense: 17,
  baseMagicalDefense: 18,
  baseSpeed: 14,
  explorationAttribute: "perception",
  naturalKeywords: {
    dodgeChance: 10,
    bleedChance: 5,
    bleedDamagePerTurn: 8,
  },
  skills: [
    {
      id: "shot",
      name: "Disparo",
      description: "Tiro certeiro com arco longo.",
      damageType: "piercing",
      defenseChannel: "physical",
      powerScaling: 1.0,
      cooldownTurns: 0,
      range: 5,
      isSingleTarget: true,
    },
    {
      id: "rupture_arrow",
      name: "Flecha de Ruptura",
      description: "Interrompe habilidades em carregamento.",
      damageType: "piercing",
      defenseChannel: "physical",
      powerScaling: 1.1,
      cooldownTurns: 3,
      range: 5,
      isSingleTarget: true,
      interruptsCharging: true,
    },
    {
      id: "triple_shot",
      name: "Tríplice Disparo",
      description: "Dispara 3 flechas independentes (3x 45% da Potência).",
      damageType: "piercing",
      defenseChannel: "physical",
      powerScaling: 0.45,
      hitsCount: 3,
      cooldownTurns: 4,
      range: 5,
      isSingleTarget: true,
    },
    {
      id: "hunt_stride",
      name: "Passo de Caça",
      description: "Reposiciona e aumenta a Esquiva em +10% até o próximo turno.",
      damageType: "piercing",
      defenseChannel: "physical",
      powerScaling: 0,
      cooldownTurns: 3,
      range: 0,
      isSingleTarget: true,
    },
  ],
  ultimate: {
    id: "rain_of_horizon",
    name: "Chuva do Último Horizonte",
    description: "Chuva de flechas em grande área. Possui fogo amigo!",
    damageType: "piercing",
    defenseChannel: "physical",
    powerScaling: 1.2,
    cooldownTurns: 5,
    range: 5,
    isSingleTarget: false,
    area: { shape: "radius", radius: 2, friendlyFire: true },
  },
};

// ==========================================
// 4. MONSTROS DO LABORATÓRIO DE TESTE
// ==========================================

export function createTestMonsters(): CombatantStateV1[] {
  return [
    // 1. Goblin Cortador
    {
      id: "goblin_cutter_1",
      name: "Goblin Cortador",
      team: "enemy",
      hpCurrent: 140,
      hpMax: 140,
      power: 24,
      physicalDefense: 10,
      magicalDefense: 8,
      speed: 13,
      movement: 3,
      position: { q: 2, r: 0 },
      tags: ["goblin"],
      damageAffinity: { weaknesses: ["slashing"] },
      keywords: { bleedChance: 10, bleedDamagePerTurn: 6 },
      activeEffects: [],
    },
    // 2. Goblin Arpoador
    {
      id: "goblin_harpooner_1",
      name: "Goblin Arpoador",
      team: "enemy",
      hpCurrent: 120,
      hpMax: 120,
      power: 26,
      physicalDefense: 8,
      magicalDefense: 10,
      speed: 14,
      movement: 3,
      position: { q: 3, r: -1 },
      tags: ["goblin"],
      damageAffinity: { weaknesses: ["slashing"] },
      keywords: { dodgeChance: 10 },
      activeEffects: [],
    },
    // 3. Goblin Chefe
    {
      id: "goblin_chief_1",
      name: "Goblin Chefe",
      team: "enemy",
      hpCurrent: 260,
      hpMax: 260,
      power: 32,
      physicalDefense: 16,
      magicalDefense: 12,
      speed: 11,
      movement: 3,
      position: { q: 2, r: -1 },
      tags: ["goblin"],
      damageAffinity: { weaknesses: ["slashing"] },
      keywords: { blockChance: 10, blockReductionPercent: 30 },
      activeEffects: [],
    },
    // 4. Bruxa dos Barris
    {
      id: "barrel_witch_1",
      name: "Bruxa dos Barris",
      team: "enemy",
      hpCurrent: 180,
      hpMax: 180,
      power: 35,
      physicalDefense: 12,
      magicalDefense: 22,
      speed: 9,
      movement: 3,
      position: { q: 1, r: -2 },
      tags: ["witch", "human"],
      damageAffinity: { weaknesses: ["piercing"], resistances: ["fire"] },
      keywords: {},
      activeEffects: [],
    },
    // 5. Guardião de Pedra
    {
      id: "stone_guardian_1",
      name: "Guardião de Pedra",
      team: "enemy",
      hpCurrent: 350,
      hpMax: 350,
      power: 38,
      physicalDefense: 35,
      magicalDefense: 15,
      speed: 7,
      movement: 2,
      position: { q: 1, r: 1 },
      tags: ["construct"],
      damageAffinity: { weaknesses: ["bludgeoning"], resistances: ["slashing"] },
      keywords: { blockChance: 20, blockReductionPercent: 50 },
      activeEffects: [],
    },
    // 6. Necromante Ossário
    {
      id: "ossuary_necromancer_1",
      name: "Necromante Ossário",
      team: "enemy",
      hpCurrent: 220,
      hpMax: 220,
      power: 40,
      physicalDefense: 14,
      magicalDefense: 28,
      speed: 8,
      movement: 3,
      position: { q: 3, r: -2 },
      tags: ["undead"],
      damageAffinity: { weaknesses: ["holy"], resistances: ["death"] },
      keywords: {},
      activeEffects: [],
    },
    // 7. Esqueleto com Último Suspiro
    {
      id: "explosive_skeleton_1",
      name: "Esqueleto Explosivo",
      team: "enemy",
      hpCurrent: 80,
      hpMax: 80,
      power: 28,
      physicalDefense: 10,
      magicalDefense: 10,
      speed: 10,
      movement: 3,
      position: { q: 2, r: 1 },
      tags: ["undead", "skeleton", "last_breath"],
      damageAffinity: { weaknesses: ["holy"], resistances: ["death"] },
      keywords: {},
      activeEffects: [],
    },
  ];
}
