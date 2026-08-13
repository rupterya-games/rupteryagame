import { activePreset, applyEquipment, characterPower, emptyEquipment, emptyLoadout, setLoadoutAbility } from "@rupterya/game-core";
import type { AbilityDefinition, CharacterPreset, DevAccount, EquipmentItem, GameCharacter, LoadoutSlot } from "@rupterya/game-core";
import { abilities, classes, equipment, sharedAbilities } from "./catalog";

const STORAGE_KEY = "rupterya-browser-dev-account-v1";
const allAbilities = [...abilities, ...sharedAbilities];
const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export class DevCharacterRepository {
  load(): DevAccount {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as DevAccount;
    }
    return { id: "dev-account", globalLevel: 30, globalXp: 0, characterSlots: 6, characters: [] };
  }

  save(account: DevAccount): DevAccount {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    return account;
  }

  create(account: DevAccount, input: { name: string; classId: string; kingdom: string }): DevAccount {
    if (account.characters.length >= account.characterSlots) throw new Error("Todos os slots de desenvolvimento estao ocupados.");
    const definition = classes.find((entry) => entry.id === input.classId);
    if (!definition) throw new Error("Classe invalida.");
    const name = input.name.trim();
    if (name.length < 3) throw new Error("Use um nome com ao menos 3 caracteres.");
    const preset: CharacterPreset = { id: id(), name: "Caça", loadout: emptyLoadout(), equipment: emptyEquipment() };
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
    if (!ability || !character.ownedAbilityIds.includes(abilityId)) throw new Error("Habilidade indisponivel.");
    const preset = activePreset(character);
    const updated = { ...preset, loadout: setLoadoutAbility(preset.loadout, slot, ability) };
    return { ...character, presets: character.presets.map((entry) => entry.id === updated.id ? updated : entry) };
  }

  setLineage(character: GameCharacter, lineageId: string | null): GameCharacter { return { ...character, lineageId }; }
  setSchool(character: GameCharacter, schoolId: string | null): GameCharacter { return { ...character, schoolId }; }
  setSkin(character: GameCharacter, skinId: string): GameCharacter { return { ...character, skinId }; }

  addPreset(character: GameCharacter, name: string): GameCharacter {
    const preset: CharacterPreset = { id: id(), name: name.trim() || `Preset ${character.presets.length + 1}`, loadout: emptyLoadout(), equipment: emptyEquipment() };
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

  summary(account: DevAccount, character: GameCharacter) {
    const base = classes.find((entry) => entry.id === character.classId)!;
    const computed = applyEquipment(base, character.equipment, equipment);
    return { name: character.name, className: base.name, kingdom: character.kingdom, level: account.globalLevel, power: characterPower(base, character.equipment, equipment), hpCurrent: character.vitals.hpCurrent, hpMax: computed.hpMax, mpCurrent: character.vitals.mpCurrent, mpMax: computed.mpMax, morale: character.vitals.morale, gold: character.vitals.gold, stats: computed.stats, adventure: base.adventure };
  }
}

export const repository = new DevCharacterRepository();
