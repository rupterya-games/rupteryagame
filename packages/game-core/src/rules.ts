import type { AbilityDefinition, CharacterCombatStats, CharacterPreset, ClassDefinition, CombatLoadout, CombatStatusEffect, EquippedItems, EquipmentItem, GameCharacter, HuntBattleLog, HuntBattleState, HuntCombatant, HuntCompanion, HuntCreatureDefinition, LoadoutSlot, StatusEffectApplication, StatusEffectKind } from "./domain";

export const LOADOUT_SLOTS: ReadonlyArray<{ key: LoadoutSlot; label: string; kind: AbilityDefinition["slotKind"] }> = [
  { key: "skill1", label: "Habilidade 1", kind: "skill" }, { key: "skill2", label: "Habilidade 2", kind: "skill" }, { key: "skill3", label: "Habilidade 3", kind: "skill" }, { key: "skill4", label: "Habilidade 4", kind: "skill" }, { key: "ultimate", label: "Ultimate", kind: "ultimate" }, { key: "stance", label: "Postura", kind: "stance" }, { key: "passive", label: "Passiva", kind: "passive" },
];

export const emptyLoadout = (): CombatLoadout => ({ skill1: null, skill2: null, skill3: null, skill4: null, ultimate: null, stance: null, passive: null });
export const emptyEquipment = (): EquippedItems => ({ weapon: null, head: null, chest: null, hands: null, feet: null, trinket: null });
export const statusEffectLabels: Record<StatusEffectKind, string> = { bleed: "Sangramento", burn: "Queimadura", poison: "Envenenamento", blind: "Cegueira" };

export function abilityRawDamage(ability: AbilityDefinition, stats: CharacterCombatStats): number { return Math.max(0, Math.round(stats.physicalDamage * (ability.physicalScaling ?? 0) + stats.magicalDamage * (ability.magicalScaling ?? 0))); }
export function mitigateDamage(rawDamage: number, kind: "physical" | "magical", defender: CharacterCombatStats): number { const defense = kind === "physical" ? defender.physicalDefense : defender.magicalDefense; return Math.max(1, Math.round(rawDamage * (100 / (100 + Math.max(0, defense))))); }

export function applyEquipment(base: ClassDefinition, equipment: EquippedItems, items: EquipmentItem[]) {
  const selected = Object.values(equipment).flatMap((id) => items.filter((item) => item.id === id));
  const stats = { ...base.baseStats };
  let hpMax = base.baseVitals.hpMax; let mpMax = base.baseVitals.mpMax; let power = 0;
  for (const item of selected) {
    power += item.power; hpMax += item.modifiers.hpMax ?? 0; mpMax += item.modifiers.mpMax ?? 0;
    (Object.keys(stats) as Array<keyof CharacterCombatStats>).forEach((key) => { stats[key] += item.modifiers[key] ?? 0; });
  }
  return { stats, hpMax, mpMax, power };
}

export function characterPower(base: ClassDefinition, equipment: EquippedItems, items: EquipmentItem[]): number { const result = applyEquipment(base, equipment, items); return Math.round(result.power + result.stats.physicalDamage * 3 + result.stats.magicalDamage * 3 + result.stats.physicalDefense * 2 + result.stats.magicalDefense * 2 + result.stats.criticalChance * 3 + result.stats.dodgeChance * 3 + result.hpMax * 0.35 + result.mpMax * 0.2); }
export function validateLoadoutSlot(slot: LoadoutSlot, ability: AbilityDefinition | undefined): string | null { const definition = LOADOUT_SLOTS.find((entry) => entry.key === slot); if (!definition || !ability) return "Habilidade invalida."; if (definition.kind !== ability.slotKind) return `${ability.name} nao pode ocupar ${definition.label}.`; return null; }
export function setLoadoutAbility(loadout: CombatLoadout, slot: LoadoutSlot, ability: AbilityDefinition): CombatLoadout { const issue = validateLoadoutSlot(slot, ability); if (issue) throw new Error(issue); return { ...loadout, [slot]: ability.id }; }
export function activePreset(character: GameCharacter): CharacterPreset { return character.presets.find((preset) => preset.id === character.activePresetId) ?? character.presets[0]; }

const battleId = () => globalThis.crypto?.randomUUID?.() ?? `hunt-${Date.now()}`;
const emptyEffects = (): CombatStatusEffect[] => [];
const statusResistance = (stats: CharacterCombatStats, kind: StatusEffectKind) => stats[`${kind}Resistance` as keyof CharacterCombatStats] as number;
const effectDotDamage = (effect: CombatStatusEffect, maxHp: number) => {
  if (effect.flatDamage !== undefined) return Math.max(1, effect.flatDamage);
  // Condições precisam importar mesmo em lutas curtas. O valor fixo é a regra
  // padrão; percentMaxHp permanece apenas como compatibilidade de conteúdo legado.
  const severity = effect.percentMaxHp ?? 2;
  if (severity >= 5) return 25;
  if (severity >= 4) return 20;
  if (severity >= 3) return 15;
  return 10;
};

function tickEffects(combatant: HuntCombatant, turn: number, logs: HuntBattleLog[]) {
  let hpCurrent = combatant.hpCurrent;
  const activeEffects: CombatStatusEffect[] = [];
  for (const effect of combatant.activeEffects) {
    if (effect.kind !== "blind") {
      const damage = effectDotDamage(effect, combatant.hpMax);
      hpCurrent = Math.max(0, hpCurrent - damage);
      logs.push({ turn, tone: "system", text: `${combatant.name} sofre ${damage} de ${statusEffectLabels[effect.kind].toLowerCase()}.` });
    }
    if (effect.turns > 1) activeEffects.push({ ...effect, turns: effect.turns - 1 });
    else logs.push({ turn, tone: "system", text: `${statusEffectLabels[effect.kind]} em ${combatant.name} terminou.` });
  }
  return { ...combatant, hpCurrent, activeEffects };
}

function applyEffects(target: HuntCombatant, applications: StatusEffectApplication[], sourceName: string, turn: number, logs: HuntBattleLog[]) {
  let activeEffects = [...target.activeEffects];
  for (const application of applications) {
    const resistance = Math.max(0, Math.min(95, statusResistance(target.stats, application.kind)));
    const finalChance = application.chance * (1 - resistance / 100);
    if (Math.random() * 100 >= finalChance) continue;
    const effect: CombatStatusEffect = { ...application, sourceName };
    const existing = activeEffects.findIndex((entry) => entry.kind === application.kind);
    if (existing >= 0) activeEffects[existing] = {
      ...effect,
      turns: Math.max(effect.turns, activeEffects[existing].turns),
      flatDamage: Math.max(effect.flatDamage ?? 0, activeEffects[existing].flatDamage ?? 0) || undefined,
      percentMaxHp: Math.max(effect.percentMaxHp ?? 0, activeEffects[existing].percentMaxHp ?? 0),
    };
    else activeEffects.push(effect);
    logs.push({ turn, tone: "system", text: `${sourceName} aplica ${statusEffectLabels[application.kind]} em ${target.name} por ${effect.turns} turno(s).` });
  }
  return { ...target, activeEffects };
}

function attack(input: { attacker: HuntCombatant; defender: HuntCombatant; rawDamage: number; kind: "physical" | "magical"; effects: StatusEffectApplication[]; sourceName: string; turn: number; logs: HuntBattleLog[] }) {
  const blinded = input.attacker.activeEffects.some((effect) => effect.kind === "blind");
  const hitChance = Math.max(10, 100 - input.defender.stats.dodgeChance - (blinded ? 35 : 0));
  if (Math.random() * 100 >= hitChance) {
    input.logs.push({ turn: input.turn, tone: "system", text: `${input.sourceName} erra ${input.defender.name}${blinded ? " por cegueira" : " por esquiva"}.` });
    return { defender: input.defender, dealt: 0, critical: false };
  }
  const critical = Math.random() * 100 < input.attacker.stats.criticalChance;
  const dealt = mitigateDamage(Math.round(input.rawDamage * (critical ? 1.5 : 1)), input.kind, input.defender.stats);
  let defender = { ...input.defender, hpCurrent: Math.max(0, input.defender.hpCurrent - dealt) };
  defender = applyEffects(defender, input.effects, input.sourceName, input.turn, input.logs);
  return { defender, dealt, critical };
}

export const featuredItemAppearanceByRarity = { common: 55, rare: 30, epic: 15, legendary: 7, mythic: 2 } as const;
export const dropBreakChanceByRarity = { common: 15, rare: 25, epic: 40, legendary: 60, mythic: 75 } as const;
export const featuredItemXpBonusByRarity = { common: 5, rare: 10, epic: 20, legendary: 40, mythic: 75 } as const;
const memorySurvivalBonusByRarity = { common: 0, rare: 0, epic: 5, legendary: 10, mythic: 15 } as const;

function materialReward(item: EquipmentItem) {
  const ranges = { common: [1, 1], rare: [1, 2], epic: [2, 3], legendary: [3, 5], mythic: [4, 6] } as const;
  const [min, max] = ranges[item.rarity];
  return min + Math.floor(Math.random() * (max - min + 1));
}

function featuredItemsFor(creature: HuntCreatureDefinition, memories: Record<string, number>) {
  const cap = creature.rarity === "boss" ? 2 : 1;
  const candidates = creature.featuredItemCandidates ?? (creature.equippedItem ? [creature.equippedItem] : []);
  return candidates
    .filter((item) => !item.allowedProfiles?.length || item.allowedProfiles.includes(creature.equipmentProfileId ?? ""))
    .filter((item) => Math.random() * 100 < (item.appearanceChance ?? featuredItemAppearanceByRarity[item.rarity]))
    .slice(0, cap)
    .map((item) => {
      const memoryStacks = Math.min(3, memories[item.id] ?? 0);
      const baseBreakChance = item.breakChance ?? dropBreakChanceByRarity[item.rarity];
      const survivalBonus = memoryStacks * memorySurvivalBonusByRarity[item.rarity];
      return { ...item, breakChance: Math.max(0, baseBreakChance - survivalBonus) };
    });
}

function rewardFor(state: HuntBattleState, turn: number) {
  const itemIds: string[] = [];
  const logs: HuntBattleLog[] = [];
  const fragments: Array<{ rarity: EquipmentItem["rarity"]; amount: number }> = [];
  const memoryUpdates: Array<{ itemId: string; stacks: number }> = [];
  state.creatures.forEach((creature) => {
    (creature.equippedItems ?? (creature.equippedItem ? [creature.equippedItem] : [])).forEach((item) => {
      const chance = item.breakChance ?? dropBreakChanceByRarity[item.rarity];
      if (Math.random() * 100 < chance) {
        const amount = materialReward(item);
        fragments.push({ rarity: item.rarity, amount });
        if (item.rarity === "epic" || item.rarity === "legendary" || item.rarity === "mythic") {
          memoryUpdates.push({ itemId: item.id, stacks: 1 });
        }
        logs.push({ turn, tone: "system", text: `${item.name} foi danificado. +${amount} Fragmento${amount > 1 ? "s" : ""} ${item.rarity}.` });
        return;
      }
      itemIds.push(item.id);
      memoryUpdates.push({ itemId: item.id, stacks: 0 });
      logs.push({ turn, tone: "victory", text: `Drop intacto: ${item.name}.` });
    });
  });
  const xp = state.creatures.reduce((sum, creature) => {
    const bonus = (creature.equippedItems ?? []).reduce((total, item) => total + featuredItemXpBonusByRarity[item.rarity], 0);
    return sum + Math.round(creature.xpReward * (1 + bonus / 100));
  }, 0);
  return { reward: { xp, gold: state.creatures.reduce((sum, creature) => sum + creature.goldReward, 0), itemIds, fragments, memoryUpdates }, logs };
}

export function createHuntBattle(input: { regionId: string; player: HuntCombatant; creatures: HuntCreatureDefinition[]; companion?: HuntCompanion | null; itemMemories?: Record<string, number> }): HuntBattleState {
  const creatures = input.creatures.map((creature) => {
    const equippedItems = featuredItemsFor(creature, input.itemMemories ?? {});
    return { ...creature, equippedItems, equippedItem: equippedItems[0] };
  });
  const enemies: HuntCombatant[] = creatures.map((creature, index) => {
    const itemModifiers = creature.equippedItems?.reduce((total, item) => ({ ...total, ...Object.fromEntries(Object.entries(item.modifiers).map(([key, value]) => [key, (total[key as keyof typeof total] ?? 0) + (value ?? 0)])) }), {} as EquipmentItem["modifiers"]) ?? {};
    const hpMax = creature.hpMax + (itemModifiers.hpMax ?? 0);
    const itemEffects = creature.equippedItems?.flatMap((item) => item.statusEffects ?? []) ?? [];
    return { id: `${creature.id}-${index}`, name: creature.name, portraitPath: creature.portraitPath, hpCurrent: hpMax, hpMax, mpCurrent: 0, mpMax: 0, activeEffects: emptyEffects(), onHitEffects: [...(creature.statusEffects ?? []), ...itemEffects], stats: { physicalDamage: creature.physicalDamage + (itemModifiers.physicalDamage ?? 0), magicalDamage: itemModifiers.magicalDamage ?? 0, physicalDefense: creature.physicalDefense + (itemModifiers.physicalDefense ?? 0), magicalDefense: creature.magicalDefense + (itemModifiers.magicalDefense ?? 0), criticalChance: (creature.rarity === "boss" ? 12 : creature.rarity === "rare" ? 7 : 4) + (itemModifiers.criticalChance ?? 0), dodgeChance: (creature.rarity === "rare" ? 5 : 2) + (itemModifiers.dodgeChance ?? 0), bleedChance: itemModifiers.bleedChance ?? 0, burnChance: itemModifiers.burnChance ?? 0, poisonChance: itemModifiers.poisonChance ?? 0, blindChance: itemModifiers.blindChance ?? 0, bleedResistance: itemModifiers.bleedResistance ?? 0, burnResistance: itemModifiers.burnResistance ?? 0, poisonResistance: itemModifiers.poisonResistance ?? 0, blindResistance: itemModifiers.blindResistance ?? 0 } };
  });
  return { id: battleId(), regionId: input.regionId, creatures, player: { ...input.player, activeEffects: input.player.activeEffects ?? emptyEffects(), onHitEffects: input.player.onHitEffects ?? [] }, companion: input.companion ?? null, enemies, lastPetTargetId: null, lastPetDamage: 0, cooldowns: {}, turn: 1, status: "active", reward: null, log: [{ turn: 0, tone: "system", text: creatures.length > 1 ? `Emboscada: ${creatures.length} inimigos bloqueiam o caminho.` : `${creatures[0].name} bloqueia o caminho.` }] };
}

export function resolveHuntTurn(state: HuntBattleState, ability: AbilityDefinition): HuntBattleState {
  if (state.status !== "active") return state;
  const logs = [...state.log];
  let player = tickEffects(state.player, state.turn, logs);
  if (player.hpCurrent === 0) return { ...state, player, status: "defeat", log: [...logs, { turn: state.turn, tone: "defeat", text: `${player.name} caiu pelos efeitos ativos.` }] };
  let enemies = state.enemies.map((enemy) => tickEffects(enemy, state.turn, logs));
  if (enemies.every((enemy) => enemy.hpCurrent === 0)) { const loot = rewardFor(state, state.turn); return { ...state, player, enemies, status: "victory", reward: loot.reward, log: [...logs, ...loot.logs, { turn: state.turn, tone: "victory", text: `Os efeitos derrotaram a emboscada. +${loot.reward.xp} XP global · +${loot.reward.gold} ouro.` }] }; }
  const cooldown = state.cooldowns[ability.id] ?? 0;
  if (cooldown > 0) return { ...state, player, enemies, log: [...logs, { turn: state.turn, tone: "system", text: `${ability.name} está em recarga por mais ${cooldown} turno(s).` }] };
  if (!ability.damageFamily || ability.slotKind === "passive" || ability.slotKind === "stance") return { ...state, player, enemies, log: [...logs, { turn: state.turn, tone: "system", text: `${ability.name} não causa dano nesta rodada.` }] };
  const manaCost = ability.manaCost ?? 0;
  if (player.mpCurrent < manaCost) return { ...state, player, enemies, log: [...logs, { turn: state.turn, tone: "system", text: `MP insuficiente para ${ability.name}.` }] };
  const primaryEnemy = enemies.find((enemy) => enemy.hpCurrent > 0)!;
  const kind = ability.damageFamily === "magical" ? "magical" : "physical";
  const hit = attack({ attacker: player, defender: primaryEnemy, rawDamage: abilityRawDamage(ability, player.stats), kind, effects: [...(ability.statusEffects ?? []), ...player.onHitEffects], sourceName: `${player.name} usa ${ability.name}`, turn: state.turn, logs });
  enemies = enemies.map((enemy) => enemy.id === primaryEnemy.id ? hit.defender : enemy);
  player = { ...player, mpCurrent: player.mpCurrent - manaCost };
  logs.push({ turn: state.turn, tone: "player", text: hit.dealt ? `${player.name} usa ${ability.name} e causa ${hit.dealt} de dano${hit.critical ? " crítico" : ""}.` : `${player.name} usa ${ability.name}, mas não acerta.` });
  const cooldowns = Object.fromEntries(Object.entries(state.cooldowns).map(([id, turns]): [string, number] => [id, Math.max(0, turns - 1)]).filter(([, turns]) => turns > 0)) as Record<string, number>;
  if (ability.cooldownTurns) cooldowns[ability.id] = ability.cooldownTurns;
  if (enemies.every((enemy) => enemy.hpCurrent === 0)) { const loot = rewardFor(state, state.turn); return { ...state, player, enemies, cooldowns, status: "victory", reward: loot.reward, log: [...logs, ...loot.logs, { turn: state.turn, tone: "victory", text: `A emboscada foi derrotada. +${loot.reward.xp} XP global · +${loot.reward.gold} ouro.` }] }; }
  for (const enemy of enemies.filter((entry) => entry.hpCurrent > 0)) {
    const counter = attack({ attacker: enemy, defender: player, rawDamage: enemy.stats.physicalDamage, kind: "physical", effects: enemy.onHitEffects, sourceName: enemy.name, turn: state.turn, logs });
    player = counter.defender;
    if (counter.dealt) logs.push({ turn: state.turn, tone: "enemy", text: `${enemy.name} causa ${counter.dealt} de dano${counter.critical ? " crítico" : ""}.` });
    if (player.hpCurrent === 0) return { ...state, player, enemies, cooldowns, status: "defeat", log: [...logs, { turn: state.turn, tone: "defeat", text: `${player.name} caiu. HP permanece em 0 até receber cura.` }] };
  }
  if (!state.companion) return { ...state, player, enemies, cooldowns, lastPetTargetId: null, lastPetDamage: 0, turn: state.turn + 1, log: logs };
  const petTarget = enemies.filter((enemy) => enemy.hpCurrent > 0).sort((left, right) => left.hpCurrent - right.hpCurrent)[0];
  const petDamage = Math.max(1, Math.round(player.stats.magicalDamage * state.companion.magicalDamageScaling));
  enemies = enemies.map((enemy) => enemy.id === petTarget.id ? { ...enemy, hpCurrent: Math.max(0, enemy.hpCurrent - petDamage) } : enemy);
  logs.push({ turn: state.turn, tone: "player", text: `${state.companion.name} lança Bola de Fogo em ${petTarget.name} e causa ${petDamage} de dano mágico.` });
  if (enemies.every((enemy) => enemy.hpCurrent === 0)) { const loot = rewardFor(state, state.turn); return { ...state, player, enemies, cooldowns, lastPetTargetId: petTarget.id, lastPetDamage: petDamage, status: "victory", reward: loot.reward, log: [...logs, ...loot.logs, { turn: state.turn, tone: "victory", text: `A emboscada foi derrotada. +${loot.reward.xp} XP global · +${loot.reward.gold} ouro.` }] }; }
  return { ...state, player, enemies, cooldowns, lastPetTargetId: petTarget.id, lastPetDamage: petDamage, turn: state.turn + 1, log: logs };
}
