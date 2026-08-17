/**
 * bestiary-v1.ts — Companions do Player e Monstros de Teste (Rupterya V1)
 *
 * PLAYERS DE TESTE (Lv.50):
 * 1. Aldren — Guardião do Juramento (Paladino • Humano • Sagrado)
 * 2. Kael — Lâmina Errante (Samurai • Humano • Cortante)
 * 3. Elyra — Olho do Norte (Arqueira • Humana • Perfurante)
 *
 * MONSTROS DO LABORATÓRIO (todos com kit de habilidades V1 completo):
 * 1. Goblin Cortador (Cortante / Fraqueza: Cortante / Sangramento)
 * 2. Goblin Arpoador (Perfurante / Fraqueza: Cortante / Single Target à distância)
 * 3. Goblin Chefe (Esmagador / Fraqueza: Cortante / Bloqueio + Provocar + grito de guerra)
 *    -> Ativam Traço SANGRIA (+20% Sangramento com 3 Goblins)
 * 4. Bruxa dos Barris (Fogo / Fraqueza: Perfurante / Resistência: Fogo / Área com Fogo Amigo)
 * 5. Guardião de Pedra (Esmagador / Fraqueza: Esmagador / Resistência: Cortante)
 * 6. Necromante Ossário (Morte / Fraqueza: Sagrado / Resistência: Morte / Carregamento & Invocação real)
 * 7. Esqueleto Explosivo (Morte / Fraqueza: Sagrado / Resistência: Morte / Último Suspiro real: Ruptura Cadavérica)
 *    -> Esqueleto invocado pelo Necromante ativa Traço LEGIÃO ÓSSEA (-15% dano p/ mortos-vivos com 3+ no campo)
 */

import type { CompanionDefinitionV1 } from "./companions";
import type { CombatantStateV1, SkillDefinitionV1 } from "./action-resolver";

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
      selfEffects: [{ keyword: "blockChance", amount: 15, duration: 1 }],
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
    description: "Convocação avassaladora em cone frontal. Aplica Provocar e possui fogo amigo. (Ultimate: carrega por turno, não usa recarga comum.)",
    damageType: "holy",
    defenseChannel: "magical",
    powerScaling: 1.6,
    cooldownTurns: 5, // interpretado como carga necessária (5 turnos) pelo orquestrador — ver isUltimate
    range: 2,
    isSingleTarget: false,
    area: { shape: "cone", friendlyFire: true },
    appliesTaunt: true,
    isUltimate: true,
  },
  deathReactionSkill: {
    id: "oath_strike_last_breath",
    name: "Golpe do Juramento (Último Suspiro)",
    description: "Antes de cair, Aldren desfere um último golpe sagrado contra quem o abateu.",
    damageType: "holy",
    defenseChannel: "physical",
    powerScaling: 1.0,
    cooldownTurns: 0,
    range: 1,
    isSingleTarget: true,
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
      advanceBeforeHit: 1,
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
      selfEffects: [{ keyword: "counterAttackChance", amount: 10, duration: 2 }],
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
    description: "Corte definitivo contra alvo único. Pode ser esquivado. (Ultimate: carrega por turno.)",
    damageType: "slashing",
    defenseChannel: "physical",
    powerScaling: 1.75,
    cooldownTurns: 4, // carga necessária
    range: 1,
    isSingleTarget: true,
    isUltimate: true,
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
      description: "Interrompe habilidades em carregamento SE acertar (Esquiva evita a interrupção).",
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
      description: "Reposiciona (+2 de movimento) e aumenta a Esquiva em +10% até o próximo turno.",
      damageType: "piercing",
      defenseChannel: "physical",
      powerScaling: 0,
      cooldownTurns: 3,
      range: 0,
      isSingleTarget: true,
      selfEffects: [{ keyword: "dodgeChance", amount: 10, duration: 1 }],
      grantsBonusMovement: 2,
    },
  ],
  ultimate: {
    id: "rain_of_horizon",
    name: "Chuva do Último Horizonte",
    description: "Chuva de flechas em grande área. Possui fogo amigo! (Ultimate: carrega por turno.)",
    damageType: "piercing",
    defenseChannel: "physical",
    powerScaling: 1.2,
    cooldownTurns: 5, // carga necessária
    range: 5,
    isSingleTarget: false,
    area: { shape: "radius", radius: 2, friendlyFire: true },
    isUltimate: true,
  },
};

// ==========================================
// 4. MONSTROS DO LABORATÓRIO DE TESTE
// ==========================================

const GOBLIN_CUTTER_SKILLS: SkillDefinitionV1[] = [
  {
    id: "dirty_cut",
    name: "Corte Sujo",
    description: "Golpe rápido e impreciso, mas cortante.",
    damageType: "slashing",
    defenseChannel: "physical",
    powerScaling: 1.0,
    cooldownTurns: 0,
    range: 1,
    isSingleTarget: true,
  },
];

const GOBLIN_HARPOONER_SKILLS: SkillDefinitionV1[] = [
  {
    id: "harpoon_throw",
    name: "Arpão Certeiro",
    description: "Arremesso de arpão à distância.",
    damageType: "piercing",
    defenseChannel: "physical",
    powerScaling: 1.0,
    cooldownTurns: 0,
    range: 3,
    isSingleTarget: true,
  },
];

const GOBLIN_CHIEF_SKILLS: SkillDefinitionV1[] = [
  {
    id: "crush",
    name: "Esmagar",
    description: "Golpe pesado que provoca o alvo.",
    damageType: "bludgeoning",
    defenseChannel: "physical",
    powerScaling: 1.1,
    cooldownTurns: 0,
    range: 1,
    isSingleTarget: true,
    appliesTaunt: true,
  },
  {
    id: "war_cry",
    name: "Grito de Guerra",
    description: "Ergue o escudo de guerra, +10% Bloqueio por 2 turnos.",
    damageType: "bludgeoning",
    defenseChannel: "physical",
    powerScaling: 0,
    cooldownTurns: 4,
    range: 0,
    isSingleTarget: true,
    selfEffects: [{ keyword: "blockChance", amount: 10, duration: 2 }],
  },
];

const BARREL_WITCH_SKILLS: SkillDefinitionV1[] = [
  {
    id: "spark",
    name: "Faísca",
    description: "Estilhaço de fogo à distância.",
    damageType: "fire",
    defenseChannel: "magical",
    powerScaling: 1.0,
    cooldownTurns: 0,
    range: 3,
    isSingleTarget: true,
  },
  {
    id: "barrel_blast",
    name: "Explosão de Barril",
    description: "Detona um barril de pólvora numa área. Possui fogo amigo!",
    damageType: "fire",
    defenseChannel: "magical",
    powerScaling: 1.2,
    cooldownTurns: 3,
    range: 3,
    isSingleTarget: false,
    area: { shape: "radius", radius: 1, friendlyFire: true },
  },
];

const STONE_GUARDIAN_SKILLS: SkillDefinitionV1[] = [
  {
    id: "stone_fist",
    name: "Punho de Pedra",
    description: "Soco esmagador de pedra maciça.",
    damageType: "bludgeoning",
    defenseChannel: "physical",
    powerScaling: 1.1,
    cooldownTurns: 0,
    range: 1,
    isSingleTarget: true,
  },
];

const NECROMANCER_SKILLS: SkillDefinitionV1[] = [
  {
    id: "bone_lance",
    name: "Lança Óssea",
    description: "Projétil de osso afiado imbuído de energia mortífera.",
    damageType: "death",
    defenseChannel: "magical",
    powerScaling: 1.0,
    cooldownTurns: 0,
    range: 3,
    isSingleTarget: true,
  },
  {
    id: "bone_call",
    name: "Chamado Ósseo",
    description: "Invoca um Esqueleto para lutar ao seu lado numa célula livre próxima.",
    damageType: "death",
    defenseChannel: "magical",
    powerScaling: 0,
    cooldownTurns: 4,
    range: 2,
    isSingleTarget: true,
    summon: { templateId: "skeleton_minion", label: "Esqueleto" },
  },
];

const NECROMANCER_ULTIMATE: SkillDefinitionV1 = {
  id: "ossuary_collapse",
  name: "Colapso Ossário",
  description: "Convoca uma onda de energia mortífera em área ao redor do alvo. Carrega 1 turno antes de resolver.",
  damageType: "death",
  defenseChannel: "magical",
  powerScaling: 1.5,
  cooldownTurns: 3, // carga necessária
  range: 2,
  isSingleTarget: false,
  area: { shape: "radius", radius: 1, friendlyFire: true },
  chargeTurnsRequired: 1,
  isUltimate: true,
};

const SKELETON_SKILLS: SkillDefinitionV1[] = [
  {
    id: "bone_charge",
    name: "Investida Óssea",
    description: "Investida desajeitada com o que sobrou de arma.",
    damageType: "bludgeoning",
    defenseChannel: "physical",
    powerScaling: 1.0,
    cooldownTurns: 0,
    range: 1,
    isSingleTarget: true,
  },
];

const SKELETON_DEATH_REACTION: SkillDefinitionV1 = {
  id: "corpse_rupture",
  name: "Ruptura Cadavérica",
  description: "Ao ser destruído, o esqueleto explode em estilhaços ósseos ao seu redor. Possui fogo amigo.",
  damageType: "death",
  defenseChannel: "magical",
  powerScaling: 0.8,
  cooldownTurns: 0,
  range: 0,
  isSingleTarget: false,
  area: { shape: "radius", radius: 1, friendlyFire: true },
};

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
      skills: GOBLIN_CUTTER_SKILLS,
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
      skills: GOBLIN_HARPOONER_SKILLS,
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
      skills: GOBLIN_CHIEF_SKILLS,
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
      skills: BARREL_WITCH_SKILLS,
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
      skills: STONE_GUARDIAN_SKILLS,
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
      skills: NECROMANCER_SKILLS,
      ultimate: NECROMANCER_ULTIMATE,
    },
    // 7. Esqueleto Explosivo com Último Suspiro
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
      skills: SKELETON_SKILLS,
      deathReactionSkill: SKELETON_DEATH_REACTION,
    },
  ];
}

/** Templates de invocação — usados pelo orquestrador para instanciar novas unidades (ex: Chamado Ósseo). */
export const SUMMON_TEMPLATES: Record<string, (id: string, position: { q: number; r: number }) => CombatantStateV1> = {
  skeleton_minion: (id, position) => ({
    id,
    name: "Esqueleto Invocado",
    team: "enemy",
    hpCurrent: 60,
    hpMax: 60,
    power: 20,
    physicalDefense: 8,
    magicalDefense: 8,
    speed: 10,
    movement: 3,
    position,
    tags: ["undead", "skeleton", "summoned"],
    damageAffinity: { weaknesses: ["holy"], resistances: ["death"] },
    keywords: {},
    activeEffects: [],
    skills: SKELETON_SKILLS,
  }),
};
