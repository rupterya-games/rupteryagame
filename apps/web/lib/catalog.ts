import type { AbilityDefinition, ClassDefinition, EquipmentItem, HuntCompanion, HuntCreatureDefinition, HuntRegionDefinition, StatusEffectApplication } from "@rupterya/game-core";

const remoteClassArt = (name: string) => `https://rrbwdoaeozklumvscaei.supabase.co/storage/v1/object/public/rupterya-art/${name}.jpeg`;

export const classes: ClassDefinition[] = [
  { id: "guardian", name: "Guardião", role: "Espada e escudo", portraitPath: remoteClassArt("guardian"), description: "Linha de frente de FiorDeValle. Protege a rota e suporta ataques pesados.", baseVitals: { hpMax: 360, mpMax: 54, morale: 100, gold: 780 }, baseStats: { physicalDamage: 49, magicalDamage: 10, physicalDefense: 46, magicalDefense: 20, criticalChance: 5, dodgeChance: 3, bleedChance: 4, burnChance: 0, poisonChance: 0, blindChance: 0, bleedResistance: 10, burnResistance: 4, poisonResistance: 8, blindResistance: 6 }, adventure: { perception: 6, knowledge: 4, strength: 10, agility: 4 } },
  { id: "duelist", name: "Duelista", role: "Duas espadas", portraitPath: remoteClassArt("duelist"), description: "Caçador marcial veloz, criado para abrir brechas antes que o inimigo reaja.", baseVitals: { hpMax: 292, mpMax: 62, morale: 100, gold: 780 }, baseStats: { physicalDamage: 61, magicalDamage: 12, physicalDefense: 27, magicalDefense: 19, criticalChance: 12, dodgeChance: 8, bleedChance: 10, burnChance: 0, poisonChance: 0, blindChance: 0, bleedResistance: 4, burnResistance: 3, poisonResistance: 5, blindResistance: 7 }, adventure: { perception: 7, knowledge: 3, strength: 8, agility: 10 } },
  { id: "archer", name: "Arqueiro", role: "Arco longo", portraitPath: remoteClassArt("archer"), description: "Batedor de fronteira que converte distância e percepção em dano preciso.", baseVitals: { hpMax: 258, mpMax: 72, morale: 100, gold: 780 }, baseStats: { physicalDamage: 56, magicalDamage: 15, physicalDefense: 23, magicalDefense: 23, criticalChance: 11, dodgeChance: 9, bleedChance: 7, burnChance: 0, poisonChance: 4, blindChance: 6, bleedResistance: 4, burnResistance: 4, poisonResistance: 7, blindResistance: 10 }, adventure: { perception: 11, knowledge: 5, strength: 5, agility: 10 } },
  { id: "mage", name: "Mago", role: "Cajado arcano", portraitPath: remoteClassArt("mage"), description: "Erudito de Rupterya que domina dano arcano e controle de campo.", baseVitals: { hpMax: 225, mpMax: 132, morale: 100, gold: 780 }, baseStats: { physicalDamage: 13, magicalDamage: 70, physicalDefense: 16, magicalDefense: 37, criticalChance: 6, dodgeChance: 4, bleedChance: 0, burnChance: 10, poisonChance: 0, blindChance: 4, bleedResistance: 3, burnResistance: 10, poisonResistance: 4, blindResistance: 5 }, adventure: { perception: 7, knowledge: 12, strength: 3, agility: 6 } },
];

const byClass = (classId: string, suffix: string) => `${classId}-${suffix}`;
const statusEffectsFor = (classId: string, index: number): StatusEffectApplication[] => {
  if (classId === "mage" && index === 1) return [{ kind: "burn", chance: 10, turns: 1, percentMaxHp: 2 }];
  if (classId === "mage" && index === 3) return [{ kind: "burn", chance: 18, turns: 3, percentMaxHp: 4 }];
  if (classId === "duelist" && index === 0) return [{ kind: "bleed", chance: 18, turns: 2, percentMaxHp: 2 }];
  if (classId === "duelist" && index === 3) return [{ kind: "bleed", chance: 30, turns: 4, percentMaxHp: 6 }];
  if (classId === "archer" && index === 2) return [{ kind: "bleed", chance: 15, turns: 2, percentMaxHp: 2 }];
  if (classId === "archer" && index === 3) return [{ kind: "blind", chance: 20, turns: 2 }];
  if (classId === "guardian" && index === 3) return [{ kind: "bleed", chance: 12, turns: 2, percentMaxHp: 2 }];
  return [];
};
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
    ...names.skills.map((name, index): AbilityDefinition => { const statusEffects = statusEffectsFor(entry.id, index); return { id: byClass(entry.id, `skill-${index + 1}`), name, description: `Técnica de ${entry.role.toLowerCase()} usada nas fronteiras de Rupterya.`, slotKind: "skill", source: "class", damageFamily: magical ? "magical" : "physical", physicalScaling: physicalScale[index], magicalScaling: magicalScale[index], manaCost: [0, 8, 14, 20][index], cooldownTurns: [0, 1, 2, 2][index], statusEffects, keywords: statusEffects.map((effect) => `${effect.chance}% ${effect.kind}`) }; }),
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
  { id: "iron-sword", name: "Espada de Ferro", slot: "weapon", rarity: "common", power: 90, modifiers: { physicalDamage: 12 }, statusEffects: [{ kind: "bleed", chance: 2.5, turns: 2, percentMaxHp: 2 }], keywords: ["2,5% de chance de Sangramento Leve"] },
  { id: "hunter-bow", name: "Arco do Caçador", slot: "weapon", rarity: "rare", power: 110, modifiers: { physicalDamage: 10, criticalChance: 3 }, statusEffects: [{ kind: "poison", chance: 7, turns: 3, percentMaxHp: 2 }], keywords: ["7% de chance de Envenenamento Leve"] },
  { id: "ember-staff", name: "Cajado de Brasa", slot: "weapon", rarity: "rare", power: 115, modifiers: { magicalDamage: 14, mpMax: 12 }, statusEffects: [{ kind: "burn", chance: 8, turns: 2, percentMaxHp: 2 }], keywords: ["8% de chance de Queimadura Leve"] },
  { id: "iron-helm", name: "Elmo de Vigia", slot: "head", rarity: "common", power: 45, modifiers: { physicalDefense: 6, hpMax: 14 } },
  { id: "leather-coat", name: "Cota de Couro", slot: "chest", rarity: "common", power: 65, modifiers: { physicalDefense: 8, dodgeChance: 1 } },
  { id: "iron-gauntlets", name: "Manoplas de Ferro", slot: "hands", rarity: "rare", power: 55, modifiers: { physicalDamage: 5, physicalDefense: 3 } },
  { id: "traveler-boots", name: "Botas do Viajante", slot: "feet", rarity: "common", power: 40, modifiers: { dodgeChance: 2, magicalDefense: 2 } },
  { id: "moon-charm", name: "Amuleto da Lua", slot: "trinket", rarity: "epic", power: 130, modifiers: { magicalDefense: 9, criticalChance: 2, mpMax: 16 } },
];

export const kingdoms = ["Eldravia", "FiorDeValle", "Dustfall"];

export const emberDragonCompanion: HuntCompanion = {
  id: "ember-dragon",
  name: "Dragão de Brasa",
  portraitPath: "/art/companions/ember-dragon.png",
  description: "Lendário: no fim da rodada, Bola de Fogo causa 10% do dano mágico do herói ao inimigo com menor HP.",
  magicalDamageScaling: 0.1,
};

export const huntRegions: HuntRegionDefinition[] = [
  { id: "fiordevalle", name: "FiorDeValle", kingdom: "FiorDeValle", description: "Centro, Mercado, Vinhedos, Estrada Velha, Colinas, Casas Abandonadas, Floresta Sombria, Cemitério e Distrito dos Nobres são ligados por rotas de Jornada.", danger: "Região-piloto · Seed regional", creatureIds: ["vampire-wanderer", "raider", "crimson-herald", "mist-captain"] },
];

export const battleBoardsByRegion: Record<string, string> = {
  fiordevalle: "/art/boards/fiordevalle-rose-board.jpeg",
};

export const huntCreatures: HuntCreatureDefinition[] = [
  { id: "vampire-wanderer", name: "Vampiro Errante", description: "Criatura noturna de FiorDeValle. À noite, a névoa oculta seus passos.", portraitPath: "/art/creatures/fiordevalle-vampire-common.jpeg", rarity: "common", regionId: "fiordevalle", level: 30, hpMax: 210, physicalDamage: 35, physicalDefense: 10, magicalDefense: 10, xpReward: 5, goldReward: 16, statusEffects: [{ kind: "bleed", chance: 8, turns: 2, percentMaxHp: 2 }] },
  { id: "raider", name: "Saqueador", description: "Um humano oportunista que explora as rotas isoladas da região.", rarity: "common", regionId: "fiordevalle", level: 30, hpMax: 210, physicalDamage: 35, physicalDefense: 10, magicalDefense: 10, xpReward: 5, goldReward: 16, statusEffects: [{ kind: "bleed", chance: 5, turns: 2, percentMaxHp: 2 }] },
  { id: "crimson-herald", name: "Arauto Carmesim", description: "Vampiro raro que conduz a magia do sangue pelas rotas isoladas.", portraitPath: "/art/creatures/fiordevalle-vampire-rare.jpeg", rarity: "rare", regionId: "fiordevalle", level: 30, hpMax: 210, physicalDamage: 35, physicalDefense: 10, magicalDefense: 10, xpReward: 12, goldReward: 46, statusEffects: [{ kind: "blind", chance: 15, turns: 2 }] },
  { id: "mist-captain", name: "Lorde da Névoa", description: "Boss vampírico que sai da névoa para tomar FiorDeValle.", portraitPath: "/art/creatures/fiordevalle-vampire-boss.jpeg", rarity: "boss", regionId: "fiordevalle", level: 30, hpMax: 210, physicalDamage: 35, physicalDefense: 10, magicalDefense: 10, xpReward: 10, goldReward: 36, statusEffects: [{ kind: "bleed", chance: 18, turns: 3, percentMaxHp: 4 }, { kind: "blind", chance: 12, turns: 2 }] },
];

export const fiordevalleJourneyNodes = [
  { id: "fiordevalle", name: "FiorDeValle", icon: "⌂", column: 2, row: 1 },
  { id: "bairro_humano", name: "Bairro", icon: "⌂", column: 1, row: 2 },
  { id: "vinhedos", name: "Vinhedos", icon: "♧", column: 2, row: 2 },
  { id: "distrito_nobre", name: "Nobres", icon: "♜", column: 3, row: 2 },
  { id: "estrada_velha", name: "Estrada", icon: "↟", column: 2, row: 3 },
  { id: "colinas", name: "Colinas", icon: "⛰", column: 1, row: 4 },
  { id: "casas_abandonadas", name: "Casas", icon: "⌂", column: 2, row: 4 },
  { id: "cemiterio", name: "Cemitério", icon: "✟", column: 3, row: 4 },
  { id: "floresta_sombria", name: "Floresta", icon: "♠", column: 2, row: 5 },
  { id: "portao", name: "Portão", icon: "⚑", column: 3, row: 3 },
] as const;

export const fiordevalleJourneyRoutes: Record<string, string[]> = {
  fiordevalle: ["fiordevalle"],
  bairro_humano: ["fiordevalle", "bairro_humano"],
  vinhedos: ["fiordevalle", "vinhedos"],
  distrito_nobre: ["fiordevalle", "distrito_nobre"],
  estrada_velha: ["fiordevalle", "vinhedos", "estrada_velha"],
  colinas: ["fiordevalle", "bairro_humano", "colinas"],
  casas_abandonadas: ["fiordevalle", "vinhedos", "estrada_velha", "casas_abandonadas"],
  cemiterio: ["fiordevalle", "distrito_nobre", "portao", "cemiterio"],
  floresta_sombria: ["fiordevalle", "vinhedos", "estrada_velha", "casas_abandonadas", "floresta_sombria"],
  portao: ["fiordevalle", "distrito_nobre", "portao"],
};

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
