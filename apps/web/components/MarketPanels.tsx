"use client";

import type { CharacterWorldProgress, EquipmentItem } from "@rupterya/game-core";
import { consumablesById, type MarketListing } from "@/lib/economy";
import { materialsById } from "@/lib/loot-catalog";
import type { AdventureCityId } from "@/lib/world";

export function MarketPanels({
  cityId,
  blackMarket,
  listings,
  equipment,
  ownedItemIds,
  gold,
  progress,
  onBuyEquipment,
  onBuyConsumable,
  onUseConsumable,
  onSellMaterial,
}: {
  cityId: AdventureCityId;
  blackMarket: boolean;
  listings: MarketListing[];
  equipment: EquipmentItem[];
  ownedItemIds: readonly string[];
  gold: number;
  progress: CharacterWorldProgress;
  onBuyEquipment: (item: EquipmentItem, price: number, blackMarket: boolean) => void;
  onBuyConsumable: (id: string, price: number, blackMarket: boolean) => void;
  onUseConsumable: (id: string) => void;
  onSellMaterial: (id: string, amount: number, blackMarket: boolean) => void;
}) {
  const reputation = progress.reputationByCity[cityId] ?? 0;
  const notoriety = progress.notorietyByCity[cityId] ?? 0;
  return (
    <div className="market-system-stack">
      <div className="market-status-row">
        <small>Ouro: {gold}</small>
        <small>Reputação: {reputation}</small>
        <small>Notoriedade: {notoriety}</small>
        <small>Estoque muda a cada 6h</small>
      </div>
      <div className={`city-shop-grid ${blackMarket ? "black-market-grid" : ""}`}>
        {listings.map((listing) => {
          const repLocked = (listing.requiredReputation ?? 0) > reputation;
          const notorietyLocked = (listing.requiredNotoriety ?? 0) > notoriety;
          if (listing.kind === "equipment") {
            const item = equipment.find((entry) => entry.id === listing.id);
            if (!item) return null;
            const owned = ownedItemIds.includes(item.id);
            return (
              <article className="city-shop-card" key={`${listing.kind}-${listing.id}`}>
                <span>{item.rarity} · Nv. {item.itemLevel}</span>
                <strong>{item.name}</strong>
                {item.affixes && item.affixes.length > 0 && (
                  <div className="item-affixes">
                    {item.affixes.map((affix) => <span key={affix}>{affix}</span>)}
                  </div>
                )}
                {item.keywords?.map((keyword) => <em className="item-keyword" key={keyword}>{keyword}</em>)}
                <small>Poder +{item.power}</small>
                <em>{listing.price} ouro</em>
                {listing.requiredReputation ? <small>Requer reputação {listing.requiredReputation}</small> : null}
                {listing.requiredNotoriety ? <small>Requer notoriedade {listing.requiredNotoriety}</small> : null}
                <button
                  className="primary"
                  disabled={owned || repLocked || notorietyLocked || gold < listing.price}
                  onClick={() => onBuyEquipment(item, listing.price, blackMarket)}
                >
                  {owned ? "Já possui" : repLocked ? "Reputação baixa" : notorietyLocked ? "Notoriedade baixa" : "Comprar"}
                </button>
              </article>
            );
          }
          const consumable = consumablesById.get(listing.id);
          if (!consumable) return null;
          const owned = progress.consumables[listing.id] ?? 0;
          return (
            <article className="city-shop-card" key={`${listing.kind}-${listing.id}`}>
              <span>Consumível</span>
              <strong>{consumable.name}</strong>
              <small>{consumable.description}</small>
              <em>{listing.price} ouro · possui {owned}</em>
              <button
                className="primary"
                disabled={repLocked || notorietyLocked || gold < listing.price}
                onClick={() => onBuyConsumable(consumable.id, listing.price, blackMarket)}
              >Comprar</button>
              {owned > 0 && <button onClick={() => onUseConsumable(consumable.id)}>Usar</button>}
            </article>
          );
        })}
      </div>

      <section className="subpanel material-wallet">
        <div className="section-title"><span>Materiais e receptação</span><small>{blackMarket ? "Pagamento 1,45×" : "Preço normal"}</small></div>
        <div className="material-wallet-grid">
          {Object.entries(progress.materials).filter(([, amount]) => amount > 0).map(([materialId, amount]) => {
            const material = materialsById.get(materialId);
            return (
              <div key={materialId}>
                <strong>{material?.name ?? materialId}</strong>
                <small>{amount} unidade(s)</small>
                <button onClick={() => onSellMaterial(materialId, 1, blackMarket)}>Vender 1</button>
              </div>
            );
          })}
          {!Object.values(progress.materials).some((amount) => amount > 0) && <small>Nenhum material coletado ainda.</small>}
        </div>
      </section>
    </div>
  );
}
