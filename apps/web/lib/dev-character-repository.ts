import { activePreset, applyEquipment, characterPower, createHuntBattle, emptyEquipment, setLoadoutAbility } from "@rupterya/game-core";
import type { CharacterPreset, DevAccount, EquipmentItem, GameCharacter, HuntBattleState, HuntCreatureDefinition, LoadoutSlot } from "@rupterya/game-core";
import { abilities, classes, emberDragonCompanion, equipment, sharedAbilities } from "./catalog";

const STORAGE_KEY = "rupterya-browser-dev-account-v2";
const allAbilities = [...abilities, ...sharedAbilities];
const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const defaultLoadout = (classId: string) => {
  const classAbilities = abilities.filter((ability) => ability.id.startsWith(`${classId}-`));
  const find = (suffix: string) => classAbilities.find((ability) => ability.id.endsWith(suffix))?.id ?? null;
  return { skill1: find("skill-1"), skill2: find("skill-2"), skill3: find("skill-3"), skill4: find("skill-4"), ultimate: find("ultimate"), stance: find("stance"), passive: find("passive") };
};

export class DevCharacterRepository {
  emptyAccount(): DevAccount {
    return { id: "dev-account", globalLevel: 30, globalXp: 0, characterSlots: 6, characters: [] };
  }

  load(): DevAccount {
    if (typeof window === "undefined") return this.emptyAccount();
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem("rupterya-browser-dev-account-v1");
    if (!raw) return this.emptyAccount();
    const stored = JSON.parse(raw) as DevAccount;
    const legacyClasses: Record<string, string> = { warrior: "guardian" };
    const characters = stored.characters.map((character) => {
      const classId = legacyClasses[character.classId] ?? character.classId;
      const definition = classes.find((entry) => entry.id === classId) ?? classes[0];
      const ownedAbilityIds = abilities.filter((ability) => ability.id.startsWith(`${definition.id}-`)).map((ability) => ability.id);
      const presets = character.presets.map((preset) => {
        const compatible = Object.values(preset.loadout).every((abilityId) => abilityId === null || ownedAbilityIds.includes(abilityId));
        return { ...preset, loadout: compatible ? preset.loadout : defaultLoadout(definition.id) };
      });
      return { ...character, classId: definition.id, ownedAbilityIds: [...new Set([...ownedAbilityIds, "school-fire", "lineage-vampire", "secret-predatory-charge"])], presets };
    });
    return { ...stored, characters };
  }

  save(account: DevAccount): DevAccount {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    return account;
  }

  create(account: DevAccount, input: { name: string; classId: string; kingdom: string }): DevAccount {
    if (account.characters.length >= account.characterSlots) throw new Error("Todos os slots de desenvolvimento estão ocupados.");
    const definition = classes.find((entry) => entry.id === input.classId);
    if (!definition) throw new Error("Classe inválida.");
    const name = input.name.trim();
    if (name.length < 3) throw new Error("Use um nome com ao menos 3 caracteres.");
    const preset: CharacterPreset = { id: id(), name: "Caça", loadout: defaultLoadout(definition.id), equipment: emptyEquipment() };
    const character: GameCharacter = { id: id(), name, classId: definition.id, kingdom: input.kingdom, lineageId: null, schoolId: null, skinId: "default", vitals: { hpCurrent: definition.baseVitals.hpMax, hpMax: definition.baseVitals.hpMax, mpCurrent: definition.baseVitals.mpMax, mpMax: definition.baseVitals.mpMax, morale: definition.baseVitals.morale, gold: definition.baseVitals.gold }, equipment: preset.equipment, ownedAbilityIds: [...abilities.filter((ability) => ability.id.startsWith(`${definition.id}-`)).map((ability) => ability.id), "school-fire", "lineage-vampire", "secret-predatory-charge"], presets: [preset], activePresetId: preset.id };
    return this.save({ ...account, characters: [...account.characters, character] });
  }

  update(account: DevAccount, character: GameCharacter): DevAccount {
    return this.save({ ...account, characters: account.characters.map((entry) => entry.id === character.id ? character : entry) });
  }

  equip(character: GameCharacter, item: EquipmentItem): GameCharacter {
    const preset = activePreset(character);
    const equipmentState = { ...preset.equipment, [item.slot]: preset.equipment[item.slot] === item.id ? null : item.id };
    const updated = { ...preset, equipment: equipmentState };
    const base = classes.find((entry) => entry.id === character.classId)!;
    const computed = applyEquipment(base, equipmentState, equipment);
    return { ...character, equipment: equipmentState, vitals: { ...character.vitals, hpMax: computed.hpMax, hpCurrent: Math.min(character.vitals.hpCurrent, computed.hpMax), mpMax: computed.mpMax, mpCurrent: Math.min(character.vitals.mpCurrent, computed.mpMax) }, presets: character.presets.map((entry) => entry.id === updated.id ? updated : entry) };
  }

  assignAbility(character: GameCharacter, slot: LoadoutSlot, abilityId: string): GameCharacter {
    const ability = allAbilities.find((entry) => entry.id === abilityId);
    if (!ability || !character.ownedAbilityIds.includes(abilityId)) throw new Error("Habilidade indisponível.");
    const preset = activePreset(character);
    const updated = { ...preset, loadout: setLoadoutAbility(preset.loadout, slot, ability) };
    return { ...character, presets: character.presets.map((entry) => entry.id === updated.id ? updated : entry) };
  }

  setLineage(character: GameCharacter, lineageId: string | null): GameCharacter { return { ...character, lineageId }; }
  setSchool(character: GameCharacter, schoolId: string | null): GameCharacter { return { ...character, schoolId }; }
  setSkin(character: GameCharacter, skinId: string): GameCharacter { return { ...character, skinId }; }
  restAtInn(character: GameCharacter): GameCharacter {
    const base = classes.find((entry) => entry.id === character.classId)!;
    const computed = applyEquipment(base, character.equipment, equipment);
    return { ...character, vitals: { ...character.vitals, hpCurrent: computed.hpMax, hpMax: computed.hpMax, mpCurrent: computed.mpMax, mpMax: computed.mpMax } };
  }

  addPreset(character: GameCharacter, name: string): GameCharacter {
    const preset: CharacterPreset = { id: id(), name: name.trim() || `Preset ${character.presets.length + 1}`, loadout: defaultLoadout(character.classId), equipment: emptyEquipment() };
    return { ...character, presets: [...character.presets, preset], activePresetId: preset.id, equipment: preset.equipment };
  }

  renamePreset(character: GameCharacter, presetId: string, name: string): GameCharacter {
    return { ...character, presets: character.presets.map((preset) => preset.id === presetId ? { ...preset, name: name.trim() || preset.name } : preset) };
  }

  activatePreset(character: GameCharacter, presetId: string): GameCharacter {
    const preset = character.presets.find((entry) => entry.id === presetId);
    if (!preset) return character;
    const base = classes.find((entry) => entry.id === character.classId)!;
    const computed = applyEquipment(base, preset.equipment, equipment);
    return { ...character, activePresetId: presetId, equipment: preset.equipment, vitals: { ...character.vitals, hpMax: computed.hpMax, hpCurrent: Math.min(character.vitals.hpCurrent, computed.hpMax), mpMax: computed.mpMax, mpCurrent: Math.min(character.vitals.mpCurrent, computed.mpMax) } };
  }

  beginHunt(account: DevAccount, character: GameCharacter, regionId: string, creatures: HuntCreatureDefinition[]): HuntBattleState {
    const summary = this.summary(account, character);
    const definition = classes.find((entry) => entry.id === character.classId)!;
    const onHitEffects = Object.values(character.equipment).flatMap((itemId) => equipment.find((item) => item.id === itemId)?.statusEffects ?? []);
    return createHuntBattle({ regionId, creatures, companion: emberDragonCompanion, player: { id: character.id, name: character.name, portraitPath: definition.portraitPath, hpCurrent: character.vitals.hpCurrent, hpMax: summary.hpMax, mpCurrent: character.vitals.mpCurrent, mpMax: summary.mpMax, stats: summary.stats, activeEffects: [], onHitEffects } });
  }

  settleHunt(account: DevAccount, character: GameCharacter, battle: HuntBattleState): DevAccount {
    if (battle.status === "active") return account;
    const gold = character.vitals.gold + (battle.status === "victory" ? battle.reward?.gold ?? 0 : 0);
    const updated = { ...character, vitals: { ...character.vitals, hpCurrent: battle.player.hpCurrent, hpMax: battle.player.hpMax, mpCurrent: battle.player.mpCurrent, mpMax: battle.player.mpMax, gold } };
    return this.save({ ...account, globalXp: account.globalXp + (battle.status === "victory" ? battle.reward?.xp ?? 0 : 0), characters: account.characters.map((entry) => entry.id === character.id ? updated : entry) });
  }

  summary(account: DevAccount, character: GameCharacter) {
    const base = classes.find((entry) => entry.id === character.classId)!;
    const computed = applyEquipment(base, character.equipment, equipment);
    return { name: character.name, className: base.name, classRole: base.role, portraitPath: base.portraitPath, kingdom: character.kingdom, level: account.globalLevel, power: characterPower(base, character.equipment, equipment), hpCurrent: character.vitals.hpCurrent, hpMax: computed.hpMax, mpCurrent: character.vitals.mpCurrent, mpMax: computed.mpMax, morale: character.vitals.morale, gold: character.vitals.gold, stats: computed.stats, adventure: base.adventure };
  }
}

export const repository = new DevCharacterRepository();
