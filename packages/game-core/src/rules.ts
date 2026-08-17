import type { AbilityDefinition, Axial, CharacterCombatStats, CharacterPreset, ClassDefinition, CombatLoadout, CombatPosition, CombatStatusEffect, CreatureAbilityDefinition, CreatureSpecialEffect, EquippedItems, EquipmentItem, GameCharacter, HuntBattleLog, HuntBattleState, HuntCombatant, HuntCompanion, HuntCreatureDefinition, LoadoutSlot, StatusEffectApplication, StatusEffectKind } from "./domain";

export const LOADOUT_SLOTS: ReadonlyArray<{ key: LoadoutSlot; label: string; kind: AbilityDefinition["slotKind"] }> = [
  { key: "skill1", label: "Habilidade 1", kind: "skill" }, { key: "skill2", label: "Habilidade 2", kind: "skill" }, { key: "skill3", label: "Habilidade 3", kind: "skill" }, { key: "skill4", label: "Habilidade 4", kind: "skill" }, { key: "ultimate", label: "Ultimate", kind: "ultimate" }, { key: "stance", label: "Postura", kind: "stance" }, { key: "passive", label: "Passiva", kind: "passive" },
];

export const emptyLoadout = (): CombatLoadout => ({ skill1: null, skill2: null, skill3: null, skill4: null, ultimate: null, stance: null, passive: null });
export const emptyEquipment = (): EquippedItems => ({ weapon: null, secondary: null, head: null, chest: null, hands: null, feet: null, trinket: null });
export const statusEffectLabels: Record<StatusEffectKind, string> = {
  bleed: "Sangramento", burn: "Queimadura", poison: "Envenenamento", blind: "Cegueira",
  stun: "Atordoamento", silence: "Silêncio", marked: "Marcado", taunted: "Provocado",
  guard: "Guarda", evasion: "Evasão", position_lock: "Imobilizado", enraged: "Fúria",
};
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


export const PLAYER_MP_REGEN_PER_TURN = 6;
/** Só a linha de frente luta: reservas ficam inativas (sem agir, sem poder ser alvo) até um slot abrir. */
export const FRONT_LINE_SIZE = 3;
export function activeFrontLine(enemies: HuntCombatant[]): HuntCombatant[] {
  return enemies.filter((enemy) => enemy.hpCurrent > 0).slice(0, FRONT_LINE_SIZE);
}
/** Teto de criaturas por encontro, incluindo reservas fora da linha de frente e invocações em combate. */
export const ENGINE_MAX_ENCOUNTER_SIZE = 8;

// ---------------------------------------------------------------------------
// Tabuleiro hexagonal do campo de batalha
// ---------------------------------------------------------------------------

/** Raio do tabuleiro (19 células) — mesmo tamanho já validado no protótipo Hex Lab. */
export const BOARD_RADIUS = 2;
/** Onde o jogador começa toda batalha (centro do tabuleiro). */
export const PLAYER_START_CELL: Axial = { q: 0, r: 0 };
/** Células fixas da linha de frente inimiga, por índice de slot (0, 1, 2). Quando o
 * ocupante de um slot morre, o próximo da reserva assume o MESMO índice — e portanto a
 * mesma célula — automaticamente, via activeFrontLine(). */
export const ENEMY_SLOT_CELLS: Axial[] = [
  { q: 2, r: -2 },
  { q: 2, r: -1 },
  { q: 2, r: 0 },
];
/** Alcance de movimento do jogador por rodada. Igual pra todas as classes por enquanto. */
export const PLAYER_MOVE_RANGE = 2;

const AXIAL_DIRECTIONS: Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

const hexKey = (cell: Axial) => `${cell.q},${cell.r}`;

export function hexDistance(a: Axial, b: Axial): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export function boardCells(): Axial[] {
  const cells: Axial[] = [];
  for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q += 1) {
    const rMin = Math.max(-BOARD_RADIUS, -q - BOARD_RADIUS);
    const rMax = Math.min(BOARD_RADIUS, -q + BOARD_RADIUS);
    for (let r = rMin; r <= rMax; r += 1) cells.push({ q, r });
  }
  return cells;
}

/** Flood-fill respeitando o tabuleiro e células ocupadas — alcance de movimento real. */
export function reachableCells(start: Axial, range: number, board: Axial[], occupied: Set<string>): Axial[] {
  const boardKeys = new Set(board.map(hexKey));
  const distances = new Map<string, number>([[hexKey(start), 0]]);
  const queue: Axial[] = [start];
  while (queue.length) {
    const current = queue.shift()!;
    const distance = distances.get(hexKey(current))!;
    if (distance >= range) continue;
    for (const direction of AXIAL_DIRECTIONS) {
      const next = { q: current.q + direction.q, r: current.r + direction.r };
      const nextKey = hexKey(next);
      if (!boardKeys.has(nextKey) || occupied.has(nextKey) || distances.has(nextKey)) continue;
      distances.set(nextKey, distance + 1);
      queue.push(next);
    }
  }
  distances.delete(hexKey(start));
  return [...distances.keys()].map((entry) => {
    const [q, r] = entry.split(",").map(Number);
    return { q, r };
  });
}

/** Classifica uma distância em rótulo, só pra avaliar gatilhos "target_position == front/center/back" do bestiário. */
export function positionLabelForDistance(distance: number): CombatPosition {
  return distance <= 1 ? "front" : distance === 2 ? "center" : "back";
}

function preparePlayerTurn(player: HuntCombatant, cooldowns: Record<string, number>) {
  const nextCooldowns = Object.fromEntries(
    Object.entries(cooldowns)
      .map(([id, turns]): [string, number] => [id, Math.max(0, turns - 1)])
      .filter(([, turns]) => turns > 0),
  ) as Record<string, number>;
  return {
    player: {
      ...player,
      mpCurrent: Math.min(player.mpMax, player.mpCurrent + PLAYER_MP_REGEN_PER_TURN),
    },
    cooldowns: nextCooldowns,
  };
}
const battleId = () => globalThis.crypto?.randomUUID?.() ?? `hunt-${Date.now()}`;
const emptyEffects = (): CombatStatusEffect[] => [];
const statusResistance = (stats: CharacterCombatStats, kind: StatusEffectKind) => (stats as unknown as Record<string, number>)[`${kind}Resistance`] ?? 0;
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
/** Só esses três status causam dano contínuo; os demais são controle/buff/debuff sem tick. */
const DOT_KINDS = new Set<StatusEffectKind>(["bleed", "burn", "poison"]);
/** Teto rígido de atordoamento: no máximo 1 rodada, depois 2 rodadas de imunidade. */
const STUN_MAX_TURNS = 1;
const STUN_IMMUNITY_TURNS = 2;

function tickEffects(combatant: HuntCombatant, turn: number, logs: HuntBattleLog[]): HuntCombatant {
  let hpCurrent = combatant.hpCurrent;
  const activeEffects: CombatStatusEffect[] = [];
  let stunImmuneTurns = combatant.stunImmuneTurns ?? 0;
  for (const effect of combatant.activeEffects) {
    if (DOT_KINDS.has(effect.kind)) {
      const damage = effectDotDamage(effect, combatant.hpMax);
      hpCurrent = Math.max(0, hpCurrent - damage);
      logs.push({ turn, tone: "system", text: `${combatant.name} sofre ${damage} de ${statusEffectLabels[effect.kind].toLowerCase()}.` });
    }
    if (effect.turns > 1) activeEffects.push({ ...effect, turns: effect.turns - 1 });
    else {
      logs.push({ turn, tone: "system", text: `${statusEffectLabels[effect.kind]} em ${combatant.name} terminou.` });
      if (effect.kind === "stun") stunImmuneTurns = Math.max(stunImmuneTurns, STUN_IMMUNITY_TURNS);
    }
  }
  if (stunImmuneTurns > 0) stunImmuneTurns -= 1;
  return { ...combatant, hpCurrent, activeEffects, stunImmuneTurns, dodgedLastTurn: false, attackedLastTurn: false, changedPositionThisTurn: false };
}

function applyEffects(target: HuntCombatant, applications: StatusEffectApplication[], sourceName: string, turn: number, logs: HuntBattleLog[], sourceId?: string): HuntCombatant {
  let activeEffects = [...target.activeEffects];
  for (const application of applications) {
    if (application.kind === "stun" && (target.stunImmuneTurns ?? 0) > 0) {
      logs.push({ turn, tone: "system", text: `${target.name} está imune a atordoamento e resiste.` });
      continue;
    }
    const resistance = Math.max(0, Math.min(95, statusResistance(target.stats, application.kind)));
    const finalChance = application.chance * (1 - resistance / 100);
    if (Math.random() * 100 >= finalChance) continue;
    const turns = application.kind === "stun" ? Math.min(STUN_MAX_TURNS, application.turns) : application.turns;
    const effect: CombatStatusEffect = { ...application, turns, sourceName, sourceId };
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

/** Chance de um golpe que acertou sair fraco: nunca vira erro, nunca causa dano extra ao autor — só reduz o próprio golpe. */
export const FUMBLE_CHANCE = 8;
export const FUMBLE_DAMAGE_MULTIPLIER = 0.5;
/** Bônus de dano contra uma espécie dominada no Bestiário (abates >= meta do codex). */
export const MASTERY_DAMAGE_BONUS = 0.1;
/** Tropa sem líder vivo perde parte do dano — regra de moral de bando, independente do kit de habilidades. */
const MORALE_BROKEN_DAMAGE_PENALTY = 0.25;
/** Bloqueio reduz parte de um golpe físico (escudo/arma); dano mágico ignora bloqueio. */
const BLOCK_DAMAGE_MULTIPLIER = 0.6;

function effectiveDodge(defender: HuntCombatant): number {
  const bonus = defender.activeEffects.filter((effect) => effect.kind === "evasion").reduce((sum, effect) => sum + (effect.dodgeBonus ?? 0), 0);
  return defender.stats.dodgeChance + bonus;
}
function guardMultiplier(defender: HuntCombatant): number {
  const reduction = defender.activeEffects.filter((effect) => effect.kind === "guard").reduce((sum, effect) => sum + (effect.damageReductionPercent ?? 0), 0);
  return Math.max(0.1, 1 - Math.min(90, reduction) / 100);
}

function attack(input: { attacker: HuntCombatant; defender: HuntCombatant; rawDamage: number; kind: "physical" | "magical"; effects: StatusEffectApplication[]; sourceName: string; turn: number; logs: HuntBattleLog[]; sourceId?: string }) {
  const blinded = input.attacker.activeEffects.some((effect) => effect.kind === "blind");
  const hitChance = Math.max(10, 100 - effectiveDodge(input.defender) - (blinded ? 35 : 0));
  if (Math.random() * 100 >= hitChance) {
    input.logs.push({ turn: input.turn, tone: "system", text: `${input.sourceName} erra ${input.defender.name}${blinded ? " por cegueira" : " por esquiva"}.` });
    return { defender: { ...input.defender, dodgedLastTurn: true, attackedLastTurn: false }, dealt: 0, critical: false, fumble: false, blocked: false };
  }
  // Sorte de mesa: um golpe que acerta pode sair "fraco" (fumble), mas nunca vira erro nem pune o atacante.
  const fumble = Math.random() * 100 < FUMBLE_CHANCE;
  const critical = !fumble && Math.random() * 100 < input.attacker.stats.criticalChance;
  const blocked = input.kind === "physical" && Math.random() * 100 < input.defender.stats.blockChance;
  const multiplier = (fumble ? FUMBLE_DAMAGE_MULTIPLIER : critical ? 1.5 : 1) * (blocked ? BLOCK_DAMAGE_MULTIPLIER : 1) * guardMultiplier(input.defender);
  const dealt = mitigateDamage(Math.round(input.rawDamage * multiplier), input.kind, input.defender.stats);
  let defender: HuntCombatant = { ...input.defender, hpCurrent: Math.max(0, input.defender.hpCurrent - dealt), dodgedLastTurn: false, attackedLastTurn: true };
  if (!fumble) defender = applyEffects(defender, input.effects, input.sourceName, input.turn, input.logs, input.sourceId);
  return { defender, dealt, critical, fumble, blocked };
}

/** Uma vez por batalha, ao chegar a 0 de Vida com uma habilidade "revive" disponível, volta com HP parcial. */
function maybeRevive(combatant: HuntCombatant, logs: HuntBattleLog[], turn: number): HuntCombatant {
  if (combatant.hpCurrent > 0) return combatant;
  const reviveAbility = combatant.abilities?.find((ability) => ability.specialEffects?.some((effect) => effect.kind === "revive"));
  if (!reviveAbility) return combatant;
  const used = combatant.usedOncePerBattle ?? [];
  if (used.includes(reviveAbility.id)) return combatant;
  const reviveEffect = reviveAbility.specialEffects!.find((effect) => effect.kind === "revive")!;
  const hpPercent = Number(reviveEffect.hpPercent ?? 20);
  const hpCurrent = Math.max(1, Math.round(combatant.hpMax * (hpPercent / 100)));
  logs.push({ turn, tone: "system", text: `${combatant.name} recusa cair e retorna com ${hpCurrent} de Vida.` });
  return { ...combatant, hpCurrent, usedOncePerBattle: [...used, reviveAbility.id] };
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
  const cap = ["elite", "boss", "worldboss"].includes(creature.rarity) ? 2 : 1;
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

export function createHuntBattle(input: { regionId: string; player: HuntCombatant; creatures: HuntCreatureDefinition[]; companion?: HuntCompanion | null; itemMemories?: Record<string, number>; masteredCreatureIds?: string[] }): HuntBattleState {
  const creatures = input.creatures.map((creature) => {
    const equippedItems = featuredItemsFor(creature, input.itemMemories ?? {});
    return { ...creature, equippedItems, equippedItem: equippedItems[0] };
  });
  const enemies: HuntCombatant[] = creatures.map((creature, index) => {
    const itemModifiers = creature.equippedItems?.reduce((total, item) => ({ ...total, ...Object.fromEntries(Object.entries(item.modifiers).map(([key, value]) => [key, (total[key as keyof typeof total] ?? 0) + (value ?? 0)])) }), {} as EquipmentItem["modifiers"]) ?? {};
    const hpMax = creature.hpMax + (itemModifiers.hpMax ?? 0);
    const itemEffects = creature.equippedItems?.flatMap((item) => item.statusEffects ?? []) ?? [];
    const highRarity = ["elite", "boss", "worldboss"].includes(creature.rarity);
    return {
      id: `${creature.id}-${index}`, creatureId: creature.id, archetype: creature.archetype, role: creature.role, name: creature.name, portraitPath: creature.portraitPath,
      hpCurrent: hpMax, hpMax, mpCurrent: 0, mpMax: 0, activeEffects: emptyEffects(), onHitEffects: [...(creature.statusEffects ?? []), ...itemEffects],
      abilities: creature.abilities ?? [], abilityCooldowns: {}, charging: null, stunImmuneTurns: 0, usedOncePerBattle: [], changedPositionThisTurn: false,
      stats: { physicalDamage: creature.physicalDamage + (itemModifiers.physicalDamage ?? 0), magicalDamage: (creature.magicalDamage ?? 0) + (itemModifiers.magicalDamage ?? 0), physicalDefense: creature.physicalDefense + (itemModifiers.physicalDefense ?? 0), magicalDefense: creature.magicalDefense + (itemModifiers.magicalDefense ?? 0), criticalChance: (highRarity ? 12 : creature.rarity === "rare" ? 7 : 4) + (itemModifiers.criticalChance ?? 0), dodgeChance: (creature.rarity === "rare" ? 5 : 2) + (itemModifiers.dodgeChance ?? 0), blockChance: (creature.blockChance ?? 0) + (itemModifiers.blockChance ?? 0), bleedChance: itemModifiers.bleedChance ?? 0, burnChance: itemModifiers.burnChance ?? 0, poisonChance: itemModifiers.poisonChance ?? 0, blindChance: itemModifiers.blindChance ?? 0, bleedResistance: itemModifiers.bleedResistance ?? 0, burnResistance: itemModifiers.burnResistance ?? 0, poisonResistance: itemModifiers.poisonResistance ?? 0, blindResistance: itemModifiers.blindResistance ?? 0 },
    };
  });
  const initialTurn = preparePlayerTurn({ ...input.player, activeEffects: input.player.activeEffects ?? emptyEffects(), onHitEffects: input.player.onHitEffects ?? [], position: input.player.position ?? PLAYER_START_CELL }, {});
  return { id: battleId(), regionId: input.regionId, creatures, player: initialTurn.player, companion: input.companion ?? null, enemies, masteredCreatureIds: input.masteredCreatureIds ?? [], lastPetTargetId: null, lastPetDamage: 0, cooldowns: initialTurn.cooldowns, turn: 1, status: "active", reward: null, log: [{ turn: 0, tone: "system", text: creatures.length > 1 ? `Emboscada: ${creatures.length} inimigos bloqueiam o caminho.` : `${creatures[0].name} bloqueia o caminho.` }] };
}

// ---------------------------------------------------------------------------
// IA de habilidades de criatura
// ---------------------------------------------------------------------------

interface TriggerContext {
  turn: number;
  self: HuntCombatant;
  target: HuntCombatant;
  alliesAlive: number;
  distance: number;
}

function hasBuff(combatant: HuntCombatant): boolean {
  return combatant.activeEffects.some((effect) => effect.kind === "guard" || effect.kind === "evasion" || effect.kind === "enraged" || (effect.damageBonusPercent ?? 0) > 0);
}

/**
 * Avalia as pequenas expressões de aiTrigger do bestiário ("turn == 1",
 * "hp_self < 30%", "target_position == back" etc). Gatilhos dependentes de
 * um sistema que não existe (ex.: "resource_full", sem medidor de recurso)
 * nunca disparam — a habilidade cai para a próxima da lista, normalmente o
 * ataque básico "always".
 */
export function evaluateTrigger(trigger: string, ctx: TriggerContext): boolean {
  const t = trigger.trim();
  if (t === "always") return true;
  if (t === "turn == 1") return ctx.turn === 1;
  const modMatch = t.match(/^turn % (\d+) == 0$/);
  if (modMatch) return ctx.turn % Number(modMatch[1]) === 0;
  if (t === "hp_self == 0") return ctx.self.hpCurrent === 0;
  const cmpMatch = t.match(/^(hp_self|target_hp|mp_self)\s*(<|>|>=|==)\s*(\d+)%$/);
  if (cmpMatch) {
    const [, subject, op, valueStr] = cmpMatch;
    const value = Number(valueStr);
    const percent = subject === "hp_self" ? (ctx.self.hpCurrent / Math.max(1, ctx.self.hpMax)) * 100
      : subject === "target_hp" ? (ctx.target.hpCurrent / Math.max(1, ctx.target.hpMax)) * 100
      : (ctx.self.mpCurrent / Math.max(1, ctx.self.mpMax)) * 100;
    if (op === "<") return percent < value;
    if (op === ">") return percent > value;
    if (op === ">=") return percent >= value;
    return Math.abs(percent - value) < 0.01;
  }
  const alliesMatch = t.match(/^(?:allies_alive|allies_same_species|enemy_count) >= (\d+)$/);
  if (alliesMatch) return ctx.alliesAlive >= Number(alliesMatch[1]);
  if (t === "target_not_poisoned") return !ctx.target.activeEffects.some((effect) => effect.kind === "poison");
  if (t === "target_not_blind") return !ctx.target.activeEffects.some((effect) => effect.kind === "blind");
  if (t === "target_not_burning") return !ctx.target.activeEffects.some((effect) => effect.kind === "burn");
  if (t === "target_has_poison") return ctx.target.activeEffects.some((effect) => effect.kind === "poison");
  if (t === "target_has_marked") return ctx.target.activeEffects.some((effect) => effect.kind === "marked");
  if (t === "target_has_buff") return hasBuff(ctx.target);
  if (t === "target_used_ability") return Boolean(ctx.target.lastAbilityUsed);
  if (t === "dodged_last_turn") return Boolean(ctx.self.dodgedLastTurn);
  if (t === "attacked_last_turn") return Boolean(ctx.self.attackedLastTurn);
  if (t === "distance > 1") return ctx.distance > 1;
  if (t === "target_adjacent") return ctx.distance <= 1;
  const posMatch = t.match(/^target_position == (front|center|back)$/);
  if (posMatch) return positionLabelForDistance(ctx.distance) === posMatch[1];
  if (t === "target_changed_position" || t === "target_attempted_escape_or_position_change") return Boolean(ctx.target.changedPositionThisTurn);
  // "resource_full" depende de um medidor de recurso que este motor não tem — nunca dispara.
  if (t === "resource_full") return false;
  return false;
}

interface SpecialEffectContext {
  self: HuntCombatant;
  player: HuntCombatant;
  enemies: HuntCombatant[];
  turn: number;
  logs: HuntBattleLog[];
  damageDealt?: number;
  frontLineIds: string[];
}

function cloneAsMinion(source: HuntCombatant, index: number): HuntCombatant {
  // Sem acesso ao catálogo de criaturas (vive em apps/web), a invocação usa o
  // próprio invocador como molde: mesma família de ataques, HP bem menor.
  const hpMax = Math.max(1, Math.round(source.hpMax * 0.45));
  return { ...source, id: `${source.id}-cria-${index}-${Date.now()}`, name: `${source.name} (cria)`, hpCurrent: hpMax, hpMax, activeEffects: [], abilityCooldowns: {}, charging: null, usedOncePerBattle: [] };
}

/** Interpreta os `specialEffects` de uma habilidade de criatura. Efeitos que dependem de
 * posição (force_position_change/gap_close) já são cobertos pelo sistema de posição, e
 * copy_last_ability é aproximado como um golpe simples — o catálogo de habilidades do
 * jogador vive em apps/web, fora do alcance deste pacote. */
function applySpecialEffects(effects: CreatureSpecialEffect[] | undefined, ctx: SpecialEffectContext): { self: HuntCombatant; player: HuntCombatant; enemies: HuntCombatant[] } {
  let { self, player, enemies } = ctx;
  for (const effect of effects ?? []) {
    switch (effect.kind) {
      case "lifesteal": {
        if (ctx.damageDealt) {
          const heal = Math.round(ctx.damageDealt * (Number(effect.percentOfDamage ?? 0) / 100));
          if (heal > 0) { self = { ...self, hpCurrent: Math.min(self.hpMax, self.hpCurrent + heal) }; ctx.logs.push({ turn: ctx.turn, tone: "enemy", text: `${self.name} rouba ${heal} de Vida.` }); }
        }
        break;
      }
      case "drain_mp": {
        const drained = Math.min(player.mpCurrent, Math.round((player.mpMax || 0) * (Number(effect.percentMaxMp ?? 0) / 100)));
        player = { ...player, mpCurrent: player.mpCurrent - drained };
        const heal = Math.round(drained * (Number(effect.healPercentOfDrained ?? 0) / 100));
        if (heal > 0) self = { ...self, hpCurrent: Math.min(self.hpMax, self.hpCurrent + heal) };
        ctx.logs.push({ turn: ctx.turn, tone: "enemy", text: `${self.name} drena ${drained} de MP${heal ? ` e recupera ${heal} de Vida` : ""}.` });
        break;
      }
      case "warband_buff":
      case "ally_damage_buff": {
        const bonus: StatusEffectApplication = { kind: "enraged", chance: 100, turns: Number(effect.turns ?? 2), damageBonusPercent: Number(effect.damageBonusPercent ?? effect.bonusPercent ?? 0), criticalChanceBonus: Number(effect.criticalChanceBonus ?? 0), statusChanceBonus: Number(effect.statusChanceBonus ?? effect.bleedChanceBonus ?? 0) };
        enemies = enemies.map((entry) => (ctx.frontLineIds.includes(entry.id) && entry.hpCurrent > 0 ? applyEffects(entry, [bonus], self.name, ctx.turn, ctx.logs, self.id) : entry));
        ctx.logs.push({ turn: ctx.turn, tone: "system", text: `${self.name} fortalece o bando.` });
        break;
      }
      case "summon":
      case "summon_minions":
      case "summon_from_warband": {
        const count = Number(effect.count ?? 1);
        let spawned = 0;
        for (let i = 0; i < count && enemies.length < ENGINE_MAX_ENCOUNTER_SIZE; i += 1) { enemies = [...enemies, cloneAsMinion(self, enemies.length)]; spawned += 1; }
        ctx.logs.push({ turn: ctx.turn, tone: "enemy", text: spawned > 0 ? `${self.name} invoca ${spawned} reforço(s).` : `${self.name} tenta invocar reforços, mas o encontro já está cheio.` });
        break;
      }
      case "remove_buff": {
        const idx = player.activeEffects.findIndex((entry) => entry.kind === "guard" || entry.kind === "evasion" || entry.kind === "enraged");
        if (idx >= 0) {
          const removed = player.activeEffects[idx];
          player = { ...player, activeEffects: player.activeEffects.filter((_, index) => index !== idx) };
          ctx.logs.push({ turn: ctx.turn, tone: "enemy", text: `${self.name} remove ${statusEffectLabels[removed.kind]} de ${player.name}.` });
        }
        break;
      }
      case "permanent_phase_buff":
      case "permanent_damage_buff": {
        const flag = `${effect.kind}`;
        if (!(self.usedOncePerBattle ?? []).includes(flag)) {
          const dmgBonus = Number(effect.bonusPercent ?? effect.damageBonusPercent ?? 0) / 100;
          const defensePenalty = Number(effect.selfDefensePenaltyPercent ?? 0) / 100;
          self = {
            ...self,
            stats: { ...self.stats, physicalDamage: Math.round(self.stats.physicalDamage * (1 + dmgBonus)), magicalDamage: Math.round(self.stats.magicalDamage * (1 + dmgBonus)), physicalDefense: Math.round(self.stats.physicalDefense * (1 - defensePenalty)), magicalDefense: Math.round(self.stats.magicalDefense * (1 - defensePenalty)), criticalChance: self.stats.criticalChance + Number(effect.criticalChanceBonus ?? 0) },
            usedOncePerBattle: [...(self.usedOncePerBattle ?? []), flag],
          };
          ctx.logs.push({ turn: ctx.turn, tone: "enemy", text: `${self.name} entra em fúria: bônus permanente de combate ativado.` });
        }
        break;
      }
      case "self_hp_cost_after_cast": {
        const cost = Math.round(self.hpMax * (Number(effect.percentMaxHp ?? 0) / 100));
        if (cost > 0) { self = { ...self, hpCurrent: Math.max(0, self.hpCurrent - cost) }; ctx.logs.push({ turn: ctx.turn, tone: "enemy", text: `${self.name} perde ${cost} de Vida pelo próprio golpe.` }); }
        break;
      }
      case "cleanse_self": {
        const statuses = Array.isArray(effect.statuses) ? (effect.statuses as unknown as string[]) : [];
        self = { ...self, activeEffects: self.activeEffects.filter((entry) => !statuses.includes(entry.kind)) };
        break;
      }
      case "reset_cooldown": {
        const abilityId = String(effect.abilityId ?? "");
        if (abilityId) self = { ...self, abilityCooldowns: { ...self.abilityCooldowns, [abilityId]: 0 } };
        break;
      }
      case "empower_next_damage": {
        self = { ...self, nextDamageBonusPercent: Number(effect.bonusPercent ?? 0) };
        break;
      }
      case "copy_last_ability": {
        // Aproximação: sem acesso ao catálogo de habilidades do jogador, resolve como um golpe simples.
        const percent = Number(effect.effectPercent ?? 60) / 100;
        const rawDamage = Math.round(Math.max(self.stats.physicalDamage, self.stats.magicalDamage) * percent);
        const kind = self.stats.magicalDamage > self.stats.physicalDamage ? "magical" : "physical";
        const echo = attack({ attacker: self, defender: player, rawDamage, kind, effects: [], sourceName: `${self.name} (eco)`, turn: ctx.turn, logs: ctx.logs, sourceId: self.id });
        player = echo.defender;
        if (echo.dealt) ctx.logs.push({ turn: ctx.turn, tone: "enemy", text: `${self.name} ecoa a última ação e causa ${echo.dealt} de dano.` });
        break;
      }
      default:
        break; // damage_bonus_per_ally / conditional_damage_bonus / turn_scaling_damage: aplicados no cálculo de dano. force_position_change/gap_close: sistema de posição.
    }
  }
  return { self, player, enemies };
}

const DEFAULT_BASIC_ATTACK: CreatureAbilityDefinition = { id: "basic-attack", name: "Ataque Básico", damageFamily: "physical", scaling: 1, cooldownTurns: 0, target: "single_enemy", description: "Ataque direto.", aiTrigger: "always" };
const REACTION_TRIGGERS = new Set(["target_changed_position", "target_attempted_escape_or_position_change"]);

function pickCreatureAbility(self: HuntCombatant, ctx: TriggerContext): CreatureAbilityDefinition {
  const pool = self.abilities?.length ? self.abilities : [DEFAULT_BASIC_ATTACK];
  const usable = pool.filter((ability) => !ability.reaction && (self.abilityCooldowns?.[ability.id] ?? 0) === 0 && !(ability.damageFamily === "magical" && self.activeEffects.some((effect) => effect.kind === "silence")));
  return usable.find((ability) => evaluateTrigger(ability.aiTrigger, ctx)) ?? usable[usable.length - 1] ?? DEFAULT_BASIC_ATTACK;
}

/** Dano bruto de uma habilidade de criatura, já com moral de bando, bônus condicional
 * por aliados vivos e o consumo de um eventual `empower_next_damage` pendente. */
function creatureAbilityRawDamage(ability: CreatureAbilityDefinition, self: HuntCombatant, player: HuntCombatant, ctx: TriggerContext, moraleMultiplier: number): number {
  const empower = self.nextDamageBonusPercent ?? 0;
  let raw = (ability.damageFamily === "magical" ? self.stats.magicalDamage : self.stats.physicalDamage) * ability.scaling * moraleMultiplier * (1 + empower / 100);
  for (const effect of ability.specialEffects ?? []) {
    if (effect.kind === "conditional_damage_bonus" && evaluateTrigger(String(effect.condition ?? ""), ctx)) raw *= 1 + Number(effect.bonusPercent ?? 0) / 100;
    if (effect.kind === "damage_bonus_per_ally") { const bonus = Math.min(Number(effect.capPercent ?? 100), ctx.alliesAlive * Number(effect.bonusPercent ?? 0)); if (bonus > 0) raw *= 1 + bonus / 100; }
    if (effect.kind === "turn_scaling_damage") { const startTurn = Number(effect.startTurn ?? 1); if (ctx.turn >= startTurn) { const bonus = Math.min(Number(effect.capPercent ?? 100), (ctx.turn - startTurn) * Number(effect.bonusPerTurnPercent ?? 0)); if (bonus > 0) raw *= 1 + bonus / 100; } }
  }
  return Math.round(raw);
}

// ---------------------------------------------------------------------------
// Resolução de rodada
// ---------------------------------------------------------------------------

function runEnemyPhase(turn: number, player0: HuntCombatant, enemies0: HuntCombatant[], logs: HuntBattleLog[], masteryMultiplier: (creatureId?: string) => number): { player: HuntCombatant; enemies: HuntCombatant[]; defeated: boolean } {
  let player = player0;
  let enemies = enemies0;
  const slots = activeFrontLine(enemies);
  for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
    const enemyRef = slots[slotIndex];
    let workingEnemy = enemies.find((entry) => entry.id === enemyRef.id) ?? enemyRef;
    if (workingEnemy.hpCurrent <= 0) continue;
    if (workingEnemy.abilityCooldowns && Object.keys(workingEnemy.abilityCooldowns).length) {
      const nextCooldowns = Object.fromEntries(Object.entries(workingEnemy.abilityCooldowns).map(([id, turns]): [string, number] => [id, Math.max(0, turns - 1)]).filter(([, turns]) => turns > 0));
      workingEnemy = { ...workingEnemy, abilityCooldowns: nextCooldowns };
    }
    if (workingEnemy.activeEffects.some((effect) => effect.kind === "stun")) {
      logs.push({ turn, tone: "system", text: `${workingEnemy.name} está atordoado e perde o turno.` });
      enemies = enemies.map((entry) => (entry.id === workingEnemy.id ? workingEnemy : entry));
      continue;
    }

    const frontIds = activeFrontLine(enemies).map((entry) => entry.id);
    const alliesAlive = frontIds.filter((id) => id !== workingEnemy.id).length;
    const slotCell = ENEMY_SLOT_CELLS[slotIndex] ?? ENEMY_SLOT_CELLS[0];
    const ctx: TriggerContext = { turn, self: workingEnemy, target: player, alliesAlive, distance: hexDistance(slotCell, player.position ?? PLAYER_START_CELL) };

    let chosenAbility: CreatureAbilityDefinition;
    let isChargeResolution = false;
    if (workingEnemy.charging) {
      chosenAbility = workingEnemy.abilities?.find((entry) => entry.id === workingEnemy.charging?.abilityId) ?? DEFAULT_BASIC_ATTACK;
      isChargeResolution = true;
    } else {
      chosenAbility = pickCreatureAbility(workingEnemy, ctx);
    }

    if (!isChargeResolution && chosenAbility.chargeTurns) {
      workingEnemy = { ...workingEnemy, charging: { abilityId: chosenAbility.id }, abilityCooldowns: { ...workingEnemy.abilityCooldowns, [chosenAbility.id]: chosenAbility.cooldownTurns } };
      logs.push({ turn, tone: "enemy", text: `${workingEnemy.name} prepara ${chosenAbility.name}: ${chosenAbility.description}` });
      enemies = enemies.map((entry) => (entry.id === workingEnemy.id ? workingEnemy : entry));
      continue;
    }
    workingEnemy = isChargeResolution
      ? { ...workingEnemy, charging: null }
      : chosenAbility.cooldownTurns ? { ...workingEnemy, abilityCooldowns: { ...workingEnemy.abilityCooldowns, [chosenAbility.id]: chosenAbility.cooldownTurns } } : workingEnemy;

    const hadLeader = enemies.some((entry) => entry.role === "leader");
    const leaderAlive = enemies.some((entry) => entry.role === "leader" && entry.hpCurrent > 0);
    const moraleMult = workingEnemy.role === "fodder" && hadLeader && !leaderAlive ? 1 - MORALE_BROKEN_DAMAGE_PENALTY : 1;

    if (chosenAbility.damageFamily === "none") {
      if (chosenAbility.statusEffects?.length) {
        if (chosenAbility.target === "self") workingEnemy = applyEffects(workingEnemy, chosenAbility.statusEffects, workingEnemy.name, turn, logs, workingEnemy.id);
        else if (chosenAbility.target === "all_allies") enemies = enemies.map((entry) => (frontIds.includes(entry.id) && entry.hpCurrent > 0 ? applyEffects(entry, chosenAbility.statusEffects!, workingEnemy.name, turn, logs, workingEnemy.id) : entry));
        else player = applyEffects(player, chosenAbility.statusEffects, workingEnemy.name, turn, logs, workingEnemy.id);
      }
      const special = applySpecialEffects(chosenAbility.specialEffects, { self: workingEnemy, player, enemies, turn, logs, frontLineIds: frontIds });
      workingEnemy = special.self; player = special.player; enemies = special.enemies;
      enemies = enemies.map((entry) => (entry.id === workingEnemy.id ? workingEnemy : entry));
      logs.push({ turn, tone: "enemy", text: `${workingEnemy.name} usa ${chosenAbility.name}.` });
    } else {
      const rawDamage = creatureAbilityRawDamage(chosenAbility, workingEnemy, player, ctx, moraleMult);
      if (workingEnemy.nextDamageBonusPercent) workingEnemy = { ...workingEnemy, nextDamageBonusPercent: 0 };
      const counter = attack({ attacker: workingEnemy, defender: player, rawDamage, kind: chosenAbility.damageFamily, effects: chosenAbility.statusEffects ?? [], sourceName: workingEnemy.name, turn, logs, sourceId: workingEnemy.id });
      player = counter.defender;
      const moraleNote = moraleMult < 1 ? ", com a moral quebrada," : isChargeResolution ? ", com o golpe carregado," : "";
      if (counter.dealt) logs.push({ turn, tone: "enemy", text: `${workingEnemy.name}${moraleNote} usa ${chosenAbility.name} e causa ${counter.dealt} de dano${counter.critical ? " crítico" : counter.fumble ? " (golpe fraco)" : ""}${counter.blocked ? " · bloqueado" : ""}.` });
      else logs.push({ turn, tone: "enemy", text: `${workingEnemy.name} usa ${chosenAbility.name}, mas erra.` });

      const special = applySpecialEffects(chosenAbility.specialEffects, { self: workingEnemy, player, enemies, turn, logs, damageDealt: counter.dealt, frontLineIds: frontIds });
      workingEnemy = special.self; player = special.player; enemies = special.enemies;
      enemies = enemies.map((entry) => (entry.id === workingEnemy.id ? workingEnemy : entry));

      if (player.hpCurrent === 0) { logs.push({ turn, tone: "defeat", text: `${player.name} caiu. HP permanece em 0 até receber cura.` }); return { player, enemies, defeated: true }; }

      // Reação do Samurai: só pode acontecer depois de um ataque direto que acertou.
      // Ela não consome ação e não chama nenhuma outra reação, preservando o contrato
      // de combate "reação não dispara reação".
      if (counter.dealt > 0 && player.counterAttack && Math.random() * 100 < player.counterAttack.chance) {
        const retaliation = attack({ attacker: player, defender: workingEnemy, rawDamage: Math.round(Math.max(1, Math.round(player.stats.physicalDamage * player.counterAttack.scaling)) * masteryMultiplier(workingEnemy.creatureId)), kind: "physical", effects: [], sourceName: player.counterAttack.sourceName, turn, logs, sourceId: player.id });
        enemies = enemies.map((entry) => (entry.id === workingEnemy.id ? retaliation.defender : entry));
        logs.push({ turn, tone: "player", text: retaliation.dealt ? `${player.counterAttack.sourceName}: ${player.name} contra-ataca ${workingEnemy.name} e causa ${retaliation.dealt} de dano${retaliation.critical ? " crítico" : retaliation.fumble ? " (golpe fraco)" : ""}${retaliation.blocked ? " · bloqueado" : ""}.` : `${player.counterAttack.sourceName}: ${player.name} tenta contra-atacar, mas não acerta.` });
      }
    }
    enemies = enemies.map((entry) => maybeRevive(entry, logs, turn));
  }
  return { player, enemies, defeated: false };
}

function finalizeRound(state: HuntBattleState, player: HuntCombatant, enemies: HuntCombatant[], cooldowns: Record<string, number>, logs: HuntBattleLog[]): HuntBattleState {
  if (enemies.every((enemy) => enemy.hpCurrent === 0)) {
    const loot = rewardFor(state, state.turn);
    return { ...state, player, enemies, cooldowns, status: "victory", reward: loot.reward, log: [...logs, ...loot.logs, { turn: state.turn, tone: "victory", text: `A emboscada foi derrotada. +${loot.reward.xp} XP global · +${loot.reward.gold} ouro.` }] };
  }
  const masteredCreatureIds = state.masteredCreatureIds ?? [];
  const masteryMultiplier = (creatureId?: string) => (creatureId && masteredCreatureIds.includes(creatureId) ? 1 + MASTERY_DAMAGE_BONUS : 1);
  if (!state.companion) {
    const prepared = preparePlayerTurn(player, cooldowns);
    return { ...state, player: prepared.player, enemies, cooldowns: prepared.cooldowns, lastPetTargetId: null, lastPetDamage: 0, turn: state.turn + 1, log: [...logs, { turn: state.turn + 1, tone: "system", text: `Início do turno: +${PLAYER_MP_REGEN_PER_TURN} MP e recargas reduzidas.` }] };
  }
  const petTarget = activeFrontLine(enemies).sort((left, right) => left.hpCurrent - right.hpCurrent)[0];
  const petFumble = Math.random() * 100 < FUMBLE_CHANCE;
  const petRawDamage = Math.max(1, Math.round(player.stats.magicalDamage * state.companion.magicalDamageScaling * masteryMultiplier(petTarget.creatureId) * (petFumble ? FUMBLE_DAMAGE_MULTIPLIER : 1)));
  const petDamage = mitigateDamage(petRawDamage, "magical", petTarget.stats);
  enemies = enemies.map((enemy) => (enemy.id === petTarget.id ? maybeRevive({ ...enemy, hpCurrent: Math.max(0, enemy.hpCurrent - petDamage) }, logs, state.turn) : enemy));
  logs.push({ turn: state.turn, tone: "player", text: `${state.companion.name} lança Bola de Fogo em ${petTarget.name} e causa ${petDamage} de dano mágico${petFumble ? " (golpe fraco)" : ""}.` });
  if (enemies.every((enemy) => enemy.hpCurrent === 0)) { const loot = rewardFor(state, state.turn); return { ...state, player, enemies, cooldowns, lastPetTargetId: petTarget.id, lastPetDamage: petDamage, status: "victory", reward: loot.reward, log: [...logs, ...loot.logs, { turn: state.turn, tone: "victory", text: `A emboscada foi derrotada. +${loot.reward.xp} XP global · +${loot.reward.gold} ouro.` }] }; }
  const prepared = preparePlayerTurn(player, cooldowns);
  return { ...state, player: prepared.player, enemies, cooldowns: prepared.cooldowns, lastPetTargetId: petTarget.id, lastPetDamage: petDamage, turn: state.turn + 1, log: [...logs, { turn: state.turn + 1, tone: "system", text: `Início do turno: +${PLAYER_MP_REGEN_PER_TURN} MP e recargas reduzidas.` }] };
}

export function resolveHuntTurn(state: HuntBattleState, ability: AbilityDefinition, targetId?: string): HuntBattleState {
  if (state.status !== "active") return state;
  const logs = [...state.log];
  let player = tickEffects(state.player, state.turn, logs);
  if (player.hpCurrent === 0) return { ...state, player, status: "defeat", log: [...logs, { turn: state.turn, tone: "defeat", text: `${player.name} caiu pelos efeitos ativos.` }] };
  let enemies = state.enemies.map((enemy) => tickEffects(enemy, state.turn, logs));
  if (enemies.every((enemy) => enemy.hpCurrent === 0)) { const loot = rewardFor(state, state.turn); return { ...state, player, enemies, status: "victory", reward: loot.reward, log: [...logs, ...loot.logs, { turn: state.turn, tone: "victory", text: `Os efeitos derrotaram a emboscada. +${loot.reward.xp} XP global · +${loot.reward.gold} ouro.` }] }; }

  let cooldowns = { ...state.cooldowns };
  const masteredCreatureIds = state.masteredCreatureIds ?? [];
  const masteryMultiplier = (creatureId?: string) => (creatureId && masteredCreatureIds.includes(creatureId) ? 1 + MASTERY_DAMAGE_BONUS : 1);
  const playerStunned = player.activeEffects.some((effect) => effect.kind === "stun");
  const playerSilenced = player.activeEffects.some((effect) => effect.kind === "silence");

  if (playerStunned) {
    logs.push({ turn: state.turn, tone: "system", text: `${player.name} está atordoado e perde o turno.` });
  } else {
    const cooldown = state.cooldowns[ability.id] ?? 0;
    if (cooldown > 0) return { ...state, player, enemies, log: [...logs, { turn: state.turn, tone: "system", text: `${ability.name} está em recarga por mais ${cooldown} turno(s).` }] };
    if (!ability.damageFamily || ability.slotKind === "passive" || ability.slotKind === "stance") return { ...state, player, enemies, log: [...logs, { turn: state.turn, tone: "system", text: `${ability.name} não causa dano nesta rodada.` }] };
    if (playerSilenced && ability.damageFamily === "magical") return { ...state, player, enemies, log: [...logs, { turn: state.turn, tone: "system", text: `${player.name} está silenciado e não consegue usar ${ability.name}.` }] };
    const manaCost = ability.manaCost ?? 0;
    if (player.mpCurrent < manaCost) return { ...state, player, enemies, log: [...logs, { turn: state.turn, tone: "system", text: `MP insuficiente para ${ability.name}.` }] };

    const frontLine = activeFrontLine(enemies);
    const tauntEffect = player.activeEffects.find((effect) => effect.kind === "taunted");
    const taunter = tauntEffect?.sourceId ? frontLine.find((entry) => entry.id === tauntEffect.sourceId) : undefined;
    const primaryEnemy = taunter ?? frontLine.find((entry) => entry.id === targetId) ?? frontLine[0];
    const primarySlot = frontLine.indexOf(primaryEnemy);
    const targetCell = ENEMY_SLOT_CELLS[primarySlot] ?? ENEMY_SLOT_CELLS[0];
    const distanceToTarget = hexDistance(player.position ?? PLAYER_START_CELL, targetCell);
    if (ability.range && distanceToTarget > ability.range) return { ...state, player, enemies, log: [...logs, { turn: state.turn, tone: "system", text: `${ability.name} está fora de alcance — chegue mais perto de ${primaryEnemy.name}.` }] };
    const kind = ability.damageFamily === "magical" ? "magical" : "physical";
    const targetMastered = masteryMultiplier(primaryEnemy.creatureId) > 1;
    const hit = attack({ attacker: player, defender: primaryEnemy, rawDamage: Math.round(abilityRawDamage(ability, player.stats) * masteryMultiplier(primaryEnemy.creatureId)), kind, effects: [...(ability.statusEffects ?? []), ...player.onHitEffects], sourceName: `${player.name} usa ${ability.name}`, turn: state.turn, logs, sourceId: player.id });
    player = { ...player, mpCurrent: player.mpCurrent - manaCost, lastAbilityUsed: ability.id };
    let updatedTarget = hit.defender;
    if (updatedTarget.charging && hit.dealt > 0) {
      const chargingAbility = updatedTarget.abilities?.find((entry) => entry.id === updatedTarget.charging?.abilityId);
      logs.push({ turn: state.turn, tone: "system", text: `${updatedTarget.name} é interrompido no meio do carregamento de ${chargingAbility?.name ?? "uma habilidade"} e perde a recarga inteira.` });
      updatedTarget = { ...updatedTarget, charging: null, abilityCooldowns: { ...updatedTarget.abilityCooldowns, ...(chargingAbility ? { [chargingAbility.id]: chargingAbility.cooldownTurns } : {}) } };
    }
    enemies = enemies.map((entry) => maybeRevive(entry.id === updatedTarget.id ? updatedTarget : entry, logs, state.turn));

    logs.push({ turn: state.turn, tone: "player", text: hit.dealt ? `${player.name} usa ${ability.name} e causa ${hit.dealt} de dano${hit.critical ? " crítico" : hit.fumble ? " (golpe fraco)" : ""}${hit.blocked ? " · bloqueado" : ""}${targetMastered ? " · maestria do Bestiário" : ""}.` : `${player.name} usa ${ability.name}, mas não acerta.` });
    if (ability.cooldownTurns) cooldowns[ability.id] = ability.cooldownTurns;
    if (enemies.every((enemy) => enemy.hpCurrent === 0)) { const loot = rewardFor(state, state.turn); return { ...state, player, enemies, cooldowns, status: "victory", reward: loot.reward, log: [...logs, ...loot.logs, { turn: state.turn, tone: "victory", text: `A emboscada foi derrotada. +${loot.reward.xp} XP global · +${loot.reward.gold} ouro.` }] }; }
  }

  const phase = runEnemyPhase(state.turn, player, enemies, logs, masteryMultiplier);
  player = phase.player; enemies = phase.enemies;
  if (phase.defeated) return { ...state, player, enemies, cooldowns, status: "defeat", log: logs };
  return finalizeRound(state, player, enemies, cooldowns, logs);
}

/**
 * Mover é uma ação tática: não causa dano, mas muda a distância/posição lida
 * pelos gatilhos das criaturas e dá o único gatilho real que existe hoje para
 * habilidades de reação ("target_changed_position"). `destination` precisa
 * estar dentro do alcance real de movimento (ver reachableCells) — chamadas
 * fora do alcance só mantêm a posição atual, sem gastar a rodada à toa.
 */
export function resolveMoveTurn(state: HuntBattleState, destination: Axial): HuntBattleState {
  if (state.status !== "active") return state;
  const logs = [...state.log];
  let player = tickEffects(state.player, state.turn, logs);
  if (player.hpCurrent === 0) return { ...state, player, status: "defeat", log: [...logs, { turn: state.turn, tone: "defeat", text: `${player.name} caiu pelos efeitos ativos.` }] };
  let enemies = state.enemies.map((enemy) => tickEffects(enemy, state.turn, logs));
  if (enemies.every((enemy) => enemy.hpCurrent === 0)) { const loot = rewardFor(state, state.turn); return { ...state, player, enemies, status: "victory", reward: loot.reward, log: [...logs, ...loot.logs, { turn: state.turn, tone: "victory", text: `Os efeitos derrotaram a emboscada. +${loot.reward.xp} XP global · +${loot.reward.gold} ouro.` }] }; }

  const cooldowns = { ...state.cooldowns };
  const masteredCreatureIds = state.masteredCreatureIds ?? [];
  const masteryMultiplier = (creatureId?: string) => (creatureId && masteredCreatureIds.includes(creatureId) ? 1 + MASTERY_DAMAGE_BONUS : 1);
  const playerStunned = player.activeEffects.some((effect) => effect.kind === "stun");
  const previousPosition = player.position ?? PLAYER_START_CELL;
  const occupiedByEnemies = new Set(ENEMY_SLOT_CELLS.slice(0, activeFrontLine(enemies).length).map(hexKey));
  const reachable = new Set(reachableCells(previousPosition, PLAYER_MOVE_RANGE, boardCells(), occupiedByEnemies).map(hexKey));
  const validMove = !playerStunned && reachable.has(hexKey(destination));
  const changed = validMove && (destination.q !== previousPosition.q || destination.r !== previousPosition.r);
  player = changed ? { ...player, position: destination, changedPositionThisTurn: true } : { ...player, changedPositionThisTurn: false };
  logs.push({ turn: state.turn, tone: "system", text: playerStunned ? `${player.name} está atordoado e não consegue se mover.` : changed ? `${player.name} se move.` : `${player.name} mantém a posição.` });

  if (changed) {
    for (const enemyRef of activeFrontLine(enemies)) {
      const enemy = enemies.find((entry) => entry.id === enemyRef.id) ?? enemyRef;
      if (enemy.hpCurrent <= 0) continue;
      const reactionAbility = enemy.abilities?.find((entry) => entry.reaction && REACTION_TRIGGERS.has(entry.aiTrigger) && (enemy.abilityCooldowns?.[entry.id] ?? 0) === 0);
      if (!reactionAbility) continue;
      const rawDamage = Math.round((reactionAbility.damageFamily === "magical" ? enemy.stats.magicalDamage : enemy.stats.physicalDamage) * reactionAbility.scaling);
      const counter = attack({ attacker: enemy, defender: player, rawDamage, kind: reactionAbility.damageFamily === "magical" ? "magical" : "physical", effects: reactionAbility.statusEffects ?? [], sourceName: `${enemy.name} (reação: ${reactionAbility.name})`, turn: state.turn, logs, sourceId: enemy.id });
      player = counter.defender;
      if (counter.dealt) logs.push({ turn: state.turn, tone: "enemy", text: `${enemy.name} reage com ${reactionAbility.name} e causa ${counter.dealt} de dano${counter.critical ? " crítico" : ""}.` });
      const updatedEnemy = reactionAbility.cooldownTurns ? { ...enemy, abilityCooldowns: { ...enemy.abilityCooldowns, [reactionAbility.id]: reactionAbility.cooldownTurns } } : enemy;
      enemies = enemies.map((entry) => (entry.id === enemy.id ? updatedEnemy : entry));
      if (player.hpCurrent === 0) return { ...state, player, enemies, cooldowns, status: "defeat", log: [...logs, { turn: state.turn, tone: "defeat", text: `${player.name} caiu. HP permanece em 0 até receber cura.` }] };
    }
  }

  const phase = runEnemyPhase(state.turn, player, enemies, logs, masteryMultiplier);
  player = phase.player; enemies = phase.enemies;
  if (phase.defeated) return { ...state, player, enemies, cooldowns, status: "defeat", log: logs };
  return finalizeRound(state, player, enemies, cooldowns, logs);
}
