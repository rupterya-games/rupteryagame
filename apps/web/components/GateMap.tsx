"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { AdventureCityDefinition } from "@/lib/world";
import { isAdventureLevelUnlocked } from "@/lib/world";
import { bestiaryById } from "@/lib/bestiary";

const exitPositions: Record<string, { left: string; top: string }> = {
  north: { left: "50%", top: "13%" },
  south: { left: "50%", top: "87%" },
  east: { left: "89%", top: "50%" },
  west: { left: "11%", top: "50%" },
};

const spotPositions = [
  { left: "11%", top: "68%" },
  { left: "25%", top: "34%" },
  { left: "40%", top: "61%" },
  { left: "55%", top: "28%" },
  { left: "69%", top: "56%" },
  { left: "84%", top: "32%" },
  { left: "89%", top: "74%" },
];

export function GateMap({
  city,
  selectedExitId,
  selectedLevelId,
  exploredSpotsByLevel,
  discoveredCreatureIds,
  creatureName,
  onSelectExit,
  onSelectLevel,
  onExploreSpot,
}: {
  city: AdventureCityDefinition;
  selectedExitId: string | null;
  selectedLevelId: string | null;
  exploredSpotsByLevel: Record<string, string[]>;
  discoveredCreatureIds: readonly string[];
  creatureName: (id: string) => string;
  onSelectExit: (exitId: string) => void;
  onSelectLevel: (levelId: string) => void;
  onExploreSpot: (spotId: string, spotName: string) => void;
}) {
  const [inspectedCreatureId, setInspectedCreatureId] = useState<string | null>(null);
  const activeExit = city.exits.find((entry) => entry.id === selectedExitId) ?? null;
  const activeLevel = activeExit?.levels.find((entry) => entry.id === selectedLevelId) ?? null;
  const spotLabels = ["Entrada", "Trilha", "Ruína", "Clareira", "Acampamento", "Marco", "Profundezas"];
  const spots = activeLevel
    ? Array.from({ length: activeLevel.spotCount }, (_, index) => ({
        id: `${activeLevel.id}-${index + 1}`,
        name: spotLabels[index] ?? `Ponto ${index + 1}`,
      }))
    : [];
  const explored = activeLevel ? exploredSpotsByLevel[activeLevel.id] ?? [] : [];
  const inspectedCreature = inspectedCreatureId ? bestiaryById.get(inspectedCreatureId) ?? null : null;
  const discoveredCreatures = useMemo(() => new Set(discoveredCreatureIds), [discoveredCreatureIds]);
  const visibleCreatures = useMemo(() => {
    if (!activeLevel) return [];
    return activeLevel.creaturePool
      .map((id) => bestiaryById.get(id))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [activeLevel]);

  useEffect(() => {
    setInspectedCreatureId(null);
  }, [selectedLevelId]);

  const knownCreatureName = (creatureId: string) =>
    discoveredCreatures.has(creatureId) ? creatureName(creatureId) : "Desconhecido";

  return (
    <div className="gate-map-stack">
      {!activeExit && <section className="gate-overview-shell">
        <div className="section-title">
          <span>Portões de {city.name}</span>
          <small>Escolha uma saída no próprio mapa</small>
        </div>
        <div className="gate-overview-map">
          <img src={`/art/maps/cities/${city.id}.jpg`} alt={`Portões de ${city.name}`} />
          {city.exits.map((exit) => {
            const position = exitPositions[exit.id] ?? { left: "50%", top: "50%" };
            const style = { left: position.left, top: position.top } as CSSProperties;
            return (
              <button
                key={exit.id}
                style={style}
                className={`gate-exit-pin ${selectedExitId === exit.id ? "selected" : ""}`}
                onClick={() => onSelectExit(exit.id)}
              >
                <b>{exit.icon}</b>
                <span>{exit.name}</span>
              </button>
            );
          })}
        </div>
      </section>}

      {activeExit && !activeLevel && (
        <section className="subpanel adventure-level-panel">
          <div className="section-title"><span>{activeExit.name}</span><small>Progressão 1 → 2 → 3</small></div>
          <div className="visual-level-grid">
            {activeExit.levels.map((level, index) => {
              const unlocked = isAdventureLevelUnlocked(city, level.id, exploredSpotsByLevel);
              const complete = (exploredSpotsByLevel[level.id]?.length ?? 0) >= level.spotCount;
              return (
                <button
                  key={level.id}
                  disabled={!unlocked}
                  className={`visual-level-card ${selectedLevelId === level.id ? "selected" : ""} ${complete ? "completed" : ""} ${!unlocked ? "locked" : ""}`}
                  onClick={() => onSelectLevel(level.id)}
                >
                  <img src={`/art/maps/instances/${level.id}.jpg`} alt={level.name} />
                  <div>
                    <span>Nível {level.level}</span>
                    <strong>{level.name}</strong>
                    <small>{level.recommendedLevel} · {complete ? "Concluído" : `${level.spotCount} spots`}</small>
                    {!unlocked && index > 0 && <em>Conclua {activeExit.levels[index - 1].name}</em>}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {activeLevel && (
        <section className="subpanel instance-visual-panel">
          <div className="section-title">
            <span>{activeLevel.name}</span>
            <small>{explored.length}/{spots.length} explorados</small>
          </div>
          <p>
            Clique nos pontos do mapa para andar e procurar encontros. Assinatura: <strong>{knownCreatureName(activeLevel.signatureCreatureId)}</strong>
            {activeLevel.bossId ? <> · Chefe: <strong>{knownCreatureName(activeLevel.bossId)}</strong></> : null}
          </p>

          <div className="instance-visual-map" aria-label={`Mapa explorável de ${activeLevel.name}`}>
            <img src={`/art/maps/instances/${activeLevel.id}.jpg`} alt={`Mapa de ${activeLevel.name}`} />
            {spots.map((spot, index) => {
              const done = explored.includes(spot.id);
              const position = spotPositions[index] ?? spotPositions[spotPositions.length - 1];
              const style = { left: position.left, top: position.top } as CSSProperties;
              return (
                <button
                  key={spot.id}
                  style={style}
                  className={`instance-spot-pin ${done ? "explored" : ""}`}
                  disabled={done}
                  onClick={() => onExploreSpot(spot.id, spot.name)}
                  title={done ? `${spot.name} já explorado` : `Explorar ${spot.name}`}
                >
                  <b>{index + 1}</b>
                  <span>{spot.name}</span>
                </button>
              );
            })}
          </div>

          <div className="encounter-gallery-title">
            <strong>Criaturas possíveis nesta instância</strong>
            <small>As criaturas são reveladas somente depois de um encontro.</small>
          </div>
          <div className="encounter-creature-gallery">
            {visibleCreatures.map((creature) => {
              const discovered = discoveredCreatures.has(creature.id);
              return (
                <button
                  key={creature.id}
                  className={`${inspectedCreatureId === creature.id ? "selected" : ""} ${!discovered ? "unknown" : ""}`}
                  disabled={!discovered}
                  onClick={() => setInspectedCreatureId(creature.id)}
                >
                  {discovered ? (
                    <img src={creature.portraitPath ?? "/art/bestiary-drafts/fiordevalle-bestiary-sheet-v1.png"} alt={creature.name} />
                  ) : (
                    <span className="unknown-creature-art" aria-hidden="true">?</span>
                  )}
                  <span>{discovered ? creature.name : "Desconhecido"}</span>
                  <small>{discovered ? `Nv. ${creature.level} · ${creature.rarity}` : "Encontre para revelar"}</small>
                </button>
              );
            })}
          </div>

          {inspectedCreature && (
            <article className="instance-creature-preview">
              <img src={inspectedCreature.portraitPath ?? "/art/bestiary-drafts/fiordevalle-bestiary-sheet-v1.png"} alt={inspectedCreature.name} />
              <div>
                <small>{inspectedCreature.family} · {inspectedCreature.rarity} · Nv. {inspectedCreature.level}</small>
                <strong>{inspectedCreature.name}</strong>
                <p>{inspectedCreature.description}</p>
                <span>HP {inspectedCreature.stats.hpMax} · ATQ {Math.max(inspectedCreature.stats.physicalDamage, inspectedCreature.stats.magicalDamage)} · DEF {inspectedCreature.stats.physicalDefense}/{inspectedCreature.stats.magicalDefense}</span>
              </div>
            </article>
          )}
        </section>
      )}
    </div>
  );
}
