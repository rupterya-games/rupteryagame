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
  { id: "iron-sword", name: "Espada de Ferro", slot: "weapon", rarity: "common", itemLevel: 10, upgradeLevel: 0, power: 10, modifiers: { physicalDamage: 7 }, affixes: ["+7 Ataque Físico"] },
  { id: "iron-helm", name: "Elmo de Vigia", slot: "head", rarity: "common", itemLevel: 10, upgradeLevel: 0, power: 7, modifiers: { physicalDefense: 5, hpMax: 12 }, affixes: ["+5 Defesa Física", "+12 Vida"] },
  { id: "leather-coat", name: "Cota de Couro", slot: "chest", rarity: "common", itemLevel: 10, upgradeLevel: 0, power: 12, modifiers: { physicalDefense: 8, magicalDefense: 4 }, affixes: ["+8 Defesa Física", "+4 Defesa Mágica"] },
  { id: "traveler-boots", name: "Botas do Viajante", slot: "feet", rarity: "common", itemLevel: 10, upgradeLevel: 0, power: 6, modifiers: { hpMax: 18, magicalDefense: 3 }, affixes: ["+18 Vida", "+3 Defesa Mágica"] },
  { id: "hunter-bow", name: "Arco do Caçador", slot: "weapon", rarity: "rare", itemLevel: 20, upgradeLevel: 0, power: 39, modifiers: { physicalDamage: 19, criticalChance: 4 }, affixes: ["+19 Ataque Físico", "+4 pp Crítico"] },
  { id: "ember-staff", name: "Cajado de Brasa", slot: "weapon", rarity: "rare", itemLevel: 20, upgradeLevel: 0, power: 40, modifiers: { magicalDamage: 20, mpMax: 20 }, affixes: ["+20 Poder Mágico", "+20 MP"] },
  { id: "iron-gauntlets", name: "Manoplas de Ferro", slot: "hands", rarity: "rare", itemLevel: 20, upgradeLevel: 0, power: 22, modifiers: { physicalDamage: 8, physicalDefense: 6, criticalChance: 3 }, affixes: ["+8 Ataque Físico", "+3 pp Crítico"] },
  { id: "moon-charm", name: "Amuleto da Lua", slot: "trinket", rarity: "epic", itemLevel: 25, upgradeLevel: 0, power: 62, modifiers: { magicalDamage: 18, magicalDefense: 12, burnChance: 8 }, statusEffects: [{ kind: "burn", chance: 8, turns: 2, percentMaxHp: 2 }], keywords: ["Queimadura leve: +8 pp de chance", "2% Vida máxima por 2 turnos"], affixes: ["+18 Poder Mágico", "+12 Defesa Mágica"] },
  { id: "serrated-blade", name: "Lâmina Serrilhada", slot: "weapon", rarity: "epic", itemLevel: 25, upgradeLevel: 0, power: 64, modifiers: { physicalDamage: 22, bleedChance: 12 }, statusEffects: [{ kind: "bleed", chance: 12, turns: 3, percentMaxHp: 1 }], keywords: ["Sangramento leve: +12 pp de chance", "1% Vida máxima por 3 turnos"], affixes: ["+22 Ataque Físico", "+12 pp Sangramento"] },
  { id: "crimson-regalia", name: "Regalia Carmesim", slot: "chest", rarity: "legendary", itemLevel: 30, upgradeLevel: 0, power: 92, modifiers: { hpMax: 80, physicalDefense: 18, magicalDefense: 18, bleedResistance: 15, blindResistance: 12 }, keywords: ["Resistência forte a Sangramento +15%", "Resistência forte a Cegueira +12%"], affixes: ["+80 Vida", "+18 Defesa Física", "+18 Defesa Mágica"] },
  { id: "mist-lord-blade", name: "Lâmina do Lorde da Névoa", slot: "weapon", rarity: "legendary", itemLevel: 30, upgradeLevel: 0, power: 104, modifiers: { physicalDamage: 30, criticalChance: 7, bleedChance: 20 }, statusEffects: [{ kind: "bleed", chance: 20, turns: 4, percentMaxHp: 2 }], keywords: ["Sangramento forte: +20 pp de chance", "2% Vida máxima por 4 turnos"], affixes: ["+30 Ataque Físico", "+7 pp Crítico", "+20 pp Sangramento"] },
];

const creatureFeaturedItems: EquipmentItem[] = [
  { id: "raider-rust-sword", name: "Espada Roubada", slot: "weapon", rarity: "common", family: "sword", allowedProfiles: ["raider"], appearanceChance: 55, breakChance: 15, itemLevel: 30, upgradeLevel: 0, power: 18, modifiers: { physicalDamage: 11 }, affixes: ["+11 Ataque FÃ­sico"] },
  { id: "vampire-velvet-dagger", name: "Adaga de Veludo", slot: "weapon", rarity: "rare", family: "dagger", allowedProfiles: ["vampire"], appearanceChance: 30, breakChance: 25, itemLevel: 30, upgradeLevel: 0, power: 43, modifiers: { physicalDamage: 18, criticalChance: 4 }, affixes: ["+18 Ataque FÃ­sico", "+4 pp CrÃ­tico"] },
  { id: "crimson-blood-orb", name: "Orbe de Sangue", slot: "trinket", rarity: "epic", family: "orb", allowedProfiles: ["vampire"], appearanceChance: 15, breakChance: 40, itemLevel: 30, upgradeLevel: 0, power: 70, modifiers: { magicalDamage: 16, burnChance: 12 }, statusEffects: [{ kind: "burn", chance: 12, turns: 2, percentMaxHp: 2 }], keywords: ["Queimadura leve: 12 pp", "Brasa de sangue"], affixes: ["+16 Poder MÃ¡gico", "+12 pp Queimadura"] },
  { id: "mist-rapier", name: "Rapieira da Névoa", slot: "weapon", rarity: "legendary", family: "rapier", allowedProfiles: ["vampire"], appearanceChance: 7, breakChance: 60, itemLevel: 30, upgradeLevel: 0, power: 108, modifiers: { physicalDamage: 32, criticalChance: 8, bleedChance: 18 }, statusEffects: [{ kind: "bleed", chance: 18, turns: 4, percentMaxHp: 2 }], uniqueKeyword: "Duelos sob névoa ampliam Sangramento.", keywords: ["Sangramento forte: 18 pp", "Duelo da névoa"], affixes: ["+32 Ataque FÃ­sico", "+8 pp CrÃ­tico"] },
];
equipment.push(...creatureFeaturedItems);

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
  { id: "vampire-wanderer", name: "Vampiro Errante", description: "Criatura noturna de FiorDeValle. À noite, a névoa oculta seus passos.", portraitPath: "/art/creatures/fiordevalle-vampire-common.jpeg", rarity: "common", regionId: "fiordevalle", level: 30, hpMax: 210, physicalDamage: 35, physicalDefense: 10, magicalDefense: 10, xpReward: 5, goldReward: 16, statusEffects: [{ kind: "bleed", chance: 8, turns: 2, percentMaxHp: 2 }], equippedItem: equipment.find((item) => item.id === "iron-gauntlets") },
  { id: "raider", name: "Saqueador", description: "Um humano oportunista que explora as rotas isoladas da região.", portraitPath: "/art/creatures/fiordevalle-raider-v1.png", rarity: "common", regionId: "fiordevalle", level: 30, hpMax: 210, physicalDamage: 35, physicalDefense: 10, magicalDefense: 10, xpReward: 5, goldReward: 16, statusEffects: [{ kind: "bleed", chance: 5, turns: 2, flatDamage: 10 }], equippedItem: equipment.find((item) => item.id === "iron-sword") },
  { id: "ash-wolf", name: "Lobo da Cinza", description: "Predador das colinas que caça em alcateia e deixa brasas nas pegadas.", portraitPath: "/art/creatures/fiordevalle-ash-wolf-v1.png", rarity: "common", regionId: "fiordevalle", level: 30, hpMax: 198, physicalDamage: 39, physicalDefense: 9, magicalDefense: 8, xpReward: 8, goldReward: 19, statusEffects: [{ kind: "bleed", chance: 18, turns: 3, flatDamage: 10 }], equippedItem: equipment.find((item) => item.id === "traveler-boots") },
  { id: "rotted-knight", name: "Cavaleiro Apodrecido", description: "Sentinela morta-viva que segura a rota mesmo quando sua armadura já não protege um corpo vivo.", portraitPath: "/art/creatures/fiordevalle-rotted-knight-v1.png", rarity: "common", regionId: "fiordevalle", level: 30, hpMax: 260, physicalDamage: 31, physicalDefense: 24, magicalDefense: 17, xpReward: 10, goldReward: 23, equippedItem: equipment.find((item) => item.id === "iron-helm") },
  { id: "crimson-herald", name: "Arauto Carmesim", description: "Vampiro raro que conduz a magia do sangue pelas rotas isoladas.", portraitPath: "/art/creatures/fiordevalle-vampire-rare.jpeg", rarity: "rare", regionId: "fiordevalle", level: 30, hpMax: 210, physicalDamage: 35, physicalDefense: 10, magicalDefense: 10, xpReward: 12, goldReward: 46, statusEffects: [{ kind: "blind", chance: 15, turns: 2 }], equippedItem: equipment.find((item) => item.id === "serrated-blade") },
  { id: "mist-captain", name: "Lorde da Névoa", description: "Boss vampírico que sai da névoa para tomar FiorDeValle.", portraitPath: "/art/creatures/fiordevalle-vampire-boss.jpeg", rarity: "boss", regionId: "fiordevalle", level: 30, hpMax: 210, physicalDamage: 35, physicalDefense: 10, magicalDefense: 10, xpReward: 10, goldReward: 36, statusEffects: [{ kind: "bleed", chance: 18, turns: 3, percentMaxHp: 4 }, { kind: "blind", chance: 12, turns: 2 }], equippedItem: equipment.find((item) => item.id === "mist-lord-blade") },
];

const creature = (id: string) => huntCreatures.find((entry) => entry.id === id)!;
creature("raider").equipmentProfileId = "raider";
creature("raider").featuredItemCandidates = creatureFeaturedItems.filter((item) => item.id === "raider-rust-sword");
creature("vampire-wanderer").equipmentProfileId = "vampire";
creature("vampire-wanderer").featuredItemCandidates = creatureFeaturedItems.filter((item) => item.id === "vampire-velvet-dagger");
creature("crimson-herald").equipmentProfileId = "vampire";
creature("crimson-herald").featuredItemCandidates = creatureFeaturedItems.filter((item) => item.id === "crimson-blood-orb");
creature("mist-captain").equipmentProfileId = "vampire";
creature("mist-captain").featuredItemCandidates = creatureFeaturedItems.filter((item) => item.id === "mist-rapier" || item.id === "crimson-blood-orb");

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
    const creatureRoll = random();
    const id = rare ? "crimson-herald" : miniboss ? "mist-captain" : creatureRoll < 0.30 ? "vampire-wanderer" : creatureRoll < 0.52 ? "ash-wolf" : creatureRoll < 0.68 ? "rotted-knight" : "raider";
    const source = huntCreatures.find((creature) => creature.id === id)!;
    return { ...source, hpMax: 30 + level * 6, physicalDamage: 5 + level, physicalDefense: level / 3, magicalDefense: level / 3 };
  });
}
