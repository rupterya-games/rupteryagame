import type { LootItemDefinition, LootRarity, MaterialDefinition } from "@rupterya/game-core";
import { mythicKeywordText } from "@rupterya/game-core";

/**
 * Poder é dirigido principalmente pelo nível do item, não pela raridade.
 * Um item comum de nível alto pode superar um lendário de nível baixo em
 * atributos primários — o lendário continua ganhando nos secundários.
 */
const rarityPowerFactor: Record<LootRarity, number> = {
  common: 1,
  rare: 1.8,
  epic: 2.9,
  legendary: 4.2,
  mythic: 5.6,
};

export const powerOf = (rarity: LootRarity, itemLevel: number) =>
  Math.round(itemLevel * rarityPowerFactor[rarity]);

// ---------------------------------------------------------------------------
// Materiais
// ---------------------------------------------------------------------------

/** Escada de Essências, herdada do TCG. Alimenta forja, treinamento e upgrade. */
export const essenceMaterials: MaterialDefinition[] = [
  { id: "essencia-primaria", name: "Essência Primária", rarity: "common", family: "universal", description: "Resíduo bruto deixado por qualquer criatura tocada pela Convergência.", vendorValue: 4 },
  { id: "essencia-refinada", name: "Essência Refinada", rarity: "rare", family: "universal", description: "Essência estabilizada. Base de toda forja acima do comum.", vendorValue: 26 },
  { id: "essencia-ascendente", name: "Essência Ascendente", rarity: "epic", family: "universal", description: "Só se condensa em criaturas de elite ou em zonas de Ruptura ativa.", vendorValue: 140 },
  { id: "essencia-divina", name: "Essência Divina", rarity: "legendary", family: "universal", description: "Fragmento do que restou de Ael. Bosses raramente a soltam inteira.", vendorValue: 900 },
];

export const materials: MaterialDefinition[] = [
  ...essenceMaterials,
  { id: "presa-rachada", name: "Presa Rachada", rarity: "common", family: "beast", description: "Dente quebrado de fera. Serve para pontas de flecha e adagas grosseiras.", vendorValue: 3 },
  { id: "couro-endurecido", name: "Couro Endurecido", rarity: "common", family: "beast", description: "Pele curtida pelo próprio animal ao sobreviver ao inverno.", vendorValue: 6 },
  { id: "cinza-de-sepultura", name: "Cinza de Sepultura", rarity: "common", family: "undead", description: "Pó que resta quando um morto-vivo finalmente descansa.", vendorValue: 5 },
  { id: "sangue-coagulado", name: "Sangue Coagulado", rarity: "rare", family: "undead", description: "Ainda quente. Vampiros de FiorDeValle o carregam como reserva.", vendorValue: 32 },
  { id: "insignia-quebrada", name: "Insígnia Quebrada", rarity: "common", family: "humanoid", description: "Marca de alguma ordem que já não existe.", vendorValue: 7 },
  { id: "bandagem-suja", name: "Bandagem Suja", rarity: "common", family: "humanoid", description: "Pano de saqueador. Vale pouco, mas todo mundo compra.", vendorValue: 2 },
  { id: "fragmento-de-ruptura", name: "Fragmento de Ruptura", rarity: "rare", family: "aberration", description: "Estilhaço de realidade que não para de vibrar na bolsa.", vendorValue: 40 },
  { id: "estilhaco-de-eco", name: "Estilhaço de Eco", rarity: "epic", family: "aberration", description: "Repete som que ninguém emitiu. Eruditos de Eldravia pagam caro.", vendorValue: 175 },
  { id: "engrenagem-corroida", name: "Engrenagem Corroída", rarity: "common", family: "construct", description: "Peça de mecanismo antigo, ainda gira sozinha às vezes.", vendorValue: 8 },
  { id: "nucleo-inerte", name: "Núcleo Inerte", rarity: "rare", family: "construct", description: "Coração de constructo desligado. Pode ser reacendido.", vendorValue: 38 },
  { id: "brasa-persistente", name: "Brasa Persistente", rarity: "rare", family: "elemental", description: "Não apaga com água. Queima o fundo da bolsa se mal guardada.", vendorValue: 35 },
  { id: "quitina-lascada", name: "Quitina Lascada", rarity: "common", family: "insect", description: "Placa de carapaça. Leve, e mais dura do que parece.", vendorValue: 9 },
  { id: "glandula-de-veneno", name: "Glândula de Veneno", rarity: "rare", family: "insect", description: "Intacta, se a esfola for limpa. Rompida, não vale nada.", vendorValue: 44 },
  { id: "escama-de-escoria", name: "Escama de Escória", rarity: "epic", family: "dragonkin", description: "Sobrevive à forja. É por isso que Dustfall ainda faz armaduras.", vendorValue: 190 },
  { id: "chifre-lascado", name: "Chifre Lascado", rarity: "rare", family: "dragonkin", description: "Arrancado de um draco jovem que não voltou para o ninho.", vendorValue: 48 },
];

// ---------------------------------------------------------------------------
// Equipamentos — escada de raridade
// ---------------------------------------------------------------------------

/**
 * Comum ......... apenas atributos primários
 * Raro .......... primário elevado OU primário + 1 secundário menor
 * Épico ......... primário elevado + 1 secundário forte
 * Lendário ...... primário muito elevado + 2 secundários fortes
 * Mítico ........ primário muito elevado + 2 ou mais secundários + palavra-chave
 */
export const lootItems: LootItemDefinition[] = [
  // --- FiorDeValle · comuns -------------------------------------------------
  { id: "cellar-knife", name: "Faca de Adega", slot: "weapon", rarity: "common", itemLevel: 3, upgradeLevel: 0, power: powerOf("common", 3), modifiers: { physicalDamage: 4 }, affixes: ["+4 Dano Físico"] },
  { id: "patched-cloak", name: "Capa Remendada", slot: "chest", rarity: "common", itemLevel: 4, upgradeLevel: 0, power: powerOf("common", 4), modifiers: { physicalDefense: 5, hpMax: 10 }, affixes: ["+5 Defesa Física", "+10 Vida"] },
  { id: "rusted-cap", name: "Coifa Enferrujada", slot: "head", rarity: "common", itemLevel: 5, upgradeLevel: 0, power: powerOf("common", 5), modifiers: { physicalDefense: 5 }, affixes: ["+5 Defesa Física"] },
  { id: "vintner-gloves", name: "Luvas de Vinhateiro", slot: "hands", rarity: "common", itemLevel: 6, upgradeLevel: 0, power: powerOf("common", 6), modifiers: { physicalDamage: 5 }, affixes: ["+5 Dano Físico"] },
  { id: "gravedigger-boots", name: "Botas de Coveiro", slot: "feet", rarity: "common", itemLevel: 7, upgradeLevel: 0, power: powerOf("common", 7), modifiers: { hpMax: 20 }, affixes: ["+20 Vida"] },

  // --- FiorDeValle · raros --------------------------------------------------
  { id: "fang-dirk", name: "Adaga de Presa", slot: "weapon", rarity: "rare", itemLevel: 9, upgradeLevel: 0, power: powerOf("rare", 9), modifiers: { physicalDamage: 13, criticalChance: 3 }, affixes: ["+13 Dano Físico", "+3 pp Crítico"] },
  { id: "ashwolf-pelt", name: "Pelego de Lobo da Cinza", slot: "chest", rarity: "rare", itemLevel: 11, upgradeLevel: 0, power: powerOf("rare", 11), modifiers: { physicalDefense: 14, hpMax: 26, dodgeChance: 2 }, affixes: ["+14 Defesa Física", "+26 Vida", "+2 pp Esquiva"] },
  { id: "barrel-charm", name: "Talismã dos Barris", slot: "trinket", rarity: "rare", itemLevel: 12, upgradeLevel: 0, power: powerOf("rare", 12), modifiers: { magicalDamage: 15, mpMax: 14 }, affixes: ["+15 Dano Mágico", "+14 MP"] },
  { id: "grave-iron-helm", name: "Elmo de Ferro Sepulcral", slot: "head", rarity: "rare", itemLevel: 13, upgradeLevel: 0, power: powerOf("rare", 13), modifiers: { physicalDefense: 16, bleedResistance: 8 }, affixes: ["+16 Defesa Física", "+8% Resistência a Sangramento"] },

  // --- FiorDeValle · épicos e acima ----------------------------------------
  { id: "crimson-censer", name: "Turíbulo Carmesim", slot: "trinket", rarity: "epic", itemLevel: 16, upgradeLevel: 0, power: powerOf("epic", 16), modifiers: { magicalDamage: 24, magicalDefense: 13, burnChance: 10 }, statusEffects: [{ kind: "burn", chance: 10, turns: 2, percentMaxHp: 2 }], keywords: ["Queimadura: +10 pp de chance"], affixes: ["+24 Dano Mágico", "+13 Defesa Mágica"] },
  { id: "rotted-bulwark", name: "Broquel Apodrecido", slot: "hands", rarity: "epic", itemLevel: 17, upgradeLevel: 0, power: powerOf("epic", 17), modifiers: { physicalDefense: 22, hpMax: 48, poisonResistance: 14 }, affixes: ["+22 Defesa Física", "+48 Vida", "+14% Resistência a Veneno"] },
  { id: "mist-veil-mantle", name: "Manto do Véu de Névoa", slot: "chest", rarity: "legendary", itemLevel: 20, upgradeLevel: 0, power: powerOf("legendary", 20), modifiers: { physicalDefense: 30, magicalDefense: 28, hpMax: 90, dodgeChance: 7, bleedResistance: 16 }, affixes: ["+30 Defesa Física", "+28 Defesa Mágica", "+90 Vida", "+7 pp Esquiva", "+16% Resistência a Sangramento"] },
  { id: "vrannoc-omen", name: "Presságio de Vrannoc", slot: "weapon", rarity: "mythic", itemLevel: 20, upgradeLevel: 0, power: powerOf("mythic", 20), modifiers: { physicalDamage: 34, criticalChance: 9, dodgeChance: 8, bleedChance: 14 }, statusEffects: [{ kind: "bleed", chance: 14, turns: 3, percentMaxHp: 2 }], keyword: "reflexo", keywordText: mythicKeywordText.reflexo, keywords: ["Reflexo", "Sangramento: +14 pp de chance"], affixes: ["+34 Dano Físico", "+9 pp Crítico", "+8 pp Esquiva"] },

  // --- Eldravia · comuns e raros -------------------------------------------
  { id: "apprentice-rod", name: "Vara de Aprendiz", slot: "weapon", rarity: "common", itemLevel: 15, upgradeLevel: 0, power: powerOf("common", 15), modifiers: { magicalDamage: 14 }, affixes: ["+14 Dano Mágico"] },
  { id: "scribe-wraps", name: "Envoltórios de Escriba", slot: "hands", rarity: "common", itemLevel: 17, upgradeLevel: 0, power: powerOf("common", 17), modifiers: { mpMax: 26 }, affixes: ["+26 MP"] },
  { id: "glass-focus", name: "Foco de Vidro", slot: "trinket", rarity: "rare", itemLevel: 20, upgradeLevel: 0, power: powerOf("rare", 20), modifiers: { magicalDamage: 22, mpMax: 24, magicalDefense: 6 }, affixes: ["+22 Dano Mágico", "+24 MP", "+6 Defesa Mágica"] },
  { id: "library-plating", name: "Placas de Biblioteca", slot: "chest", rarity: "rare", itemLevel: 22, upgradeLevel: 0, power: powerOf("rare", 22), modifiers: { physicalDefense: 26, magicalDefense: 18, hpMax: 40 }, affixes: ["+26 Defesa Física", "+18 Defesa Mágica", "+40 Vida"] },

  // --- Eldravia · épicos e acima -------------------------------------------
  { id: "shard-edge", name: "Fio de Estilhaço", slot: "weapon", rarity: "epic", itemLevel: 26, upgradeLevel: 0, power: powerOf("epic", 26), modifiers: { physicalDamage: 38, criticalChance: 8, bleedChance: 12 }, statusEffects: [{ kind: "bleed", chance: 12, turns: 3, percentMaxHp: 2 }], affixes: ["+38 Dano Físico", "+8 pp Crítico", "+12 pp Sangramento"] },
  { id: "archive-crown", name: "Coroa do Arquivo", slot: "head", rarity: "epic", itemLevel: 28, upgradeLevel: 0, power: powerOf("epic", 28), modifiers: { magicalDamage: 32, magicalDefense: 22, mpMax: 34 }, affixes: ["+32 Dano Mágico", "+22 Defesa Mágica", "+34 MP"] },
  { id: "converged-mantle", name: "Manto Convergido", slot: "chest", rarity: "legendary", itemLevel: 32, upgradeLevel: 0, power: powerOf("legendary", 32), modifiers: { magicalDefense: 44, physicalDefense: 30, hpMax: 120, mpMax: 40, burnResistance: 18 }, affixes: ["+44 Defesa Mágica", "+30 Defesa Física", "+120 Vida", "+40 MP", "+18% Resistência a Queimadura"] },
  { id: "hollow-echo-crown", name: "Coroa do Eco Oco", slot: "head", rarity: "mythic", itemLevel: 24, upgradeLevel: 0, power: powerOf("mythic", 24), modifiers: { magicalDamage: 40, magicalDefense: 26, mpMax: 46, blindResistance: 15 }, keyword: "eco", keywordText: mythicKeywordText.eco, keywords: ["Eco"], affixes: ["+40 Dano Mágico", "+26 Defesa Mágica", "+46 MP"] },
  { id: "convergence-seal", name: "Selo de Convergência", slot: "trinket", rarity: "mythic", itemLevel: 33, upgradeLevel: 0, power: powerOf("mythic", 33), modifiers: { magicalDamage: 46, physicalDamage: 30, mpMax: 50, criticalChance: 7 }, keyword: "convergencia", keywordText: mythicKeywordText.convergencia, keywords: ["Convergência"], affixes: ["+46 Dano Mágico", "+30 Dano Físico", "+50 MP", "+7 pp Crítico"] },
  { id: "convergence-spurs", name: "Esporas de Convergência", slot: "feet", rarity: "mythic", itemLevel: 27, upgradeLevel: 0, power: powerOf("mythic", 27), modifiers: { physicalDamage: 28, dodgeChance: 12, criticalChance: 6, hpMax: 60 }, keyword: "perseguicao", keywordText: mythicKeywordText.perseguicao, keywords: ["Perseguição"], affixes: ["+28 Dano Físico", "+12 pp Esquiva", "+6 pp Crítico", "+60 Vida"] },

  // --- Dustfall · comuns e raros -------------------------------------------
  { id: "slag-shiv", name: "Estilete de Escória", slot: "weapon", rarity: "common", itemLevel: 30, upgradeLevel: 0, power: powerOf("common", 30), modifiers: { physicalDamage: 29 }, affixes: ["+29 Dano Físico"] },
  { id: "salt-wrap", name: "Envoltório de Sal", slot: "chest", rarity: "common", itemLevel: 32, upgradeLevel: 0, power: powerOf("common", 32), modifiers: { physicalDefense: 31 }, affixes: ["+31 Defesa Física"] },
  { id: "jaw-axe", name: "Machado de Mandíbula", slot: "weapon", rarity: "rare", itemLevel: 35, upgradeLevel: 0, power: powerOf("rare", 35), modifiers: { physicalDamage: 44, criticalChance: 5 }, affixes: ["+44 Dano Físico", "+5 pp Crítico"] },
  { id: "beetle-carapace", name: "Carapaça de Escaravelho", slot: "chest", rarity: "rare", itemLevel: 37, upgradeLevel: 0, power: powerOf("rare", 37), modifiers: { physicalDefense: 46, hpMax: 90, poisonResistance: 12 }, affixes: ["+46 Defesa Física", "+90 Vida", "+12% Resistência a Veneno"] },

  // --- Dustfall · épicos e acima -------------------------------------------
  { id: "dust-piercer", name: "Perfurante de Poeira", slot: "weapon", rarity: "epic", itemLevel: 40, upgradeLevel: 0, power: powerOf("epic", 40), modifiers: { physicalDamage: 62, criticalChance: 11, bleedChance: 14 }, statusEffects: [{ kind: "bleed", chance: 14, turns: 3, percentMaxHp: 3 }], affixes: ["+62 Dano Físico", "+11 pp Crítico", "+14 pp Sangramento"] },
  { id: "venom-gland-ring", name: "Anel da Glândula", slot: "trinket", rarity: "epic", itemLevel: 42, upgradeLevel: 0, power: powerOf("epic", 42), modifiers: { magicalDamage: 54, poisonChance: 18, poisonResistance: 20 }, statusEffects: [{ kind: "poison", chance: 18, turns: 4, percentMaxHp: 3 }], affixes: ["+54 Dano Mágico", "+18 pp Veneno", "+20% Resistência a Veneno"] },
  { id: "buried-sentinel-plate", name: "Placa da Sentinela Enterrada", slot: "chest", rarity: "legendary", itemLevel: 44, upgradeLevel: 0, power: powerOf("legendary", 44), modifiers: { physicalDefense: 66, magicalDefense: 52, hpMax: 210, bleedResistance: 20, burnResistance: 20 }, affixes: ["+66 Defesa Física", "+52 Defesa Mágica", "+210 Vida", "+20% Resistência a Sangramento", "+20% Resistência a Queimadura"] },
  { id: "salt-knight-blade", name: "Lâmina do Cavaleiro de Sal", slot: "weapon", rarity: "mythic", itemLevel: 44, upgradeLevel: 0, power: powerOf("mythic", 44), modifiers: { physicalDamage: 74, physicalDefense: 26, criticalChance: 10, hpMax: 120 }, keyword: "retorno", keywordText: mythicKeywordText.retorno, keywords: ["Retorno"], affixes: ["+74 Dano Físico", "+26 Defesa Física", "+10 pp Crítico", "+120 Vida"] },
  { id: "brood-mother-stinger", name: "Ferrão da Mãe da Ninhada", slot: "weapon", rarity: "mythic", itemLevel: 42, upgradeLevel: 0, power: powerOf("mythic", 42), modifiers: { physicalDamage: 66, magicalDamage: 34, poisonChance: 26, criticalChance: 8 }, statusEffects: [{ kind: "poison", chance: 26, turns: 4, percentMaxHp: 4 }], keyword: "propagacao", keywordText: mythicKeywordText.propagacao, keywords: ["Propagação", "Veneno: +26 pp de chance"], affixes: ["+66 Dano Físico", "+34 Dano Mágico", "+8 pp Crítico"] },
  { id: "slag-drake-fang", name: "Presa do Draco de Escória", slot: "weapon", rarity: "mythic", itemLevel: 46, upgradeLevel: 0, power: powerOf("mythic", 46), modifiers: { physicalDamage: 80, burnChance: 22, criticalChance: 12, hpMax: 90 }, statusEffects: [{ kind: "burn", chance: 22, turns: 3, percentMaxHp: 4 }], keyword: "devorar", keywordText: mythicKeywordText.devorar, keywords: ["Devorar", "Queimadura: +22 pp de chance"], affixes: ["+80 Dano Físico", "+12 pp Crítico", "+90 Vida"] },
  { id: "buried-titan-heart", name: "Coração do Titã Soterrado", slot: "chest", rarity: "mythic", itemLevel: 50, upgradeLevel: 0, power: powerOf("mythic", 50), modifiers: { physicalDefense: 84, magicalDefense: 70, hpMax: 320, physicalDamage: 30, bleedResistance: 25 }, keyword: "fortaleza", keywordText: mythicKeywordText.fortaleza, keywords: ["Fortaleza"], affixes: ["+84 Defesa Física", "+70 Defesa Mágica", "+320 Vida", "+30 Dano Físico"] },

  // --- Horda Verde e Labirinto ---------------------------------------------
  { id: "goblin-cleaver", name: "Cutelo Goblin", slot: "weapon", rarity: "common", itemLevel: 6, upgradeLevel: 0, power: powerOf("common", 6), modifiers: { physicalDamage: 6 }, affixes: ["+6 Dano Físico"] },
  { id: "sling-pouch", name: "Bolsa de Funda", slot: "hands", rarity: "common", itemLevel: 8, upgradeLevel: 0, power: powerOf("common", 8), modifiers: { physicalDamage: 5, criticalChance: 2 }, affixes: ["+5 Dano Físico", "+2 pp Crítico"] },
  { id: "bone-totem", name: "Totem de Osso", slot: "trinket", rarity: "rare", itemLevel: 11, upgradeLevel: 0, power: powerOf("rare", 11), modifiers: { magicalDamage: 16, mpMax: 12 }, affixes: ["+16 Dano Mágico", "+12 MP"] },
  { id: "warband-hide", name: "Couro de Bando", slot: "chest", rarity: "rare", itemLevel: 24, upgradeLevel: 0, power: powerOf("rare", 24), modifiers: { physicalDefense: 29, hpMax: 52 }, affixes: ["+29 Defesa Física", "+52 Vida"] },
  { id: "warlord-plate", name: "Placa do Senhor da Guerra", slot: "chest", rarity: "legendary", itemLevel: 32, upgradeLevel: 0, power: powerOf("legendary", 32), modifiers: { physicalDefense: 48, hpMax: 140, physicalDamage: 22, bleedResistance: 18 }, affixes: ["+48 Defesa Física", "+140 Vida", "+22 Dano Físico", "+18% Resistência a Sangramento"] },
  { id: "executioner-axe", name: "Machado do Carrasco", slot: "weapon", rarity: "mythic", itemLevel: 28, upgradeLevel: 0, power: powerOf("mythic", 28), modifiers: { physicalDamage: 52, criticalChance: 10, bleedChance: 20, hpMax: 70 }, statusEffects: [{ kind: "bleed", chance: 20, turns: 3, percentMaxHp: 3 }], keyword: "cacador", keywordText: mythicKeywordText.cacador, keywords: ["Caçador", "Sangramento: +20 pp de chance"], affixes: ["+52 Dano Físico", "+10 pp Crítico", "+70 Vida"] },
  { id: "minotaur-horn-maul", name: "Malho de Chifre", slot: "weapon", rarity: "mythic", itemLevel: 30, upgradeLevel: 0, power: powerOf("mythic", 30), modifiers: { physicalDamage: 58, criticalChance: 14, physicalDefense: 20, hpMax: 100 }, keyword: "tempestade", keywordText: mythicKeywordText.tempestade, keywords: ["Tempestade"], affixes: ["+58 Dano Físico", "+14 pp Crítico", "+20 Defesa Física", "+100 Vida"] },
];

export const lootItemsById = new Map(lootItems.map((item) => [item.id, item]));
export const materialsById = new Map(materials.map((entry) => [entry.id, entry]));
