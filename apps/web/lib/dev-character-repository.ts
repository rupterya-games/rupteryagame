import {
  activePreset,
  applyEquipment,
  characterPower,
  createHuntBattle,
  emptyEquipment,
  setLoadoutAbility,
} from "@rupterya/game-core";
import type {
  CharacterPreset,
  CharacterWorldProgress,
  DevAccount,
  EquipmentItem,
  GameCharacter,
  HuntBattleState,
  HuntCreatureDefinition,
  LoadoutSlot,
} from "@rupterya/game-core";
import { abilities, classes, emberDragonCompanion, equipment, sharedAbilities, starterSetsByClass } from "./catalog";
import { bestiaryById } from "./bestiary";
import { consumablesById, materialResaleValue } from "./economy";
import { questsById, questIsReady, questPrerequisitesMet } from "./quests";
import type { AdventureCityId } from "./world";
import { supabase } from "./supabase";

const allAbilities = [...abilities, ...sharedAbilities];
const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export const emptyWorldProgress = (): CharacterWorldProgress => ({
  exploredSpotsByLevel: {},
  discoveredCreatureIds: [],
  creatureKills: {},
  defeatedBossIds: [],
  activeQuestIds: [],
  completedQuestIds: [],
  materials: {},
  consumables: {},
  reputationByCity: {},
  notorietyByCity: {},
});

export const xpToNextLevel = (level: number) => Math.round(120 + level * 34 + Math.pow(level, 1.35) * 8);

const defaultLoadout = (classId: string) => {
  const classAbilities = abilities.filter((ability) => ability.id.startsWith(`${classId}-`));
  const find = (suffix: string) => classAbilities.find((ability) => ability.id.endsWith(suffix))?.id ?? null;
  return {
    skill1: find("skill-1"),
    skill2: find("skill-2"),
    skill3: find("skill-3"),
    skill4: find("skill-4"),
    ultimate: find("ultimate"),
    stance: find("stance"),
    passive: find("passive"),
  };
};


const starterItemIdsForClass = (classId: string) => starterSetsByClass[classId] ?? [];

const starterEquipmentForClass = (classId: string) => {
  const state = emptyEquipment();
  for (const itemId of starterItemIdsForClass(classId)) {
    const item = equipment.find((entry) => entry.id === itemId);
    if (item) state[item.slot] = item.id;
  }
  return state;
};

const normalizeEquipmentForClass = (classId: string, current?: Partial<GameCharacter["equipment"]>) => {
  const starter = starterEquipmentForClass(classId);
  const normalized = { ...emptyEquipment(), ...(current ?? {}) };
  // Migração segura: preserva todo item já equipado e só completa slots vazios
  // com o set inicial da classe, incluindo o novo slot de arma secundária.
  for (const slot of Object.keys(starter) as Array<keyof typeof starter>) {
    if (!normalized[slot] && starter[slot]) normalized[slot] = starter[slot];
  }
  return normalized;
};

function normalizeWorldProgress(progress?: CharacterWorldProgress): CharacterWorldProgress {
  return {
    ...emptyWorldProgress(),
    ...(progress ?? {}),
    exploredSpotsByLevel: progress?.exploredSpotsByLevel ?? {},
    discoveredCreatureIds: progress?.discoveredCreatureIds ?? Object.keys(progress?.creatureKills ?? {}),
    creatureKills: progress?.creatureKills ?? {},
    defeatedBossIds: progress?.defeatedBossIds ?? [],
    activeQuestIds: progress?.activeQuestIds ?? [],
    completedQuestIds: progress?.completedQuestIds ?? [],
    materials: progress?.materials ?? {},
    consumables: progress?.consumables ?? {},
    reputationByCity: progress?.reputationByCity ?? {},
    notorietyByCity: progress?.notorietyByCity ?? {},
  };
}

function withWorldProgress(character: GameCharacter): GameCharacter {
  return { ...character, worldProgress: normalizeWorldProgress(character.worldProgress) };
}

function applyAccountXp(account: DevAccount, gainedXp: number): DevAccount {
  if (gainedXp <= 0) return account;
  let globalLevel = account.globalLevel;
  let globalXp = account.globalXp + gainedXp;
  while (globalXp >= xpToNextLevel(globalLevel)) {
    globalXp -= xpToNextLevel(globalLevel);
    globalLevel += 1;
  }
  return { ...account, globalLevel, globalXp };
}

function replaceCharacter(account: DevAccount, character: GameCharacter) {
  return { ...account, characters: account.characters.map((entry) => (entry.id === character.id ? character : entry)) };
}

export class DevCharacterRepository {
  private userId: string | null = null;
  private saveQueue: Promise<unknown> = Promise.resolve();

  emptyAccount(userId = this.userId ?? "offline"): DevAccount {
    return { id: userId, globalLevel: 30, globalXp: 0, characterSlots: 6, characters: [] };
  }

  async loadForUser(userId: string): Promise<DevAccount> {
    this.userId = userId;
    const { data, error } = await supabase.from("account_saves").select("game_state").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (!data?.game_state || !Object.keys(data.game_state).length) {
      const fresh = this.emptyAccount(userId);
      await supabase.from("account_saves").upsert({ user_id: userId, game_state: fresh, updated_at: new Date().toISOString() });
      return fresh;
    }
    const stored = data.game_state as DevAccount;
    const legacyClasses: Record<string, string> = { warrior: "guardian" };
    const characters = stored.characters.map((character) => {
      const classId = legacyClasses[character.classId] ?? character.classId;
      const definition = classes.find((entry) => entry.id === classId) ?? classes[0];
      const ownedAbilityIds = abilities.filter((ability) => ability.id.startsWith(`${definition.id}-`)).map((ability) => ability.id);
      const starterIds = starterItemIdsForClass(definition.id);
      const presets = character.presets.map((preset) => {
        const compatible = Object.values(preset.loadout).every((abilityId) => abilityId === null || ownedAbilityIds.includes(abilityId));
        return {
          ...preset,
          loadout: compatible ? preset.loadout : defaultLoadout(definition.id),
          equipment: normalizeEquipmentForClass(definition.id, preset.equipment),
        };
      });
      const activePreset = presets.find((preset) => preset.id === character.activePresetId) ?? presets[0];
      const normalizedEquipment = activePreset?.equipment ?? normalizeEquipmentForClass(definition.id, character.equipment);
      const computed = applyEquipment(definition, normalizedEquipment, equipment);
      return withWorldProgress({
        ...character,
        classId: definition.id,
        equipment: normalizedEquipment,
        inventoryItemIds: [...new Set([...(character.inventoryItemIds ?? []), ...starterIds])],
        itemMemories: character.itemMemories ?? {},
        fragments: character.fragments ?? {},
        ownedAbilityIds: [...new Set([...ownedAbilityIds, "school-fire", "lineage-vampire", "secret-predatory-charge"])],
        presets,
        vitals: {
          ...character.vitals,
          hpMax: computed.hpMax,
          hpCurrent: Math.min(character.vitals.hpCurrent, computed.hpMax),
          mpMax: computed.mpMax,
          mpCurrent: Math.min(character.vitals.mpCurrent, computed.mpMax),
        },
      });
    });
    const migrated = { ...stored, id: userId, characters };
    return migrated;
  }

  save(account: DevAccount): DevAccount {
    if (!this.userId) throw new Error("Nenhum jogador autenticado.");
    const state = { ...account, id: this.userId };
    this.saveQueue = this.saveQueue.then(async () => {
      const { error } = await supabase.from("account_saves").upsert({ user_id: this.userId, game_state: state, updated_at: new Date().toISOString() });
      if (error) console.error("Falha ao salvar progresso no Supabase", error.message);
    });
    return account;
  }

  clearUser() { this.userId = null; }

  create(account: DevAccount, input: { name: string; classId: string; kingdom: string }): DevAccount {
    if (account.characters.length >= account.characterSlots) throw new Error("Todos os slots de desenvolvimento estão ocupados.");
    const definition = classes.find((entry) => entry.id === input.classId);
    if (!definition) throw new Error("Classe inválida.");
    const name = input.name.trim();
    if (name.length < 3) throw new Error("Use um nome com ao menos 3 caracteres.");
    const starterEquipment = starterEquipmentForClass(definition.id);
    const computedStarter = applyEquipment(definition, starterEquipment, equipment);
    const preset: CharacterPreset = { id: id(), name: "Caça", loadout: defaultLoadout(definition.id), equipment: starterEquipment };
    const character: GameCharacter = {
      id: id(),
      name,
      classId: definition.id,
      kingdom: input.kingdom,
      lineageId: null,
      schoolId: null,
      skinId: "default",
      vitals: {
        hpCurrent: computedStarter.hpMax,
        hpMax: computedStarter.hpMax,
        mpCurrent: computedStarter.mpMax,
        mpMax: computedStarter.mpMax,
        morale: definition.baseVitals.morale,
        gold: definition.baseVitals.gold,
      },
      equipment: preset.equipment,
      inventoryItemIds: starterItemIdsForClass(definition.id),
      itemMemories: {},
      fragments: {},
      ownedAbilityIds: [
        ...abilities.filter((ability) => ability.id.startsWith(`${definition.id}-`)).map((ability) => ability.id),
        "school-fire",
        "lineage-vampire",
        "secret-predatory-charge",
      ],
      presets: [preset],
      activePresetId: preset.id,
      worldProgress: emptyWorldProgress(),
    };
    return this.save({ ...account, characters: [...account.characters, character] });
  }

  update(account: DevAccount, character: GameCharacter): DevAccount {
    return this.save(replaceCharacter(account, withWorldProgress(character)));
  }

  equip(character: GameCharacter, item: EquipmentItem): GameCharacter {
    if (!character.inventoryItemIds.includes(item.id)) throw new Error("Esse item ainda não pertence ao inventário.");
    if (item.allowedClassIds?.length && !item.allowedClassIds.includes(character.classId)) throw new Error(`${item.name} não pode ser equipado por esta classe.`);
    const preset = activePreset(character);
    const equipmentState = { ...preset.equipment, [item.slot]: preset.equipment[item.slot] === item.id ? null : item.id };
    const updated = { ...preset, equipment: equipmentState };
    const base = classes.find((entry) => entry.id === character.classId)!;
    const computed = applyEquipment(base, equipmentState, equipment);
    return {
      ...character,
      equipment: equipmentState,
      vitals: {
        ...character.vitals,
        hpMax: computed.hpMax,
        hpCurrent: Math.min(character.vitals.hpCurrent, computed.hpMax),
        mpMax: computed.mpMax,
        mpCurrent: Math.min(character.vitals.mpCurrent, computed.mpMax),
      },
      presets: character.presets.map((entry) => (entry.id === updated.id ? updated : entry)),
    };
  }

  assignAbility(character: GameCharacter, slot: LoadoutSlot, abilityId: string): GameCharacter {
    const ability = allAbilities.find((entry) => entry.id === abilityId);
    if (!ability || !character.ownedAbilityIds.includes(abilityId)) throw new Error("Habilidade indisponível.");
    const preset = activePreset(character);
    const updated = { ...preset, loadout: setLoadoutAbility(preset.loadout, slot, ability) };
    return { ...character, presets: character.presets.map((entry) => (entry.id === updated.id ? updated : entry)) };
  }

  setLineage(character: GameCharacter, lineageId: string | null): GameCharacter { return { ...character, lineageId }; }
  setSchool(character: GameCharacter, schoolId: string | null): GameCharacter { return { ...character, schoolId }; }
  setSkin(character: GameCharacter, skinId: string): GameCharacter { return { ...character, skinId }; }

  restAtInn(character: GameCharacter, cost = 0): GameCharacter {
    if (character.vitals.gold < cost) throw new Error(`Ouro insuficiente para a Estalagem. Faltam ${cost - character.vitals.gold}.`);
    const base = classes.find((entry) => entry.id === character.classId)!;
    const computed = applyEquipment(base, character.equipment, equipment);
    return {
      ...character,
      vitals: {
        ...character.vitals,
        gold: character.vitals.gold - cost,
        hpCurrent: computed.hpMax,
        hpMax: computed.hpMax,
        mpCurrent: computed.mpMax,
        mpMax: computed.mpMax,
      },
    };
  }

  buyItem(account: DevAccount, character: GameCharacter, item: EquipmentItem, price: number, cityId?: AdventureCityId, blackMarket = false): DevAccount {
    if (character.inventoryItemIds.includes(item.id)) throw new Error("Você já possui esse item.");
    if (character.vitals.gold < price) throw new Error(`Ouro insuficiente. Faltam ${price - character.vitals.gold}.`);
    const progress = normalizeWorldProgress(character.worldProgress);
    if (cityId && blackMarket) progress.notorietyByCity[cityId] = (progress.notorietyByCity[cityId] ?? 0) + 2;
    const updated: GameCharacter = {
      ...character,
      inventoryItemIds: [...character.inventoryItemIds, item.id],
      vitals: { ...character.vitals, gold: character.vitals.gold - price },
      worldProgress: progress,
    };
    return this.save(replaceCharacter(account, updated));
  }

  buyConsumable(account: DevAccount, character: GameCharacter, consumableId: string, price: number, cityId?: AdventureCityId, blackMarket = false): DevAccount {
    const consumable = consumablesById.get(consumableId);
    if (!consumable) throw new Error("Consumível inválido.");
    if (character.vitals.gold < price) throw new Error(`Ouro insuficiente. Faltam ${price - character.vitals.gold}.`);
    const progress = normalizeWorldProgress(character.worldProgress);
    progress.consumables[consumableId] = (progress.consumables[consumableId] ?? 0) + 1;
    if (cityId && blackMarket) progress.notorietyByCity[cityId] = (progress.notorietyByCity[cityId] ?? 0) + 1;
    const updated = { ...character, vitals: { ...character.vitals, gold: character.vitals.gold - price }, worldProgress: progress };
    return this.save(replaceCharacter(account, updated));
  }

  useConsumable(account: DevAccount, character: GameCharacter, consumableId: string): DevAccount {
    const consumable = consumablesById.get(consumableId);
    const progress = normalizeWorldProgress(character.worldProgress);
    if (!consumable || (progress.consumables[consumableId] ?? 0) <= 0) throw new Error("Consumível indisponível.");
    if (consumable.special === "sealed_crate") return this.openSealedCrate(account, character, consumableId);
    const nextVitals = { ...character.vitals };
    if (consumable.effect?.kind === "heal_hp") nextVitals.hpCurrent = Math.min(nextVitals.hpMax, nextVitals.hpCurrent + consumable.effect.amount);
    if (consumable.effect?.kind === "restore_mp") nextVitals.mpCurrent = Math.min(nextVitals.mpMax, nextVitals.mpCurrent + consumable.effect.amount);
    if (consumable.effect?.kind === "restore_morale") nextVitals.morale = Math.min(100, nextVitals.morale + consumable.effect.amount);
    if (consumable.effect?.kind === "mixed") {
      nextVitals.hpCurrent = Math.min(nextVitals.hpMax, nextVitals.hpCurrent + consumable.effect.hp);
      nextVitals.mpCurrent = Math.min(nextVitals.mpMax, nextVitals.mpCurrent + consumable.effect.mp);
    }
    progress.consumables[consumableId] -= 1;
    const updated = { ...character, vitals: nextVitals, worldProgress: progress };
    return this.save(replaceCharacter(account, updated));
  }

  private openSealedCrate(account: DevAccount, character: GameCharacter, consumableId: string): DevAccount {
    const progress = normalizeWorldProgress(character.worldProgress);
    const candidates = equipment.filter((item) => !character.inventoryItemIds.includes(item.id) && ["rare", "epic", "legendary"].includes(item.rarity));
    progress.consumables[consumableId] = Math.max(0, (progress.consumables[consumableId] ?? 1) - 1);
    const item = candidates[Math.floor(Math.random() * candidates.length)];
    const updated = {
      ...character,
      inventoryItemIds: item ? [...character.inventoryItemIds, item.id] : character.inventoryItemIds,
      worldProgress: progress,
    };
    return this.save(replaceCharacter(account, updated));
  }

  sellMaterial(account: DevAccount, character: GameCharacter, materialId: string, amount: number, blackMarket = false, cityId?: AdventureCityId): DevAccount {
    const progress = normalizeWorldProgress(character.worldProgress);
    const owned = progress.materials[materialId] ?? 0;
    if (amount <= 0 || owned < amount) throw new Error("Quantidade de material inválida.");
    const value = materialResaleValue(materialId, amount, blackMarket);
    progress.materials[materialId] = owned - amount;
    if (blackMarket && cityId) progress.notorietyByCity[cityId] = (progress.notorietyByCity[cityId] ?? 0) + 1;
    const updated = { ...character, vitals: { ...character.vitals, gold: character.vitals.gold + value }, worldProgress: progress };
    return this.save(replaceCharacter(account, updated));
  }

  recordSpot(account: DevAccount, character: GameCharacter, levelId: string, spotId: string): DevAccount {
    const progress = normalizeWorldProgress(character.worldProgress);
    progress.exploredSpotsByLevel[levelId] = [...new Set([...(progress.exploredSpotsByLevel[levelId] ?? []), spotId])];
    return this.save(replaceCharacter(account, { ...character, worldProgress: progress }));
  }

  discoverCreatures(account: DevAccount, character: GameCharacter, creatureIds: string[]): DevAccount {
    const progress = normalizeWorldProgress(character.worldProgress);
    progress.discoveredCreatureIds = [...new Set([...progress.discoveredCreatureIds, ...creatureIds])];
    return this.save(replaceCharacter(account, { ...character, worldProgress: progress }));
  }

  acceptQuest(account: DevAccount, character: GameCharacter, questId: string): DevAccount {
    const quest = questsById.get(questId);
    if (!quest) throw new Error("Contrato inexistente.");
    const progress = normalizeWorldProgress(character.worldProgress);
    if (progress.activeQuestIds.includes(questId)) return account;
    if (progress.activeQuestIds.length >= 3) throw new Error("Você já possui 3 contratos ativos.");
    if (!questPrerequisitesMet(quest, progress.completedQuestIds)) throw new Error("Pré-requisitos do contrato ainda não foram concluídos.");
    if (!quest.repeatable && progress.completedQuestIds.includes(questId)) throw new Error("Esse contrato já foi concluído.");
    progress.activeQuestIds.push(questId);
    return this.save(replaceCharacter(account, { ...character, worldProgress: progress }));
  }

  claimQuest(account: DevAccount, character: GameCharacter, questId: string): DevAccount {
    const quest = questsById.get(questId);
    if (!quest) throw new Error("Contrato inexistente.");
    const progress = normalizeWorldProgress(character.worldProgress);
    if (!progress.activeQuestIds.includes(questId)) throw new Error("Esse contrato não está ativo.");
    if (!questIsReady(quest, { ...progress, completedQuestIds: progress.completedQuestIds })) throw new Error("Objetivo do contrato ainda não foi concluído.");
    if (quest.objective.kind === "deliver") {
      progress.materials[quest.objective.materialId] = Math.max(0, (progress.materials[quest.objective.materialId] ?? 0) - quest.objective.target);
    }
    if (quest.objective.kind === "kill") {
      progress.creatureKills[quest.objective.creatureId] = Math.max(0, (progress.creatureKills[quest.objective.creatureId] ?? 0) - quest.objective.target);
    }
    progress.activeQuestIds = progress.activeQuestIds.filter((id) => id !== questId);
    if (!progress.completedQuestIds.includes(questId)) progress.completedQuestIds.push(questId);
    progress.reputationByCity[quest.cityId] = (progress.reputationByCity[quest.cityId] ?? 0) + quest.rewardReputation;
    const inventoryItemIds = quest.rewardItemId ? [...new Set([...character.inventoryItemIds, quest.rewardItemId])] : character.inventoryItemIds;
    const updated: GameCharacter = {
      ...character,
      inventoryItemIds,
      vitals: { ...character.vitals, gold: character.vitals.gold + quest.rewardGold },
      worldProgress: progress,
    };
    const withCharacter = replaceCharacter(account, updated);
    return this.save(applyAccountXp(withCharacter, quest.rewardXp));
  }

  grantMissionReward(account: DevAccount, character: GameCharacter, reward: { gold: number; xp: number; itemId?: string }): DevAccount {
    const inventoryItemIds = reward.itemId ? [...new Set([...character.inventoryItemIds, reward.itemId])] : character.inventoryItemIds;
    const updated: GameCharacter = { ...character, inventoryItemIds, vitals: { ...character.vitals, gold: character.vitals.gold + reward.gold } };
    return this.save(applyAccountXp(replaceCharacter(account, updated), reward.xp));
  }

  addPreset(character: GameCharacter, name: string): GameCharacter {
    const preset: CharacterPreset = { id: id(), name: name.trim() || `Preset ${character.presets.length + 1}`, loadout: defaultLoadout(character.classId), equipment: starterEquipmentForClass(character.classId) };
    return { ...character, presets: [...character.presets, preset], activePresetId: preset.id, equipment: preset.equipment };
  }

  renamePreset(character: GameCharacter, presetId: string, name: string): GameCharacter {
    return { ...character, presets: character.presets.map((preset) => (preset.id === presetId ? { ...preset, name: name.trim() || preset.name } : preset)) };
  }

  activatePreset(character: GameCharacter, presetId: string): GameCharacter {
    const preset = character.presets.find((entry) => entry.id === presetId);
    if (!preset) return character;
    const base = classes.find((entry) => entry.id === character.classId)!;
    const computed = applyEquipment(base, preset.equipment, equipment);
    return {
      ...character,
      activePresetId: presetId,
      equipment: preset.equipment,
      vitals: {
        ...character.vitals,
        hpMax: computed.hpMax,
        hpCurrent: Math.min(character.vitals.hpCurrent, computed.hpMax),
        mpMax: computed.mpMax,
        mpCurrent: Math.min(character.vitals.mpCurrent, computed.mpMax),
      },
    };
  }

  beginHunt(account: DevAccount, character: GameCharacter, regionId: string, creatures: HuntCreatureDefinition[]): HuntBattleState {
    const summary = this.summary(account, character);
    const equippedItems = Object.values(character.equipment).flatMap((itemId) => equipment.filter((item) => item.id === itemId));
    const onHitEffects = equippedItems.flatMap((item) => item.statusEffects ?? []);
    const preset = activePreset(character);
    const samuraiPassiveActive = character.classId === "samurai" && preset.loadout.passive === "samurai-passive";
    const counterAttack = samuraiPassiveActive
      ? {
          chance: Math.min(70, 30 + equippedItems.reduce((sum, item) => sum + (item.counterAttackChanceBonus ?? 0), 0)),
          scaling: Math.min(1.25, 0.65 + equippedItems.reduce((sum, item) => sum + (item.counterAttackScalingBonus ?? 0), 0)),
          sourceName: "Retaliação Iai",
        }
      : undefined;
    return createHuntBattle({
      regionId,
      creatures,
      itemMemories: character.itemMemories,
      companion: emberDragonCompanion,
      player: {
        id: character.id,
        name: character.name,
        portraitPath: summary.portraitPath,
        hpCurrent: character.vitals.hpCurrent,
        hpMax: summary.hpMax,
        mpCurrent: character.vitals.mpCurrent,
        mpMax: summary.mpMax,
        stats: summary.stats,
        activeEffects: [],
        onHitEffects,
        counterAttack,
      },
    });
  }

  settleHunt(account: DevAccount, character: GameCharacter, battle: HuntBattleState): DevAccount {
    if (battle.status === "active") return account;
    const progress = normalizeWorldProgress(character.worldProgress);
    const victory = battle.status === "victory";
    const gold = character.vitals.gold + (victory ? battle.reward?.gold ?? 0 : 0);
    const inventoryItemIds = victory ? [...new Set([...character.inventoryItemIds, ...(battle.reward?.itemIds ?? [])])] : character.inventoryItemIds;
    const itemMemories = { ...(character.itemMemories ?? {}) };
    if (victory) battle.reward?.memoryUpdates.forEach(({ itemId, stacks }) => { itemMemories[itemId] = stacks === 0 ? 0 : Math.min(3, (itemMemories[itemId] ?? 0) + stacks); });
    const fragments = { ...(character.fragments ?? {}) };
    if (victory) battle.reward?.fragments.forEach(({ rarity, amount }) => { fragments[rarity] = (fragments[rarity] ?? 0) + amount; });

    if (victory) {
      for (const creature of battle.creatures) {
        progress.creatureKills[creature.id] = (progress.creatureKills[creature.id] ?? 0) + 1;
        const rich = bestiaryById.get(creature.id);
        if (rich && ["boss", "worldboss"].includes(rich.rarity) && !progress.defeatedBossIds.includes(rich.id)) progress.defeatedBossIds.push(rich.id);
        for (const drop of rich?.loot.guaranteed ?? []) {
          if (drop.kind !== "material") continue;
          const min = drop.min ?? 1;
          const max = drop.max ?? min;
          const amount = min + Math.floor(Math.random() * (max - min + 1));
          progress.materials[drop.id] = (progress.materials[drop.id] ?? 0) + amount;
        }
      }
    }

    const updated: GameCharacter = {
      ...character,
      inventoryItemIds,
      itemMemories,
      fragments,
      worldProgress: progress,
      vitals: {
        ...character.vitals,
        hpCurrent: battle.player.hpCurrent,
        hpMax: battle.player.hpMax,
        mpCurrent: battle.player.mpCurrent,
        mpMax: battle.player.mpMax,
        gold,
      },
    };
    const withCharacter = replaceCharacter(account, updated);
    return this.save(applyAccountXp(withCharacter, victory ? battle.reward?.xp ?? 0 : 0));
  }

  summary(account: DevAccount, character: GameCharacter) {
    const base = classes.find((entry) => entry.id === character.classId)!;
    const computed = applyEquipment(base, character.equipment, equipment);
    const equippedItems = Object.values(character.equipment).flatMap((itemId) => equipment.filter((item) => item.id === itemId));
    const preset = activePreset(character);
    const counterAttackActive = character.classId === "samurai" && preset.loadout.passive === "samurai-passive";
    const counterAttackChance = counterAttackActive ? Math.min(70, 30 + equippedItems.reduce((sum, item) => sum + (item.counterAttackChanceBonus ?? 0), 0)) : 0;
    const counterAttackScaling = counterAttackActive ? Math.min(1.25, 0.65 + equippedItems.reduce((sum, item) => sum + (item.counterAttackScalingBonus ?? 0), 0)) : 0;
    const premiumSkin = character.classId === "guardian" && character.skinId === "guardian-eclipse";
    return {
      name: character.name,
      className: base.name,
      classRole: base.role,
      classId: base.id,
      counterAttackChance,
      counterAttackScaling,
      portraitPath: premiumSkin ? "/art/skins/guardian-eclipse-premium-v1.png" : base.portraitPath,
      kingdom: character.kingdom,
      level: account.globalLevel,
      power: characterPower(base, character.equipment, equipment),
      hpCurrent: character.vitals.hpCurrent,
      hpMax: computed.hpMax,
      mpCurrent: character.vitals.mpCurrent,
      mpMax: computed.mpMax,
      morale: character.vitals.morale,
      gold: character.vitals.gold,
      stats: computed.stats,
      adventure: base.adventure,
    };
  }
}

export const repository = new DevCharacterRepository();
