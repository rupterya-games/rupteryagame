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
const effectDotDamage = (effect: CombatStatusEffect, maxHp: number) => Math.max(1, Math.round(maxHp * (effect.percentMaxHp ?? 2) / 100));

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
    if (existing >= 0) activeEffects[existing] = { ...effect, turns: Math.max(effect.turns, activeEffects[existing].turns), percentMaxHp: Math.max(effect.percentMaxHp ?? 0, activeEffects[existing].percentMaxHp ?? 0) };
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

function rewardFor(state: HuntBattleState) { return { xp: state.creatures.reduce((sum, creature) => sum + creature.xpReward, 0), gold: state.creatures.reduce((sum, creature) => sum + creature.goldReward, 0) }; }

export function createHuntBattle(input: { regionId: string; player: HuntCombatant; creatures: HuntCreatureDefinition[]; companion?: HuntCompanion | null }): HuntBattleState {
  const enemies: HuntCombatant[] = input.creatures.map((creature, index) => ({ id: `${creature.id}-${index}`, name: creature.name, portraitPath: creature.portraitPath, hpCurrent: creature.hpMax, hpMax: creature.hpMax, mpCurrent: 0, mpMax: 0, activeEffects: emptyEffects(), onHitEffects: creature.statusEffects ?? [], stats: { physicalDamage: creature.physicalDamage, magicalDamage: 0, physicalDefense: creature.physicalDefense, magicalDefense: creature.magicalDefense, criticalChance: creature.rarity === "boss" ? 12 : creature.rarity === "rare" ? 7 : 4, dodgeChance: creature.rarity === "rare" ? 5 : 2, bleedChance: 0, burnChance: 0, poisonChance: 0, blindChance: 0, bleedResistance: 0, burnResistance: 0, poisonResistance: 0, blindResistance: 0 } }));
  return { id: battleId(), regionId: input.regionId, creatures: input.creatures, player: { ...input.player, activeEffects: input.player.activeEffects ?? emptyEffects(), onHitEffects: input.player.onHitEffects ?? [] }, companion: input.companion ?? null, enemies, lastPetTargetId: null, cooldowns: {}, turn: 1, status: "active", reward: null, log: [{ turn: 0, tone: "system", text: input.creatures.length > 1 ? `Emboscada: ${input.creatures.length} inimigos bloqueiam o caminho.` : `${input.creatures[0].name} bloqueia o caminho.` }] };
}

export function resolveHuntTurn(state: HuntBattleState, ability: AbilityDefinition): HuntBattleState {
  if (state.status !== "active") return state;
  const logs = [...state.log];
  let player = tickEffects(state.player, state.turn, logs);
  if (player.hpCurrent === 0) return { ...state, player, status: "defeat", log: [...logs, { turn: state.turn, tone: "defeat", text: `${player.name} caiu pelos efeitos ativos.` }] };
  let enemies = state.enemies.map((enemy) => tickEffects(enemy, state.turn, logs));
  if (enemies.every((enemy) => enemy.hpCurrent === 0)) { const reward = rewardFor(state); return { ...state, player, enemies, status: "victory", reward, log: [...logs, { turn: state.turn, tone: "victory", text: `Os efeitos derrotaram a emboscada. +${reward.xp} XP global · +${reward.gold} ouro.` }] }; }
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
  if (enemies.every((enemy) => enemy.hpCurrent === 0)) { const reward = rewardFor(state); return { ...state, player, enemies, cooldowns, status: "victory", reward, log: [...logs, { turn: state.turn, tone: "victory", text: `A emboscada foi derrotada. +${reward.xp} XP global · +${reward.gold} ouro.` }] }; }
  for (const enemy of enemies.filter((entry) => entry.hpCurrent > 0)) {
    const counter = attack({ attacker: enemy, defender: player, rawDamage: enemy.stats.physicalDamage, kind: "physical", effects: enemy.onHitEffects, sourceName: enemy.name, turn: state.turn, logs });
    player = counter.defender;
    if (counter.dealt) logs.push({ turn: state.turn, tone: "enemy", text: `${enemy.name} causa ${counter.dealt} de dano${counter.critical ? " crítico" : ""}.` });
    if (player.hpCurrent === 0) return { ...state, player, enemies, cooldowns, status: "defeat", log: [...logs, { turn: state.turn, tone: "defeat", text: `${player.name} caiu. HP permanece em 0 até receber cura.` }] };
  }
  if (!state.companion) return { ...state, player, enemies, cooldowns, lastPetTargetId: null, turn: state.turn + 1, log: logs };
  const petTarget = enemies.filter((enemy) => enemy.hpCurrent > 0).sort((left, right) => left.hpCurrent - right.hpCurrent)[0];
  const petDamage = Math.max(1, Math.round(player.stats.magicalDamage * state.companion.magicalDamageScaling));
  enemies = enemies.map((enemy) => enemy.id === petTarget.id ? { ...enemy, hpCurrent: Math.max(0, enemy.hpCurrent - petDamage) } : enemy);
  logs.push({ turn: state.turn, tone: "player", text: `${state.companion.name} lança Bola de Fogo em ${petTarget.name} e causa ${petDamage} de dano mágico.` });
  if (enemies.every((enemy) => enemy.hpCurrent === 0)) { const reward = rewardFor(state); return { ...state, player, enemies, cooldowns, lastPetTargetId: petTarget.id, status: "victory", reward, log: [...logs, { turn: state.turn, tone: "victory", text: `A emboscada foi derrotada. +${reward.xp} XP global · +${reward.gold} ouro.` }] }; }
  return { ...state, player, enemies, cooldowns, lastPetTargetId: petTarget.id, turn: state.turn + 1, log: logs };
}
