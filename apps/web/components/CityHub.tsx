"use client";

import type { CSSProperties } from "react";
import type { AdventureCityDefinition, AdventureCityId } from "@/lib/world";
import { adventureCityList, cityUnlockProgress } from "@/lib/world";

const citySectionPositions: Record<string, { left: string; top: string }> = {
  centro: { left: "50%", top: "48%" },
  mercado: { left: "25%", top: "33%" },
  mural: { left: "75%", top: "32%" },
  "black-market": { left: "27%", top: "71%" },
  portoes: { left: "75%", top: "70%" },
};

export function CityHub({
  city,
  selectedSectionId,
  defeatedBossIds,
  activeQuestCount,
  onSwitchCity,
  onSelectSection,
}: {
  city: AdventureCityDefinition;
  selectedSectionId: string;
  defeatedBossIds: readonly string[];
  activeQuestCount: number;
  onSwitchCity: (cityId: AdventureCityId) => void;
  onSelectSection: (sectionId: string) => void;
}) {
  return (
    <>
      <div className="adventure-city-switcher" aria-label="Cidades de Rupterya">
        {adventureCityList.map((entry) => {
          const unlock = cityUnlockProgress(entry.id, defeatedBossIds);
          return (
            <button
              key={entry.id}
              className={`${entry.id === city.id ? "selected" : ""} ${!unlock.unlocked ? "locked" : ""}`}
              onClick={() => onSwitchCity(entry.id)}
              disabled={!unlock.unlocked}
              title={unlock.unlocked ? `Viajar para ${entry.name}` : unlock.description}
            >
              <strong>{entry.name}</strong>
              <small>
                {unlock.unlocked
                  ? entry.id === city.id
                    ? "Cidade atual"
                    : "Viajar"
                  : `${unlock.defeated}/${unlock.required} chefes`}
              </small>
            </button>
          );
        })}
      </div>

      <section className="city-map-shell">
        <div className="city-map-header">
          <div>
            <span>HUB INTERATIVO</span>
            <strong>{city.name}</strong>
          </div>
          <small>{activeQuestCount}/3 contratos ativos</small>
        </div>

        <div className="city-visual-map" aria-label={`Mapa interativo de ${city.name}`}>
          <img src={`/art/maps/cities/${city.id}.jpg`} alt={`Mapa de ${city.name}`} />
          {city.sections.map((section) => {
            const position = citySectionPositions[section.id] ?? { left: "50%", top: "50%" };
            const style = {
              left: position.left,
              top: position.top,
            } as CSSProperties;
            return (
              <button
                key={section.id}
                style={style}
                className={`city-map-pin ${selectedSectionId === section.id ? "selected" : ""}`}
                onClick={() => onSelectSection(section.id)}
                title={section.description}
              >
                <b>{section.icon}</b>
                <span>{section.name}</span>
              </button>
            );
          })}
        </div>

        <div className="city-map-copy">
          <p>{city.description}</p>
          <small>Clique diretamente nos locais do mapa. O mapa é navegação real da interface, não uma imagem de exemplo.</small>
        </div>
      </section>
    </>
  );
}
