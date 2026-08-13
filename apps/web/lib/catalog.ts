import type { AbilityDefinition, ClassDefinition, EquipmentItem, HuntCreatureDefinition, HuntRegionDefinition } from "@rupterya/game-core";

export const classes: ClassDefinition[] = [
  { id: "guardian", name: "Guardião", role: "Espada e escudo", portraitPath: "/art/classes/guardian.jpeg", description: "Linha de frente de FiorDeValle. Protege a rota e suporta ataques pesados.", baseVitals: { hpMax: 360, mpMax: 54, morale: 100, gold: 780 }, baseStats: { physicalDamage: 49, magicalDamage: 10, physicalDefense: 46, magicalDefense: 20, criticalChance: 5, dodgeChance: 3 }, adventure: { perception: 6, knowledge: 4, strength: 10, agility: 4 } },
  { id: "duelist", name: "Duelista", role: "Duas espadas", portraitPath: "/art/classes/duelist.jpeg", description: "Caçador marcial veloz, criado para abrir brechas antes que o inimigo reaja.", baseVitals: { hpMax: 292, mpMax: 62, morale: 100, gold: 780 }, baseStats: { physicalDamage: 61, magicalDamage: 12, physicalDefense: 27, magicalDefense: 19, criticalChance: 12, dodgeChance: 8 }, adventure: { perception: 7, knowledge: 3, strength: 8, agility: 10 } },
  { id: "archer", name: "Arqueiro", role: "Arco longo", portraitPath: "/art/classes/archer.jpeg", description: "Batedor de fronteira que converte distância e percepção em dano preciso.", baseVitals: { hpMax: 258, mpMax: 72, morale: 100, gold: 780 }, baseStats: { physicalDamage: 56, magicalDamage: 15, physicalDefense: 23, magicalDefense: 23, criticalChance: 11, dodgeChance: 9 }, adventure: { perception: 11, knowledge: 5, strength: 5, agility: 10 } },
  { id: "mage", name: "Mago", role: "Cajado arcano", portraitPath: "/art/classes/mage.jpeg", description: "Erudito de Rupterya que domina dano arcano e controle de campo.", baseVitals: { hpMax: 225, mpMax: 132, morale: 100, gold: 780 }, baseStats: { physicalDamage: 13, magicalDamage: 70, physicalDefense: 16, magicalDefense: 37, criticalChance: 6, dodgeChance: 4 }, adventure: { perception: 7, knowledge: 12, strength: 3, agility: 6 } },
];

const byClass = (classId: string, suffix: string) => `${classId}-${suffix}`;
const classAbilityNames: Record<string, { skills: string[]; stance: string; ultimate: string; passive: string }> = {
  guardian: { skills: ["Corte da Muralha", "Golpe de Escudo", "Lança do Bastião", "Retaliação de Fiordevalle"], stance: "Postura de Bastião", ultimate: "Juramento de Ardenor", passive: "Vontade de Aço" },
  duelist: { skills: ["Corte Geminado", "Passo de Cinza", "Dança das Lâminas", "Ruptura Carmesim"], stance: "Guarda da Serpente", ultimate: "Mil Cortes de Rupterya", passive: "Fome de Duelo" },
  archer: { skills: ["Flecha do Vigia", "Disparo Duplo", "Tiro Perfurante", "Marca do Caçador"], stance: "Olho de Falcão", ultimate: "Chuva de Fiordevalle", passive: "Passo Silencioso" },
  mage: { skills: ["Dardo de Éter", "Lança de Brasa", "Prisma Congelante", "Ruptura Arcana"], stance: "Véu de Vidro", ultimate: "Tempestade de Rupterya", passive: "Sintonia Arcana" },
};

export const abilities: AbilityDefinition[] = classes.flatMap((entry) => {
  const names = classAbilityNames[entry.id];
  const magical = entry.id === "mage";
  const physicalScale: number[] = magical ? [0, 0, 0, 0] : [1.05, 1.18, 1.3, 1.42];
  const magicalScale: number[] = magical ? [1.05, 1.18, 1.3, 1.42] : [0, 0, 0, 0];
  return [
    ...names.skills.map((name, index): AbilityDefinition => ({ id: byClass(entry.id, `skill-${index + 1}`), name, description: `Técnica de ${entry.role.toLowerCase()} usada nas fronteiras de Rupterya.`, slotKind: "skill", source: "class", damageFamily: magical ? "magical" : "physical", physicalScaling: physicalScale[index], magicalScaling: magicalScale[index], manaCost: [0, 8, 14, 20][index], cooldownTurns: [0, 1, 2, 2][index] })),
    { id: byClass(entry.id, "stance"), name: names.stance, description: "Postura preparada antes do combate.", slotKind: "stance", source: "class", manaCost: 10, cooldownTurns: 3 },
    { id: byClass(entry.id, "ultimate"), name: names.ultimate, description: "Golpe máximo da classe, reservado para a caça mais perigosa.", slotKind: "ultimate", source: "class", damageFamily: magical ? "magical" : "physical", physicalScaling: magical ? 0 : 1.85, magicalScaling: magical ? 1.85 : 0, manaCost: 32, cooldownTurns: 4 },
    { id: byClass(entry.id, "passive"), name: names.passive, description: "Passiva da classe; ocupa o único slot de Passiva.", slotKind: "passive", source: "class" },
  ];
});

export const sharedAbilities: AbilityDefinition[] = [
  { id: "school-fire", name: "Escola de Fogo", description: "Passiva de escola para provar fontes externas.", slotKind: "passive", source: "school", damageFamily: "magical" },
  { id: "lineage-vampire", name: "Sangue Real", description: "Passiva de linhagem. Apenas uma linhagem pode ser escolhida.", slotKind: "passive", source: "lineage" },
  { id: "secret-predatory-charge", name: "Investida Predatória", description: "Arte Secreta marcial descoberta no mundo.", slotKind: "skill", source: "secret_art", damageFamily: "physical", physicalScaling: 1.35, manaCost: 10, cooldownTurns: 2 },
];

export const equipment: EquipmentItem[] = [
  { id: "iron-sword", name: "Espada de Ferro", slot: "weapon", rarity: "common", power: 90, modifiers: { physicalDamage: 12 } },
  { id: "hunter-bow", name: "Arco do Caçador", slot: "weapon", rarity: "rare", power: 110, modifiers: { physicalDamage: 10, criticalChance: 3 } },
  { id: "ember-staff", name: "Cajado de Brasa", slot: "weapon", rarity: "rare", power: 115, modifiers: { magicalDamage: 14, mpMax: 12 } },
  { id: "iron-helm", name: "Elmo de Vigia", slot: "head", rarity: "common", power: 45, modifiers: { physicalDefense: 6, hpMax: 14 } },
  { id: "leather-coat", name: "Cota de Couro", slot: "chest", rarity: "common", power: 65, modifiers: { physicalDefense: 8, dodgeChance: 1 } },
  { id: "iron-gauntlets", name: "Manoplas de Ferro", slot: "hands", rarity: "rare", power: 55, modifiers: { physicalDamage: 5, physicalDefense: 3 } },
  { id: "traveler-boots", name: "Botas do Viajante", slot: "feet", rarity: "common", power: 40, modifiers: { dodgeChance: 2, magicalDefense: 2 } },
  { id: "moon-charm", name: "Amuleto da Lua", slot: "trinket", rarity: "epic", power: 130, modifiers: { magicalDefense: 9, criticalChance: 2, mpMax: 16 } },
];

export const kingdoms = ["Eldravia", "FiorDeValle", "Dustfall"];

export const huntRegions: HuntRegionDefinition[] = [
  { id: "fiordevalle", name: "FiorDeValle", kingdom: "FiorDeValle", description: "Centro, Mercado, Vinhedos, Estrada Velha, Colinas, Casas Abandonadas, Floresta Sombria, Cemitério e Distrito dos Nobres são ligados por rotas de Jornada.", danger: "Região-piloto · Seed regional", creatureIds: ["vampire-wanderer", "raider", "crimson-herald", "mist-captain"] },
];

export const huntCreatures: HuntCreatureDefinition[] = [
  { id: "vampire-wanderer", name: "Vampiro Errante", description: "Criatura noturna de FiorDeValle. À noite, a névoa oculta seus passos.", regionId: "fiordevalle", level: 30, hpMax: 210, physicalDamage: 35, physicalDefense: 10, magicalDefense: 10, xpReward: 5, goldReward: 16 },
  { id: "raider", name: "Saqueador", description: "Um humano oportunista que explora as rotas isoladas da região.", regionId: "fiordevalle", level: 30, hpMax: 210, physicalDamage: 35, physicalDefense: 10, magicalDefense: 10, xpReward: 5, goldReward: 16 },
  { id: "crimson-herald", name: "Arauto Carmesim", description: "Encontro raro; sua presença altera o silêncio da estrada.", regionId: "fiordevalle", level: 30, hpMax: 210, physicalDamage: 35, physicalDefense: 10, magicalDefense: 10, xpReward: 12, goldReward: 46 },
  { id: "mist-captain", name: "Capitão da Névoa", description: "Mini-boss que pode sair da névoa durante a Jornada.", regionId: "fiordevalle", level: 30, hpMax: 210, physicalDamage: 35, physicalDefense: 10, magicalDefense: 10, xpReward: 10, goldReward: 36 },
];

export function rollFiordevalleEncounter(random: () => number = Math.random) {
  const level = 30;
  const count = 1 + Math.floor(random() * 3);
  return Array.from({ length: count }, () => {
    const rare = random() < 0.10;
    const miniboss = !rare && random() < 0.16;
    const vampire = random() < 0.38;
    const id = rare ? "crimson-herald" : miniboss ? "mist-captain" : vampire ? "vampire-wanderer" : "raider";
    const source = huntCreatures.find((creature) => creature.id === id)!;
    return { ...source, hpMax: 30 + level * 6, physicalDamage: 5 + level, physicalDefense: level / 3, magicalDefense: level / 3 };
  });
}
