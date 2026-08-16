import type {
  BestiaryCreature,
  BestiaryRarity,
  BestiaryRegion,
  CreatureArchetype,
  CreatureFamily,
  DamageChannel,
  LootEntry,
  LootTable,
  StatusEffectApplication,
  StatusEffectKind,
} from "@rupterya/game-core";
import { baseDropRateByLootRarity, deriveCreatureStats, deriveRewards, rarityProfiles } from "@rupterya/game-core";
import { creatureAbilitiesById } from "./creature-abilities";
import { lootItemsById, materialsById } from "./loot-catalog";
import { solitaryCreatureIds, warbandMembership, warbands, warbandsById } from "./warbands";

// ---------------------------------------------------------------------------
// Regiões de caça
// ---------------------------------------------------------------------------

export const bestiaryRegions: BestiaryRegion[] = [
  { id: "fiordevalle-vinhedos", name: "Vinhedos", kingdom: "FiorDeValle", levelMin: 1, levelMax: 6, danger: "Baixo", description: "Fileiras de parreiras e adegas abertas. É onde todo aventureiro de FiorDeValle começa.", creatureIds: ["cellar-rat", "leech-bat", "raider"] },
  { id: "fiordevalle-estrada", name: "Estrada Velha", kingdom: "FiorDeValle", levelMin: 5, levelMax: 10, danger: "Baixo", description: "A rota entre os vinhedos e o portão. Ninguém viaja sozinho depois do pôr do sol.", creatureIds: ["raider", "graveyard-crow", "pale-servant"] },
  { id: "fiordevalle-colinas", name: "Colinas", kingdom: "FiorDeValle", levelMin: 8, levelMax: 13, danger: "Médio", description: "Terreno aberto e vento constante. Bom para arqueiros, péssimo para emboscadas.", creatureIds: ["hanged-vintner", "ash-wolf", "pale-servant"] },
  { id: "fiordevalle-passo-quebrado", name: "Passo Quebrado", kingdom: "FiorDeValle", levelMin: 3, levelMax: 12, danger: "Baixo", description: "A garganta entre as colinas. A Horda Verde cobra pedágio de quem tenta atravessar.", creatureIds: ["goblin-batedor", "goblin-fundeiro", "goblin-montador", "goblin-chefe", "ash-wolf", "raider"] },
  { id: "fiordevalle-cemiterio", name: "Cemitério", kingdom: "FiorDeValle", levelMin: 11, levelMax: 16, danger: "Médio", description: "Além do portão. O solo aqui não aceita mais enterros — devolve tudo.", creatureIds: ["vampire-wanderer", "barrel-witch", "rotted-knight"] },
  { id: "fiordevalle-floresta", name: "Floresta Sombria", kingdom: "FiorDeValle", levelMin: 14, levelMax: 20, danger: "Alto", description: "A névoa não levanta nem ao meio-dia. O Lorde da Névoa tem corte aqui.", creatureIds: ["crimson-herald", "vrannoc-bride", "mist-captain"] },

  { id: "eldravia-arquivo", name: "Arquivo Externo", kingdom: "Eldravia", levelMin: 15, levelMax: 22, danger: "Médio", description: "Salas de leitura que se reorganizam sozinhas desde a Convergência.", creatureIds: ["stray-apprentice", "ink-servant", "rupture-shard"] },
  { id: "eldravia-claustro", name: "Claustro de Vidro", kingdom: "Eldravia", levelMin: 21, levelMax: 28, danger: "Alto", description: "Onde Eldravia guarda o que estudou e não conseguiu fechar.", creatureIds: ["hollow-echo", "library-golem", "essence-leech", "grimoire-owl"] },
  { id: "eldravia-fenda", name: "Fenda Aberta", kingdom: "Eldravia", levelMin: 27, levelMax: 35, danger: "Extremo", description: "Uma Ruptura que nunca fechou. O chão muda de lugar entre uma visita e outra.", creatureIds: ["convergence-hound", "glass-inquisitor", "rupture-weaver", "fractured-archon"] },

  { id: "dustfall-escoria", name: "Campos de Escória", kingdom: "Dustfall", levelMin: 30, levelMax: 38, danger: "Alto", description: "Restos industriais de uma guerra que Dustfall perdeu e nunca limpou.", creatureIds: ["slag-beetle", "cracked-nomad", "iron-hyena", "dust-worm"] },
  { id: "dustfall-labirinto", name: "Labirinto de Sal", kingdom: "Dustfall", levelMin: 24, levelMax: 32, danger: "Extremo", description: "Corredores de sal cristalizado. A Horda Verde acampa nas bordas e não entra no fundo.", creatureIds: ["orc-saqueador", "xama-goblin", "orc-carrasco", "senhor-da-guerra-orc", "minotauro-do-labirinto"] },
  { id: "dustfall-salinas", name: "Salinas", kingdom: "Dustfall", levelMin: 36, levelMax: 44, danger: "Extremo", description: "Planície branca que conserva tudo — inclusive quem morreu atravessando.", creatureIds: ["walking-cinder", "buried-sentinel", "brood-mother", "salt-knight"] },
  { id: "dustfall-cratera", name: "Cratera", kingdom: "Dustfall", levelMin: 43, levelMax: 50, danger: "Lendário", description: "O ponto de impacto. Só entra quem já não tem nada a perder em Rupterya.", creatureIds: ["slag-drake", "slag-colossus", "buried-titan"] },
];

// ---------------------------------------------------------------------------
// Construtor de criaturas
// ---------------------------------------------------------------------------

interface CreatureSeed {
  id: string;
  name: string;
  description: string;
  family: CreatureFamily;
  archetype: CreatureArchetype;
  rarity: BestiaryRarity;
  level: number;
  regionId: string;
  portraitPath?: string;
  effects?: StatusEffectApplication[];
  resist?: Partial<Record<DamageChannel | StatusEffectKind, number>>;
  weak?: Partial<Record<DamageChannel | StatusEffectKind, number>>;
  ai: string[];
  pack: [number, number];
  /** Materiais garantidos: [id, min, max] */
  mats: Array<[string, number, number]>;
  /** Materiais e equipamentos com chance derivada da raridade. */
  rolls?: string[];
  /** Drop assinatura exclusivo: [itemId, chance] */
  signature?: [string, number];
  lore?: string;
  codexKills?: number;
}

const regionKingdom = (regionId: string) =>
  bestiaryRegions.find((region) => region.id === regionId)?.kingdom ?? "Rupterya";

/** Chance final = curva base da raridade do item × multiplicador da criatura. */
function dropChance(entryId: string, creatureRarity: BestiaryRarity): LootEntry {
  const gear = lootItemsById.get(entryId);
  const material = materialsById.get(entryId);
  const rarity = gear?.rarity ?? material?.rarity ?? "common";
  const raw = baseDropRateByLootRarity[rarity] * rarityProfiles[creatureRarity].dropMultiplier;
  return {
    id: entryId,
    kind: gear ? "gear" : "material",
    chance: Math.min(gear ? 45 : 65, Number(raw.toFixed(2))),
    min: 1,
    max: material ? (rarity === "common" ? 3 : 1) : 1,
  };
}

function buildLoot(seed: CreatureSeed, goldReward: number): LootTable {
  return {
    goldMin: Math.round(goldReward * 0.7),
    goldMax: Math.round(goldReward * 1.35),
    guaranteed: seed.mats.map(([id, min, max]) => ({ id, kind: "material" as const, chance: 100, min, max })),
    rolls: (seed.rolls ?? []).map((id) => dropChance(id, seed.rarity)),
    signature: seed.signature
      ? { id: seed.signature[0], kind: lootItemsById.has(seed.signature[0]) ? "gear" : "material", chance: seed.signature[1] }
      : undefined,
  };
}

function makeCreature(seed: CreatureSeed): BestiaryCreature {
  const stats = deriveCreatureStats(seed.level, seed.archetype, seed.rarity);
  const rewards = deriveRewards(seed.level, seed.rarity);
  return {
    id: seed.id,
    name: seed.name,
    description: seed.description,
    portraitPath: seed.portraitPath ?? `/art/creatures/generated/${seed.id}.jpg`,
    family: seed.family,
    archetype: seed.archetype,
    rarity: seed.rarity,
    level: seed.level,
    regionId: seed.regionId,
    kingdom: regionKingdom(seed.regionId),
    stats,
    xpReward: rewards.xpReward,
    goldReward: rewards.goldReward,
    statusEffects: seed.effects ?? [],
    resistances: seed.resist ?? {},
    weaknesses: seed.weak ?? {},
    aiPriority: seed.ai,
    warbandIds: warbandMembership.bands.get(seed.id) ?? [],
    role: warbandMembership.roles.get(seed.id) ?? "regular",
    solitary: solitaryCreatureIds.has(seed.id),
    packMin: seed.pack[0],
    packMax: seed.pack[1],
    loot: buildLoot(seed, rewards.goldReward),
    loreEntry: seed.lore,
    codexKills: seed.codexKills ?? (seed.rarity === "common" ? 25 : seed.rarity === "rare" ? 10 : seed.rarity === "elite" ? 5 : 1),
    abilities: creatureAbilitiesById[seed.id] ?? [],
  };
}

// ---------------------------------------------------------------------------
// Bestiário
// ---------------------------------------------------------------------------

const seeds: CreatureSeed[] = [
  // ===== FiorDeValle ========================================================
  { id: "cellar-rat", name: "Rato de Adega", description: "Engordou com o que sobra das prensas. Vem sempre em ninhada.", family: "beast", archetype: "swarm", rarity: "common", level: 1, regionId: "fiordevalle-vinhedos", weak: { physical: 10 }, ai: ["ataque-basico sempre"], pack: [2, 4], mats: [["presa-rachada", 1, 2]], rolls: ["essencia-primaria", "cellar-knife"], lore: "Os vinhateiros não os matam mais. Aprenderam que o ninho vazio atrai coisa pior." },
  { id: "leech-bat", name: "Morcego Sanguessuga", description: "Difícil de acertar, fácil de matar. Bebe e some antes da retaliação.", family: "beast", archetype: "swarm", rarity: "common", level: 2, regionId: "fiordevalle-vinhedos", effects: [{ kind: "bleed", chance: 10, turns: 2, percentMaxHp: 1 }], resist: { physical: 8 }, ai: ["recuar se hp_proprio < 30%", "ataque-basico sempre"], pack: [2, 5], mats: [["presa-rachada", 1, 2]], rolls: ["essencia-primaria", "couro-endurecido"] },
  { id: "raider", name: "Saqueador", description: "Humano oportunista que explora as rotas isoladas da região.", family: "humanoid", archetype: "skirmisher", rarity: "common", level: 4, regionId: "fiordevalle-estrada", effects: [{ kind: "bleed", chance: 8, turns: 2, percentMaxHp: 2 }], ai: ["golpe-sujo se hp_alvo < 40%", "ataque-basico sempre"], pack: [1, 3], mats: [["bandagem-suja", 1, 2], ["insignia-quebrada", 1, 1]], rolls: ["essencia-primaria", "cellar-knife", "patched-cloak", "vintner-gloves"] },
  { id: "graveyard-crow", name: "Corvo do Cemitério", description: "Aprendeu a acompanhar aventureiros feridos. Sabe esperar.", family: "beast", archetype: "swarm", rarity: "common", level: 5, regionId: "fiordevalle-estrada", effects: [{ kind: "blind", chance: 12, turns: 1 }], ai: ["bicada-nos-olhos se turno == 1", "ataque-basico sempre"], pack: [3, 5], mats: [["presa-rachada", 1, 1]], rolls: ["essencia-primaria", "rusted-cap"] },
  { id: "pale-servant", name: "Servo Pálido", description: "O que sobra de quem foi mordido e não teve força para virar vampiro.", family: "undead", archetype: "brute", rarity: "common", level: 8, regionId: "fiordevalle-estrada", resist: { bleed: 60, poison: 40 }, weak: { burn: 25 }, ai: ["agarrao se aliado_atacou_alvo", "ataque-basico sempre"], pack: [1, 3], mats: [["cinza-de-sepultura", 1, 2]], rolls: ["essencia-primaria", "gravedigger-boots", "fang-dirk"], lore: "FiorDeValle os chama de servos por educação. Não servem a ninguém." },
  { id: "hanged-vintner", name: "Vinhateiro Enforcado", description: "Continua fazendo a ronda das parreiras que perdeu.", family: "undead", archetype: "brute", rarity: "common", level: 9, regionId: "fiordevalle-colinas", effects: [{ kind: "poison", chance: 12, turns: 3, percentMaxHp: 2 }], resist: { bleed: 60, physical: 10 }, weak: { burn: 25, magical: 10 }, ai: ["corda-ao-pescoco se hp_proprio < 50%", "ataque-basico sempre"], pack: [1, 2], mats: [["cinza-de-sepultura", 1, 2], ["bandagem-suja", 1, 1]], rolls: ["essencia-primaria", "essencia-refinada", "ashwolf-pelt"] },
  { id: "ash-wolf", name: "Lobo da Cinza", description: "Caça em alcateia e sempre morde quem está mais atrás na formação.", family: "beast", archetype: "skirmisher", rarity: "common", level: 11, regionId: "fiordevalle-colinas", effects: [{ kind: "bleed", chance: 18, turns: 3, percentMaxHp: 2 }], weak: { burn: 20 }, ai: ["bote-na-retaguarda se alvo_posicao == 'tras'", "uivo se aliados_vivos >= 2", "ataque-basico sempre"], pack: [2, 4], mats: [["couro-endurecido", 1, 2], ["presa-rachada", 1, 2]], rolls: ["essencia-primaria", "essencia-refinada", "ashwolf-pelt", "fang-dirk"] },
  { id: "vampire-wanderer", name: "Vampiro Errante", description: "Criatura noturna de FiorDeValle. À noite, a névoa oculta seus passos.", portraitPath: "/art/creatures/fiordevalle-vampire-common.jpeg", family: "undead", archetype: "skirmisher", rarity: "common", level: 13, regionId: "fiordevalle-cemiterio", effects: [{ kind: "bleed", chance: 14, turns: 2, percentMaxHp: 2 }], resist: { bleed: 70, physical: 12 }, weak: { burn: 30 }, ai: ["drenar se hp_proprio < 55%", "passo-de-nevoa se esquivou_ultimo_turno", "ataque-basico sempre"], pack: [1, 3], mats: [["cinza-de-sepultura", 1, 2], ["sangue-coagulado", 1, 1]], rolls: ["essencia-refinada", "fang-dirk", "grave-iron-helm", "crimson-censer"] },
  { id: "barrel-witch", name: "Bruxa dos Barris", description: "Fermenta coisas que não deviam fermentar. Ataca à distância e recua.", family: "humanoid", archetype: "caster", rarity: "common", level: 14, regionId: "fiordevalle-cemiterio", effects: [{ kind: "poison", chance: 20, turns: 3, percentMaxHp: 3 }], resist: { poison: 70 }, weak: { physical: 15 }, ai: ["borrifo-acido se alvo_sem_veneno", "trocar-posicao se hp_proprio < 40%", "ataque-basico sempre"], pack: [1, 2], mats: [["glandula-de-veneno", 1, 1]], rolls: ["essencia-refinada", "barrel-charm", "crimson-censer"] },
  { id: "rotted-knight", name: "Cavaleiro Apodrecido", description: "Armadura inteira, corpo não. Segura uma posição até ser desmontado.", family: "undead", archetype: "tank", rarity: "common", level: 16, regionId: "fiordevalle-cemiterio", resist: { physical: 25, bleed: 80 }, weak: { magical: 20, burn: 20 }, ai: ["provocar se aliado_hp < 40%", "postura-de-guarda se hp_proprio < 60%", "ataque-basico sempre"], pack: [1, 2], mats: [["cinza-de-sepultura", 2, 3], ["engrenagem-corroida", 1, 1]], rolls: ["essencia-refinada", "grave-iron-helm", "rotted-bulwark"] },
  { id: "crimson-herald", name: "Arauto Carmesim", description: "Vampiro raro que conduz a magia do sangue pelas rotas isoladas.", portraitPath: "/art/creatures/fiordevalle-vampire-rare.jpeg", family: "undead", archetype: "caster", rarity: "rare", level: 18, regionId: "fiordevalle-floresta", effects: [{ kind: "bleed", chance: 22, turns: 3, percentMaxHp: 3 }, { kind: "blind", chance: 15, turns: 2 }], resist: { bleed: 80, magical: 20 }, weak: { burn: 30 }, ai: ["chamado-de-sangue se aliados_vivos >= 1", "ceifa-carmesim se hp_alvo < 45%", "ataque-basico sempre"], pack: [1, 1], mats: [["sangue-coagulado", 1, 2], ["essencia-refinada", 1, 1]], rolls: ["essencia-ascendente", "crimson-censer", "rotted-bulwark", "mist-veil-mantle"], lore: "Os arautos não mordem para se alimentar. Mordem para entregar recado." },
  { id: "vrannoc-bride", name: "Noiva de Vrannoc", description: "Élfica capturada pela Colheita Cinzenta e devolvida como outra coisa.", family: "undead", archetype: "caster", rarity: "rare", level: 19, regionId: "fiordevalle-floresta", effects: [{ kind: "blind", chance: 25, turns: 2 }], resist: { magical: 30, bleed: 70 }, weak: { burn: 25 }, ai: ["canto-cego se alvo_sem_cegueira", "lamento se hp_proprio < 35%", "ataque-basico sempre"], pack: [1, 2], mats: [["sangue-coagulado", 1, 2]], rolls: ["essencia-ascendente", "barrel-charm", "mist-veil-mantle"], lore: "Zarna nega que Vrannoc Sael ainda faça noivas. As colinas discordam." },
  { id: "mist-captain", name: "Lorde da Névoa", description: "Boss vampírico que sai da névoa para tomar FiorDeValle.", portraitPath: "/art/creatures/fiordevalle-vampire-boss.jpeg", family: "undead", archetype: "skirmisher", rarity: "boss", level: 20, regionId: "fiordevalle-floresta", effects: [{ kind: "bleed", chance: 28, turns: 4, percentMaxHp: 4 }, { kind: "blind", chance: 18, turns: 2 }], resist: { bleed: 90, physical: 20, magical: 15 }, weak: { burn: 35 }, ai: ["forma-de-nevoa se hp_proprio < 30%", "convocar-servos se turno % 4 == 0", "sangria-real se hp_alvo < 50%", "ataque-basico sempre"], pack: [1, 1], mats: [["sangue-coagulado", 2, 4], ["essencia-refinada", 2, 3]], rolls: ["essencia-ascendente", "essencia-divina", "mist-veil-mantle", "crimson-censer", "rotted-bulwark"], signature: ["vrannoc-omen", 2.5], lore: "Ele não quer FiorDeValle. Quer a estrada que sai dela." },

  // ===== Eldravia ===========================================================
  { id: "stray-apprentice", name: "Aprendiz Desgarrado", description: "Entrou no Arquivo para estudar e não encontra mais a saída.", family: "humanoid", archetype: "caster", rarity: "common", level: 16, regionId: "eldravia-arquivo", effects: [{ kind: "burn", chance: 15, turns: 2, percentMaxHp: 2 }], resist: { magical: 15 }, weak: { physical: 20 }, ai: ["dardo se mp_proprio > 20%", "recuar se hp_proprio < 40%", "ataque-basico sempre"], pack: [1, 3], mats: [["insignia-quebrada", 1, 2]], rolls: ["essencia-primaria", "apprentice-rod", "scribe-wraps"] },
  { id: "ink-servant", name: "Servo de Tinta", description: "Constructo de escrita que continua copiando um texto que já não existe.", family: "construct", archetype: "brute", rarity: "common", level: 18, regionId: "eldravia-arquivo", effects: [{ kind: "blind", chance: 20, turns: 2 }], resist: { bleed: 100, poison: 100, physical: 10 }, weak: { magical: 25 }, ai: ["jato-de-tinta se alvo_sem_cegueira", "ataque-basico sempre"], pack: [1, 3], mats: [["engrenagem-corroida", 1, 2]], rolls: ["essencia-primaria", "essencia-refinada", "scribe-wraps", "library-plating"] },
  { id: "rupture-shard", name: "Fragmento de Ruptura", description: "Pedaço de realidade solto. Não tem intenção — só corta o que encosta.", family: "aberration", archetype: "swarm", rarity: "common", level: 20, regionId: "eldravia-arquivo", effects: [{ kind: "bleed", chance: 20, turns: 2, percentMaxHp: 2 }], resist: { physical: 30, bleed: 100, poison: 100 }, weak: { magical: 30 }, ai: ["deslocar se atacado_ultimo_turno", "ataque-basico sempre"], pack: [2, 4], mats: [["fragmento-de-ruptura", 1, 2]], rolls: ["essencia-refinada", "shard-edge"] },
  { id: "hollow-echo", name: "Eco Oco", description: "Repete o gesto de alguém que morreu ali. Repete cada vez mais rápido.", family: "aberration", archetype: "caster", rarity: "rare", level: 22, regionId: "eldravia-claustro", effects: [{ kind: "blind", chance: 30, turns: 2 }], resist: { physical: 45, magical: 10, bleed: 100, poison: 100, burn: 50 }, weak: { magical: 0 }, ai: ["repetir-ultima-habilidade-do-alvo se alvo_usou_habilidade", "eco-crescente se turno >= 4", "ataque-basico sempre"], pack: [1, 1], mats: [["estilhaco-de-eco", 1, 1], ["fragmento-de-ruptura", 1, 2]], rolls: ["essencia-ascendente", "glass-focus", "archive-crown"], signature: ["hollow-echo-crown", 1.8], lore: "O Eco Oco não é um monstro. É a Convergência ainda acontecendo em um ponto só.", codexKills: 8 },
  { id: "library-golem", name: "Golem de Biblioteca", description: "Foi construído para carregar estantes. Continua achando que você é uma.", family: "construct", archetype: "tank", rarity: "common", level: 23, regionId: "eldravia-claustro", resist: { physical: 35, bleed: 100, poison: 100, burn: 40 }, weak: { magical: 25 }, ai: ["esmagar se alvo_posicao == 'centro'", "postura-de-guarda se hp_proprio < 50%", "ataque-basico sempre"], pack: [1, 2], mats: [["engrenagem-corroida", 2, 3], ["nucleo-inerte", 1, 1]], rolls: ["essencia-refinada", "library-plating", "archive-crown"] },
  { id: "essence-leech", name: "Sanguessuga de Essência", description: "Não bebe sangue. Bebe MP, e sabe exatamente quem tem mais.", family: "aberration", archetype: "skirmisher", rarity: "common", level: 25, regionId: "eldravia-claustro", effects: [{ kind: "poison", chance: 18, turns: 3, percentMaxHp: 2 }], resist: { magical: 35, poison: 80 }, weak: { physical: 20 }, ai: ["drenar-essencia se alvo_mp > 40%", "fugir se hp_proprio < 25%", "ataque-basico sempre"], pack: [1, 3], mats: [["fragmento-de-ruptura", 1, 2]], rolls: ["essencia-refinada", "essencia-ascendente", "glass-focus", "shard-edge"] },
  { id: "grimoire-owl", name: "Coruja-Grimório", description: "Guarda de estante com penas de pergaminho. Ataca quem lê alto demais.", family: "beast", archetype: "caster", rarity: "common", level: 26, regionId: "eldravia-claustro", effects: [{ kind: "blind", chance: 24, turns: 2 }], resist: { magical: 25 }, weak: { physical: 15, burn: 30 }, ai: ["silenciar se alvo_classe == 'mage'", "voo-cego se hp_proprio < 45%", "ataque-basico sempre"], pack: [1, 2], mats: [["presa-rachada", 1, 1], ["fragmento-de-ruptura", 1, 1]], rolls: ["essencia-ascendente", "archive-crown", "glass-focus"] },
  { id: "convergence-hound", name: "Cão de Convergência", description: "Persegue quem tenta mudar de posição. Nunca perde o rastro.", family: "aberration", archetype: "skirmisher", rarity: "elite", level: 28, regionId: "eldravia-fenda", effects: [{ kind: "bleed", chance: 26, turns: 3, percentMaxHp: 3 }], resist: { physical: 25, bleed: 100 }, weak: { magical: 20 }, ai: ["perseguir se alvo_trocou_posicao", "salto se distancia > 1", "ataque-basico sempre"], pack: [1, 2], mats: [["fragmento-de-ruptura", 2, 3], ["couro-endurecido", 1, 2]], rolls: ["essencia-ascendente", "shard-edge", "converged-mantle"], signature: ["convergence-spurs", 1.2] },
  { id: "glass-inquisitor", name: "Inquisidor de Vidro", description: "Eldravia enviou para fechar a Fenda. Ficou do lado de dentro.", family: "humanoid", archetype: "brute", rarity: "rare", level: 30, regionId: "eldravia-fenda", effects: [{ kind: "burn", chance: 24, turns: 3, percentMaxHp: 3 }], resist: { magical: 30, burn: 60 }, weak: { physical: 10 }, ai: ["julgamento se hp_alvo > 70%", "purgar se alvo_com_buff", "ataque-basico sempre"], pack: [1, 2], mats: [["insignia-quebrada", 2, 3], ["essencia-refinada", 1, 2]], rolls: ["essencia-ascendente", "shard-edge", "archive-crown", "converged-mantle"] },
  { id: "rupture-weaver", name: "Tecelão de Rupturas", description: "Abre pequenas fendas no meio do combate e ataca por dentro delas.", family: "aberration", archetype: "caster", rarity: "elite", level: 32, regionId: "eldravia-fenda", effects: [{ kind: "blind", chance: 28, turns: 2 }, { kind: "burn", chance: 20, turns: 3, percentMaxHp: 3 }], resist: { physical: 40, magical: 20, bleed: 100, poison: 100 }, weak: { magical: 0 }, ai: ["abrir-fenda se turno % 3 == 0", "trocar-posicao-do-alvo se alvo_posicao == 'frente'", "ataque-basico sempre"], pack: [1, 1], mats: [["estilhaco-de-eco", 1, 2], ["fragmento-de-ruptura", 2, 4]], rolls: ["essencia-ascendente", "essencia-divina", "converged-mantle", "archive-crown"] },
  { id: "fractured-archon", name: "Arconte Fraturado", description: "Foi uma das autoridades de Eldravia. A Convergência o dividiu e ele não voltou inteiro.", family: "aberration", archetype: "caster", rarity: "boss", level: 34, regionId: "eldravia-fenda", effects: [{ kind: "burn", chance: 30, turns: 4, percentMaxHp: 4 }, { kind: "blind", chance: 22, turns: 2 }], resist: { physical: 40, magical: 30, bleed: 100, poison: 100 }, weak: { burn: 0 }, ai: ["fase-dois se hp_proprio < 50%", "convergir se recurso_maximo", "juizo-fraturado se turno % 5 == 0", "ataque-basico sempre"], pack: [1, 1], mats: [["estilhaco-de-eco", 2, 4], ["essencia-ascendente", 1, 2]], rolls: ["essencia-divina", "converged-mantle", "archive-crown", "shard-edge"], signature: ["convergence-seal", 2.5], lore: "Ele ainda cumprimenta pelo nome quem serviu sob suas ordens. Depois ataca mesmo assim." },

  // ===== Dustfall ===========================================================
  { id: "slag-beetle", name: "Escaravelho de Escória", description: "Come metal descartado. A carapaça é o que ele digeriu ontem.", family: "insect", archetype: "swarm", rarity: "common", level: 31, regionId: "dustfall-escoria", resist: { physical: 25, poison: 60 }, weak: { magical: 20 }, ai: ["enxame se aliados_vivos >= 3", "ataque-basico sempre"], pack: [3, 5], mats: [["quitina-lascada", 1, 3]], rolls: ["essencia-refinada", "slag-shiv", "salt-wrap"] },
  { id: "cracked-nomad", name: "Nômade Rachado", description: "Bebeu da água errada. Ainda negocia, mas não termina as frases.", family: "humanoid", archetype: "skirmisher", rarity: "common", level: 33, regionId: "dustfall-escoria", effects: [{ kind: "bleed", chance: 20, turns: 3, percentMaxHp: 2 }], resist: { burn: 40 }, ai: ["punhalada se alvo_hp < 50%", "arremesso se distancia > 1", "ataque-basico sempre"], pack: [2, 4], mats: [["bandagem-suja", 2, 3], ["insignia-quebrada", 1, 2]], rolls: ["essencia-refinada", "slag-shiv", "jaw-axe"] },
  { id: "iron-hyena", name: "Hiena de Ferro", description: "Mandíbula reforçada por lascas de escória que se alojaram e ficaram.", family: "beast", archetype: "skirmisher", rarity: "common", level: 35, regionId: "dustfall-escoria", effects: [{ kind: "bleed", chance: 26, turns: 3, percentMaxHp: 3 }], resist: { physical: 15, burn: 30 }, ai: ["morder-ferido se alvo_hp < 40%", "matilha se aliados_vivos >= 2", "ataque-basico sempre"], pack: [2, 4], mats: [["presa-rachada", 2, 3], ["couro-endurecido", 1, 2]], rolls: ["essencia-refinada", "jaw-axe", "beetle-carapace"] },
  { id: "dust-worm", name: "Verme de Poeira", description: "Emerge sob a formação. Quem estiver no centro sente primeiro.", family: "beast", archetype: "brute", rarity: "common", level: 37, regionId: "dustfall-escoria", effects: [{ kind: "poison", chance: 22, turns: 3, percentMaxHp: 3 }], resist: { physical: 30, poison: 70 }, weak: { magical: 25 }, ai: ["emergir se turno == 1", "engolir se alvo_hp < 25%", "ataque-basico sempre"], pack: [1, 2], mats: [["couro-endurecido", 2, 3], ["glandula-de-veneno", 1, 1]], rolls: ["essencia-ascendente", "beetle-carapace", "dust-piercer"] },
  { id: "walking-cinder", name: "Cinzeiro Ambulante", description: "O que resta quando o fogo de Dustfall não encontra mais o que queimar.", family: "elemental", archetype: "caster", rarity: "common", level: 39, regionId: "dustfall-salinas", effects: [{ kind: "burn", chance: 32, turns: 3, percentMaxHp: 4 }], resist: { burn: 100, physical: 25, bleed: 100 }, weak: { magical: 20 }, ai: ["labareda se alvo_sem_queimadura", "implodir se hp_proprio < 20%", "ataque-basico sempre"], pack: [1, 3], mats: [["brasa-persistente", 1, 2]], rolls: ["essencia-ascendente", "venom-gland-ring", "dust-piercer"] },
  { id: "buried-sentinel", name: "Sentinela Enterrada", description: "Guarda um posto que o sal cobriu há gerações. Não recebeu ordem de sair.", family: "construct", archetype: "tank", rarity: "elite", level: 41, regionId: "dustfall-salinas", resist: { physical: 45, bleed: 100, poison: 100, burn: 50 }, weak: { magical: 30 }, ai: ["bloquear-rota se alvo_tentou_fugir", "postura-de-guarda se hp_proprio < 60%", "ataque-basico sempre"], pack: [1, 1], mats: [["nucleo-inerte", 1, 2], ["engrenagem-corroida", 2, 4]], rolls: ["essencia-ascendente", "essencia-divina", "buried-sentinel-plate", "beetle-carapace"] },
  { id: "brood-mother", name: "Mãe da Ninhada", description: "Não luta sozinha. Nunca lutou sozinha.", family: "insect", archetype: "brute", rarity: "elite", level: 43, regionId: "dustfall-salinas", effects: [{ kind: "poison", chance: 35, turns: 4, percentMaxHp: 4 }], resist: { poison: 100, physical: 25 }, weak: { burn: 35 }, ai: ["desovar se aliados_vivos < 2", "ferroar se alvo_envenenado", "ataque-basico sempre"], pack: [1, 1], mats: [["quitina-lascada", 3, 5], ["glandula-de-veneno", 1, 3]], rolls: ["essencia-divina", "venom-gland-ring", "beetle-carapace"], signature: ["brood-mother-stinger", 2] },
  { id: "salt-knight", name: "Cavaleiro de Sal", description: "Morreu atravessando as salinas e o sal não deixou terminar de morrer.", family: "undead", archetype: "tank", rarity: "rare", level: 44, regionId: "dustfall-salinas", effects: [{ kind: "bleed", chance: 28, turns: 3, percentMaxHp: 3 }], resist: { physical: 35, bleed: 100, poison: 100 }, weak: { magical: 25 }, ai: ["erguer-se se hp_proprio == 0 e primeira_vez", "investida se turno == 1", "ataque-basico sempre"], pack: [1, 2], mats: [["cinza-de-sepultura", 2, 4], ["essencia-ascendente", 1, 1]], rolls: ["essencia-divina", "buried-sentinel-plate", "dust-piercer"], signature: ["salt-knight-blade", 2] },
  { id: "slag-drake", name: "Draco de Escória", description: "Jovem demais para voar longe, velho demais para não cobrar a passagem.", family: "dragonkin", archetype: "brute", rarity: "elite", level: 46, regionId: "dustfall-cratera", effects: [{ kind: "burn", chance: 38, turns: 4, percentMaxHp: 5 }], resist: { burn: 100, physical: 35, magical: 20 }, weak: { poison: 25 }, ai: ["sopro se aliados_inimigos >= 2", "voo-rasante se hp_proprio < 40%", "ataque-basico sempre"], pack: [1, 1], mats: [["escama-de-escoria", 1, 2], ["chifre-lascado", 1, 2]], rolls: ["essencia-divina", "dust-piercer", "buried-sentinel-plate"], signature: ["slag-drake-fang", 2.2] },
  { id: "slag-colossus", name: "Colosso de Escória", description: "Montado com o que sobrou de cem constructos. Nenhum deles queria isso.", family: "construct", archetype: "tank", rarity: "boss", level: 48, regionId: "dustfall-cratera", effects: [{ kind: "burn", chance: 26, turns: 3, percentMaxHp: 4 }], resist: { physical: 50, bleed: 100, poison: 100, burn: 60 }, weak: { magical: 30 }, ai: ["desmoronar se hp_proprio < 25%", "varrer-linha se turno % 3 == 0", "postura-de-guarda se hp_proprio < 60%", "ataque-basico sempre"], pack: [1, 1], mats: [["nucleo-inerte", 2, 4], ["escama-de-escoria", 1, 2], ["essencia-divina", 1, 1]], rolls: ["buried-sentinel-plate", "dust-piercer", "venom-gland-ring"] },
  { id: "buried-titan", name: "O Titã Soterrado", description: "Está sob a Cratera desde a Convergência. Dustfall foi construída sobre ele sem saber.", family: "aberration", archetype: "tank", rarity: "worldboss", level: 50, regionId: "dustfall-cratera", effects: [{ kind: "burn", chance: 30, turns: 4, percentMaxHp: 5 }, { kind: "bleed", chance: 30, turns: 4, percentMaxHp: 5 }], resist: { physical: 45, magical: 40, bleed: 100, poison: 100, burn: 70 }, weak: {}, ai: ["despertar se turno == 1", "fase-dois se hp_proprio < 66%", "fase-tres se hp_proprio < 33%", "impacto-de-cratera se turno % 4 == 0", "ataque-basico sempre"], pack: [1, 1], mats: [["essencia-divina", 2, 4], ["estilhaco-de-eco", 2, 3], ["escama-de-escoria", 2, 3]], rolls: ["buried-sentinel-plate", "converged-mantle", "dust-piercer"], signature: ["buried-titan-heart", 5], lore: "A Grande Convergência não terminou. Só ficou quieta o bastante para plantarem cidades em cima.", codexKills: 1 },
  // ===== Horda Verde ========================================================
  { id: "goblin-batedor", name: "Goblin Batedor", description: "Corre à frente do bando marcando quem está sozinho na estrada.", family: "humanoid", archetype: "swarm", rarity: "common", level: 3, regionId: "fiordevalle-passo-quebrado", weak: { physical: 10 }, ai: ["gritar-alarme se turno == 1", "fugir se aliados_vivos == 0", "ataque-basico sempre"], pack: [3, 5], mats: [["bandagem-suja", 1, 2]], rolls: ["essencia-primaria", "goblin-cleaver"], lore: "Nunca luta até o fim. Ele foi enviado para contar quantos vocês são." },
  { id: "goblin-fundeiro", name: "Goblin Fundeiro", description: "Atira pedras da retaguarda e acerta olho com frequência incômoda.", family: "humanoid", archetype: "swarm", rarity: "common", level: 5, regionId: "fiordevalle-passo-quebrado", effects: [{ kind: "blind", chance: 16, turns: 1 }], ai: ["funda se distancia > 1", "recuar se alvo_adjacente", "ataque-basico sempre"], pack: [2, 4], mats: [["bandagem-suja", 1, 2], ["insignia-quebrada", 1, 1]], rolls: ["essencia-primaria", "sling-pouch", "goblin-cleaver"] },
  { id: "goblin-montador", name: "Goblin Montador", description: "Monta um Lobo da Cinza. Se o lobo cai, ele foge; se ele cai, o lobo continua.", family: "humanoid", archetype: "skirmisher", rarity: "common", level: 8, regionId: "fiordevalle-passo-quebrado", effects: [{ kind: "bleed", chance: 14, turns: 2, percentMaxHp: 2 }], ai: ["investida se turno == 1", "flanquear se alvo_posicao == 'tras'", "ataque-basico sempre"], pack: [2, 3], mats: [["couro-endurecido", 1, 2], ["presa-rachada", 1, 1]], rolls: ["essencia-primaria", "essencia-refinada", "goblin-cleaver", "fang-dirk"] },
  { id: "goblin-chefe", name: "Chefe de Bando Goblin", description: "Manda os menores na frente e só entra quando o número está a favor.", family: "humanoid", archetype: "brute", rarity: "rare", level: 11, regionId: "fiordevalle-passo-quebrado", effects: [{ kind: "bleed", chance: 20, turns: 3, percentMaxHp: 2 }], ai: ["berro-de-comando se aliados_vivos >= 2", "empurrar-subordinado se hp_proprio < 40%", "ataque-basico sempre"], pack: [1, 1], mats: [["insignia-quebrada", 2, 3], ["essencia-refinada", 1, 1]], rolls: ["essencia-ascendente", "bone-totem", "ashwolf-pelt", "grave-iron-helm"] },
  { id: "orc-saqueador", name: "Orc Saqueador", description: "Não corre, não recua e não entende por que você tentaria fugir.", family: "humanoid", archetype: "brute", rarity: "common", level: 24, regionId: "dustfall-labirinto", effects: [{ kind: "bleed", chance: 22, turns: 3, percentMaxHp: 3 }], resist: { physical: 15, bleed: 30 }, ai: ["esmagar se alvo_posicao == 'frente'", "ignorar-dor se hp_proprio < 30%", "ataque-basico sempre"], pack: [2, 4], mats: [["couro-endurecido", 2, 3], ["insignia-quebrada", 1, 2]], rolls: ["essencia-refinada", "warband-hide", "jaw-axe"] },
  { id: "xama-goblin", name: "Xamã Goblin", description: "Queima os próprios aliados para acertar você. Considera aceitável.", family: "humanoid", archetype: "caster", rarity: "common", level: 26, regionId: "dustfall-labirinto", effects: [{ kind: "burn", chance: 26, turns: 3, percentMaxHp: 3 }], resist: { burn: 50 }, weak: { physical: 20 }, ai: ["labareda se aliados_inimigos >= 2", "totem se turno % 4 == 0", "ataque-basico sempre"], pack: [1, 2], mats: [["brasa-persistente", 1, 1], ["insignia-quebrada", 1, 2]], rolls: ["essencia-ascendente", "bone-totem", "archive-crown"] },
  { id: "orc-carrasco", name: "Orc Carrasco", description: "Escolhe um alvo no primeiro turno e não muda de ideia até um dos dois cair.", family: "humanoid", archetype: "brute", rarity: "rare", level: 28, regionId: "dustfall-labirinto", effects: [{ kind: "bleed", chance: 30, turns: 4, percentMaxHp: 4 }], resist: { physical: 20, bleed: 40 }, ai: ["marcar-alvo se turno == 1", "execucao se alvo_hp < 30%", "ataque-basico sempre"], pack: [1, 1], mats: [["couro-endurecido", 2, 4], ["essencia-ascendente", 1, 1]], rolls: ["essencia-divina", "warband-hide", "dust-piercer"], signature: ["executioner-axe", 2] },
  { id: "senhor-da-guerra-orc", name: "Senhor da Guerra", description: "Uniu goblins e orcs sob a mesma bandeira. Nenhum dos dois lados gostou, e nenhum reclamou duas vezes.", family: "humanoid", archetype: "brute", rarity: "boss", level: 32, regionId: "dustfall-labirinto", effects: [{ kind: "bleed", chance: 32, turns: 4, percentMaxHp: 4 }], resist: { physical: 30, bleed: 60, magical: 10 }, ai: ["convocar-horda se turno % 4 == 0", "fase-dois se hp_proprio < 45%", "varrer-linha se aliados_inimigos >= 2", "ataque-basico sempre"], pack: [1, 1], mats: [["couro-endurecido", 3, 5], ["essencia-ascendente", 1, 2]], rolls: ["essencia-divina", "warlord-plate", "dust-piercer", "warband-hide"], signature: ["warlord-plate", 8], lore: "A Horda Verde não tem sucessão. Quando ele cair, o Passo Quebrado fica vazio por uma estação." },

  // ===== Solitário ==========================================================
  { id: "minotauro-do-labirinto", name: "Minotauro do Labirinto", description: "Vive no fundo das salinas. A Horda Verde acampa perto e nunca entra — ele não aceita companhia, nem aliada.", family: "beast", archetype: "brute", rarity: "elite", level: 30, regionId: "dustfall-labirinto", effects: [{ kind: "bleed", chance: 34, turns: 4, percentMaxHp: 5 }], resist: { physical: 35, bleed: 50 }, weak: { magical: 20 }, ai: ["investida-de-chifre se turno == 1", "furia se hp_proprio < 50%", "perseguir se alvo_trocou_posicao", "ataque-basico sempre"], pack: [1, 1], mats: [["chifre-lascado", 1, 2], ["couro-endurecido", 2, 4]], rolls: ["essencia-divina", "warband-hide", "dust-piercer"], signature: ["minotaur-horn-maul", 2.5], lore: "Orcs contam que já tentaram recrutá-lo. Contam a história sem mencionar quantos foram." },

  // ===== Criaturas exclusivas de instância · FiorDeValle ==================
  { id: "cabra-ladra", name: "Cabra-Ladra", description: "Fera de encosta que aprendeu a arrancar bolsas e fugir por atalhos impossíveis.", family: "beast", archetype: "skirmisher", rarity: "common", level: 2, regionId: "fiordevalle-vinhedos", ai: ["roubar-suprimento se turno == 1", "ataque-basico sempre"], pack: [1, 3], mats: [["couro-endurecido", 1, 1]], rolls: ["essencia-primaria"] },
  { id: "sacristao-oco", name: "Sacristão Oco", description: "Um antigo guardião da capela, agora guiado apenas pelo som dos sinos quebrados.", family: "undead", archetype: "tank", rarity: "rare", level: 10, regionId: "fiordevalle-cemiterio", resist: { physical: 15 }, weak: { magical: 12 }, ai: ["guardar-aliado se aliados_vivos > 1", "ataque-basico sempre"], pack: [1, 2], mats: [["cinza-de-sepultura", 1, 2]], rolls: ["essencia-refinada"] },
  { id: "alfa-uivo-cinzento", name: "Alfa do Uivo Cinzento", description: "O predador dominante da gruta. Seu uivo transforma medo em disciplina de alcateia.", family: "beast", archetype: "brute", rarity: "boss", level: 18, regionId: "fiordevalle-floresta", effects: [{ kind: "bleed", chance: 28, turns: 3, percentMaxHp: 3 }], resist: { physical: 20 }, ai: ["uivo-de-guerra se turno == 1", "investida se alvo_hp < 50%", "ataque-basico sempre"], pack: [1, 1], mats: [["couro-endurecido", 2, 3]], rolls: ["essencia-ascendente"] },
  { id: "lebre-de-brasa", name: "Lebre de Brasa", description: "Pequena fera que se alimenta de raízes queimadas e deixa faíscas ao escapar.", family: "beast", archetype: "swarm", rarity: "common", level: 3, regionId: "fiordevalle-vinhedos", effects: [{ kind: "burn", chance: 8, turns: 1, percentMaxHp: 1 }], ai: ["fugir se hp_proprio < 25%", "ataque-basico sempre"], pack: [2, 4], mats: [["presa-rachada", 1, 1]], rolls: ["essencia-primaria"] },
  { id: "aranha-de-adega", name: "Aranha de Adega", description: "Constrói ninhos entre barris velhos e paralisa presas com veneno de fermentação.", family: "insect", archetype: "skirmisher", rarity: "rare", level: 9, regionId: "fiordevalle-vinhedos", effects: [{ kind: "poison", chance: 18, turns: 3, percentMaxHp: 2 }], ai: ["envenenar se alvo_sem_veneno", "ataque-basico sempre"], pack: [1, 3], mats: [["essencia-primaria", 1, 1]], rolls: ["essencia-refinada"] },
  { id: "horror-da-prensa", name: "Horror da Prensa", description: "Carne, madeira e vinho coagulado comprimidos numa criatura que ainda range como uma máquina.", family: "aberration", archetype: "tank", rarity: "boss", level: 18, regionId: "fiordevalle-floresta", effects: [{ kind: "bleed", chance: 24, turns: 3, percentMaxHp: 3 }], resist: { physical: 28 }, weak: { magical: 15 }, ai: ["esmagar se turno % 3 == 0", "ataque-basico sempre"], pack: [1, 1], mats: [["sangue-coagulado", 1, 2]], rolls: ["essencia-ascendente"] },
  { id: "cobrador-goblin", name: "Cobrador Goblin", description: "Fiscal improvisado da Horda Verde. Exige pedágio mesmo quando a estrada não pertence a ninguém.", family: "humanoid", archetype: "skirmisher", rarity: "common", level: 5, regionId: "fiordevalle-passo-quebrado", ai: ["golpe-sujo se turno == 1", "ataque-basico sempre"], pack: [1, 3], mats: [["insignia-quebrada", 1, 1]], rolls: ["essencia-primaria"] },
  { id: "falcao-do-vigia", name: "Falcão do Vigia", description: "Ave treinada por uma ordem extinta, continua marcando intrusos para arqueiros que já morreram.", family: "beast", archetype: "skirmisher", rarity: "rare", level: 11, regionId: "fiordevalle-colinas", effects: [{ kind: "blind", chance: 16, turns: 1 }], ai: ["marcar-alvo se turno == 1", "ataque-basico sempre"], pack: [1, 2], mats: [["presa-rachada", 1, 1]], rolls: ["essencia-refinada"] },
  { id: "noiva-do-mausoleu", name: "Noiva do Mausoléu", description: "A última promessa de uma família nobre, preservada em véu e rancor.", family: "undead", archetype: "caster", rarity: "boss", level: 18, regionId: "fiordevalle-cemiterio", effects: [{ kind: "blind", chance: 24, turns: 2 }, { kind: "bleed", chance: 18, turns: 3, percentMaxHp: 2 }], resist: { magical: 25 }, ai: ["veu-funebre se turno == 1", "lamento se aliados_inimigos >= 2", "ataque-basico sempre"], pack: [1, 1], mats: [["cinza-de-sepultura", 2, 3], ["sangue-coagulado", 1, 1]], rolls: ["essencia-ascendente"] },
  { id: "cacador-sem-rosto", name: "Caçador Sem Rosto", description: "Um homem que esqueceu o próprio nome, mas não esqueceu como seguir pegadas.", family: "humanoid", archetype: "skirmisher", rarity: "common", level: 7, regionId: "fiordevalle-estrada", effects: [{ kind: "bleed", chance: 12, turns: 2, percentMaxHp: 1 }], ai: ["marcar-alvo se turno == 1", "ataque-basico sempre"], pack: [1, 2], mats: [["bandagem-suja", 1, 2]], rolls: ["essencia-primaria"] },
  { id: "assombro-do-mosto", name: "Assombro do Mosto", description: "Uma lembrança de festa e afogamento que rasteja entre raízes embebidas de vinho.", family: "undead", archetype: "caster", rarity: "rare", level: 13, regionId: "fiordevalle-floresta", effects: [{ kind: "blind", chance: 18, turns: 2 }], resist: { magical: 18 }, ai: ["nevoa-do-mosto se turno == 1", "ataque-basico sempre"], pack: [1, 2], mats: [["sangue-coagulado", 1, 1]], rolls: ["essencia-refinada"] },
  { id: "barao-da-bruma", name: "Barão da Bruma", description: "Vampiro que reivindica a floresta como feudo e transforma cada trilha em salão de caça.", family: "undead", archetype: "skirmisher", rarity: "boss", level: 20, regionId: "fiordevalle-floresta", effects: [{ kind: "bleed", chance: 30, turns: 4, percentMaxHp: 4 }], resist: { magical: 22, bleed: 45 }, ai: ["passo-na-nevoa se turno == 1", "execucao se alvo_hp < 35%", "ataque-basico sempre"], pack: [1, 1], mats: [["sangue-coagulado", 2, 3]], rolls: ["essencia-ascendente"] },

  // ===== Criaturas exclusivas de instância · Eldravia =====================
  { id: "pajem-de-pergaminho", name: "Pajem de Pergaminho", description: "Folhas encantadas dobradas numa forma humanoide para carregar livros que ninguém mais lê.", family: "construct", archetype: "swarm", rarity: "common", level: 16, regionId: "eldravia-arquivo", weak: { burn: 20 }, ai: ["corte-de-papel sempre"], pack: [2, 4], mats: [["fragmento-de-ruptura", 1, 1]], rolls: ["essencia-refinada"] },
  { id: "devora-tinta", name: "Devora-Tinta", description: "Aberração que apaga runas, mapas e memórias escritas antes de atacar o escriba.", family: "aberration", archetype: "caster", rarity: "rare", level: 20, regionId: "eldravia-arquivo", effects: [{ kind: "blind", chance: 18, turns: 2 }], ai: ["apagar-runa se turno == 1", "ataque-basico sempre"], pack: [1, 2], mats: [["fragmento-de-ruptura", 1, 2]], rolls: ["essencia-refinada"] },
  { id: "bibliotecario-invertido", name: "Bibliotecário Invertido", description: "O responsável pelo arquivo continua catalogando visitantes — agora de cabeça para baixo e contra a gravidade.", family: "construct", archetype: "tank", rarity: "boss", level: 27, regionId: "eldravia-arquivo", resist: { magical: 30 }, ai: ["reorganizar-arquivo se turno == 1", "selar-habilidade se turno % 3 == 0", "ataque-basico sempre"], pack: [1, 1], mats: [["fragmento-de-ruptura", 2, 3]], rolls: ["essencia-ascendente"] },
  { id: "faisca-discente", name: "Faísca Discente", description: "Restos de exercícios arcanos que nunca foram dissipados e aprenderam a perseguir calor corporal.", family: "elemental", archetype: "swarm", rarity: "common", level: 17, regionId: "eldravia-arquivo", effects: [{ kind: "burn", chance: 12, turns: 2, percentMaxHp: 1 }], ai: ["salto-eletrico sempre"], pack: [2, 4], mats: [["fragmento-de-ruptura", 1, 1]], rolls: ["essencia-refinada"] },
  { id: "sanguessuga-de-mana", name: "Sanguessuga de Mana", description: "Parasita translúcido que segue conjuradores e engorda com magia desperdiçada.", family: "aberration", archetype: "skirmisher", rarity: "rare", level: 24, regionId: "eldravia-claustro", resist: { magical: 24 }, ai: ["drenar-mana se turno == 1", "ataque-basico sempre"], pack: [1, 3], mats: [["fragmento-de-ruptura", 1, 2]], rolls: ["essencia-ascendente"] },
  { id: "astronomo-partido", name: "Astrônomo Partido", description: "Um pesquisador dividido entre dois céus incompatíveis. Cada metade prevê um futuro diferente.", family: "aberration", archetype: "caster", rarity: "boss", level: 32, regionId: "eldravia-fenda", effects: [{ kind: "blind", chance: 24, turns: 2 }], resist: { magical: 35 }, ai: ["prever-golpe se turno == 1", "chuva-estelar se turno % 3 == 0", "ataque-basico sempre"], pack: [1, 1], mats: [["estilhaco-de-eco", 1, 2]], rolls: ["essencia-divina"] },
  { id: "sentinela-de-vitrine", name: "Sentinela de Vitrine", description: "Constructo de vidro criado para impedir que peças raras saíssem do claustro. Agora impede qualquer um de entrar.", family: "construct", archetype: "tank", rarity: "common", level: 21, regionId: "eldravia-claustro", resist: { physical: 20, magical: 12 }, weak: { physical: 8 }, ai: ["guardar-entrada sempre"], pack: [1, 2], mats: [["fragmento-de-ruptura", 1, 1]], rolls: ["essencia-refinada"] },
  { id: "gemeo-de-espelho", name: "Gêmeo de Espelho", description: "Reflexo que escolheu não imitar mais. Ataca um instante depois de você decidir.", family: "aberration", archetype: "skirmisher", rarity: "rare", level: 25, regionId: "eldravia-claustro", effects: [{ kind: "blind", chance: 14, turns: 1 }], ai: ["refletir se turno % 2 == 0", "ataque-basico sempre"], pack: [1, 2], mats: [["estilhaco-de-eco", 1, 1]], rolls: ["essencia-ascendente"] },
  { id: "prelado-prismatico", name: "Prelado Prismático", description: "Guardião de uma câmara que separa luz, magia e carne com a mesma precisão.", family: "construct", archetype: "caster", rarity: "boss", level: 30, regionId: "eldravia-claustro", effects: [{ kind: "blind", chance: 28, turns: 2 }], resist: { magical: 32 }, ai: ["prisma-defensivo se turno == 1", "raio-dividido se turno % 3 == 0", "ataque-basico sempre"], pack: [1, 1], mats: [["estilhaco-de-eco", 1, 2]], rolls: ["essencia-divina"] },
  { id: "cao-de-margem", name: "Cão de Margem", description: "Predador de Ruptura que corre exatamente na borda entre dois lugares.", family: "aberration", archetype: "skirmisher", rarity: "common", level: 27, regionId: "eldravia-fenda", ai: ["perseguir se alvo_trocou_posicao", "ataque-basico sempre"], pack: [1, 3], mats: [["fragmento-de-ruptura", 1, 2]], rolls: ["essencia-ascendente"] },
  { id: "tecelao-de-falha", name: "Tecelão de Falha", description: "Costura rachaduras no espaço para aproximar presas que deveriam estar longe.", family: "aberration", archetype: "caster", rarity: "rare", level: 31, regionId: "eldravia-fenda", resist: { magical: 28 }, ai: ["puxar-alvo se turno == 1", "rasgar-espaco se turno % 3 == 0", "ataque-basico sempre"], pack: [1, 2], mats: [["estilhaco-de-eco", 1, 2]], rolls: ["essencia-divina"] },
  { id: "arconte-da-fenda", name: "Arconte da Fenda", description: "Uma autoridade sem reino que governa o espaço aberto pela Convergência.", family: "aberration", archetype: "caster", rarity: "boss", level: 35, regionId: "eldravia-fenda", effects: [{ kind: "blind", chance: 30, turns: 2 }, { kind: "burn", chance: 18, turns: 3, percentMaxHp: 3 }], resist: { magical: 40, physical: 15 }, ai: ["decreto-de-ruptura se turno == 1", "fase-dois se hp_proprio < 50%", "ataque-basico sempre"], pack: [1, 1], mats: [["estilhaco-de-eco", 2, 3]], rolls: ["essencia-divina"] },

  // ===== Criaturas exclusivas de instância · Dustfall =====================
  { id: "catador-verde", name: "Catador Verde", description: "Goblin que recolhe metal da guerra e testa cada peça em quem passa pela estrada.", family: "humanoid", archetype: "skirmisher", rarity: "common", level: 25, regionId: "dustfall-labirinto", ai: ["arremessar-sucata se turno == 1", "ataque-basico sempre"], pack: [1, 4], mats: [["insignia-quebrada", 1, 2]], rolls: ["essencia-refinada"] },
  { id: "chifrudo-salino", name: "Chifrudo Salino", description: "Besta coberta de crostas de sal que investe até quebrar a parede ou o alvo.", family: "beast", archetype: "brute", rarity: "rare", level: 29, regionId: "dustfall-labirinto", resist: { physical: 25 }, ai: ["investida se turno == 1", "ataque-basico sempre"], pack: [1, 2], mats: [["couro-endurecido", 2, 3]], rolls: ["essencia-ascendente"] },
  { id: "matriarca-da-horda", name: "Matriarca da Horda", description: "Orc que mantém o trono pela logística: comida, medo e machados distribuídos na hora certa.", family: "humanoid", archetype: "brute", rarity: "boss", level: 34, regionId: "dustfall-labirinto", effects: [{ kind: "bleed", chance: 30, turns: 4, percentMaxHp: 4 }], resist: { physical: 32 }, ai: ["ordenar-horda se turno == 1", "execucao se alvo_hp < 30%", "ataque-basico sempre"], pack: [1, 1], mats: [["couro-endurecido", 3, 4]], rolls: ["essencia-divina"] },
  { id: "besouro-de-escoria", name: "Besouro de Escória", description: "Inseto que usa metal derretido como carapaça e deixa rastros que ainda queimam.", family: "insect", archetype: "swarm", rarity: "common", level: 31, regionId: "dustfall-escoria", effects: [{ kind: "burn", chance: 12, turns: 2, percentMaxHp: 2 }], resist: { burn: 30 }, ai: ["ataque-basico sempre"], pack: [2, 5], mats: [["essencia-refinada", 1, 1]], rolls: ["essencia-ascendente"] },
  { id: "capataz-de-escoria", name: "Capataz de Escória", description: "Antigo supervisor de forja fundido ao equipamento de proteção que usava em vida.", family: "undead", archetype: "tank", rarity: "rare", level: 36, regionId: "dustfall-escoria", resist: { physical: 30, burn: 35 }, ai: ["marcar-operario se turno == 1", "ataque-basico sempre"], pack: [1, 2], mats: [["cinza-de-sepultura", 2, 3]], rolls: ["essencia-ascendente"] },
  { id: "forjador-carbonizado", name: "Forjador Carbonizado", description: "Uma silhueta de carvão que ainda martela armas invisíveis antes de arremessá-las.", family: "elemental", archetype: "brute", rarity: "boss", level: 41, regionId: "dustfall-escoria", effects: [{ kind: "burn", chance: 30, turns: 4, percentMaxHp: 4 }], resist: { burn: 60, physical: 22 }, ai: ["forjar-arma se turno == 1", "martelo-fundido se turno % 3 == 0", "ataque-basico sempre"], pack: [1, 1], mats: [["essencia-ascendente", 1, 2]], rolls: ["essencia-divina"] },
  { id: "abutre-de-sal", name: "Abutre de Sal", description: "Ave branca que segue caravanas e se alimenta do que o sal preserva.", family: "beast", archetype: "swarm", rarity: "common", level: 37, regionId: "dustfall-salinas", effects: [{ kind: "blind", chance: 14, turns: 1 }], ai: ["bicada-nos-olhos se turno == 1", "ataque-basico sempre"], pack: [2, 4], mats: [["presa-rachada", 1, 2]], rolls: ["essencia-ascendente"] },
  { id: "cavaleiro-calcificado", name: "Cavaleiro Calcificado", description: "Armadura e osso transformados numa única massa de sal endurecido.", family: "undead", archetype: "tank", rarity: "rare", level: 42, regionId: "dustfall-salinas", resist: { physical: 34, bleed: 70 }, weak: { magical: 15 }, ai: ["erguer-escudo se turno == 1", "ataque-basico sempre"], pack: [1, 2], mats: [["cinza-de-sepultura", 2, 3]], rolls: ["essencia-divina"] },
  { id: "rainha-salina", name: "Rainha Salina", description: "Figura coroada de cristais que comanda os mortos preservados na fortaleza branca.", family: "undead", archetype: "caster", rarity: "boss", level: 46, regionId: "dustfall-salinas", effects: [{ kind: "blind", chance: 26, turns: 2 }], resist: { physical: 30, magical: 25, bleed: 80 }, ai: ["coroa-de-sal se turno == 1", "erguer-morto se turno % 3 == 0", "ataque-basico sempre"], pack: [1, 1], mats: [["cinza-de-sepultura", 3, 4]], rolls: ["essencia-divina"] },
  { id: "verme-de-impacto", name: "Verme de Impacto", description: "Criatura que vive sob vidro vulcânico e emerge quando sente passos pesados.", family: "beast", archetype: "brute", rarity: "common", level: 44, regionId: "dustfall-cratera", ai: ["emergir se turno == 1", "ataque-basico sempre"], pack: [1, 2], mats: [["couro-endurecido", 2, 3]], rolls: ["essencia-ascendente"] },
  { id: "draco-de-cinza", name: "Draco de Cinza", description: "Predador jovem que respira pó incandescente em vez de fogo aberto.", family: "dragonkin", archetype: "skirmisher", rarity: "rare", level: 48, regionId: "dustfall-cratera", effects: [{ kind: "burn", chance: 24, turns: 3, percentMaxHp: 3 }], resist: { burn: 50 }, ai: ["sopro-de-cinza se turno == 1", "voo-rasante se turno % 2 == 0", "ataque-basico sempre"], pack: [1, 2], mats: [["essencia-ascendente", 1, 2]], rolls: ["essencia-divina"] },
  { id: "tita-da-cratera", name: "Titã da Cratera", description: "Uma massa colossal de rocha e metal acordada pelo impacto que criou a cratera.", family: "construct", archetype: "tank", rarity: "boss", level: 50, regionId: "dustfall-cratera", effects: [{ kind: "burn", chance: 28, turns: 4, percentMaxHp: 4 }], resist: { physical: 45, magical: 30, burn: 60 }, ai: ["tremor se turno == 1", "fase-dois se hp_proprio < 50%", "esmagar se turno % 3 == 0", "ataque-basico sempre"], pack: [1, 1], mats: [["essencia-divina", 1, 2]], rolls: ["essencia-divina"] },
];

export const bestiary: BestiaryCreature[] = seeds.map(makeCreature);

export const bestiaryById = new Map(bestiary.map((creature) => [creature.id, creature]));

export const creaturesByRegion = (regionId: string) =>
  bestiary.filter((creature) => creature.regionId === regionId);

export const regionsByKingdom = (kingdom: string) =>
  bestiaryRegions.filter((region) => region.kingdom === kingdom);

// ---------------------------------------------------------------------------
// Encontros
// ---------------------------------------------------------------------------

/** Peso de aparição por raridade, usado para criaturas solitárias. */
const solitaryWeight: Record<BestiaryRarity, number> = {
  common: 60,
  rare: 30,
  elite: 18,
  boss: 8,
  worldboss: 3,
};

type EncounterPool =
  | { kind: "warband"; bandId: string; members: BestiaryCreature[]; weight: number }
  | { kind: "solitary"; creature: BestiaryCreature; weight: number };

/** Bandos e solitários que podem gerar encontro numa região. */
export function encounterPools(regionId: string): EncounterPool[] {
  const local = creaturesByRegion(regionId);
  const pools: EncounterPool[] = [];

  for (const band of warbands) {
    const members = local.filter((creature) => creature.warbandIds.includes(band.id) && !creature.solitary);
    if (members.length > 0) pools.push({ kind: "warband", bandId: band.id, members, weight: band.weight });
  }
  for (const creature of local) {
    if (creature.solitary) pools.push({ kind: "solitary", creature, weight: solitaryWeight[creature.rarity] });
  }
  return pools;
}

function pickWeighted<T extends { weight: number }>(entries: T[], random: () => number): T {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let ticket = random() * total;
  for (const entry of entries) {
    ticket -= entry.weight;
    if (ticket <= 0) return entry;
  }
  return entries[entries.length - 1];
}

const pickOne = <T,>(list: T[], random: () => number) => list[Math.floor(random() * list.length)];

/**
 * Sorteia um encontro coeso para a região.
 *
 * O grupo nasce de um único bando: goblins vêm com orcs porque dividem a
 * Horda Verde, e um reforço aliado só entra se a aliança estiver declarada.
 * Criaturas solitárias aparecem sempre sozinhas, mesmo dividindo região com
 * um bando inteiro.
 */
export function rollEncounter(regionId: string, random: () => number): BestiaryCreature[] {
  const pools = encounterPools(regionId);
  if (pools.length === 0) return [];

  const pool = pickWeighted(pools, random);
  if (pool.kind === "solitary") return [pool.creature];

  const band = warbandsById.get(pool.bandId)!;
  const local = creaturesByRegion(regionId);
  const byRole = (role: "leader" | "regular" | "fodder") =>
    pool.members.filter((creature) => creature.role === role);

  const leaders = byRole("leader");
  const regulars = byRole("regular");
  const fodder = byRole("fodder");
  // Sem tropa disponível na região, o líder aparece sozinho — nunca duplicado.
  const rank = fodder.length > 0 ? fodder : regulars;
  if (rank.length === 0) return leaders.length > 0 ? [pickOne(leaders, random)] : [];

  const size = band.minSize + Math.floor(random() * (band.maxSize - band.minSize + 1));
  const group: BestiaryCreature[] = [];

  if (leaders.length > 0 && random() < band.leaderChance) group.push(pickOne(leaders, random));

  while (group.length < size) {
    const useRegular = regulars.length > 0 && random() < 0.35;
    group.push(pickOne(useRegular ? regulars : rank, random));
  }

  if (band.allies.length > 0 && random() < band.allyChance) {
    const reinforcements = local.filter(
      (creature) => !creature.solitary && creature.warbandIds.some((id) => band.allies.includes(id)),
    );
    if (reinforcements.length > 0) group[group.length - 1] = pickOne(reinforcements, random);
  }

  return group;
}

/** Validação de integridade: toda criatura precisa de bando ou da marca de solitária. */
export function validateWarbands(): string[] {
  const problems: string[] = [];
  for (const creature of bestiary) {
    if (creature.solitary) continue;
    if (creature.warbandIds.length === 0) problems.push(`${creature.id} não pertence a nenhum bando`);
  }
  for (const region of bestiaryRegions) {
    if (encounterPools(region.id).length === 0) problems.push(`${region.id} não tem bando capaz de gerar encontro`);
  }
  return problems;
}
