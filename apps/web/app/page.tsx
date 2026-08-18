"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  ENEMY_FRONT_SPAWN_CELLS,
  FRONT_LINE_SIZE,
  LOADOUT_SLOTS,
  PLAYER_MOVE_RANGE,
  PLAYER_MP_REGEN_PER_TURN,
  PLAYER_START_CELL,
  activeFrontLine,
  activePreset,
  abilityAreaCells,
  boardCells,
  canUnitSeeCell,
  combatantSpeed,
  dropBreakChanceByRarity,
  effectiveVisionRange,
  hexDistance,
  playerAbilityRange,
  reachableCells,
  terrainCellAt,
  visibleCellsForUnit,
  resolveHuntTurn,
  resolveMoveTurn,
  resolveWaitTurn,
  statusEffectLabels,
} from "@rupterya/game-core";
import type {
  AbilityDefinition,
  Axial,
  CombatStatusEffect,
  GameCharacter,
  HuntBattleState,
  HuntCompanion,
  HuntCreatureDefinition,
  LoadoutSlot,
} from "@rupterya/game-core";
import {
  abilities,
  adventureCities,
  battleBoardsByRegion,
  classes,
  equipment,
  fiordevalleJourneyNodes,
  fiordevalleJourneyRoutes,
  huntCreatures,
  huntRegions,
  kingdoms,
  rollFiordevalleEncounter,
  sharedAbilities,
} from "@/lib/catalog";
import { emptyWorldProgress, repository, xpToNextLevel } from "@/lib/dev-character-repository";
import { bestiaryById } from "@/lib/bestiary";
import { blackMarketStock, innCost, marketStock } from "@/lib/economy";
import { questDestinationLevelId, questsByCity, questsById } from "@/lib/quests";
import {
  adventureCityList,
  cityUnlockProgress,
  findAdventureLevel,
  isAdventureLevelUnlocked,
  isCityUnlocked,
  type AdventureCityId,
} from "@/lib/world";
import { musicDirector } from "@/lib/music";
import { CityHub } from "@/components/CityHub";
import { CreatureFrameOverlay, creatureFrameClassName, creatureRarityLabels, resolveCreatureRarity } from "@/components/CreatureFamilyBadge";
import { StatusEffectIcon } from "@/components/StatusEffectIcon";
import { GateMap } from "@/components/GateMap";
import { HexBattlePrototype } from "@/components/HexBattlePrototype";
import { CompanionsLab } from "@/components/CompanionsLab";
import { QuestBoard } from "@/components/QuestBoard";
import { MarketPanels } from "@/components/MarketPanels";
import { LoginScreen } from "@/components/LoginScreen";
import { supabase } from "@/lib/supabase";

type View =
  | "slots"
  | "lobby"
  | "city"
  | "profile"
  | "equipment"
  | "abilities"
  | "presets"
  | "hunt"
  | "bestiary"
  | "dev"
  | "hexlab"
  | "companionslab";
type BattleEffect = {
  kind: "physical" | "magical" | "dragonfire";
  targetId?: string;
  targetIds?: string[];
  damage?: number;
} | null;
type BattleTurnEntry = {
  id: string;
  name: string;
  portraitPath: string;
  side: "player" | "enemy";
  speed: number;
};
type CastEffect = { classId: string } | null;
type JourneyOutcome = {
  destinationId: string;
  kind: "event" | "quiet" | "encounter";
  nodeName: string;
  text: string;
};
const slotLabels: Record<string, string> = {
  weapon: "Arma principal",
  secondary: "Arma secundária",
  head: "Cabeça",
  chest: "Peito",
  hands: "Mãos",
  feet: "Pés",
  trinket: "Amuleto",
};
const equipmentSlotIds = ["weapon", "secondary", "head", "chest", "hands", "feet", "trinket"] as const;
const premiumSkins = [
  { id: "guardian-eclipse", classId: "guardian", name: "Guardião do Eclipse", image: "/art/skins/guardian-eclipse-premium-v1.png" },
  { id: "archer-shadowwood", classId: "archer", name: "Arqueiro da Floresta Sombria", image: "/art/skins/archer-shadowwood-premium.jpg" },
  { id: "samurai-moonblossom", classId: "samurai", name: "Samurai da Lua Florida", image: "/art/skins/samurai-moonblossom-premium.jpg" },
] as const;

function EquipmentLoadoutModal({
  character,
  activeEffects = [],
  onClose,
}: {
  character: GameCharacter;
  activeEffects?: CombatStatusEffect[];
  onClose: () => void;
}) {
  return (
    <div className="loadout-overlay" role="presentation" onClick={onClose}>
      <section
        className="loadout-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Equipamentos em uso"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="section-title">
          <span>EQUIPAMENTO</span>
          <button onClick={onClose} aria-label="Fechar equipamentos">×</button>
        </div>
        <p>{character.name} · Nv. {character.level} · toque fora para voltar à batalha.</p>
        <CombatEffects effects={activeEffects} />
        <div className="loadout-equipment-grid">
          {equipmentSlotIds.map((slot) => {
            const item = equipment.find((entry) => entry.id === character.equipment[slot]);
            return (
              <article className={`loadout-equipment-slot ${item ? "equipped" : "empty"}`} key={slot}>
                <div className={`loadout-item-art item-art-${slot}`} aria-hidden="true" />
                <small>{slotLabels[slot]}</small>
                <strong>{item?.name ?? "Vazio"}</strong>
                <span>{item ? `Poder +${item.power}` : "Sem item"}</span>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CompanionDetailModal({
  companion,
  onClose,
}: {
  companion: HuntCompanion;
  onClose: () => void;
}) {
  return (
    <div className="loadout-overlay" role="presentation" onClick={onClose}>
      <section className="loadout-modal" role="dialog" aria-modal="true" aria-label={`Detalhes de ${companion.name}`} onClick={(event) => event.stopPropagation()}>
        <div className="section-title">
          <span>COMPANHEIRO</span>
          <button onClick={onClose} aria-label="Fechar detalhes">×</button>
        </div>
        <p>{companion.name}</p>
        <p>{companion.description}</p>
      </section>
    </div>
  );
}

function CreatureLoadoutModal({
  creature,
  activeEffects = [],
  onClose,
}: {
  creature: HuntBattleState["creatures"][number];
  activeEffects?: CombatStatusEffect[];
  onClose: () => void;
}) {
  const items = creature.equippedItems ?? (creature.equippedItem ? [creature.equippedItem] : []);
  return (
    <div className="loadout-overlay" role="presentation" onClick={onClose}>
      <section className="loadout-modal creature-loadout-modal" role="dialog" aria-modal="true" aria-label={`Equipamentos de ${creature.name}`} onClick={(event) => event.stopPropagation()}>
        <div className="section-title">
          <span>ITENS AVISTADOS</span>
          <button onClick={onClose} aria-label="Fechar equipamentos">×</button>
        </div>
        <p>{creature.name} · dados táticos da criatura avistada.</p>
        <div className="creature-detail-stats">
          <small>Classificação: {creatureRarityLabels[resolveCreatureRarity(creature.rarity)]}</small>
          <small>Nível {creature.level} · HP {creature.hpMax}</small>
        </div>
        <CombatEffects effects={activeEffects} />
        {items.length ? (
          <div className="loadout-equipment-grid">
            {items.map((item) => (
              <article className="loadout-equipment-slot equipped" key={item.id}>
                <div className={`loadout-item-art item-art-${item.slot}`} aria-hidden="true" />
                <small>{item.rarity} · {slotLabels[item.slot]}</small>
                <strong>{item.name}</strong>
                <span>Integridade: {100 - (item.breakChance ?? dropBreakChanceByRarity[item.rarity])}%</span>
                {item.uniqueKeyword && <em>{item.uniqueKeyword}</em>}
              </article>
            ))}
          </div>
        ) : <p className="empty-loadout">Nenhum Item Destacado nesta aparição.</p>}
      </section>
    </div>
  );
}

function BattleLoadout({
  character,
}: {
  character: GameCharacter;
}) {
  const equipped = Object.values(character.equipment).flatMap((itemId) =>
    equipment.filter((item) => item.id === itemId),
  );
  return (
    <section
      className="battle-loadout"
      aria-label="Aliado e equipamentos em uso"
    >
      <div className="battle-gear">
        <span>Equipado</span>
        <div>
          {equipped.length ? (
            equipped.map((item) => (
              <small key={item.id}>
                {slotLabels[item.slot]} · {item.name}
              </small>
            ))
          ) : (
            <small>Sem equipamento</small>
          )}
        </div>
      </div>
    </section>
  );
}

function journeyBetween(startId: string, destinationId: string) {
  if (startId === destinationId) return [startId];
  const links = new Map<string, string[]>();
  Object.values(fiordevalleJourneyRoutes).forEach((route) =>
    route.slice(1).forEach((nodeId, index) => {
      const previous = route[index];
      links.set(previous, [...(links.get(previous) ?? []), nodeId]);
      links.set(nodeId, [...(links.get(nodeId) ?? []), previous]);
    }),
  );
  const queue = [[startId]];
  const visited = new Set([startId]);
  while (queue.length) {
    const path = queue.shift()!;
    const current = path.at(-1)!;
    for (const neighbour of links.get(current) ?? []) {
      if (visited.has(neighbour)) continue;
      const next = [...path, neighbour];
      if (neighbour === destinationId) return next;
      visited.add(neighbour);
      queue.push(next);
    }
  }
  return [startId, destinationId];
}

function JourneyRoutePanel({
  startId,
  destinationId,
}: {
  startId: string;
  destinationId: string;
}) {
  const route = journeyBetween(startId, destinationId);
  const stops = route
    .map((id) => fiordevalleJourneyNodes.find((node) => node.id === id))
    .filter((node): node is (typeof fiordevalleJourneyNodes)[number] =>
      Boolean(node),
    );
  return (
    <section
      className="journey-route-panel"
      aria-label="Registro da rota planejada"
    >
      <span>Rota planejada</span>
      <div>
        {stops.map((node, index) => (
          <small
            key={node.id}
            className={index === stops.length - 1 ? "destination" : "passed"}
          >
            {node.icon} {node.name}
            {index < stops.length - 1 && <b> → </b>}
          </small>
        ))}
      </div>
      <p>
        Partida: {stops[0]?.name ?? "FiorDeValle"} · Destino:{" "}
        {stops.at(-1)?.name ?? "FiorDeValle"}
      </p>
    </section>
  );
}

function MusicToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className={`music-toggle ${enabled ? "playing" : ""}`}
      onClick={onToggle}
      aria-pressed={enabled}
    >
      {enabled ? "♫ Som" : "♫ Ativar som"}
    </button>
  );
}

function CombatEffects({ effects }: { effects: CombatStatusEffect[] }) {
  if (!effects.length) return null;
  return (
    <div className="combat-effects" aria-label="Efeitos ativos">
      {effects.map((effect) => (
        <span className={`combat-effect-pill status-effect-${effect.kind}`} key={`${effect.kind}-${effect.sourceName}`} title={`${statusEffectLabels[effect.kind]} · ${effect.turns} turno(s) restante(s)`}>
          <StatusEffectIcon kind={effect.kind} />
          <small>{statusEffectLabels[effect.kind]} · {effect.turns}T</small>
        </span>
      ))}
    </div>
  );
}

function JourneyOutcomePanel({
  title,
  text,
  kind,
  actionLabel,
  onAction,
  inline = false,
}: {
  title: string;
  text: string;
  kind: "event" | "quiet" | "encounter";
  actionLabel: string;
  onAction: () => void;
  inline?: boolean;
}) {
  return (
    <section className={`journey-outcome-panel ${kind} ${inline ? "inline" : ""}`}>
      <strong>{title}</strong>
      <small>{text}</small>
      <button className="primary" onClick={onAction}>
        {actionLabel}
      </button>
    </section>
  );
}

type AdventureAlert = {
  title: string;
  text: string;
  kind: "event" | "quiet" | "encounter";
  actionLabel: string;
};

function bestiaryCreatureForHunt(creatureId: string): HuntCreatureDefinition {
  const source = bestiaryById.get(creatureId);
  const legacy = huntCreatures.find((entry) => entry.id === creatureId);
  if (!source) return legacy ?? huntCreatures[0];
  return {
    id: source.id,
    name: source.name,
    description: source.description,
    portraitPath: source.portraitPath ?? legacy?.portraitPath,
    rarity: source.rarity,
    family: source.family,
    archetype: source.archetype,
    role: source.role,
    regionId: source.regionId,
    level: source.level,
    hpMax: source.stats.hpMax,
    physicalDamage: source.stats.physicalDamage,
    magicalDamage: source.stats.magicalDamage,
    physicalDefense: source.stats.physicalDefense,
    magicalDefense: source.stats.magicalDefense,
    blockChance: source.stats.blockChance,
    speed: source.stats.speed,
    xpReward: source.xpReward,
    goldReward: source.goldReward,
    statusEffects: source.statusEffects,
    equippedItem: legacy?.equippedItem,
    equippedItems: legacy?.equippedItems,
    featuredItemCandidates: legacy?.featuredItemCandidates,
    equipmentProfileId: legacy?.equipmentProfileId,
    abilities: source.abilities,
  };
}

const MAX_ENCOUNTER_SIZE = 8;

/** Só desenho — a geometria/alcance de verdade vive no motor (@rupterya/game-core). */
const HEX_SIZE = 34;
function axialToPixel(cell: Axial): { x: number; y: number } {
  return { x: HEX_SIZE * Math.sqrt(3) * (cell.q + cell.r / 2), y: HEX_SIZE * 1.5 * cell.r };
}
function hexCorners(cx: number, cy: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    points.push(`${cx + HEX_SIZE * Math.cos(angle)},${cy + HEX_SIZE * Math.sin(angle)}`);
  }
  return points.join(" ");
}
const hexKey = (cell: Axial) => `${cell.q},${cell.r}`;
/** Vaga de enxame: evento raro, só para arquétipo "swarm" (goblins, lobos, morcegos etc). */
const SWARM_SURGE_CHANCE = 0.12;

function createInstanceEncounter(creaturePool: readonly string[], playerLevel: number) {
  const firstId = creaturePool[Math.floor(Math.random() * creaturePool.length)] ?? creaturePool[0] ?? huntCreatures[0].id;
  const source = bestiaryById.get(firstId);
  const creatureLevel = source?.level ?? playerLevel;
  // Padrão continua 1x1 a 1x3. Só enxames podem, raramente, vir em vagas maiores
  // (até MAX_ENCOUNTER_SIZE) — mesmo aí só FRONT_LINE_SIZE entram em campo por
  // vez, o resto fica de reserva fora da tela até um slot abrir (activeFrontLine).
  let min = source?.solitary ? 1 : Math.max(1, source?.packMin ?? 1);
  let max = source?.solitary ? 1 : Math.min(3, Math.max(min, source?.packMax ?? 2));
  const isSwarmSurge = source?.archetype === "swarm" && !source?.solitary && Math.random() < SWARM_SURGE_CHANCE;
  if (isSwarmSurge) { min = Math.max(min, FRONT_LINE_SIZE + 1); max = MAX_ENCOUNTER_SIZE; }

  // Balanceamento por diferença de nível: grupos existem para serem perigosos
  // na faixa recomendada, não para fazer um personagem muito acima do nível
  // apanhar de uma alcateia trivial. Só entra em ação em diferenças grandes —
  // um personagem levemente acima do nível da zona ainda enfrenta o bando cheio.
  const gap = playerLevel - creatureLevel;
  if (gap >= 25) { min = 1; max = 1; }
  else if (gap >= 15) { min = 1; max = Math.min(2, max); }
  else if (gap >= 8) { min = 1; max = Math.min(3, max); }
  if (creatureLevel >= playerLevel + 6) { min = 1; max = Math.min(2, max); }
  min = Math.min(min, max);

  const count = min + Math.floor(Math.random() * (max - min + 1));
  return Array.from({ length: count }, (_, index) => {
    const candidates = creaturePool.filter((id) => {
      const candidate = bestiaryById.get(id);
      return !candidate || Math.abs(candidate.level - creatureLevel) <= 5;
    });
    const pool = candidates.length ? candidates : [...creaturePool];
    const creatureId = index === 0 ? firstId : (pool[Math.floor(Math.random() * pool.length)] ?? firstId);
    return bestiaryCreatureForHunt(creatureId);
  });
}

function BattleCooldownPanel({
  battle,
  abilities,
}: {
  battle: HuntBattleState;
  abilities: AbilityDefinition[];
}) {
  const recovering = abilities.filter(
    (ability) => (battle.cooldowns[ability.id] ?? 0) > 0,
  );
  if (!recovering.length) return null;
  return (
    <section className="battle-cooldowns" aria-label="Habilidades em recarga">
      <span>Em recarga</span>
      <div>
        {recovering.map((ability) => (
          <small key={ability.id}>
            {ability.name} · {battle.cooldowns[ability.id]}T
          </small>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileTab, setProfileTab] = useState<"stats" | "appearance">("stats");
  const [account, setAccount] = useState(() => repository.emptyAccount());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>("slots");
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("guardian");
  const [kingdom, setKingdom] = useState(kingdoms[0]);
  const [message, setMessage] = useState("Conta DEV pronta: Nv. Global 30.");
  const [presetName, setPresetName] = useState("");
  const [regionId, setRegionId] = useState(huntRegions[0].id);
  const [journeyNodeId, setJourneyNodeId] = useState("fiordevalle");
  const [journeyStartNodeId, setJourneyStartNodeId] = useState("fiordevalle");
  const [battle, setBattle] = useState<HuntBattleState | null>(null);
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);
  const [battleEffect, setBattleEffect] = useState<BattleEffect>(null);
  const [castEffect, setCastEffect] = useState<CastEffect>(null);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [showBattleLoadout, setShowBattleLoadout] = useState(false);
  const [inspectedCreatureIndex, setInspectedCreatureIndex] = useState<number | null>(null);
  const [showCompanionDetail, setShowCompanionDetail] = useState(false);
  const [battleActionMode, setBattleActionMode] = useState<"idle" | "move" | "skill">("idle");
  const [preparedAbilityId, setPreparedAbilityId] = useState<string | null>(null);
  const [inspectedBestiaryCreatureId, setInspectedBestiaryCreatureId] = useState<string | null>(null);
  const [devLevelInput, setDevLevelInput] = useState("0");
  const [devCreatureId, setDevCreatureId] = useState("");
  const [devCreatureCount, setDevCreatureCount] = useState(1);
  const [journeyOutcome, setJourneyOutcome] = useState<JourneyOutcome | null>(
    null,
  );
  const [traveledRoute, setTraveledRoute] = useState<string[]>(["fiordevalle"]);
  const [activeCityId, setActiveCityId] = useState<AdventureCityId>("fiordevalle");
  const [citySectionId, setCitySectionId] = useState("hub");
  const [selectedExitId, setSelectedExitId] = useState<string | null>(null);
  const [selectedInstanceLevelId, setSelectedInstanceLevelId] = useState<string | null>(null);
  const [adventureAlert, setAdventureAlert] = useState<AdventureAlert | null>(null);
  const [pendingEncounter, setPendingEncounter] = useState<ReturnType<typeof createInstanceEncounter> | null>(null);
  const [pendingEncounterSpot, setPendingEncounterSpot] = useState<{ levelId: string; spotId: string; spotName: string } | null>(null);

  const loadAuthenticatedAccount = async () => {
    setAuthLoading(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setAuthUserId(null);
      setAuthLoading(false);
      return;
    }
    try {
      const stored = await repository.loadForUser(data.user.id);
      setAuthUserId(data.user.id);
      setAccount(stored);
      setSelectedId(stored.characters[0]?.id ?? null);
      setView(stored.characters.length ? "lobby" : "slots");
      setMessage("Progresso online carregado.");
    } catch {
      await supabase.auth.signOut();
      setAuthUserId(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => { void loadAuthenticatedAccount(); }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    repository.clearUser();
    setAuthUserId(null);
    setAccount(repository.emptyAccount());
    setSelectedId(null);
    setBattle(null);
    setView("slots");
  };

  const musicMode = battle ? "combat" : "lobby";
  useEffect(() => {
    if (!musicEnabled) {
      musicDirector.stop();
      return;
    }
    void musicDirector.setMode(musicMode);
  }, [musicEnabled, musicMode]);

  useEffect(() => {
    const unlockMusic = () => {
      setMusicEnabled(true);
      void musicDirector.setMode(musicMode);
    };
    window.addEventListener("pointerdown", unlockMusic, { once: true });
    return () => window.removeEventListener("pointerdown", unlockMusic);
  }, [musicMode]);

  useEffect(() => {
    if (!battle || battle.status !== "active") {
      setSelectedEnemyId(null);
      return;
    }
    const frontLine = activeFrontLine(battle.enemies);
    const visible = frontLine.filter((enemy) => enemy.position && canUnitSeeCell(battle.player, enemy.position, battle.battlefield));
    const selectedAlive = visible.some((enemy) => enemy.id === selectedEnemyId);
    if (!selectedAlive) {
      setSelectedEnemyId(visible[0]?.id ?? null);
    }
  }, [battle, selectedEnemyId]);

  useEffect(() => {
    setBattleActionMode("idle");
    setPreparedAbilityId(null);
  }, [battle?.turn, battle?.status]);

  useEffect(() => {
    document
      .querySelectorAll<HTMLElement>(".journey-node")
      .forEach((element) => {
        const node = fiordevalleJourneyNodes.find((entry) =>
          element.textContent?.includes(entry.name),
        );
        if (!node) return;
        element.classList.toggle(
          "route-passed",
          traveledRoute.includes(node.id),
        );
        element.classList.toggle(
          "route-current",
          traveledRoute.at(-1) === node.id,
        );
      });
  }, [traveledRoute, view]);

  const selected =
    account.characters.find((character) => character.id === selectedId) ?? null;
  const summary = useMemo(
    () => (selected ? repository.summary(account, selected) : null),
    [account, selected],
  );
  useEffect(() => {
    if (!selected) return;
    const preferred = adventureCityList.find((city) => city.kingdom === selected.kingdom);
    const progress = selected.worldProgress ?? emptyWorldProgress();
    const cityId = preferred && isCityUnlocked(preferred.id, progress.defeatedBossIds) ? preferred.id : "fiordevalle";
    setActiveCityId(cityId);
    setRegionId(cityId);
    setCitySectionId("hub");
    setSelectedExitId(null);
    setSelectedInstanceLevelId(null);
    setAdventureAlert(null);
    setPendingEncounter(null);
  }, [selectedId]);

  const region =
    huntRegions.find((entry) => entry.id === regionId) ?? huntRegions[0];
  const adventureCity = adventureCities[activeCityId] ?? adventureCities.fiordevalle;
  const worldProgress = selected?.worldProgress ?? emptyWorldProgress();
  const exploredSpotsByLevel = worldProgress.exploredSpotsByLevel;
  const bestiaryChapters = adventureCityList
    .map((city) => ({
      city,
      exits: city.exits
        .map((exit) => ({
          exit,
          levels: exit.levels
            .map((level) => ({
              level,
              creatures: level.creaturePool
                .map((id) => bestiaryById.get(id))
                .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
            }))
            .filter(({ creatures }) => creatures.some((creature) => worldProgress.discoveredCreatureIds.includes(creature.id))),
        }))
        .filter(({ levels }) => levels.length > 0),
    }))
    .filter(({ exits }) => exits.length > 0);
  const bestiaryTotalSpecies = new Set(
    adventureCityList.flatMap((city) => city.exits.flatMap((exit) => exit.levels.flatMap((level) => level.creaturePool))),
  ).size;
  const bestiaryDiscoveredCount = worldProgress.discoveredCreatureIds.length;
  const bestiaryTotalKills = Object.values(worldProgress.creatureKills).reduce((sum, count) => sum + count, 0);
  const cityQuests = questsByCity(adventureCity.id);
  const normalMarketListings = marketStock(adventureCity.id, equipment);
  const blackMarketListings = blackMarketStock(adventureCity.id, equipment);
  const battleBoardStyle = {
    "--battle-board-art": `url("${battleBoardsByRegion[activeCityId] ?? adventureCity.heroArtPath}")`,
  } as CSSProperties;
  const journeyNode =
    fiordevalleJourneyNodes.find((node) => node.id === journeyNodeId) ??
    fiordevalleJourneyNodes[0];
  const journeyStartNode =
    fiordevalleJourneyNodes.find((node) => node.id === journeyStartNodeId) ??
    fiordevalleJourneyNodes[0];
  const selectedCitySection =
    adventureCity.sections.find((section) => section.id === citySectionId) ??
    adventureCity.sections[0];
  const activeExit =
    adventureCity.exits.find((entry) => entry.id === selectedExitId) ?? null;
  const activeLevel =
    activeExit?.levels.find((entry) => entry.id === selectedInstanceLevelId) ??
    null;
  const preset = selected ? activePreset(selected) : null;
  const ownedAbilities = selected
    ? [...abilities, ...sharedAbilities].filter((ability) =>
        selected.ownedAbilityIds.includes(ability.id),
      )
    : [];
  const activeBattleHero = battle?.party?.find((h) => h.id === (battle.activeHeroId ?? battle.currentActorId ?? battle.player.id)) ?? battle?.player;
  const battleAbilities: AbilityDefinition[] = activeBattleHero?.abilities?.length
    ? activeBattleHero.abilities.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        slotKind: a.id.includes("decree") || a.id.includes("eclipse") || a.id.includes("horizon") || a.id.includes("ultimate") ? "ultimate" : "skill",
        damageFamily: a.damageFamily === "magical" ? "magical" : "physical",
        source: "class" as const,
        range: a.range,
        area: a.area,
        cooldownTurns: a.cooldownTurns,
        damageType: a.damageFamily === "magical" ? "fire" : "slashing",
        powerScaling: a.scaling,
        defenseChannel: a.damageFamily === "magical" ? "magical" : "physical",
        isUltimate: a.id.includes("decree") || a.id.includes("eclipse") || a.id.includes("horizon") || a.id.includes("ultimate"),
        requiredChargeTurns: a.cooldownTurns || 4,
        hitsCount: a.id.includes("triple") ? 3 : 1,
        isSingleTarget: !(a.area && a.area.shape !== "single"),
      }))
    : preset
      ? Array.from(
          new Map(
            Object.values(preset.loadout)
              .flatMap((abilityId) =>
                ownedAbilities.filter(
                  (ability) =>
                    ability.id === abilityId &&
                    ability.damageFamily &&
                    ability.slotKind !== "passive" &&
                    ability.slotKind !== "stance",
                ),
              )
              .map((ability) => [ability.id, ability]),
          ).values(),
        )
      : [];
  const frontLineEnemies = battle
    ? battle.enemies
        .map((enemy, index) => ({ enemy, index }))
        .filter(({ enemy }) => enemy.hpCurrent > 0)
        .slice(0, FRONT_LINE_SIZE)
    : [];
  const hexBoardBounds = useMemo(() => {
    const points = boardCells().map(axialToPixel);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const pad = HEX_SIZE * 1.5;
    const left = Math.min(...xs) - pad;
    const top = Math.min(...ys) - pad;
    return { minX: left, minY: top, width: Math.max(...xs) - left + pad, height: Math.max(...ys) - top + pad };
  }, []);
  const hexToPercent = (cell: Axial) => {
    const { x, y } = axialToPixel(cell);
    return {
      left: `${((x - hexBoardBounds.minX) / hexBoardBounds.width) * 100}%`,
      top: `${((y - hexBoardBounds.minY) / hexBoardBounds.height) * 100}%`,
    };
  };
  const FRONT_SLOT_NUDGE_PX = [{ x: 0, y: 0 }, { x: 7, y: -5 }, { x: -7, y: 5 }, { x: 5, y: -8 }, { x: -5, y: 8 }];
  const hexToPercentForSlot = (cell: Axial, slot: number) => {
    const base = hexToPercent(cell);
    const nudge = FRONT_SLOT_NUDGE_PX[slot % FRONT_SLOT_NUDGE_PX.length];
    return { left: `calc(${base.left} + ${nudge.x}px)`, top: `calc(${base.top} + ${nudge.y}px)` };
  };
  const playerPosition: Axial = battle?.player.position ?? PLAYER_START_CELL;
  const battleFogEnabled = battle?.battlefield.fog.enabled ?? false;
  const visibleCellKeys = battle ? new Set(visibleCellsForUnit(battle.player, battle.battlefield).map(hexKey)) : new Set<string>();
  const visibleEnemyIds = battle ? new Set(frontLineEnemies.filter(({ enemy }) => enemy.position && canUnitSeeCell(battle.player, enemy.position, battle.battlefield)).map(({ enemy }) => enemy.id)) : new Set<string>();
  const preparedAbility = battleAbilities.find((ability) => ability.id === preparedAbilityId) ?? null;
  const occupiedEnemyCells = new Set(frontLineEnemies.flatMap(({ enemy }) => enemy.position ? [hexKey(enemy.position)] : []));
  const moveTargets = battle && battleActionMode === "move" && !battle.movementUsed
    ? new Set(reachableCells(playerPosition, PLAYER_MOVE_RANGE, boardCells(), occupiedEnemyCells, battle.battlefield).map(hexKey))
    : new Set<string>();
  const selectedSlot = frontLineEnemies.findIndex((entry) => entry.enemy.id === selectedEnemyId);
  const selectedEnemy = selectedSlot >= 0 ? frontLineEnemies[selectedSlot]?.enemy ?? null : null;
  const selectedEnemyPosition = selectedEnemy?.position ?? (selectedSlot >= 0 ? ENEMY_FRONT_SPAWN_CELLS[selectedSlot] ?? ENEMY_FRONT_SPAWN_CELLS[0] : null);
  const distanceToSelected = selectedEnemyPosition ? hexDistance(playerPosition, selectedEnemyPosition) : null;
  const preparedAbilityRange = preparedAbility && battle ? (playerAbilityRange(preparedAbility, battle.player) ?? 1) : 1;
  const preparedReachCells = preparedAbility
    ? new Set(boardCells().filter((cell) => hexDistance(playerPosition, cell) <= preparedAbilityRange && (!battle || canUnitSeeCell(battle.player, cell, battle.battlefield))).map(hexKey))
    : new Set<string>();
  const preparedAreaCells = preparedAbility && selectedEnemyPosition
    ? new Set(abilityAreaCells(playerPosition, selectedEnemyPosition, preparedAbility.area, preparedAbilityRange).map(hexKey))
    : new Set<string>();
  const enemyTelegraphCells = new Set(
    frontLineEnemies.flatMap(({ enemy }) => enemy.charging?.affectedCells ?? []).filter((cell) => !battle || visibleCellKeys.has(hexKey(cell))).map(hexKey),
  );
  const targetableEnemyIds = preparedAbility
    ? new Set(frontLineEnemies.filter(({ enemy }, slot) => visibleEnemyIds.has(enemy.id) && hexDistance(playerPosition, enemy.position ?? ENEMY_FRONT_SPAWN_CELLS[slot] ?? ENEMY_FRONT_SPAWN_CELLS[0]) <= preparedAbilityRange).map((entry) => entry.enemy.id))
    : new Set<string>();
  const preparedAbilityInRange = Boolean(preparedAbility && selectedEnemyId && targetableEnemyIds.has(selectedEnemyId));
  const preparedAreaLabel = preparedAbility?.area?.shape === "radius"
    ? `Área raio ${preparedAbility.area.radius ?? 1}`
    : preparedAbility?.area?.shape === "ring"
      ? `Anel ${preparedAbility.area.radius ?? 1}`
      : preparedAbility?.area?.shape === "line"
        ? "Linha"
        : preparedAbility?.area?.shape === "cone"
          ? "Cone"
          : preparedAbility?.area?.shape === "connected"
            ? "Área conectada"
            : preparedAbility?.area?.shape === "all"
              ? "Campo inteiro"
              : "Alvo único";
  const activeChargeCount = frontLineEnemies.filter(({ enemy }) => Boolean(enemy.charging)).length;
  const battleTurnOrder: BattleTurnEntry[] = battle ? (() => {
    const partyHeroes = (battle.party ?? [battle.player]).filter((h) => h.hpCurrent > 0);
    const fallbackOrder = [...partyHeroes.map((h) => h.id), ...frontLineEnemies.map(({ enemy }) => enemy.id)];
    const order = battle.initiativeOrder?.length ? battle.initiativeOrder : fallbackOrder;
    const currentIndex = Math.max(0, battle.initiativeIndex ?? order.indexOf(battle.player.id));
    const rotated = [...order.slice(currentIndex), ...order.slice(0, currentIndex)];
    return rotated.flatMap<BattleTurnEntry>((actorId) => {
      const hero = partyHeroes.find((h) => h.id === actorId);
      if (hero) return [{ id: hero.id, name: hero.name, portraitPath: hero.portraitPath ?? "", side: "player" as const, speed: combatantSpeed(hero) }];
      const enemy = battle.enemies.find((entry) => entry.id === actorId && entry.hpCurrent > 0);
      return enemy ? [{ id: enemy.id, name: enemy.name, portraitPath: enemy.portraitPath ?? "", side: "enemy" as const, speed: combatantSpeed(enemy) }] : [];
    });
  })() : [];
  const battleHint = battleActionMode === "move"
    ? "Modo mover ativo: toque em um hex azul para reposicionar seu card; depois você ainda pode realizar uma ação."
    : preparedAbility
      ? preparedAbilityInRange && selectedEnemy
        ? `${preparedAbility.name} preparado contra ${selectedEnemy.name}. Toque no inimigo ou em “Usar habilidade” para confirmar.`
        : `${preparedAbility.name} preparado. Selecione um inimigo dentro do alcance ${preparedAbilityRange}.`
      : battle?.movementUsed
        ? "Movimento já usado: escolha uma habilidade ou aguarde para encerrar a rodada."
        : "Escolha entre mover, aguardar ou preparar uma habilidade. Toque em um inimigo para definir o alvo.";

  const persist = (character: GameCharacter) =>
    setAccount(repository.update(account, character));
  const open = (character: GameCharacter, next: View = "lobby") => {
    setSelectedId(character.id);
    setBattle(null);
    setView(next);
  };
  const create = () => {
    try {
      const next = repository.create(account, { name, classId, kingdom });
      const newest = next.characters.at(-1)!;
      setAccount(next);
      setSelectedId(newest.id);
      setView("lobby");
      setName("");
      setMessage(`${newest.name} entrou no Lobby de ${newest.kingdom}.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o personagem.",
      );
    }
  };
  const chooseAbility = (slot: LoadoutSlot, abilityId: string) => {
    if (!selected || !abilityId) return;
    try {
      persist(repository.assignAbility(selected, slot, abilityId));
      setMessage("Habilidade salva no preset ativo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Slot inválido.");
    }
  };
  const startJourney = () => {
    if (!selected || selected.vitals.hpCurrent <= 0) {
      setMessage(
        "Seu personagem está sem HP. Descanse na Estalagem antes de caçar.",
      );
      return;
    }
    const plannedRoute = journeyBetween(journeyStartNodeId, journeyNodeId);
    setJourneyOutcome(null);
    setTraveledRoute([plannedRoute[0]]);
    plannedRoute.slice(1).forEach((nodeId, index) => {
      window.setTimeout(
        () => {
          const walked = plannedRoute.slice(0, index + 2);
          setTraveledRoute(walked);
          if (index !== plannedRoute.length - 2) return;
          const eventStop =
            walked[Math.max(0, Math.floor(Math.random() * walked.length))];
          const eventNode =
            fiordevalleJourneyNodes.find((node) => node.id === eventStop) ??
            journeyNode;
          const encounterFound = Math.random() < 0.72;
          const eventFound = Math.random() < 0.62;
          setJourneyOutcome(
            encounterFound
              ? {
                  destinationId: journeyNodeId,
                  kind: "encounter",
                  nodeName: eventNode.name,
                  text: eventFound
                    ? "Um evento revelou uma emboscada na rota. A ameaça está esperando."
                    : "Uma ameaça foi encontrada ao final da rota.",
                }
              : eventFound
                ? {
                    destinationId: journeyNodeId,
                    kind: "event",
                    nodeName: eventNode.name,
                    text: "Um evento foi encontrado no caminho. A rota foi concluída sem combate.",
                  }
                : {
                    destinationId: journeyNodeId,
                    kind: "quiet",
                    nodeName: eventNode.name,
                    text: "Nenhum evento apareceu durante esta travessia.",
                  },
          );
          setJourneyStartNodeId(journeyNodeId);
          setMessage(`Chegada em ${journeyNode.name}.`);
        },
        (index + 1) * 620,
      );
    });
    return;
    const route = fiordevalleJourneyRoutes[journeyNodeId] ?? ["fiordevalle"];
    const intermediateStops = route.slice(1, -1);
    const eventId = intermediateStops.length
      ? intermediateStops[Math.floor(Math.random() * intermediateStops.length)]
      : route.at(-1)!;
    const eventNode =
      fiordevalleJourneyNodes.find((node) => node.id === eventId) ??
      journeyNode;
    const eventFound = Math.random() < 0.5;
    setJourneyOutcome(
      eventFound
        ? {
            destinationId: journeyNodeId,
            kind: "event",
            nodeName: eventNode.name,
            text: "Uma ocorrência interrompeu a rota. A caça continua disponível quando você quiser.",
          }
        : {
            destinationId: journeyNodeId,
            kind: "quiet",
            nodeName: eventNode.name,
            text: "Nenhum evento foi encontrado nesta rota. Você chegou sem interrupções.",
          },
    );
    setMessage(`Rota percorrida: FiorDeValle → ${journeyNode.name}.`);
    return;
    const creature = huntCreatures[0];
    if (!creature) return;
    const creatures =
      region.id === "fiordevalle" ? rollFiordevalleEncounter() : [creature];
    setBattle(repository.beginHunt(account, selected!, region.id, creatures));
    setMessage(`Jornada para ${journeyNode.name}: encontro revelado.`);
  };
  const beginHuntFromJourney = () => {
    if (!selected) return;
    const creature = huntCreatures[0];
    if (!creature) return;
    const creatures =
      region.id === "fiordevalle" ? rollFiordevalleEncounter() : [creature];
    setJourneyOutcome(null);
    setBattle(repository.beginHunt(account, selected, region.id, creatures));
    setMessage(`Ameaça revelada em ${journeyNode.name}.`);
  };
  const switchAdventureCity = (cityId: AdventureCityId) => {
    if (!selected) return;
    const unlock = cityUnlockProgress(cityId, worldProgress.defeatedBossIds);
    if (!unlock.unlocked) {
      setMessage(`${adventureCities[cityId].name} bloqueada: ${unlock.description} Progresso ${unlock.defeated}/${unlock.required}.`);
      return;
    }
    setActiveCityId(cityId);
    setRegionId(cityId);
    setCitySectionId("hub");
    setSelectedExitId(null);
    setSelectedInstanceLevelId(null);
    setAdventureAlert(null);
    setPendingEncounter(null);
    setPendingEncounterSpot(null);
    setMessage(`Você entrou em ${adventureCities[cityId].name}.`);
  };
  const buyEquipmentListing = (item: (typeof equipment)[number], price: number, blackMarket = false) => {
    if (!selected) return;
    try {
      setAccount(repository.buyItem(account, selected, item, price, adventureCity.id, blackMarket));
      setMessage(`${item.name} comprado por ${price} ouro${blackMarket ? " no Mercado Negro" : ""}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível comprar o item.");
    }
  };
  const buyConsumableListing = (consumableId: string, price: number, blackMarket = false) => {
    if (!selected) return;
    try {
      setAccount(repository.buyConsumable(account, selected, consumableId, price, adventureCity.id, blackMarket));
      setMessage(`Consumível comprado por ${price} ouro.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível comprar o consumível.");
    }
  };
  const useConsumable = (consumableId: string) => {
    if (!selected) return;
    try {
      setAccount(repository.useConsumable(account, selected, consumableId));
      setMessage("Consumível usado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível usar o consumível.");
    }
  };
  const sellMaterial = (materialId: string, amount: number, blackMarket = false) => {
    if (!selected) return;
    try {
      setAccount(repository.sellMaterial(account, selected, materialId, amount, blackMarket, adventureCity.id));
      setMessage(`${amount} material vendido${blackMarket ? " por receptação" : ""}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível vender o material.");
    }
  };
  const acceptMission = (questId: string) => {
    if (!selected) return;
    try {
      setAccount(repository.acceptQuest(account, selected, questId));
      setMessage(`Contrato aceito: ${questsById.get(questId)?.title ?? questId}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível aceitar o contrato.");
    }
  };
  const claimMission = (questId: string) => {
    if (!selected) return;
    try {
      setAccount(repository.claimQuest(account, selected, questId));
      setMessage(`Contrato concluído: ${questsById.get(questId)?.title ?? questId}. Recompensas recebidas.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "O contrato ainda não pode ser entregue.");
    }
  };
  const goToMissionLevel = (questId: string) => {
    const quest = questsById.get(questId);
    if (!quest || !selected) return;
    const city = adventureCities[quest.cityId];
    if (!isCityUnlocked(city.id, worldProgress.defeatedBossIds)) {
      const unlock = cityUnlockProgress(city.id, worldProgress.defeatedBossIds);
      setMessage(`${city.name} ainda está bloqueada: ${unlock.description}`);
      return;
    }
    const destinationLevelId = questDestinationLevelId(quest);
    if (!destinationLevelId) {
      setMessage("Esse contrato não possui uma rota explorável direta.");
      return;
    }
    const found = findAdventureLevel(city, destinationLevelId);
    if (!found) return;
    setActiveCityId(city.id);
    setRegionId(city.id);
    setCitySectionId("portoes");
    setSelectedExitId(found.exit.id);
    if (!isAdventureLevelUnlocked(city, destinationLevelId, worldProgress.exploredSpotsByLevel)) {
      setSelectedInstanceLevelId(null);
      setMessage(`A rota de ${quest.title} está bloqueada. Conclua a instância anterior dessa saída.`);
      return;
    }
    setSelectedInstanceLevelId(destinationLevelId);
    setAdventureAlert(null);
    setPendingEncounter(null);
    setPendingEncounterSpot(null);
    setMessage(`Rota do contrato aberta: ${quest.title}.`);
  };
  const openCitySection = (sectionId: string) => {
    setCitySectionId(sectionId);
    setAdventureAlert(null);
    if (sectionId !== "portoes") {
      setSelectedExitId(null);
      setSelectedInstanceLevelId(null);
      setPendingEncounter(null);
      setPendingEncounterSpot(null);
    }
  };
  const openExit = (exitId: string) => {
    setCitySectionId("portoes");
    setSelectedExitId(exitId);
    setSelectedInstanceLevelId(null);
    setAdventureAlert(null);
    setPendingEncounter(null);
    setPendingEncounterSpot(null);
  };
  const openInstanceLevel = (levelId: string) => {
    if (!isAdventureLevelUnlocked(adventureCity, levelId, exploredSpotsByLevel)) {
      const found = findAdventureLevel(adventureCity, levelId);
      const previous = found && found.index > 0 ? found.exit.levels[found.index - 1] : null;
      setMessage(previous ? `Conclua ${previous.name} para liberar este nível.` : "Esta instância ainda está bloqueada.");
      return;
    }
    setSelectedInstanceLevelId(levelId);
    setAdventureAlert(null);
    setPendingEncounter(null);
    setPendingEncounterSpot(null);
  };
  const exploreSpot = (spotId: string, spotName: string) => {
    if (!selected || !activeExit || !activeLevel) return;
    if (adventureAlert || pendingEncounterSpot) {
      setMessage("Resolva o encontro atual antes de explorar outro ponto.");
      return;
    }
    const roll = Math.random();
    const eventText = activeLevel.eventPool[Math.floor(Math.random() * activeLevel.eventPool.length)] ?? `${spotName} permanece em silêncio.`;
    if (roll < 0.62) {
      const creatures = createInstanceEncounter(activeLevel.creaturePool, selected.level);
      setPendingEncounter(creatures);
      setPendingEncounterSpot({ levelId: activeLevel.id, spotId, spotName });
      setAdventureAlert({
        kind: "encounter",
        title: `${spotName} · ameaça detectada`,
        text: `Uma ameaça desconhecida surgiu em ${activeLevel.name}. Entre em combate para descobrir quem está à sua frente. O spot só será concluído se você vencer.`,
        actionLabel: "Entrar em combate",
      });
      setMessage(`Encontro encontrado em ${activeLevel.name}.`);
      window.setTimeout(() => document.querySelector<HTMLElement>(".journey-outcome-panel.inline")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
      return;
    }
    setAccount(repository.recordSpot(account, selected, activeLevel.id, spotId));
    setPendingEncounterSpot(null);
    if (roll < 0.87) {
      setPendingEncounter(null);
      setAdventureAlert({
        kind: "event",
        title: `${spotName} · evento`,
        text: eventText,
        actionLabel: "Continuar exploração",
      });
      setMessage(`Evento encontrado em ${activeLevel.name}.`);
      window.setTimeout(() => document.querySelector<HTMLElement>(".journey-outcome-panel.inline")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
      return;
    }
    setPendingEncounter(null);
    setAdventureAlert({
      kind: "quiet",
      title: `${spotName} · sem contato`,
      text: `Nada atacou você neste ponto. ${eventText}`,
      actionLabel: "Continuar exploração",
    });
    setMessage(`Spot explorado em ${activeLevel.name} sem combate.`);
    window.setTimeout(() => document.querySelector<HTMLElement>(".journey-outcome-panel.inline")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  };
  const consumeAdventureAction = () => {
    if (adventureAlert?.kind === "encounter" && pendingEncounter && selected) {
      const discoveredAccount = repository.discoverCreatures(account, selected, pendingEncounter.map((entry) => entry.id));
      const discoveredCharacter = discoveredAccount.characters.find((entry) => entry.id === selected.id) ?? selected;
      setAccount(discoveredAccount);
      setBattle(repository.beginHunt(discoveredAccount, discoveredCharacter, activeCityId, pendingEncounter));
      setAdventureAlert(null);
      setPendingEncounter(null);
      return;
    }
    setAdventureAlert(null);
    setPendingEncounterSpot(null);
  };
  const returnFromAdventureScreen = () => {
    setAdventureAlert(null);
    setPendingEncounter(null);
    setPendingEncounterSpot(null);
    if (selectedInstanceLevelId) return setSelectedInstanceLevelId(null);
    if (selectedExitId) return setSelectedExitId(null);
    setCitySectionId("hub");
  };
  const applyBattleUpdate = (next: HuntBattleState, activeMessage: string) => {
    setBattle(next);
    setBattleActionMode("idle");
    setPreparedAbilityId(null);
    if (next.status !== "active") {
      let settled = repository.settleHunt(account, selected!, next);
      if (next.status === "victory" && pendingEncounterSpot) {
        const settledCharacter = settled.characters.find((entry) => entry.id === selected!.id);
        if (settledCharacter) settled = repository.recordSpot(settled, settledCharacter, pendingEncounterSpot.levelId, pendingEncounterSpot.spotId);
      }
      setAccount(settled);
      setPendingEncounterSpot(null);
      setMessage(
        next.status === "victory"
          ? "Vitória registrada: XP, ouro e o spot da instância foram concluídos."
          : "Derrota registrada: o spot não foi consumido e poderá ser tentado novamente após a cura.",
      );
    } else {
      setMessage(activeMessage);
    }
  };
  const executeAbility = (ability: AbilityDefinition, forcedTargetId?: string) => {
    if (!battle || !selected) return;
    const currentHero = activeBattleHero ?? battle.player;
    const cooldown = currentHero.abilityCooldowns?.[ability.id] ?? battle.cooldowns[ability.id] ?? 0;
    if (cooldown > 0) {
      setMessage(`${ability.name} estará disponível em ${cooldown} turno(s).`);
      return;
    }
    if (ability.isUltimate) {
      const required = currentHero.ultimateRequiredCharge ?? ability.requiredChargeTurns ?? 4;
      const current = currentHero.ultimateCurrentCharge ?? 0;
      if (current < required) {
        setMessage(`Ultimate ${ability.name} ainda carregando (${current}/${required} turnos).`);
        return;
      }
    }
    const frontLine = activeFrontLine(battle.enemies);
    const target = frontLine.find((enemy) => enemy.id === forcedTargetId) ?? frontLine.find((enemy) => enemy.id === selectedEnemyId) ?? frontLine[0];
    if (!target) {
      setMessage("Nenhum alvo disponível.");
      return;
    }
    if (target.id !== selectedEnemyId) setSelectedEnemyId(target.id);
    const targetPosition = target.position ?? ENEMY_FRONT_SPAWN_CELLS[0];
    const visualArea = new Set(abilityAreaCells(currentHero.position ?? PLAYER_START_CELL, targetPosition, ability.area, playerAbilityRange(ability, currentHero) ?? 1).map(hexKey));
    const visualTargetIds = frontLine.filter((enemy) => enemy.position && visualArea.has(hexKey(enemy.position))).map((enemy) => enemy.id);
    const next = resolveHuntTurn(battle, ability, target.id);
    if (target) {
      setBattleEffect({
        kind: ability.damageFamily === "magical" ? "magical" : "physical",
        targetIds: visualTargetIds.length ? visualTargetIds : [target.id],
      });
      setCastEffect({ classId: selected.classId });
      window.setTimeout(() => setCastEffect(null), 560);
      window.setTimeout(() => {
        if (next.player.hpCurrent < battle.player.hpCurrent) setBattleEffect({ kind: "physical", targetId: battle.player.id });
      }, 330);
      window.setTimeout(() => setBattleEffect(null), 1120);
    }
    applyBattleUpdate(next, `${currentHero.name} usa ${ability.name}.`);
  };
  const prepareAbility = (ability: AbilityDefinition) => {
    if (!battle) return;
    const currentHero = activeBattleHero ?? battle.player;
    const cooldown = currentHero.abilityCooldowns?.[ability.id] ?? battle.cooldowns[ability.id] ?? 0;
    if (cooldown > 0) {
      setMessage(`${ability.name} em recarga por mais ${cooldown} turno(s).`);
      return;
    }
    if (ability.isUltimate) {
      const required = currentHero.ultimateRequiredCharge ?? ability.requiredChargeTurns ?? 4;
      const current = currentHero.ultimateCurrentCharge ?? 0;
      if (current < required) {
        setMessage(`Ultimate ${ability.name} ainda carregando (${current}/${required} turnos).`);
        return;
      }
    }
    setBattleActionMode("skill");
    setMessage(`Habilidade preparada: ${ability.name}. ${selectedEnemy ? `Alvo atual: ${selectedEnemy.name}.` : "Escolha um alvo."}`);
  };
  const beginMoveMode = () => {
    if (!battle) return;
    if (battle.movementUsed) {
      setMessage(`${summary!.name} já usou o movimento desta rodada, mas ainda pode usar uma habilidade.`);
      return;
    }
    setPreparedAbilityId(null);
    setBattleActionMode((current) => {
      const nextMode = current === "move" ? "idle" : "move";
      setMessage(nextMode === "move" ? `Modo mover ativo para ${summary!.name}.` : "Modo mover cancelado.");
      return nextMode;
    });
  };
  const cancelBattleMode = () => {
    setBattleActionMode("idle");
    setPreparedAbilityId(null);
    setMessage("Ação preparada cancelada.");
  };
  const moveTo = (cell: Axial) => {
    if (!battle || !selected) return;
    const next = resolveMoveTurn(battle, cell);
    applyBattleUpdate(next, `${summary!.name} se move pelo campo hexagonal.`);
  };
  const waitTurn = () => {
    if (!battle || !selected) return;
    const next = resolveWaitTurn(battle);
    applyBattleUpdate(next, `${summary!.name} aguarda e passa a rodada.`);
  };
  const handleEnemyInteraction = (enemyId: string, enemyName: string, immediateCast = false) => {
    setSelectedEnemyId(enemyId);
    if ((battleActionMode === "skill" || immediateCast) && preparedAbility) {
      if (!targetableEnemyIds.has(enemyId)) {
        setMessage(`${preparedAbility.name} está fora de alcance para ${enemyName}.`);
        return;
      }
      executeAbility(preparedAbility, enemyId);
      return;
    }
    setMessage(`${enemyName} selecionado como alvo.${preparedAbility ? ` ${preparedAbility.name} está preparado.` : ""}`);
  };
  const applyDevLevel = () => {
    if (!selected) return;
    const parsed = Number(devLevelInput);
    if (!Number.isFinite(parsed)) return;
    setAccount(repository.setCharacterLevel(account, selected, parsed));
    setMessage(`Nível de ${selected.name} definido para ${Math.max(0, Math.round(parsed))}.`);
  };
  const forceDevEncounter = () => {
    if (!selected || !devCreatureId) return;
    const creature = bestiaryCreatureForHunt(devCreatureId);
    const creatures = Array.from({ length: devCreatureCount }, () => creature);
    setBattle(repository.beginHunt(account, selected, activeCityId, creatures));
    setPendingEncounterSpot(null);
    setAdventureAlert(null);
    setPendingEncounter(null);
    setView("hunt");
    setMessage(`Combate forçado: ${devCreatureCount}x ${creature.name}.`);
  };
  const toggleMusic = () => {
    if (musicEnabled) {
      musicDirector.stop();
      setMusicEnabled(false);
      return;
    }
    setMusicEnabled(true);
    void musicDirector.setMode(musicMode);
  };

  if (authLoading) return <main className="login-shell"><section className="login-card"><span className="brand">RUPTERYA</span><p>Carregando conta...</p></section></main>;
  if (!authUserId) return <LoginScreen onLoggedIn={() => void loadAuthenticatedAccount()} />;

  if (!selected || view === "slots")
    return (
      <main className="shell">
        <button className="account-logout" onClick={() => void logout()}>Sair</button>
        <header className="topbar">
          <div>
            <span className="brand">RUPTERYA</span>
            <small>Browser prototype · Caça V0</small>
          </div>
          <strong>{account.characters.length}/{account.characterSlots} personagens</strong>
        </header>
        <section className="panel intro">
          <span className="eyebrow">SLOTS DE PERSONAGEM · DEV</span>
          <h1>Escolha seu aventureiro</h1>
          <p>
            Os cinco arquétipos usam retratos e cartas próprias. Cada
            personagem evolui sozinho, a partir do Nv. 0.
          </p>
        </section>
        <section className="slot-grid">
          {Array.from({ length: account.characterSlots }, (_, index) => {
            const character = account.characters[index];
            const definition =
              character &&
              classes.find((entry) => entry.id === character.classId);
            return character && definition ? (
              <button
                className="slot-card occupied portrait-slot"
                onClick={() => open(character)}
                key={character.id}
              >
                <img src={definition.portraitPath} alt="" />
                <span>Nv. {character.level}</span>
                <strong>{character.name}</strong>
                <small>
                  {definition.name} · {character.kingdom}
                </small>
              </button>
            ) : (
              <div className="slot-card" key={index}>
                <span>SLOT {index + 1}</span>
                <strong>Livre</strong>
                <small>Disponível no modo DEV</small>
              </div>
            );
          })}
        </section>
        {account.characters.length < account.characterSlots && (
          <section className="panel form-panel">
            <div className="section-title">
              <span>Novo personagem</span>
              <span className="badge">DEV</span>
            </div>
            <label>
              Nome
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Eldrin"
                maxLength={24}
              />
            </label>
            <span className="field-label">Classe e retrato</span>
            <div className="class-picker">
              {classes.map((entry) => (
                <button
                  type="button"
                  className={`class-option ${classId === entry.id ? "selected" : ""}`}
                  onClick={() => setClassId(entry.id)}
                  key={entry.id}
                >
                  <img src={entry.portraitPath} alt="" />
                  <strong>{entry.name}</strong>
                  <small>{entry.role}</small>
                </button>
              ))}
            </div>
            <label>
              Reino que defende
              <select
                value={kingdom}
                onChange={(event) => setKingdom(event.target.value)}
              >
                {kingdoms.map((entry) => (
                  <option key={entry}>{entry}</option>
                ))}
              </select>
            </label>
            <button className="primary" onClick={create}>
              Criar personagem
            </button>
          </section>
        )}
        {battle && view === "hunt" && (
          <BattleCooldownPanel
            battle={battle}
            abilities={[...battleAbilities]}
          />
        )}
        {battle && view === "hunt" && selected && (
          <BattleLoadout character={selected} />
        )}
        <MusicToggle enabled={musicEnabled} onToggle={toggleMusic} />
        <p className="notice">{message}</p>
      </main>
    );

  return (
    <main className="shell">
      <button className="account-logout" onClick={() => void logout()}>Sair</button>
      {!(view === "hunt" && battle) && (
        <header className="topbar">
          <button
            className="back"
            onClick={() => {
              setBattle(null);
              setSelectedEnemyId(null);
              setView("slots");
            }}
          >
            Slots
          </button>
          <div>
            <span className="brand">RUPTERYA</span>
            <small>
              Nv. {summary!.level} · XP {selected.xp}/{xpToNextLevel(selected.level)}
            </small>
          </div>
          <span className="badge">
            Poder {summary!.power.toLocaleString("pt-BR")}
          </span>
        </header>
      )}
      {view === "lobby" && (
        <>
          <section className="hero-card">
            <img
              className="hero-portrait"
              src={summary!.portraitPath}
              alt={`Retrato de ${summary!.className}`}
            />
            <div>
              <span className="eyebrow">LOBBY · {summary!.kingdom}</span>
              <h1>{summary!.name}</h1>
              <p>
                {summary!.className} · {summary!.classRole} · Nv.{" "}
                {summary!.level}
              </p>
              <div className="vitals">
                <span>
                  HP{" "}
                  <b>
                    {summary!.hpCurrent}/{summary!.hpMax}
                  </b>
                </span>
                <span>
                  MP{" "}
                  <b>
                    {summary!.mpCurrent}/{summary!.mpMax}
                  </b>
                </span>
                <span>
                  Moral <b>{summary!.morale}</b>
                </span>
                <span>
                  Ouro <b>{summary!.gold}</b>
                </span>
              </div>
            </div>
          </section>
          <section className="action-grid">
            {(
              [
                [
                  "hunt",
                  "Cidade & Mundo",
                  "Entre na cidade, use Mercado, Mural, Black Market e Portões para acessar instâncias por nível.",
                ],
                ["profile", "Perfil", "Ficha, combate e atributos de Jornada."],
                [
                  "equipment",
                  "Equipamentos",
                  "Equipe itens e recalcule Poder.",
                ],
                [
                  "abilities",
                  "Habilidades",
                  "Configure os sete slots do preset.",
                ],
                ["presets", "Presets", "Crie, renomeie e alterne builds."],
              ] as const
            ).map(([key, title, description]) => (
              <button
                className="action-card"
                onClick={() => setView(key)}
                key={key}
              >
                <strong>{title}</strong>
                <small>{description}</small>
              </button>
            ))}
          </section>
          <section className="panel">
            <div className="section-title">
              <span>Preset ativo: {preset!.name}</span>
              <button onClick={() => setView("presets")}>Alterar</button>
            </div>
            <p className="rule-copy">
              Sem Energia. Vida não regenera sozinha. A Caça solo resolve
              encontros de 1×1 a 1×3; o tabuleiro 3×3 é reservado ao co-op.
            </p>
          </section>
        </>
      )}
      {view === "city" && (
        <section className="city-view">
          <section className="panel city-banner">
            <span className="eyebrow">CIDADE DE FIORDEVALLE</span>
            <h1>Servicos da Cidade</h1>
            <p>A cidade sera o ponto para descanso, melhorias e gastos de ouro.</p>
          </section>
          <section className="inn-card city-inn-card">
            <div>
              <span>ESTALAGEM · NIVEL 1</span>
              <strong>Descanso Completo</strong>
              <small>Restaura todo HP e MP. Custo de ouro sera adicionado no balanceamento.</small>
            </div>
            <button
              className="primary"
              onClick={() => {
                persist(repository.restAtInn(selected));
                setMessage("A Estalagem restaurou todo HP e MP.");
              }}
            >
              Descansar
            </button>
          </section>
          <section className="panel city-levels">
            <span>PROGRESSAO DA ESTALAGEM</span>
            <div><b>Nivel 1</b><i className="active" /></div>
            <div><b>Nivel 2</b><i /></div>
            <div><b>Nivel 3</b><i /></div>
          </section>
        </section>
      )}
      {view === "profile" && (
        <section className="panel">
          <div className="section-title">
            <span>Perfil e Ficha</span>
            <button onClick={() => setView("lobby")}>Lobby</button>
          </div>
          <div className="profile-name">
            <h1>{summary!.name}</h1>
            <p>
              {summary!.className} · {summary!.classRole} · {summary!.kingdom} ·
              Conta Nv. {summary!.level}
            </p>
          </div>
          <div className="profile-tabs">
            <button className={profileTab === "stats" ? "selected" : ""} onClick={() => setProfileTab("stats")}>Atributos</button>
            <button className={profileTab === "appearance" ? "selected" : ""} onClick={() => setProfileTab("appearance")}>Aparência & Skins</button>
          </div>
          {profileTab === "stats" && <div className="stats-grid">
            {Object.entries({
              "Dano físico": summary!.stats.physicalDamage,
              "Dano mágico": summary!.stats.magicalDamage,
              "Defesa física": summary!.stats.physicalDefense,
              "Defesa mágica": summary!.stats.magicalDefense,
              Crítico: `${summary!.stats.criticalChance}%`,
              Esquiva: `${summary!.stats.dodgeChance}%`,
              "Sangramento causado": `${summary!.stats.bleedChance}%`,
              "Queimadura causada": `${summary!.stats.burnChance}%`,
              "Veneno causado": `${summary!.stats.poisonChance}%`,
              "Cegueira causada": `${summary!.stats.blindChance}%`,
              "Resist. sangramento": `${summary!.stats.bleedResistance}%`,
              "Resist. queimadura": `${summary!.stats.burnResistance}%`,
              "Resist. veneno": `${summary!.stats.poisonResistance}%`,
              "Resist. cegueira": `${summary!.stats.blindResistance}%`,
              ...(summary!.counterAttackChance > 0 ? {
                "Chance de contra-ataque": `${summary!.counterAttackChance}%`,
                "Escala do contra-ataque": `${Math.round(summary!.counterAttackScaling * 100)}% do Dano Físico`,
              } : {}),
              Percepção: summary!.adventure.perception,
              Conhecimento: summary!.adventure.knowledge,
              Força: summary!.adventure.strength,
              Agilidade: summary!.adventure.agility,
            }).map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>}
          {profileTab === "appearance" && (
            <section className="appearance-panel">
              <div className="section-title"><span>Skins de {summary!.className}</span><small>Cosmético · não altera Poder</small></div>
              <div className="skin-grid">
                <button className={`skin-card ${selected.skinId === "default" ? "selected" : ""}`} onClick={() => persist(repository.setSkin(selected, "default"))}>
                  <img src={classes.find((entry) => entry.id === selected.classId)?.portraitPath} alt="Visual padrão" />
                  <span>PADRÃO</span><strong>Visual clássico</strong><small>{selected.skinId === "default" ? "Equipada" : "Equipar"}</small>
                </button>
                {premiumSkins.filter((skin) => skin.classId === selected.classId).map((skin) => (
                  <button className={`skin-card premium ${selected.skinId === skin.id ? "selected" : ""}`} key={skin.id} onClick={() => persist(repository.setSkin(selected, skin.id))}>
                    <img src={skin.image} alt={skin.name} />
                    <span>PREMIUM</span><strong>{skin.name}</strong><small>{selected.skinId === skin.id ? "Equipada" : "Equipar skin"}</small>
                  </button>
                ))}
              </div>
            </section>
          )}
        </section>
      )}
      {view === "equipment" && (
        <section className="panel">
          <div className="section-title">
            <span>Equipamentos V0</span>
            <button onClick={() => setView("lobby")}>Lobby</button>
          </div>
          <p className="rule-copy">
            Clique em um item para equipar ou desequipar. Poder e atributos são
            calculados no game-core.
          </p>
          <div className="equipment-grid">
            {equipment.filter((item) => selected.inventoryItemIds.includes(item.id)).map((item) => {
              const active = selected.equipment[item.slot] === item.id;
              return (
                <button
                  className={`item-card ${active ? "selected" : ""}`}
                  key={item.id}
                  onClick={() => {
                    try {
                      persist(repository.equip(selected, item));
                      setMessage(`${active ? "Desequipado" : "Equipado"}: ${item.name}.`);
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : "Não foi possível equipar este item.");
                    }
                  }}
                >
                  <small>
                    {slotLabels[item.slot]} · {item.rarity}
                  </small>
                  <strong>{item.name}</strong>
                  {item.affixes && item.affixes.length > 0 && (
                    <div className="item-affixes">
                      {item.affixes.map((affix) => <span key={affix}>{affix}</span>)}
                    </div>
                  )}
                  {item.keywords?.map((keyword) => <em className="item-keyword" key={keyword}>{keyword}</em>)}
                  <span>Poder +{item.power}</span>
                </button>
              );
            })}
          </div>
          <p className="notice">{message}</p>
        </section>
      )}
      {view === "abilities" && (
        <section className="panel">
          <div className="section-title">
            <span>Habilidades · 7 slots fixos</span>
            <button onClick={() => setView("lobby")}>Lobby</button>
          </div>
          <p className="rule-copy">
            Você começa com uma técnica básica e libera outra habilidade de classe a cada 4 níveis
            (Nv. 4, 8, 12, 16, 20 e 24). Uma passiva de classe, linhagem ou escola ocupa o mesmo único slot de Passiva.
          </p>
          <p className="notice">Habilidades de classe liberadas: {selected.ownedAbilityIds.filter((abilityId) => abilityId.startsWith(`${selected.classId}-`)).length}/7{selected.level < 24 ? ` · Próxima no Nv. ${Math.max(4, (Math.floor(selected.level / 4) + 1) * 4)}` : " · Todas liberadas"}</p>
          <div className="loadout-grid">
            {LOADOUT_SLOTS.map((slot) => (
              <label className="loadout-slot" key={slot.key}>
                <span>{slot.label}</span>
                <select
                  value={preset!.loadout[slot.key] ?? ""}
                  onChange={(event) =>
                    chooseAbility(slot.key, event.target.value)
                  }
                >
                  <option value="">Selecionar {slot.kind}</option>
                  {ownedAbilities
                    .filter((ability) => ability.slotKind === slot.kind)
                    .map((ability) => (
                      <option key={ability.id} value={ability.id}>
                        {ability.name} · {ability.source}
                      </option>
                    ))}
                </select>
                <small>
                  {preset!.loadout[slot.key]
                    ? ownedAbilities.find(
                        (ability) => ability.id === preset!.loadout[slot.key],
                      )?.description
                    : "Vazio"}
                </small>
              </label>
            ))}
          </div>
          <section className="subpanel">
            <strong>Fontes de build</strong>
            <div className="inline-actions">
              <button
                className={selected.lineageId ? "selected" : ""}
                onClick={() =>
                  persist(
                    repository.setLineage(
                      selected,
                      selected.lineageId ? null : "vampire",
                    ),
                  )
                }
              >
                Linhagem: {selected.lineageId ? "Vampiro" : "Nenhuma"}
              </button>
              <button
                className={selected.schoolId ? "selected" : ""}
                onClick={() =>
                  persist(
                    repository.setSchool(
                      selected,
                      selected.schoolId ? null : "fire",
                    ),
                  )
                }
              >
                Escola: {selected.schoolId ? "Fogo" : "Nenhuma"}
              </button>
            </div>
            <small>Linhagem máxima: uma. Skins agora ficam em Perfil → Aparência & Skins.</small>
          </section>
        </section>
      )}
      {view === "presets" && (
        <section className="panel">
          <div className="section-title">
            <span>Presets</span>
            <button onClick={() => setView("lobby")}>Lobby</button>
          </div>
          <p className="rule-copy">
            A troca é permitida fora de atividades. Cada preset armazena
            equipamentos e sete slots.
          </p>
          <div className="preset-list">
            {selected.presets.map((entry) => (
              <div
                className={`preset-row ${entry.id === selected.activePresetId ? "active" : ""}`}
                key={entry.id}
              >
                <input
                  defaultValue={entry.name}
                  onBlur={(event) =>
                    persist(
                      repository.renamePreset(
                        selected,
                        entry.id,
                        event.target.value,
                      ),
                    )
                  }
                />
                <button
                  onClick={() =>
                    persist(repository.activatePreset(selected, entry.id))
                  }
                >
                  {entry.id === selected.activePresetId ? "Ativo" : "Ativar"}
                </button>
              </div>
            ))}
          </div>
          <div className="create-preset">
            <input
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder="Nome do novo preset"
            />
            <button
              className="primary"
              onClick={() => {
                persist(repository.addPreset(selected, presetName));
                setPresetName("");
              }}
            >
              Criar preset
            </button>
          </div>
        </section>
      )}
      {view === "bestiary" && (
        <section className="panel">
          <div className="section-title">
            <span>Bestiário</span>
            <button onClick={() => setView("lobby")}>Lobby</button>
          </div>
          <p className="rule-copy">
            Cada criatura que você encontra em combate é registrada aqui, agrupada pela instância onde vive. Abates continuam contando mesmo depois da revelação.
          </p>
          <div className="bestiary-overview">
            <span>{bestiaryDiscoveredCount}/{bestiaryTotalSpecies} espécies descobertas</span>
            <span>{bestiaryTotalKills} abates totais</span>
          </div>
          {bestiaryChapters.length === 0 && (
            <p className="rule-copy">Nenhuma criatura descoberta ainda. Explore as instâncias nos Portões de cada cidade para começar o registro.</p>
          )}
          {bestiaryChapters.map(({ city, exits }) => (
            <section className="subpanel bestiary-city" key={city.id}>
              <div className="section-title"><span>{city.name}</span><small>{city.kingdom}</small></div>
              {exits.map(({ exit, levels }) => (
                <div className="bestiary-exit" key={exit.id}>
                  <strong>{exit.icon} {exit.name}</strong>
                  {levels.map(({ level, creatures }) => {
                    const discoveredHere = creatures.filter((creature) => worldProgress.discoveredCreatureIds.includes(creature.id)).length;
                    return (
                      <div className="bestiary-level" key={level.id}>
                        <div className="encounter-gallery-title">
                          <strong>{level.name}</strong>
                          <small>Instância · Nível {level.level} · {discoveredHere}/{creatures.length} descobertos</small>
                        </div>
                        <div className="encounter-creature-gallery">
                          {creatures.map((creature) => {
                            const discovered = worldProgress.discoveredCreatureIds.includes(creature.id);
                            const kills = worldProgress.creatureKills[creature.id] ?? 0;
                            const mastered = discovered && kills >= creature.codexKills;
                            return (
                              <button
                                key={creature.id}
                                disabled={!discovered}
                                className={`${inspectedBestiaryCreatureId === creature.id ? "selected" : ""} ${!discovered ? "unknown" : ""} ${mastered ? "mastered" : ""}`}
                                onClick={() => discovered && setInspectedBestiaryCreatureId(creature.id)}
                              >
                                <div className={discovered ? creatureFrameClassName(creature.family, creature.rarity) : "creature-family-frame frame-unknown"}>
                                  {discovered ? (creature.portraitPath ? <img src={creature.portraitPath} alt={creature.name} /> : <div className="unknown-creature-art">✦</div>) : <div className="unknown-creature-art">?</div>}
                                  {discovered && <CreatureFrameOverlay family={creature.family} rarity={creature.rarity} />}
                                </div>
                                <span>{discovered ? creature.name : "Desconhecido"}</span>
                                <small>{discovered ? `${kills}/${creature.codexKills} abates${mastered ? " · Dominado" : ""}` : "Encontre para revelar"}</small>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </section>
          ))}
          {(() => {
            const inspected = inspectedBestiaryCreatureId ? bestiaryById.get(inspectedBestiaryCreatureId) ?? null : null;
            if (!inspected) return null;
            const inspectedKills = worldProgress.creatureKills[inspected.id] ?? 0;
            const inspectedMastered = inspectedKills >= inspected.codexKills;
            return (
              <article className="instance-creature-preview">
                <div className={`instance-creature-portrait ${creatureFrameClassName(inspected.family, inspected.rarity)}`}>
                  {inspected.portraitPath ? <img src={inspected.portraitPath} alt={inspected.name} /> : <div className="unknown-creature-art">✦</div>}
                  <CreatureFrameOverlay family={inspected.family} rarity={inspected.rarity} />
                </div>
                <div className="instance-creature-info">
                  <small>{creatureRarityLabels[resolveCreatureRarity(inspected.rarity)]} · Nv. {inspected.level} · {inspectedKills}/{inspected.codexKills} abates{inspectedMastered ? " · Dominado (+10% dano)" : ""}</small>
                  <strong>{inspected.name}</strong>
                  <p>{inspected.description}</p>
                  <span>HP {inspected.stats.hpMax} · ATQ {Math.max(inspected.stats.physicalDamage, inspected.stats.magicalDamage)} · DEF {inspected.stats.physicalDefense}/{inspected.stats.magicalDefense}</span>
                </div>
              </article>
            );
          })()}
        </section>
      )}
      {view === "dev" && (
        <section className="panel">
          <div className="section-title">
            <span>Painel Dev</span>
            <button onClick={() => setView("lobby")}>Lobby</button>
          </div>
          <p className="rule-copy">
            Ferramentas de teste desta conta DEV. Não existem num jogo publicado — servem só pra pular direto pro estado que você quer testar.
          </p>
          <section className="subpanel">
            <strong>Nível de {selected.name}</strong>
            <p className="rule-copy">Atual: Nv. {selected.level} · XP {selected.xp}/{xpToNextLevel(selected.level)}</p>
            <div className="inline-actions">
              <input
                type="number"
                min={0}
                max={60}
                value={devLevelInput}
                onChange={(event) => setDevLevelInput(event.target.value)}
                style={{ maxWidth: 90 }}
              />
              <button className="primary" onClick={applyDevLevel}>Definir nível</button>
            </div>
          </section>
          <section className="subpanel">
            <strong>Forçar encontro</strong>
            <p className="rule-copy">Inicia uma batalha direto contra a criatura escolhida, sem precisar navegar até a instância.</p>
            <div className="inline-actions">
              <select value={devCreatureId} onChange={(event) => setDevCreatureId(event.target.value)}>
                <option value="">Selecionar criatura</option>
                {[...bestiaryById.values()]
                  .sort((a, b) => a.level - b.level)
                  .map((creature) => (
                    <option key={creature.id} value={creature.id}>
                      Nv.{creature.level} · {creature.name} · {creature.archetype} · {creature.rarity}
                    </option>
                  ))}
              </select>
              <select value={devCreatureCount} onChange={(event) => setDevCreatureCount(Number(event.target.value))}>
                {Array.from({ length: MAX_ENCOUNTER_SIZE }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>{count}x</option>
                ))}
              </select>
              <button className="primary" disabled={!devCreatureId || !selected} onClick={forceDevEncounter}>
                Iniciar combate
              </button>
            </div>
          </section>
        </section>
      )}
      {view === "hexlab" && (
        <section className="panel">
          <div className="section-title">
            <span>Laboratório Hex (experimental)</span>
            <button onClick={() => setView("lobby")}>Lobby</button>
          </div>
          <HexBattlePrototype />
        </section>
      )}
      {view === "companionslab" && (
        <section className="panel">
          <div className="section-title">
            <span>Laboratório de Companions (experimental)</span>
            <button onClick={() => setView("lobby")}>Lobby</button>
          </div>
          <CompanionsLab />
        </section>
      )}
      {view === "hunt" && (
        <section className="hunt-view">
          {!battle ? (
            <>
              <section className="journey-panel city-adventure-panel">
                <div className="section-title">
                  <span>{adventureCity.name}</span>
                  <button onClick={() => setView("lobby")}>Lobby</button>
                </div>

                {citySectionId === "hub" && <CityHub
                  city={adventureCity}
                  selectedSectionId={citySectionId}
                  defeatedBossIds={worldProgress.defeatedBossIds}
                  activeQuestCount={worldProgress.activeQuestIds.length}
                  onSwitchCity={switchAdventureCity}
                  onSelectSection={openCitySection}
                />}

                {citySectionId !== "hub" && <section className="subpanel adventure-detail-card">
                  <div className="section-title">
                    <button onClick={returnFromAdventureScreen}>← Voltar</button>
                    <span>{selectedInstanceLevelId ? activeLevel?.name : selectedExitId ? activeExit?.name : selectedCitySection.name}</span>
                    <span className="city-wallet">Ouro: {selected.vitals.gold}</span>
                  </div>
                  {!selectedExitId && !selectedInstanceLevelId && <p>{selectedCitySection.detail}</p>}

                  {selectedCitySection.id === "centro" && (
                    <div className="city-service-actions">
                      <button
                        className="primary"
                        onClick={() => {
                          try {
                            const cost = innCost(adventureCity.id, selected.level);
                            persist(repository.restAtInn(selected, cost));
                            setMessage(`${adventureCity.name}: descanso completo por ${cost} ouro.`);
                          } catch (error) {
                            setMessage(error instanceof Error ? error.message : "Não foi possível descansar.");
                          }
                        }}
                      >
                        Descansar · {innCost(adventureCity.id, selected.level)} ouro
                      </button>
                      <button onClick={() => setView("profile")}>Ver ficha do personagem</button>
                    </div>
                  )}

                  {selectedCitySection.id === "mercado" && (
                    <MarketPanels
                      cityId={adventureCity.id}
                      blackMarket={false}
                      listings={normalMarketListings}
                      equipment={equipment}
                      ownedItemIds={selected.inventoryItemIds}
                      gold={selected.vitals.gold}
                      progress={worldProgress}
                      onBuyEquipment={buyEquipmentListing}
                      onBuyConsumable={buyConsumableListing}
                      onUseConsumable={useConsumable}
                      onSellMaterial={sellMaterial}
                    />
                  )}

                  {selectedCitySection.id === "black-market" && (
                    <MarketPanels
                      cityId={adventureCity.id}
                      blackMarket
                      listings={blackMarketListings}
                      equipment={equipment}
                      ownedItemIds={selected.inventoryItemIds}
                      gold={selected.vitals.gold}
                      progress={worldProgress}
                      onBuyEquipment={buyEquipmentListing}
                      onBuyConsumable={buyConsumableListing}
                      onUseConsumable={useConsumable}
                      onSellMaterial={sellMaterial}
                    />
                  )}

                  {selectedCitySection.id === "mural" && (
                    <QuestBoard
                      quests={cityQuests}
                      progress={worldProgress}
                      itemName={(itemId) => equipment.find((entry) => entry.id === itemId)?.name ?? itemId}
                      onAccept={acceptMission}
                      onClaim={claimMission}
                      onOpenRoute={goToMissionLevel}
                    />
                  )}

                  {selectedCitySection.id === "portoes" && (
                    <>
                      <GateMap
                        city={adventureCity}
                        selectedExitId={selectedExitId}
                        selectedLevelId={selectedInstanceLevelId}
                        exploredSpotsByLevel={worldProgress.exploredSpotsByLevel}
                        discoveredCreatureIds={worldProgress.discoveredCreatureIds}
                        explorationLocked={Boolean(adventureAlert || pendingEncounterSpot)}
                        creatureName={(creatureId) => bestiaryById.get(creatureId)?.name ?? huntCreatures.find((creature) => creature.id === creatureId)?.name ?? creatureId}
                        onSelectExit={openExit}
                        onSelectLevel={openInstanceLevel}
                        onExploreSpot={exploreSpot}
                      />
                      {adventureAlert && (
                        <JourneyOutcomePanel
                          title={adventureAlert.title}
                          text={adventureAlert.text}
                          kind={adventureAlert.kind}
                          actionLabel={adventureAlert.actionLabel}
                          onAction={consumeAdventureAction}
                          inline
                        />
                      )}
                    </>
                  )}
                </section>}
              </section>
            </>
          ) : (
            <section className={`battle-screen battle-screen-v6 ${battleFogEnabled ? "fog-on" : "fog-off"}`}>
              <header className="battle-v6-header battle-v6-header-mockup">
                <div className="battle-v6-brand">
                  <span>RUPTERYA</span>
                  <small>BATALHA TÁTICA</small>
                </div>
                <div className="battle-v6-title battle-v6-round-title">
                  <span>Turno {battle.turn}</span>
                </div>
                <button
                  className="battle-v6-back battle-v6-menu"
                  aria-label="Recuar da batalha"
                  onClick={() => {
                    setShowBattleLoadout(false);
                    setBattle(null);
                    setSelectedEnemyId(null);
                    setPendingEncounterSpot(null);
                  }}
                >
                  ☰
                </button>
              </header>

              <section className="battle-v6-enemy-ribbon" aria-label="Inimigos ativos">
                {frontLineEnemies.map(({ enemy, index }) => {
                  const creature = battle.creatures[index];
                  const enemyVisible = visibleEnemyIds.has(enemy.id);
                  const selectedTarget = enemy.id === selectedEnemyId;
                  if (!enemyVisible) return (
                    <article key={enemy.id} className="battle-v6-ribbon-card fog-hidden-card" aria-label="Inimigo oculto pela neblina ou por obstáculo">
                      <div className="battle-v6-ribbon-portrait battle-v6-hidden-portrait">?</div>
                      <div className="battle-v6-ribbon-copy">
                        <strong>Presença Oculta</strong>
                        <small>Fora da linha de visão</small>
                        <div className="battle-v6-hidden-bar">DESCONHECIDO</div>
                      </div>
                    </article>
                  );
                  return (
                    <article
                      key={enemy.id}
                      className={`battle-v6-ribbon-card ${selectedTarget ? "target-selected" : ""} ${preparedAbility && targetableEnemyIds.has(enemy.id) ? "cast-ready" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleEnemyInteraction(enemy.id, enemy.name)}
                      onDoubleClick={() => setInspectedCreatureIndex(index)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleEnemyInteraction(enemy.id, enemy.name);
                        }
                      }}
                    >
                      <div className="battle-v6-ribbon-portrait">
                        {enemy.portraitPath ? <img src={enemy.portraitPath} alt={`Retrato de ${enemy.name}`} /> : <div className="monster-art">✦</div>}
                        <CreatureFrameOverlay family={creature.family} rarity={creature.rarity} />
                      </div>
                      <div className="battle-v6-ribbon-copy">
                        <strong>{enemy.name}</strong>
                        <small>Nv. {creature.level} · ⚡ {combatantSpeed(enemy)}</small>
                        {enemy.tacticalIntent && <em className={`battle-v6-ai-intent intent-${enemy.tacticalIntent.kind}`}>◈ {enemy.tacticalIntent.label}</em>}
                        {enemy.charging && <em className="battle-v6-ribbon-charge">⚠ {enemy.abilities?.find((ability) => ability.id === enemy.charging?.abilityId)?.name ?? "Carregando"}</em>}
                        <div className="battle-v6-bar hp" aria-label={`HP ${enemy.hpCurrent} de ${enemy.hpMax}`}>
                          <b style={{ width: `${Math.max(0, (enemy.hpCurrent / enemy.hpMax) * 100)}%` }} />
                          <em>{enemy.hpCurrent}/{enemy.hpMax}</em>
                        </div>
                        {enemy.activeEffects.length > 0 && (
                          <div className="battle-v6-ribbon-statuses">
                            {enemy.activeEffects.slice(0, 3).map((effect, effectIndex) => (
                              <StatusEffectIcon key={`${enemy.id}-${effect.kind}-${effectIndex}`} kind={effect.kind} />
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </section>

              <section className="battle-v6-turn-strip" aria-label="Ordem de turno real">
                <span className="battle-v6-turn-label">PRÓXIMO</span>
                <div className="battle-v6-turn-track">
                  {battleTurnOrder.map((entry, orderIndex) => {
                    const hiddenEnemy = entry.side === "enemy" && !visibleEnemyIds.has(entry.id);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        className={`battle-v6-turn-chip ${entry.side} ${hiddenEnemy ? "fog-hidden-turn" : ""} ${entry.id === battle.player.id ? "active" : entry.id === selectedEnemyId ? "target-selected" : ""}`}
                        onClick={() => {
                          if (entry.side === "enemy" && !hiddenEnemy) setSelectedEnemyId(entry.id);
                        }}
                        aria-label={hiddenEnemy ? "Ator inimigo oculto" : entry.name}
                      >
                        {hiddenEnemy ? <span>?</span> : entry.portraitPath ? <img src={entry.portraitPath} alt="" /> : <span>{entry.side === "player" ? "♞" : "☠"}</span>}
                        <small className="battle-v6-turn-speed">⚡{hiddenEnemy ? "?" : entry.speed}</small>
                        <i>{orderIndex + 1}</i>
                      </button>
                    );
                  })}
                </div>
              </section>

              <div className="battle-v6-arena" style={battleBoardStyle}>
                <aside className="battle-v6-side-panel battle-v6-legend-panel" aria-label="Legenda tática">
                  <h3>LEGENDA</h3>
                  <div><i className="movement" /> Movimento</div>
                  <div><i className="range" /> Alcance</div>
                  <div><i className="magic" /> Área mágica</div>
                  <div><i className="target" /> Alvo</div>
                  <div><i className="threat" /> Área ameaçada</div>
                  <div><i className="cover" /> Cobertura</div>
                  <div><i className="blocked" /> Obstáculo</div>
                </aside>

                <div className="battle-v6-board-center">
                  <div className="battle-v6-section-title">
                    <span>CAMPO HEXAGONAL</span>
                  </div>
                  <div className="battle-v6-hex-board" style={{ aspectRatio: `${hexBoardBounds.width} / ${hexBoardBounds.height}` }}>
                    <svg viewBox={`0 0 ${hexBoardBounds.width} ${hexBoardBounds.height}`} className="battle-v6-hex-svg">
                      {boardCells().map((cell) => {
                        const { x, y } = axialToPixel(cell);
                        const cx = x - hexBoardBounds.minX;
                        const cy = y - hexBoardBounds.minY;
                        const cellKey = hexKey(cell);
                        const terrain = terrainCellAt(battle.battlefield, cell);
                        const isMove = moveTargets.has(cellKey);
                        const isTargetCell = Boolean(selectedEnemyPosition && cellKey === hexKey(selectedEnemyPosition));
                        const hiddenByFog = battleFogEnabled && !visibleCellKeys.has(cellKey);
                        const terrainClass = terrain ? ` terrain-${terrain.terrain}` : "";
                        const obstacleClass = terrain?.blocked ? " blocked-cell" : "";
                        const coverClass = (terrain?.coverPercent ?? 0) > 0 ? " cover-cell" : "";
                        const obstacleGlyph = terrain?.obstacle === "tree" ? "♣" : terrain?.obstacle === "rock" ? "◆" : terrain?.obstacle === "pillar" ? "▮" : terrain?.obstacle === "wall" ? "▰" : terrain?.obstacle === "crystal" ? "✦" : "";
                        return (
                          <g key={cellKey}>
                            <polygon
                              points={hexCorners(cx, cy)}
                              className={`battle-v6-hex-cell${terrainClass}${obstacleClass}${coverClass}${hiddenByFog ? " fog-hidden-cell" : ""}${isMove ? " move" : ""}${isTargetCell ? " target" : ""}${enemyTelegraphCells.has(cellKey) ? " enemy-threat" : ""}${preparedAbility && preparedReachCells.has(cellKey) ? " ability-reach" : ""}${preparedAbility && preparedAreaCells.has(cellKey) ? preparedAbility.damageFamily === "magical" ? " magic-area" : " physical-area" : ""}`}
                              onClick={() => {
                                if (isMove) moveTo(cell);
                              }}
                            />
                            {obstacleGlyph && !hiddenByFog && <text x={cx} y={cy + 5} textAnchor="middle" className="battle-v6-obstacle-glyph" pointerEvents="none">{obstacleGlyph}</text>}
                          </g>
                        );
                      })}
                    </svg>

                    {frontLineEnemies.filter(({ enemy }) => visibleEnemyIds.has(enemy.id)).map(({ enemy, index }, slot) => {
                      const selectedTarget = enemy.id === selectedEnemyId;
                      const creature = battle.creatures[index];
                      const cell = enemy.position ?? ENEMY_FRONT_SPAWN_CELLS[slot] ?? ENEMY_FRONT_SPAWN_CELLS[0];
                      return (
                        <article
                          className={`battle-v6-hex-unit battle-v6-hex-token battle-v6-hex-token-enemy ${creatureFrameClassName(creature.family, creature.rarity)} ${selectedTarget ? "target-selected" : ""} ${preparedAbility && targetableEnemyIds.has(enemy.id) ? "cast-ready" : ""} ${(battleEffect?.targetId === enemy.id || battleEffect?.targetIds?.includes(enemy.id)) ? `hit-${battleEffect.kind}` : ""}`}
                          key={enemy.id}
                          style={hexToPercentForSlot(cell, slot)}
                          role="button"
                          tabIndex={0}
                          aria-pressed={selectedTarget}
                          aria-label={`${selectedTarget ? "Alvo atual" : "Selecionar"} ${enemy.name}. Toque duas vezes para ver detalhes.`}
                          onClick={() => handleEnemyInteraction(enemy.id, enemy.name, true)}
                          onDoubleClick={() => setInspectedCreatureIndex(index)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleEnemyInteraction(enemy.id, enemy.name, true);
                            }
                          }}
                        >
                          {selectedTarget && <span className="battle-v6-target-reticle" aria-hidden="true">⌖</span>}
                          {(battleEffect?.targetId === enemy.id || battleEffect?.targetIds?.includes(enemy.id)) && (
                            <span className={`battle-impact ${battleEffect.kind}`} aria-hidden="true">{battleEffect.damage ? `-${battleEffect.damage}` : ""}</span>
                          )}
                          {enemy.charging && (
                            <span className="battle-v6-charge-badge">⚠ {enemy.abilities?.find((ability) => ability.id === enemy.charging?.abilityId)?.name ?? "CARREGANDO"}</span>
                          )}
                          {enemy.tacticalIntent && <span className={`battle-v6-ai-intent-badge intent-${enemy.tacticalIntent.kind}`}>{enemy.tacticalIntent.label}</span>}
                          <span className="battle-v6-level-badge">Nv. {creature.level}</span>
                          <div className="battle-v6-hex-token-portrait">
                            <span className="battle-v6-hex-token-ring" aria-hidden="true" />
                            {enemy.portraitPath ? <img src={enemy.portraitPath} alt={`Retrato de ${enemy.name}`} /> : <div className="monster-art">✦</div>}
                          </div>
                          <span className="battle-v6-hex-token-label">{enemy.name}</span>
                        </article>
                      );
                    })}

                    {(battle.party ?? [battle.player]).filter((hero) => hero.hpCurrent > 0).map((hero) => {
                      const isCurrentTurnHero = hero.id === (battle.activeHeroId ?? battle.currentActorId ?? battle.player.id);
                      return (
                        <article
                          key={hero.id}
                          className={`battle-v6-hex-unit battle-v6-hex-token battle-v6-hex-token-player ${isCurrentTurnHero ? "target-selected active-turn-hero" : ""} ${battleEffect?.targetId === hero.id ? `hit-${battleEffect.kind}` : ""}`}
                          style={hexToPercent(hero.position ?? PLAYER_START_CELL)}
                          role="button"
                          tabIndex={0}
                          aria-label={`${hero.name} (${hero.className ?? "Herói"}). Toque duas vezes para ver equipamentos.`}
                          onDoubleClick={() => setShowBattleLoadout(true)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") setShowBattleLoadout(true);
                          }}
                        >
                          {battleEffect?.targetId === hero.id && (
                            <span className={`battle-impact ${battleEffect.kind}`} aria-hidden="true">
                              {battleEffect.damage ? `-${battleEffect.damage}` : ""}
                            </span>
                          )}
                          {isCurrentTurnHero && <span className="battle-v6-target-reticle" aria-hidden="true">★</span>}
                          {castEffect && <span className={`class-cast class-cast-${castEffect.classId}`} aria-hidden="true" />}
                          <span className="battle-v6-level-badge">Nv. {summary!.level}</span>
                          <div className="battle-v6-hex-token-portrait">
                            <span className="battle-v6-hex-token-ring" aria-hidden="true" />
                            <img src={hero.portraitPath ?? summary!.portraitPath} alt={`Retrato de ${hero.name}`} />
                          </div>
                          <span className="battle-v6-hex-token-label">{hero.name}</span>
                        </article>
                      );
                    })}
                  </div>
                </div>

                <aside className="battle-v6-side-panel battle-v6-fog-panel" aria-label="Condição de visão do campo">
                  <div className="battle-v6-fog-cloud">☁</div>
                  <h3>{battle.battlefield.fog.label.toUpperCase()}</h3>
                  <p>{battleFogEnabled ? "Condição ativa: unidades só enxergam dentro da própria visão e através de uma linha de visão livre." : "Campo aberto: a distância visual não limita o combate, mas obstáculos ainda bloqueiam linha de visão."}</p>
                  <div className={`battle-v6-fog-toggle ${battleFogEnabled ? "on" : "off"}`}>
                    {battleFogEnabled ? "ATIVA" : "SEM NEBLINA"}
                  </div>
                  <small>Visão do herói: {effectiveVisionRange(activeBattleHero ?? battle.player, battle.battlefield) >= 90 ? "campo inteiro" : `${effectiveVisionRange(activeBattleHero ?? battle.player, battle.battlefield)} hex`}</small>
                  {battle.companion && (
                    <button
                      type="button"
                      className="battle-v6-companion-chip"
                      aria-label={`${battle.companion.name}. Toque para ver detalhes.`}
                      onClick={() => setShowCompanionDetail(true)}
                    >
                      <img src={battle.companion.portraitPath} alt={battle.companion.name} />
                      <span>{battle.companion.name}</span>
                    </button>
                  )}
                </aside>
                <div className="battle-v6-mode-note">Rupterya V1: Party de 3 Companions em campo simultâneo · Motor tático em 14 etapas.</div>
              </div>

              <section className="battle-v6-command-panel">
                <div className="battle-v6-active-hero battle-v6-active-hero-card">
                  <button
                    className="battle-v6-avatar-button"
                    onClick={() => setShowBattleLoadout(true)}
                    aria-label="Abrir equipamentos"
                  >
                    <img src={activeBattleHero?.portraitPath ?? summary!.portraitPath} alt="" />
                  </button>
                  <div className="battle-v6-active-copy">
                    <strong>{(activeBattleHero?.name ?? summary!.name)} <span>· {(activeBattleHero?.className ?? summary!.className)} · Nv. {summary!.level}</span></strong>
                    <small>⚔ Potência {activeBattleHero?.power ?? activeBattleHero?.stats.physicalDamage ?? 30} · ⚡ Vel {combatantSpeed(activeBattleHero ?? battle.player)} · Dano {activeBattleHero?.damageType?.toUpperCase() ?? "SAGRADO"}</small>
                    <em>Alvo: {battle.enemies.find((enemy) => enemy.id === selectedEnemyId)?.name ?? "selecione um inimigo"}</em>
                  </div>
                  <div className="battle-v6-resource-pills">
                    <span className="hp-pill">♥ HP {activeBattleHero?.hpCurrent ?? battle.player.hpCurrent}/{activeBattleHero?.hpMax ?? battle.player.hpMax}</span>
                    <span className="mp-pill">★ Ultimate {activeBattleHero?.ultimateCurrentCharge ?? 0}/{activeBattleHero?.ultimateRequiredCharge ?? 4}</span>
                  </div>
                </div>

                <div className="battle-v6-tactical-toolbar">
                  <button type="button" className={`battle-v6-tactical-button ${battleActionMode === "move" ? "active" : ""}`} onClick={beginMoveMode} disabled={Boolean(battle.movementUsed)}> {battle.movementUsed ? "Movimento usado" : "Mover"}</button>
                  <button type="button" className="battle-v6-tactical-button" onClick={waitTurn}>Aguardar</button>
                  <button type="button" className={`battle-v6-tactical-button primary ${preparedAbility ? "ready" : ""}`} onClick={() => preparedAbility && selectedEnemyId ? executeAbility(preparedAbility, selectedEnemyId) : undefined} disabled={!preparedAbility || !preparedAbilityInRange || !selectedEnemyId}>Usar habilidade</button>
                  <button type="button" className="battle-v6-tactical-button ghost" onClick={cancelBattleMode} disabled={battleActionMode === "idle" && !preparedAbility}>Cancelar</button>
                </div>
                <p className="battle-v6-tactical-hint">{battleHint}{preparedAbility ? ` · ${preparedAreaLabel}` : ""}{activeChargeCount ? ` · ⚠ ${activeChargeCount} carregamento(s) telegrafado(s)` : ""}</p>

                {battle.status === "active" ? (
                  <section className="battle-v6-actions">
                    {(activeBattleHero ?? battle.player).activeEffects.some((effect) => effect.kind === "stun") && (
                      <p className="battle-v6-status-warning">Atordoado: você perde este turno.</p>
                    )}
                    <div className="battle-v6-skill-grid battle-v6-skill-grid-cards">
                      {battleAbilities.map((ability, abilityIndex) => {
                        const currentHero = activeBattleHero ?? battle.player;
                        const cooldown = currentHero.abilityCooldowns?.[ability.id] ?? battle.cooldowns[ability.id] ?? 0;
                        const isUltimate = Boolean(ability.isUltimate);
                        const ultReq = currentHero.ultimateRequiredCharge ?? ability.requiredChargeTurns ?? 4;
                        const ultCur = currentHero.ultimateCurrentCharge ?? 0;
                        const ultNotReady = isUltimate && ultCur < ultReq;
                        const noTarget = !selectedEnemyId;
                        const stunned = currentHero.activeEffects.some((effect) => effect.kind === "stun");
                        const silenced = ability.damageFamily === "magical" && currentHero.activeEffects.some((effect) => effect.kind === "silence");
                        const displayedRange = playerAbilityRange(ability, currentHero) ?? 1;
                        const outOfRange = !noTarget && ability.range !== undefined && distanceToSelected !== null && distanceToSelected > displayedRange;
                        const disabled = cooldown > 0 || ultNotReady || stunned || silenced;
                        const icon = isUltimate
                          ? "★"
                          : ability.damageFamily === "magical"
                            ? "✦"
                            : abilityIndex === 0
                              ? "➶"
                              : abilityIndex === 1
                                ? "➷"
                                : abilityIndex === 2
                                  ? "➹"
                                  : "◎";
                        return (
                          <button
                            key={ability.id}
                            onClick={() => prepareAbility(ability)}
                            disabled={disabled}
                            aria-pressed={preparedAbilityId === ability.id}
                            className={`battle-v6-skill battle-v6-skill-card ${isUltimate ? "ultimate-card" : ""} ${preparedAbilityId === ability.id ? "prepared" : ""} ${disabled ? "combat-action-disabled" : ""}`}
                            data-family={ability.damageFamily}
                          >
                            <b className="battle-v6-skill-icon" aria-hidden="true">{icon}</b>
                            <span>
                              <strong>{ability.name}</strong>
                              <small>{ability.damageFamily === "magical" ? "Dano mágico" : "Dano físico"} · Alcance {displayedRange} · {ability.area?.shape === "radius" ? `Raio ${ability.area.radius ?? 1}` : ability.area?.shape === "ring" ? `Anel ${ability.area.radius ?? 1}` : ability.area?.shape === "line" ? "Linha" : ability.area?.shape === "cone" ? "Cone" : ability.area?.shape === "connected" ? "Conectada" : ability.area?.shape === "all" ? "Campo" : "Único"}</small>
                            </span>
                            {isUltimate ? (
                              <em className="battle-v6-cost">{ultNotReady ? `${ultCur}/${ultReq} Turnos` : "★ PRONTA"}</em>
                            ) : (
                              <em className="battle-v6-cost">{cooldown > 0 ? `CD ${cooldown}` : "PRONTA"}</em>
                            )}
                            {cooldown > 0 && <i className="battle-v6-cd">CD {cooldown}</i>}
                            {cooldown === 0 && isUltimate && ultNotReady && <i className="battle-v6-cd">CARREGANDO</i>}
                            {cooldown === 0 && !ultNotReady && noTarget && <i className="battle-v6-cd">SEM ALVO</i>}
                            {cooldown === 0 && !ultNotReady && !noTarget && silenced && <i className="battle-v6-cd">SILENCIADO</i>}
                            {cooldown === 0 && !ultNotReady && !noTarget && !silenced && outOfRange && <i className="battle-v6-cd">FORA DE ALCANCE</i>}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : (
                  <section className={`battle-result ${battle.status}`}>
                    <h2>{battle.status === "victory" ? "Vitória na Caça" : "Você foi derrotado"}</h2>
                    <p>
                      {battle.status === "victory"
                        ? `+${battle.reward?.xp} XP global · +${battle.reward?.gold} ouro`
                        : "Procure cura antes da próxima caçada."}
                    </p>
                    {battle.status === "victory" && battle.reward?.itemIds.length ? (
                      <small className="loot-result">Itens preservados: {battle.reward.itemIds.map((itemId) => equipment.find((item) => item.id === itemId)?.name ?? itemId).join(", ")}</small>
                    ) : null}
                    {battle.status === "victory" && battle.reward?.fragments.length ? (
                      <small className="loot-result">Fragmentos: {battle.reward.fragments.map((entry) => `${entry.amount} ${entry.rarity}`).join(" · ")}</small>
                    ) : null}
                    <button className="primary" onClick={() => {
                      setShowBattleLoadout(false);
                      setBattle(null);
                      setSelectedEnemyId(null);
                      setPendingEncounterSpot(null);
                    }}>
                      Voltar às rotas
                    </button>
                  </section>
                )}

                <details className="battle-v6-log">
                  <summary>▤ Registro de combate <span>⌄</span></summary>
                  <div>
                    {battle.log.slice(-8).map((line, index) => (
                      <p className={line.tone} key={`${line.turn}-${index}`}>{line.text}</p>
                    ))}
                  </div>
                </details>
              </section>
            </section>
          )}
        </section>
      )}
      {showBattleLoadout && battle && view === "hunt" && selected && (
        <EquipmentLoadoutModal
          character={selected}
          activeEffects={battle.player.activeEffects}
          onClose={() => setShowBattleLoadout(false)}
        />
      )}
      {inspectedCreatureIndex !== null && battle && view === "hunt" && battle.creatures[inspectedCreatureIndex] && (
        <CreatureLoadoutModal
          creature={battle.creatures[inspectedCreatureIndex]}
          activeEffects={battle.enemies[inspectedCreatureIndex]?.activeEffects ?? []}
          onClose={() => setInspectedCreatureIndex(null)}
        />
      )}
      {showCompanionDetail && battle?.companion && view === "hunt" && (
        <CompanionDetailModal
          companion={battle.companion}
          onClose={() => setShowCompanionDetail(false)}
        />
      )}
      {!(battle && view === "hunt") && <MusicToggle enabled={musicEnabled} onToggle={toggleMusic} />}
      {!(battle && view === "hunt") && <p className="notice">{message}</p>}
      {!(battle && view === "hunt") && <nav className="bottom-nav">
        <button
          className={view === "lobby" ? "active" : ""}
          onClick={() => {
            setBattle(null);
            setView("lobby");
          }}
        >
          Lobby
        </button>
        <button
          className={view === "hunt" ? "active" : ""}
          onClick={() => setView("hunt")}
        >
          Mundo
        </button>
        <button
          className={view === "profile" ? "active" : ""}
          onClick={() => setView("profile")}
        >
          Perfil
        </button>
        <button
          className={view === "equipment" ? "active" : ""}
          onClick={() => setView("equipment")}
        >
          Itens
        </button>
        <button
          className={view === "abilities" ? "active" : ""}
          onClick={() => setView("abilities")}
        >
          Habilidades
        </button>
        <button
          className={view === "presets" ? "active" : ""}
          onClick={() => setView("presets")}
        >
          Presets
        </button>
        <button
          className={view === "bestiary" ? "active" : ""}
          onClick={() => setView("bestiary")}
        >
          Bestiário
        </button>
        <button
          className={view === "dev" ? "active" : ""}
          onClick={() => setView("dev")}
        >
          Dev
        </button>
        <button
          className={view === "hexlab" ? "active" : ""}
          onClick={() => setView("hexlab")}
        >
          Hex Lab
        </button>
        <button
          className={view === "companionslab" ? "active" : ""}
          onClick={() => setView("companionslab")}
        >
          Companions Lab
        </button>
      </nav>}
    </main>
  );
}
