import type { AbilityDefinition, CharacterCombatStats, CharacterPreset, ClassDefinition, CombatLoadout, EquippedItems, EquipmentItem, GameCharacter, HuntBattleState, HuntCombatant, HuntCreatureDefinition, LoadoutSlot } from "./domain";

export const LOADOUT_SLOTS: ReadonlyArray<{ key: LoadoutSlot; label: string; kind: AbilityDefinition["slotKind"] }> = [
  { key: "skill1", label: "Habilidade 1", kind: "skill" },
  { key: "skill2", label: "Habilidade 2", kind: "skill" },
  { key: "skill3", label: "Habilidade 3", kind: "skill" },
  { key: "skill4", label: "Habilidade 4", kind: "skill" },
  { key: "ultimate", label: "Ultimate", kind: "ultimate" },
  { key: "stance", label: "Postura", kind: "stance" },
  { key: "passive", label: "Passiva", kind: "passive" },
];

export const emptyLoadout = (): CombatLoadout => ({ skill1: null, skill2: null, skill3: null, skill4: null, ultimate: null, stance: null, passive: null });
export const emptyEquipment = (): EquippedItems => ({ weapon: null, head: null, chest: null, hands: null, feet: null, trinket: null });

export function abilityRawDamage(ability: AbilityDefinition, stats: CharacterCombatStats): number {
  return Math.max(0, Math.round(stats.physicalDamage * (ability.physicalScaling ?? 0) + stats.magicalDamage * (ability.magicalScaling ?? 0)));
}

export function mitigateDamage(rawDamage: number, kind: "physical" | "magical", defender: CharacterCombatStats): number {
  const defense = kind === "physical" ? defender.physicalDefense : defender.magicalDefense;
  return Math.max(1, Math.round(rawDamage * (100 / (100 + Math.max(0, defense)))));
}

export function applyEquipment(base: ClassDefinition, equipment: EquippedItems, items: EquipmentItem[]) {
  const selected = Object.values(equipment).flatMap((id) => items.filter((item) => item.id === id));
  const stats = { ...base.baseStats };
  let hpMax = base.baseVitals.hpMax;
  let mpMax = base.baseVitals.mpMax;
  let power = 0;
  for (const item of selected) {
    power += item.power;
    hpMax += item.modifiers.hpMax ?? 0;
    mpMax += item.modifiers.mpMax ?? 0;
    stats.physicalDamage += item.modifiers.physicalDamage ?? 0;
    stats.magicalDamage += item.modifiers.magicalDamage ?? 0;
    stats.physicalDefense += item.modifiers.physicalDefense ?? 0;
    stats.magicalDefense += item.modifiers.magicalDefense ?? 0;
    stats.criticalChance += item.modifiers.criticalChance ?? 0;
    stats.dodgeChance += item.modifiers.dodgeChance ?? 0;
  }
  return { stats, hpMax, mpMax, power };
}

export function characterPower(base: ClassDefinition, equipment: EquippedItems, items: EquipmentItem[]): number {
  const result = applyEquipment(base, equipment, items);
  return Math.round(result.power + result.stats.physicalDamage * 3 + result.stats.magicalDamage * 3 + result.stats.physicalDefense * 2 + result.stats.magicalDefense * 2 + result.hpMax * 0.35 + result.mpMax * 0.2);
}

export function validateLoadoutSlot(slot: LoadoutSlot, ability: AbilityDefinition | undefined): string | null {
  const definition = LOADOUT_SLOTS.find((entry) => entry.key === slot);
  if (!definition || !ability) return "Habilidade invalida.";
  if (definition.kind !== ability.slotKind) return `${ability.name} nao pode ocupar ${definition.label}.`;
  return null;
}

export function setLoadoutAbility(loadout: CombatLoadout, slot: LoadoutSlot, ability: AbilityDefinition): CombatLoadout {
  const issue = validateLoadoutSlot(slot, ability);
  if (issue) throw new Error(issue);
  return { ...loadout, [slot]: ability.id };
}

export function activePreset(character: GameCharacter): CharacterPreset {
  return character.presets.find((preset) => preset.id === character.activePresetId) ?? character.presets[0];
}

const battleId = () => globalThis.crypto?.randomUUID?.() ?? `hunt-${Date.now()}`;

export function createHuntBattle(input: { regionId: string; player: HuntCombatant; creatures: HuntCreatureDefinition[] }): HuntBattleState {
  const enemies: HuntCombatant[] = input.creatures.map((creature, index) => ({
    id: `${creature.id}-${index}`,
    name: creature.name,
    portraitPath: creature.portraitPath,
    hpCurrent: creature.hpMax,
    hpMax: creature.hpMax,
    mpCurrent: 0,
    mpMax: 0,
    stats: {
      physicalDamage: creature.physicalDamage,
      magicalDamage: 0,
      physicalDefense: creature.physicalDefense,
      magicalDefense: creature.magicalDefense,
      criticalChance: 0,
      dodgeChance: 0,
    },
  }));
  return {
    id: battleId(),
    regionId: input.regionId,
    creatures: input.creatures,
    player: input.player,
    enemies,
    turn: 1,
    status: "active",
    reward: null,
    log: [{ turn: 0, tone: "system", text: input.creatures.length > 1 ? `Emboscada: ${input.creatures.length} inimigos bloqueiam o caminho.` : `${input.creatures[0].name} bloqueia o caminho.` }],
  };
}

export function resolveHuntTurn(state: HuntBattleState, ability: AbilityDefinition): HuntBattleState {
  if (state.status !== "active") return state;
  if (!ability.damageFamily || ability.slotKind === "passive" || ability.slotKind === "stance") return { ...state, log: [...state.log, { turn: state.turn, tone: "system", text: `${ability.name} não causa dano nesta rodada.` }] };
  const manaCost = ability.manaCost ?? 0;
  if (state.player.mpCurrent < manaCost) return { ...state, log: [...state.log, { turn: state.turn, tone: "system", text: `MP insuficiente para ${ability.name}.` }] };
  const kind = ability.damageFamily === "magical" ? "magical" : "physical";
  const raw = abilityRawDamage(ability, state.player.stats);
  const primaryEnemy = state.enemies.find((enemy) => enemy.hpCurrent > 0)!;
  const dealt = mitigateDamage(raw, kind, primaryEnemy.stats);
  const player = { ...state.player, mpCurrent: state.player.mpCurrent - manaCost };
  const enemies = state.enemies.map((enemy) => enemy.id === primaryEnemy.id ? { ...enemy, hpCurrent: Math.max(0, enemy.hpCurrent - dealt) } : enemy);
  const playerLog = { turn: state.turn, tone: "player" as const, text: `${player.name} usa ${ability.name} e causa ${dealt} de dano.` };
  if (enemies.every((enemy) => enemy.hpCurrent === 0)) {
    const reward = { xp: state.creatures.reduce((sum, creature) => sum + creature.xpReward, 0), gold: state.creatures.reduce((sum, creature) => sum + creature.goldReward, 0) };
    return { ...state, player, enemies, status: "victory", reward, log: [...state.log, playerLog, { turn: state.turn, tone: "victory", text: `A emboscada foi derrotada. +${reward.xp} XP global · +${reward.gold} ouro.` }] };
  }
  const received = enemies.filter((enemy) => enemy.hpCurrent > 0).reduce((sum, enemy) => sum + mitigateDamage(enemy.stats.physicalDamage, "physical", player.stats), 0);
  const afterCounter = { ...player, hpCurrent: Math.max(0, player.hpCurrent - received) };
  const enemyLog = { turn: state.turn, tone: "enemy" as const, text: `${enemies.filter((enemy) => enemy.hpCurrent > 0).length} inimigo(s) respondem e causam ${received} de dano físico.` };
  if (afterCounter.hpCurrent === 0) {
    return { ...state, player: afterCounter, enemies, status: "defeat", log: [...state.log, playerLog, enemyLog, { turn: state.turn, tone: "defeat", text: `${player.name} caiu. HP permanece em 0 até receber cura.` }] };
  }
  return { ...state, player: afterCounter, enemies, turn: state.turn + 1, log: [...state.log, playerLog, enemyLog] };
}
