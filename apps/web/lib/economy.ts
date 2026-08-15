import type { EquipmentItem } from "@rupterya/game-core";
import { materialsById } from "./loot-catalog";
import type { AdventureCityId } from "./world";

export type ConsumableEffect =
  | { kind: "heal_hp"; amount: number }
  | { kind: "restore_mp"; amount: number }
  | { kind: "restore_morale"; amount: number }
  | { kind: "mixed"; hp: number; mp: number };

export interface ConsumableDefinition {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  effect?: ConsumableEffect;
  special?: "sealed_crate";
}

export interface MarketListing {
  kind: "equipment" | "consumable";
  id: string;
  price: number;
  requiredReputation?: number;
  requiredNotoriety?: number;
  blackMarket?: boolean;
}

export const consumables: ConsumableDefinition[] = [
  { id: "pocao-rubra", name: "Poção Rubra", description: "Recupera 90 HP fora de combate.", basePrice: 42, effect: { kind: "heal_hp", amount: 90 } },
  { id: "pocao-rubra-forte", name: "Poção Rubra Forte", description: "Recupera 190 HP fora de combate.", basePrice: 96, effect: { kind: "heal_hp", amount: 190 } },
  { id: "tonico-azul", name: "Tônico Azul", description: "Recupera 42 MP fora de combate.", basePrice: 48, effect: { kind: "restore_mp", amount: 42 } },
  { id: "tonico-azul-forte", name: "Tônico Azul Forte", description: "Recupera 90 MP fora de combate.", basePrice: 110, effect: { kind: "restore_mp", amount: 90 } },
  { id: "racao-de-estrada", name: "Ração de Estrada", description: "Recupera 12 de Moral.", basePrice: 30, effect: { kind: "restore_morale", amount: 12 } },
  { id: "vinho-fortificado", name: "Vinho Fortificado", description: "Recupera 60 HP e 18 MP.", basePrice: 64, effect: { kind: "mixed", hp: 60, mp: 18 } },
  { id: "sal-de-vigilia", name: "Sal de Vigília", description: "Recupera 22 de Moral antes de uma expedição.", basePrice: 78, effect: { kind: "restore_morale", amount: 22 } },
  { id: "caixa-selada", name: "Caixa Selada", description: "Mercadoria clandestina. Ao abrir, concede um equipamento aleatório da cidade.", basePrice: 390, special: "sealed_crate" },
];

export const consumablesById = new Map(consumables.map((entry) => [entry.id, entry]));

const cityEquipment: Record<AdventureCityId, { common: string[]; reputation: string[]; black: string[] }> = {
  fiordevalle: {
    common: ["iron-sword", "iron-helm", "leather-coat", "traveler-boots", "iron-gauntlets"],
    reputation: ["hunter-bow", "ember-staff"],
    black: ["serrated-blade", "moon-charm", "mist-lord-blade"],
  },
  eldravia: {
    common: ["ember-staff", "eldravia-glass-staff", "moon-charm", "traveler-boots"],
    reputation: ["eldravia-prism-coat", "hunter-bow"],
    black: ["eldravia-rift-orb", "crimson-blood-orb", "mist-lord-blade"],
  },
  dustfall: {
    common: ["dustfall-scrap-blade", "iron-gauntlets", "hunter-bow", "leather-coat"],
    reputation: ["dustfall-salt-plate", "serrated-blade"],
    black: ["dustfall-crater-core", "mist-lord-blade", "crimson-blood-orb"],
  },
};

const equipmentPrice = (item: EquipmentItem) => Math.max(70, Math.round(item.power * 8.5 + item.itemLevel * 3));

function hashSeed(input: string) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function rotate<T>(entries: readonly T[], seed: number) {
  if (!entries.length) return [];
  const offset = seed % entries.length;
  return [...entries.slice(offset), ...entries.slice(0, offset)];
}

export function marketCycle(now = Date.now()) {
  return Math.floor(now / (6 * 60 * 60 * 1000));
}

export function marketStock(cityId: AdventureCityId, equipment: EquipmentItem[], now = Date.now()): MarketListing[] {
  const cycle = marketCycle(now);
  const seed = hashSeed(`${cityId}:${cycle}`);
  const config = cityEquipment[cityId];
  const equipmentById = new Map(equipment.map((item) => [item.id, item]));
  const normal = rotate(config.common, seed).slice(0, 4).flatMap((id) => {
    const item = equipmentById.get(id);
    return item ? [{ kind: "equipment" as const, id, price: equipmentPrice(item) }] : [];
  });
  const reputation = rotate(config.reputation, seed >>> 3).slice(0, 1).flatMap((id) => {
    const item = equipmentById.get(id);
    return item ? [{ kind: "equipment" as const, id, price: Math.round(equipmentPrice(item) * 1.15), requiredReputation: 12 }] : [];
  });
  const consumableStock = rotate(consumables.filter((entry) => entry.id !== "caixa-selada"), seed >>> 5)
    .slice(0, 3)
    .map((entry) => ({ kind: "consumable" as const, id: entry.id, price: entry.basePrice }));
  return [...normal, ...reputation, ...consumableStock];
}

export function blackMarketStock(cityId: AdventureCityId, equipment: EquipmentItem[], now = Date.now()): MarketListing[] {
  const cycle = marketCycle(now);
  const seed = hashSeed(`black:${cityId}:${cycle}`);
  const equipmentById = new Map(equipment.map((item) => [item.id, item]));
  const gear = rotate(cityEquipment[cityId].black, seed).slice(0, 2).flatMap((id, index) => {
    const item = equipmentById.get(id);
    return item ? [{
      kind: "equipment" as const,
      id,
      price: Math.round(equipmentPrice(item) * 2.6),
      requiredNotoriety: index === 0 ? 0 : 10,
      blackMarket: true,
    }] : [];
  });
  return [
    ...gear,
    { kind: "consumable", id: "caixa-selada", price: Math.round(consumablesById.get("caixa-selada")!.basePrice * 2.6), requiredNotoriety: 4, blackMarket: true },
  ];
}

export function materialResaleValue(materialId: string, amount: number, blackMarket = false) {
  const material = materialsById.get(materialId);
  if (!material || amount <= 0) return 0;
  const multiplier = blackMarket ? 1.45 : 1;
  return Math.max(1, Math.floor(material.vendorValue * amount * multiplier));
}

export function innCost(cityId: AdventureCityId, level: number) {
  const base: Record<AdventureCityId, number> = { fiordevalle: 22, eldravia: 48, dustfall: 82 };
  return base[cityId] + Math.max(0, Math.floor(level / 10) * 6);
}
