import type { AbilityAreaDefinition, AbilityDefinition, ClassDefinition, EquipmentItem, HuntCompanion, HuntCreatureDefinition, HuntRegionDefinition, StatusEffectApplication } from "@rupterya/game-core";

const classArt = (name: string) => `/art/classes/${name}.jpeg`;

export const classes: ClassDefinition[] = [
  { id: "guardian", name: "Guardião", role: "Espada e escudo", portraitPath: classArt("guardian"), description: "Linha de frente de FiorDeValle. Protege a rota e suporta ataques pesados.", baseVitals: { hpMax: 360, mpMax: 54, morale: 100, gold: 780 }, baseStats: { speed: 8, physicalDamage: 49, magicalDamage: 10, physicalDefense: 46, magicalDefense: 20, criticalChance: 5, dodgeChance: 3, blockChance: 10, bleedChance: 4, burnChance: 0, poisonChance: 0, blindChance: 0, bleedResistance: 10, burnResistance: 4, poisonResistance: 8, blindResistance: 6 }, adventure: { perception: 6, knowledge: 4, strength: 10, agility: 4 } },
  { id: "duelist", name: "Duelista", role: "Duas lâminas", portraitPath: classArt("duelist"), description: "DPS marcial veloz que abre brechas com crítico, esquiva e pressão constante.", baseVitals: { hpMax: 292, mpMax: 62, morale: 100, gold: 780 }, baseStats: { speed: 14, physicalDamage: 61, magicalDamage: 12, physicalDefense: 27, magicalDefense: 19, criticalChance: 12, dodgeChance: 8, blockChance: 0, bleedChance: 10, burnChance: 0, poisonChance: 0, blindChance: 0, bleedResistance: 4, burnResistance: 3, poisonResistance: 5, blindResistance: 7 }, adventure: { perception: 7, knowledge: 3, strength: 8, agility: 10 } },
  { id: "archer", name: "Arqueiro", role: "Arco e aljava", portraitPath: classArt("archer"), description: "Batedor de fronteira que converte distância, munição e percepção em dano preciso.", baseVitals: { hpMax: 258, mpMax: 72, morale: 100, gold: 780 }, baseStats: { speed: 12, physicalDamage: 56, magicalDamage: 15, physicalDefense: 23, magicalDefense: 23, criticalChance: 11, dodgeChance: 9, blockChance: 0, bleedChance: 7, burnChance: 0, poisonChance: 4, blindChance: 6, bleedResistance: 4, burnResistance: 4, poisonResistance: 7, blindResistance: 10 }, adventure: { perception: 11, knowledge: 5, strength: 5, agility: 10 } },
  { id: "mage", name: "Mago", role: "Cajado e foco arcano", portraitPath: classArt("mage"), description: "Erudito de Rupterya que domina dano arcano e controle de campo.", baseVitals: { hpMax: 225, mpMax: 132, morale: 100, gold: 780 }, baseStats: { speed: 10, physicalDamage: 13, magicalDamage: 70, physicalDefense: 16, magicalDefense: 37, criticalChance: 6, dodgeChance: 4, blockChance: 0, bleedChance: 0, burnChance: 10, poisonChance: 0, blindChance: 4, bleedResistance: 3, burnResistance: 10, poisonResistance: 4, blindResistance: 5 }, adventure: { perception: 7, knowledge: 12, strength: 3, agility: 6 } },
  { id: "samurai", name: "Samurai", role: "Katana e bainha", portraitPath: classArt("samurai"), description: "DPS físico de precisão. Aguenta menos que um Guardião, mas transforma parte dos golpes recebidos em contra-ataques Iai.", baseVitals: { hpMax: 278, mpMax: 68, morale: 100, gold: 780 }, baseStats: { speed: 11, physicalDamage: 65, magicalDamage: 10, physicalDefense: 26, magicalDefense: 21, criticalChance: 11, dodgeChance: 7, blockChance: 0, bleedChance: 9, burnChance: 0, poisonChance: 0, blindChance: 0, bleedResistance: 6, burnResistance: 4, poisonResistance: 5, blindResistance: 8 }, adventure: { perception: 7, knowledge: 4, strength: 9, agility: 9 } },
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
  if (classId === "samurai" && index === 0) return [{ kind: "bleed", chance: 12, turns: 2, percentMaxHp: 2 }];
  if (classId === "samurai" && index === 3) return [{ kind: "bleed", chance: 22, turns: 3, percentMaxHp: 3 }];
  return [];
};
/** Alcance em hexágonos no tabuleiro de batalha: corpo a corpo fica preso a distância 1, à distância cobre o tabuleiro inteiro. */
const rangeByClass: Record<string, number> = { guardian: 1, duelist: 1, samurai: 1, archer: 3, mage: 3 };
const specialEffectsForClassSkill = (classId: string, index: number) => {
  if (classId === "guardian" && index === 1) return [{ kind: "push", distance: 1 }];
  return undefined;
};
const areaByClassSkill = (classId: string, index: number): AbilityAreaDefinition | undefined => {
  if (classId === "guardian" && index === 2) return { shape: "line" };
  if (classId === "duelist" && index === 2) return { shape: "radius", radius: 1 };
  if (classId === "archer" && index === 2) return { shape: "line" };
  if (classId === "mage" && index === 1) return { shape: "line" };
  if (classId === "mage" && (index === 2 || index === 3)) return { shape: "radius", radius: 1 };
  if (classId === "samurai" && index === 2) return { shape: "line" };
  if (classId === "samurai" && index === 3) return { shape: "cone" };
  return undefined;
};
const ultimateAreaByClass: Record<string, AbilityAreaDefinition | undefined> = {
  guardian: { shape: "cone" },
  duelist: { shape: "radius", radius: 1 },
  archer: { shape: "radius", radius: 2 },
  mage: { shape: "radius", radius: 2 },
  samurai: { shape: "cone" },
};
const classAbilityNames: Record<string, { skills: string[]; stance: string; ultimate: string; passive: string }> = {
  guardian: { skills: ["Corte da Muralha", "Golpe de Escudo", "Lança do Bastião", "Retaliação de Fiordevalle"], stance: "Postura de Bastião", ultimate: "Juramento de Ardenor", passive: "Vontade de Aço" },
  duelist: { skills: ["Corte Geminado", "Passo de Cinza", "Dança das Lâminas", "Ruptura Carmesim"], stance: "Guarda da Serpente", ultimate: "Mil Cortes de Rupterya", passive: "Fome de Duelo" },
  archer: { skills: ["Flecha do Vigia", "Disparo Duplo", "Tiro Perfurante", "Marca do Caçador"], stance: "Olho de Falcão", ultimate: "Chuva de Fiordevalle", passive: "Passo Silencioso" },
  mage: { skills: ["Dardo de Éter", "Lança de Brasa", "Prisma Congelante", "Ruptura Arcana"], stance: "Véu de Vidro", ultimate: "Tempestade de Rupterya", passive: "Sintonia Arcana" },
  samurai: { skills: ["Corte Iai", "Passo da Lua", "Corte Ascendente", "Lua Partida"], stance: "Postura Mushin", ultimate: "Lua Sem Retorno", passive: "Retaliação Iai" },
};

export const abilities: AbilityDefinition[] = classes.flatMap((entry) => {
  const names = classAbilityNames[entry.id];
  const magical = entry.id === "mage";
  const samurai = entry.id === "samurai";
  const physicalScale: number[] = magical ? [0, 0, 0, 0] : samurai ? [1.10, 1.22, 1.36, 1.50] : [1.05, 1.18, 1.3, 1.42];
  const magicalScale: number[] = magical ? [1.05, 1.18, 1.3, 1.42] : [0, 0, 0, 0];
  return [
    ...names.skills.map((name, index): AbilityDefinition => {
      const statusEffects = statusEffectsFor(entry.id, index);
      return { id: byClass(entry.id, `skill-${index + 1}`), name, description: `Técnica de ${entry.role.toLowerCase()} usada nas fronteiras de Rupterya.`, slotKind: "skill", source: "class", damageFamily: magical ? "magical" : "physical", physicalScaling: physicalScale[index], magicalScaling: magicalScale[index], manaCost: [0, 8, 14, 20][index], cooldownTurns: [0, 1, 2, 2][index], statusEffects, keywords: statusEffects.map((effect) => `${effect.chance}% ${effect.kind}`), range: rangeByClass[entry.id], area: areaByClassSkill(entry.id, index), specialEffects: specialEffectsForClassSkill(entry.id, index) };
    }),
    { id: byClass(entry.id, "stance"), name: names.stance, description: entry.id === "samurai" ? "Postura de foco para preparar cortes e contra-ataques." : "Postura preparada antes do combate.", slotKind: "stance", source: "class", manaCost: 10, cooldownTurns: 3 },
    { id: byClass(entry.id, "ultimate"), name: names.ultimate, description: "Golpe máximo da classe, reservado para a caça mais perigosa.", slotKind: "ultimate", source: "class", damageFamily: magical ? "magical" : "physical", physicalScaling: magical ? 0 : samurai ? 1.95 : 1.85, magicalScaling: magical ? 1.85 : 0, manaCost: 32, cooldownTurns: 4, range: rangeByClass[entry.id], area: ultimateAreaByClass[entry.id] },
    { id: byClass(entry.id, "passive"), name: names.passive, description: entry.id === "samurai" ? "Enquanto esta Passiva estiver equipada, ataques diretos que acertarem têm 30% de chance de provocar um contra-ataque de 65% do Dano Físico. Reação não consome ação e não dispara outra reação." : "Passiva da classe; ocupa o único slot de Passiva.", slotKind: "passive", source: "class" },
  ];
});

export const sharedAbilities: AbilityDefinition[] = [
  { id: "school-fire", name: "Escola de Fogo", description: "Passiva de escola para provar fontes externas.", slotKind: "passive", source: "school", damageFamily: "magical" },
  { id: "lineage-vampire", name: "Sangue Real", description: "Passiva de linhagem. Apenas uma linhagem pode ser escolhida.", slotKind: "passive", source: "lineage" },
  { id: "secret-predatory-charge", name: "Investida Predatória", description: "Arte Secreta marcial descoberta no mundo.", slotKind: "skill", source: "secret_art", damageFamily: "physical", physicalScaling: 1.35, manaCost: 10, cooldownTurns: 2, range: 2 },
];

export const equipment: EquipmentItem[] = [
  // Sets iniciais. Todos começam com arma principal + arma secundária.
  { id: "starter-guardian-sword", name: "Espada do Recruta", slot: "weapon", family: "sword", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 8, allowedClassIds: ["guardian"], modifiers: { physicalDamage: 5 }, affixes: ["+5 Dano Físico"] },
  { id: "starter-guardian-shield", name: "Escudo de Carvalho Ferrado", slot: "secondary", family: "shield", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 8, allowedClassIds: ["guardian"], modifiers: { physicalDefense: 4, magicalDefense: 2, hpMax: 12, blockChance: 6 }, keywords: ["Bloqueio: +6 pp de chance", "Bloqueio reduz parte do dano físico recebido; ataques mágicos ignoram bloqueio."], affixes: ["+4 Defesa Física", "+2 Defesa Mágica", "+12 Vida", "+6 pp Bloqueio"] },
  { id: "starter-guardian-helm", name: "Elmo do Bastião Jovem", slot: "head", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 5, allowedClassIds: ["guardian"], modifiers: { physicalDefense: 3, hpMax: 6, blockChance: 2 }, affixes: ["+3 Defesa Física", "+6 Vida", "+2 pp Bloqueio"] },
  { id: "starter-guardian-chest", name: "Cota do Bastião Jovem", slot: "chest", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 7, allowedClassIds: ["guardian"], modifiers: { physicalDefense: 4, magicalDefense: 2, hpMax: 10, blockChance: 2 }, affixes: ["+4 Defesa Física", "+2 Defesa Mágica", "+10 Vida", "+2 pp Bloqueio"] },
  { id: "starter-guardian-hands", name: "Manoplas do Bastião Jovem", slot: "hands", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 4, allowedClassIds: ["guardian"], modifiers: { physicalDefense: 2 }, affixes: ["+2 Defesa Física"] },
  { id: "starter-guardian-feet", name: "Grevas do Bastião Jovem", slot: "feet", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 4, allowedClassIds: ["guardian"], modifiers: { physicalDefense: 1, magicalDefense: 1, hpMax: 6 }, affixes: ["+1 Defesas", "+6 Vida"] },

  { id: "starter-duelist-blade", name: "Espada Leve de Treino", slot: "weapon", family: "sword", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 9, allowedClassIds: ["duelist"], modifiers: { physicalDamage: 6, criticalChance: 1, bleedChance: 3 }, keywords: ["Sangramento leve: +3 pp de chance"], affixes: ["+6 Dano Físico", "+1 pp Crítico", "+3 pp Sangramento"] },
  { id: "starter-duelist-offhand", name: "Lâmina de Mão Fraca", slot: "secondary", family: "dagger", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 7, allowedClassIds: ["duelist"], modifiers: { physicalDamage: 3, dodgeChance: 1 }, affixes: ["+3 Dano Físico", "+1 pp Esquiva"] },
  { id: "starter-duelist-head", name: "Faixa do Duelista", slot: "head", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 4, allowedClassIds: ["duelist"], modifiers: { criticalChance: 1, physicalDefense: 1 }, affixes: ["+1 pp Crítico", "+1 Defesa Física"] },
  { id: "starter-duelist-chest", name: "Gibão do Duelista", slot: "chest", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 6, allowedClassIds: ["duelist"], modifiers: { physicalDefense: 3, magicalDefense: 1, hpMax: 8 }, affixes: ["+3 Defesa Física", "+1 Defesa Mágica", "+8 Vida"] },
  { id: "starter-duelist-hands", name: "Luvas de Empunhadura", slot: "hands", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 4, allowedClassIds: ["duelist"], modifiers: { physicalDamage: 1, physicalDefense: 1, poisonChance: 2 }, keywords: ["Lâminas untadas: +2 pp de Veneno"], affixes: ["+1 Dano Físico", "+1 Defesa Física", "+2 pp Veneno"] },
  { id: "starter-duelist-feet", name: "Botas de Passo Curto", slot: "feet", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 5, allowedClassIds: ["duelist"], modifiers: { dodgeChance: 1, physicalDefense: 2 }, affixes: ["+1 pp Esquiva", "+2 Defesa Física"] },

  { id: "starter-archer-bow", name: "Arco de Freixo", slot: "weapon", family: "bow", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 9, allowedClassIds: ["archer"], modifiers: { physicalDamage: 6, criticalChance: 1, bleedChance: 3 }, keywords: ["Pontas farpadas: +3 pp de Sangramento"], affixes: ["+6 Dano Físico", "+1 pp Crítico", "+3 pp Sangramento"] },
  { id: "starter-archer-quiver", name: "Aljava de Flechas Simples", slot: "secondary", family: "quiver", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 7, allowedClassIds: ["archer"], modifiers: { physicalDamage: 4, poisonChance: 2 }, keywords: ["Flechas Básicas · Nv. 1", "Pontas untadas: +2 pp de Veneno"], affixes: ["+4 Dano Físico", "+2 pp Veneno"] },
  { id: "starter-archer-head", name: "Capuz do Batedor", slot: "head", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 4, allowedClassIds: ["archer"], modifiers: { physicalDefense: 1, magicalDefense: 1 }, affixes: ["+1 Defesas"] },
  { id: "starter-archer-chest", name: "Gibão do Batedor", slot: "chest", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 6, allowedClassIds: ["archer"], modifiers: { physicalDefense: 3, magicalDefense: 2, hpMax: 8 }, affixes: ["+3 Defesa Física", "+2 Defesa Mágica", "+8 Vida"] },
  { id: "starter-archer-hands", name: "Braçadeiras do Arqueiro", slot: "hands", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 4, allowedClassIds: ["archer"], modifiers: { physicalDamage: 1, physicalDefense: 1 }, affixes: ["+1 Dano Físico", "+1 Defesa Física"] },
  { id: "starter-archer-feet", name: "Botas do Rastreador", slot: "feet", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 5, allowedClassIds: ["archer"], modifiers: { dodgeChance: 1, physicalDefense: 2 }, affixes: ["+1 pp Esquiva", "+2 Defesa Física"] },

  { id: "starter-mage-staff", name: "Cajado de Aprendiz", slot: "weapon", family: "staff", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 10, allowedClassIds: ["mage"], modifiers: { magicalDamage: 8, mpMax: 6 }, affixes: ["+8 Dano Mágico", "+6 MP"] },
  { id: "starter-mage-focus", name: "Foco Arcano de Cobre", slot: "secondary", family: "orb", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 8, allowedClassIds: ["mage"], modifiers: { magicalDamage: 5, mpMax: 10, burnChance: 3 }, keywords: ["Brasa contida: +3 pp de Queimadura"], affixes: ["+5 Dano Mágico", "+10 MP", "+3 pp Queimadura"] },
  { id: "starter-mage-head", name: "Capuz do Aprendiz", slot: "head", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 4, allowedClassIds: ["mage"], modifiers: { magicalDefense: 2 }, affixes: ["+2 Defesa Mágica"] },
  { id: "starter-mage-chest", name: "Manto do Aprendiz", slot: "chest", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 6, allowedClassIds: ["mage"], modifiers: { magicalDefense: 4, physicalDefense: 1, hpMax: 8 }, affixes: ["+4 Defesa Mágica", "+1 Defesa Física", "+8 Vida"] },
  { id: "starter-mage-hands", name: "Luvas de Canalização", slot: "hands", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 4, allowedClassIds: ["mage"], modifiers: { magicalDamage: 1, magicalDefense: 1 }, affixes: ["+1 Dano Mágico", "+1 Defesa Mágica"] },
  { id: "starter-mage-feet", name: "Sapatos Rúnicos", slot: "feet", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 4, allowedClassIds: ["mage"], modifiers: { magicalDefense: 1, hpMax: 4 }, affixes: ["+1 Defesa Mágica", "+4 Vida"] },

  { id: "starter-samurai-katana", name: "Katana de Aço Simples", slot: "weapon", family: "katana", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 10, allowedClassIds: ["samurai"], modifiers: { physicalDamage: 7, criticalChance: 1 }, affixes: ["+7 Dano Físico", "+1 pp Crítico"] },
  { id: "starter-samurai-sheath", name: "Bainha de Madeira Laqueada", slot: "secondary", family: "sheath", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 8, allowedClassIds: ["samurai"], modifiers: { physicalDamage: 3 }, counterAttackChanceBonus: 5, counterAttackScalingBonus: 0.10, keywords: ["+5 pp chance de Contra-ataque", "+10 pp escala do Contra-ataque", "A bainha melhora a Retaliação Iai sem transformar o Samurai em tanque."], affixes: ["+3 Dano Físico"] },
  { id: "starter-samurai-head", name: "Hachimaki do Peregrino", slot: "head", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 4, allowedClassIds: ["samurai"], modifiers: { criticalChance: 1, physicalDefense: 1 }, affixes: ["+1 pp Crítico", "+1 Defesa Física"] },
  { id: "starter-samurai-chest", name: "Dô Laminar de Viagem", slot: "chest", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 7, allowedClassIds: ["samurai"], modifiers: { physicalDefense: 4, magicalDefense: 1, hpMax: 10 }, affixes: ["+4 Defesa Física", "+1 Defesa Mágica", "+10 Vida"] },
  { id: "starter-samurai-hands", name: "Kote de Treino", slot: "hands", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 4, allowedClassIds: ["samurai"], modifiers: { physicalDamage: 1, physicalDefense: 1 }, counterAttackChanceBonus: 3, keywords: ["+3 pp chance de Contra-ataque", "Punho firme agiliza o saque da Retaliação Iai."], affixes: ["+1 Dano Físico", "+1 Defesa Física"] },
  { id: "starter-samurai-feet", name: "Suneate de Estrada", slot: "feet", family: "armor", rarity: "common", itemLevel: 1, upgradeLevel: 0, power: 5, allowedClassIds: ["samurai"], modifiers: { physicalDefense: 2, dodgeChance: 1, hpMax: 4 }, affixes: ["+2 Defesa Física", "+1 pp Esquiva", "+4 Vida"] },
  { id: "iron-sword", name: "Espada de Ferro", slot: "weapon", rarity: "common", itemLevel: 10, upgradeLevel: 0, power: 10, modifiers: { physicalDamage: 7 }, affixes: ["+7 Ataque Físico"] },
  { id: "iron-helm", name: "Elmo de Vigia", slot: "head", rarity: "common", itemLevel: 10, upgradeLevel: 0, power: 7, modifiers: { physicalDefense: 5, hpMax: 12, blockChance: 3 }, affixes: ["+5 Defesa Física", "+12 Vida", "+3 pp Bloqueio"] },
  { id: "leather-coat", name: "Cota de Couro", slot: "chest", rarity: "common", itemLevel: 10, upgradeLevel: 0, power: 12, modifiers: { physicalDefense: 8, magicalDefense: 4, blockChance: 3 }, affixes: ["+8 Defesa Física", "+4 Defesa Mágica", "+3 pp Bloqueio"] },
  { id: "traveler-boots", name: "Botas do Viajante", slot: "feet", rarity: "common", itemLevel: 10, upgradeLevel: 0, power: 6, modifiers: { hpMax: 18, magicalDefense: 3 }, affixes: ["+18 Vida", "+3 Defesa Mágica"] },
  { id: "hunter-bow", name: "Arco do Caçador", slot: "weapon", rarity: "rare", itemLevel: 20, upgradeLevel: 0, power: 39, modifiers: { physicalDamage: 19, criticalChance: 4 }, affixes: ["+19 Ataque Físico", "+4 pp Crítico"] },
  { id: "ember-staff", name: "Cajado de Brasa", slot: "weapon", rarity: "rare", itemLevel: 20, upgradeLevel: 0, power: 40, modifiers: { magicalDamage: 20, mpMax: 20 }, affixes: ["+20 Poder Mágico", "+20 MP"] },
  { id: "iron-gauntlets", name: "Manoplas de Ferro", slot: "hands", rarity: "rare", itemLevel: 20, upgradeLevel: 0, power: 22, modifiers: { physicalDamage: 8, physicalDefense: 6, criticalChance: 3 }, affixes: ["+8 Ataque Físico", "+3 pp Crítico"] },
  { id: "moon-charm", name: "Amuleto da Lua", slot: "trinket", rarity: "epic", itemLevel: 25, upgradeLevel: 0, power: 62, modifiers: { magicalDamage: 18, magicalDefense: 12, burnChance: 8 }, statusEffects: [{ kind: "burn", chance: 8, turns: 2, percentMaxHp: 2 }], keywords: ["Queimadura leve: +8 pp de chance", "2% Vida máxima por 2 turnos"], affixes: ["+18 Poder Mágico", "+12 Defesa Mágica"] },
  { id: "serrated-blade", name: "Lâmina Serrilhada", slot: "weapon", rarity: "epic", itemLevel: 25, upgradeLevel: 0, power: 64, modifiers: { physicalDamage: 22, bleedChance: 12 }, statusEffects: [{ kind: "bleed", chance: 12, turns: 3, percentMaxHp: 1 }], keywords: ["Sangramento leve: +12 pp de chance", "1% Vida máxima por 3 turnos"], affixes: ["+22 Ataque Físico", "+12 pp Sangramento"] },
  { id: "crimson-regalia", name: "Regalia Carmesim", slot: "chest", rarity: "legendary", itemLevel: 30, upgradeLevel: 0, power: 92, modifiers: { hpMax: 80, physicalDefense: 18, magicalDefense: 18, blockChance: 8, bleedResistance: 15, blindResistance: 12 }, keywords: ["Bloqueio forte: +8 pp de chance", "Resistência forte a Sangramento +15%", "Resistência forte a Cegueira +12%"], affixes: ["+80 Vida", "+18 Defesa Física", "+18 Defesa Mágica", "+8 pp Bloqueio"] },
  { id: "mist-lord-blade", name: "Lâmina do Lorde da Névoa", slot: "weapon", rarity: "legendary", itemLevel: 30, upgradeLevel: 0, power: 104, modifiers: { physicalDamage: 30, criticalChance: 7, bleedChance: 20 }, statusEffects: [{ kind: "bleed", chance: 20, turns: 4, percentMaxHp: 2 }], keywords: ["Sangramento forte: +20 pp de chance", "2% Vida máxima por 4 turnos"], affixes: ["+30 Ataque Físico", "+7 pp Crítico", "+20 pp Sangramento"] },
  { id: "eldravia-glass-staff", name: "Cajado de Vidro Rúnico", slot: "weapon", rarity: "rare", itemLevel: 24, upgradeLevel: 0, power: 48, modifiers: { magicalDamage: 24, magicalDefense: 6, mpMax: 18 }, affixes: ["+24 Poder Mágico", "+6 Defesa Mágica", "+18 MP"] },
  { id: "eldravia-prism-coat", name: "Manto Prismático", slot: "chest", rarity: "epic", itemLevel: 30, upgradeLevel: 0, power: 78, modifiers: { magicalDefense: 22, physicalDefense: 8, hpMax: 38, burnResistance: 8 }, affixes: ["+22 Defesa Mágica", "+38 Vida", "+8% Resist. queimadura"] },
  { id: "eldravia-rift-orb", name: "Orbe da Fenda Contida", slot: "trinket", rarity: "legendary", itemLevel: 35, upgradeLevel: 0, power: 112, modifiers: { magicalDamage: 31, mpMax: 36, blindChance: 12, magicalDefense: 12 }, statusEffects: [{ kind: "blind", chance: 12, turns: 1 }], keywords: ["12 pp de Cegueira", "Energia de Ruptura estabilizada"], affixes: ["+31 Poder Mágico", "+36 MP", "+12 Defesa Mágica"] },
  { id: "dustfall-scrap-blade", name: "Lâmina de Escória", slot: "weapon", rarity: "rare", itemLevel: 30, upgradeLevel: 0, power: 52, modifiers: { physicalDamage: 23, physicalDefense: 6, criticalChance: 3 }, affixes: ["+23 Ataque Físico", "+6 Defesa Física", "+3 pp Crítico"] },
  { id: "dustfall-salt-plate", name: "Couraça das Salinas", slot: "chest", rarity: "epic", itemLevel: 40, upgradeLevel: 0, power: 84, modifiers: { hpMax: 58, physicalDefense: 22, magicalDefense: 14, blockChance: 5, poisonResistance: 10 }, affixes: ["+58 Vida", "+22 Defesa Física", "+14 Defesa Mágica", "+5 pp Bloqueio", "+10% Resist. veneno"] },
  { id: "dustfall-crater-core", name: "Núcleo da Cratera", slot: "trinket", rarity: "legendary", itemLevel: 50, upgradeLevel: 0, power: 118, modifiers: { physicalDamage: 14, magicalDamage: 14, physicalDefense: 10, magicalDefense: 10, burnResistance: 16 }, keywords: ["Híbrido da Convergência", "+16% Resist. queimadura"], affixes: ["+14 Ataque Físico", "+14 Poder Mágico", "+10 Defesas"] },
];

export const starterSetsByClass: Record<string, string[]> = {
  guardian: ["starter-guardian-sword", "starter-guardian-shield", "starter-guardian-helm", "starter-guardian-chest", "starter-guardian-hands", "starter-guardian-feet"],
  duelist: ["starter-duelist-blade", "starter-duelist-offhand", "starter-duelist-head", "starter-duelist-chest", "starter-duelist-hands", "starter-duelist-feet"],
  archer: ["starter-archer-bow", "starter-archer-quiver", "starter-archer-head", "starter-archer-chest", "starter-archer-hands", "starter-archer-feet"],
  mage: ["starter-mage-staff", "starter-mage-focus", "starter-mage-head", "starter-mage-chest", "starter-mage-hands", "starter-mage-feet"],
  samurai: ["starter-samurai-katana", "starter-samurai-sheath", "starter-samurai-head", "starter-samurai-chest", "starter-samurai-hands", "starter-samurai-feet"],
};

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
  {
    id: "fiordevalle",
    name: "FiorDeValle",
    kingdom: "FiorDeValle",
    description: "Cidade-hub inicial com vinhedos, colinas, cemitério e Floresta Sombria conectados por instâncias de progressão.",
    danger: "Nv. 1–20 · Progressão inicial",
    creatureIds: ["cellar-rat", "leech-bat", "raider", "ash-wolf", "vampire-wanderer", "rotted-knight", "crimson-herald", "mist-captain"],
  },
  {
    id: "eldravia",
    name: "Eldravia",
    kingdom: "Eldravia",
    description: "Cidade arcana cercada por arquivos vivos, claustros de vidro e áreas atingidas pela Ruptura.",
    danger: "Nv. 15–35 · Progressão arcana",
    creatureIds: ["stray-apprentice", "ink-servant", "rupture-shard", "hollow-echo", "library-golem", "essence-leech", "grimoire-owl", "convergence-hound", "glass-inquisitor", "rupture-weaver", "fractured-archon"],
  },
  {
    id: "dustfall",
    name: "Dustfall",
    kingdom: "Dustfall",
    description: "Fronteira de sal e escória com Horda Verde, salinas mortas e a Cratera como progressão final.",
    danger: "Nv. 24–50 · Progressão avançada",
    creatureIds: ["orc-saqueador", "xama-goblin", "orc-carrasco", "minotauro-do-labirinto", "senhor-da-guerra-orc", "slag-beetle", "cracked-nomad", "iron-hyena", "dust-worm", "walking-cinder", "buried-sentinel", "brood-mother", "salt-knight", "slag-drake", "slag-colossus", "buried-titan"],
  },
];

export const battleBoardsByRegion: Record<string, string> = {
  fiordevalle: "/art/boards/fiordevalle-rose-board.jpeg",
  eldravia: "/art/maps/cities/eldravia.jpg",
  dustfall: "/art/maps/cities/dustfall.jpg",
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


export { adventureCities } from "./world";
