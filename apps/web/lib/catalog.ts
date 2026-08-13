import type { AbilityDefinition, ClassDefinition, EquipmentItem } from "@rupterya/game-core";

export const classes: ClassDefinition[] = [
  { id: "warrior", name: "Guerreiro", description: "Linha de frente com defesa fisica e golpes marciais.", baseVitals: { hpMax: 320, mpMax: 40, morale: 100, gold: 780 }, baseStats: { physicalDamage: 52, magicalDamage: 11, physicalDefense: 39, magicalDefense: 17, criticalChance: 6.5, dodgeChance: 3.2 }, adventure: { perception: 6, knowledge: 3, strength: 10, agility: 5 } },
  { id: "archer", name: "Arqueiro", description: "Dano preciso, agilidade e tecnicas de distancia.", baseVitals: { hpMax: 250, mpMax: 58, morale: 100, gold: 780 }, baseStats: { physicalDamage: 48, magicalDamage: 15, physicalDefense: 22, magicalDefense: 22, criticalChance: 10, dodgeChance: 8 }, adventure: { perception: 10, knowledge: 5, strength: 5, agility: 10 } },
  { id: "mage", name: "Mago", description: "Alto dano magico e controle, com defesa menor.", baseVitals: { hpMax: 210, mpMax: 105, morale: 100, gold: 780 }, baseStats: { physicalDamage: 14, magicalDamage: 58, physicalDefense: 15, magicalDefense: 34, criticalChance: 5, dodgeChance: 4 }, adventure: { perception: 7, knowledge: 10, strength: 3, agility: 6 } },
];

const byClass = (classId: string, suffix: string) => `${classId}-${suffix}`;
export const abilities: AbilityDefinition[] = classes.flatMap((entry) => [
  { id: byClass(entry.id, "strike"), name: entry.id === "mage" ? "Dardo Arcano" : entry.id === "archer" ? "Tiro Certeiro" : "Talho", description: "Tecnica basica da classe.", slotKind: "skill", source: "class", damageFamily: entry.id === "mage" ? "magical" : "physical", physicalScaling: entry.id === "mage" ? 0 : 1.15, magicalScaling: entry.id === "mage" ? 1.2 : 0, manaCost: 0, cooldownTurns: 0 },
  { id: byClass(entry.id, "burst"), name: entry.id === "mage" ? "Lanca de Areia" : entry.id === "archer" ? "Flecha Perfurante" : "Investida", description: "Habilidade de alto impacto.", slotKind: "skill", source: "class", damageFamily: entry.id === "mage" ? "magical" : "physical", physicalScaling: entry.id === "mage" ? 0 : 1.55, magicalScaling: entry.id === "mage" ? 1.55 : 0, manaCost: 16, cooldownTurns: 2 },
  { id: byClass(entry.id, "stance"), name: entry.id === "mage" ? "Veo de Vidro" : entry.id === "archer" ? "Reposicionar" : "Muralha", description: "Postura preparada antes do combate.", slotKind: "stance", source: "class", manaCost: 12, cooldownTurns: 3 },
  { id: byClass(entry.id, "ultimate"), name: entry.id === "mage" ? "Tempestade Arcana" : entry.id === "archer" ? "Chuva de Flechas" : "Ceifa de Ardenor", description: "Ultimate de area da classe.", slotKind: "ultimate", source: "class", damageFamily: entry.id === "mage" ? "magical" : "physical", physicalScaling: entry.id === "mage" ? 0 : 0.9, magicalScaling: entry.id === "mage" ? 0.9 : 0, manaCost: 26, cooldownTurns: 4 },
  { id: byClass(entry.id, "passive"), name: entry.id === "mage" ? "Sintonia Arcana" : entry.id === "archer" ? "Olho de Falcao" : "Vontade de Aco", description: "Passiva da classe; ocupa o unico slot de Passiva.", slotKind: "passive", source: "class" },
]);

export const sharedAbilities: AbilityDefinition[] = [
  { id: "school-fire", name: "Escola de Fogo", description: "Passiva de escola para provar fontes externas.", slotKind: "passive", source: "school", damageFamily: "magical" },
  { id: "lineage-vampire", name: "Sangue Real", description: "Passiva de linhagem. Apenas uma linhagem pode ser escolhida.", slotKind: "passive", source: "lineage" },
  { id: "secret-predatory-charge", name: "Investida Predatoria", description: "Arte Secreta marcial descoberta no mundo.", slotKind: "skill", source: "secret_art", damageFamily: "physical", physicalScaling: 1.35, manaCost: 10, cooldownTurns: 2 },
];

export const equipment: EquipmentItem[] = [
  { id: "iron-sword", name: "Espada de Ferro", slot: "weapon", rarity: "common", power: 90, modifiers: { physicalDamage: 12 } },
  { id: "hunter-bow", name: "Arco do Cacador", slot: "weapon", rarity: "rare", power: 110, modifiers: { physicalDamage: 10, criticalChance: 3 } },
  { id: "ember-staff", name: "Cajado de Brasa", slot: "weapon", rarity: "rare", power: 115, modifiers: { magicalDamage: 14, mpMax: 12 } },
  { id: "iron-helm", name: "Elmo de Vigia", slot: "head", rarity: "common", power: 45, modifiers: { physicalDefense: 6, hpMax: 14 } },
  { id: "leather-coat", name: "Cota de Couro", slot: "chest", rarity: "common", power: 65, modifiers: { physicalDefense: 8, dodgeChance: 1 } },
  { id: "iron-gauntlets", name: "Manoplas de Ferro", slot: "hands", rarity: "rare", power: 55, modifiers: { physicalDamage: 5, physicalDefense: 3 } },
  { id: "traveler-boots", name: "Botas do Viajante", slot: "feet", rarity: "common", power: 40, modifiers: { dodgeChance: 2, magicalDefense: 2 } },
  { id: "moon-charm", name: "Amuleto da Lua", slot: "trinket", rarity: "epic", power: 130, modifiers: { magicalDefense: 9, criticalChance: 2, mpMax: 16 } },
];

export const kingdoms = ["Eldravia", "FiorDeValle", "Dustfall"];
