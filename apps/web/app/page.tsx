"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  LOADOUT_SLOTS,
  PLAYER_MP_REGEN_PER_TURN,
  activePreset,
  dropBreakChanceByRarity,
  resolveHuntTurn,
  statusEffectLabels,
} from "@rupterya/game-core";
import type {
  AbilityDefinition,
  CombatStatusEffect,
  GameCharacter,
  HuntBattleState,
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
import { CreatureFamilyBadge, creatureFrameClassName, creatureRarityLabels, resolveCreatureRarity } from "@/components/CreatureFamilyBadge";
import { GateMap } from "@/components/GateMap";
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
  | "bestiary";
type BattleEffect = {
  kind: "physical" | "magical" | "dragonfire";
  targetId: string;
  damage?: number;
} | null;
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
  onClose,
}: {
  character: GameCharacter;
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
        <p>Loadout ativo · toque fora para voltar à batalha.</p>
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

function CreatureLoadoutModal({
  creature,
  onClose,
}: {
  creature: HuntBattleState["creatures"][number];
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
          <small>Ataque {creature.physicalDamage} · Defesa {creature.physicalDefense}/{creature.magicalDefense}</small>
          {creature.statusEffects?.length ? <small>Perigo: {creature.statusEffects.map((effect) => statusEffectLabels[effect.kind]).join(", ")}</small> : <small>Perigo: ataque direto</small>}
        </div>
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
  return <div className="combat-effects" aria-label="Efeitos ativos">{effects.map((effect) => <small key={`${effect.kind}-${effect.sourceName}`}>{statusEffectLabels[effect.kind]} · {effect.turns}T</small>)}</div>;
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
    xpReward: source.xpReward,
    goldReward: source.goldReward,
    statusEffects: source.statusEffects,
    equippedItem: legacy?.equippedItem,
    equippedItems: legacy?.equippedItems,
    featuredItemCandidates: legacy?.featuredItemCandidates,
    equipmentProfileId: legacy?.equipmentProfileId,
  };
}

function createInstanceEncounter(creaturePool: readonly string[], playerLevel: number) {
  const firstId = creaturePool[Math.floor(Math.random() * creaturePool.length)] ?? creaturePool[0] ?? huntCreatures[0].id;
  const source = bestiaryById.get(firstId);
  const creatureLevel = source?.level ?? playerLevel;
  let min = source?.solitary ? 1 : Math.max(1, source?.packMin ?? 1);
  let max = source?.solitary ? 1 : Math.min(5, Math.max(min, source?.packMax ?? 2));

  // Balanceamento por diferença de nível: grupos existem para serem perigosos
  // na faixa recomendada, não para fazer um personagem muito acima do nível
  // apanhar de uma alcateia trivial. Só entra em ação em diferenças grandes —
  // um personagem levemente acima do nível da zona ainda enfrenta o bando cheio.
  const gap = playerLevel - creatureLevel;
  if (gap >= 25) { min = 1; max = 1; }
  else if (gap >= 15) { min = 1; max = Math.min(2, max); }
  else if (gap >= 8) { min = 1; max = Math.min(3, max); }
  if (creatureLevel >= playerLevel + 6) { min = 1; max = Math.min(2, max); }

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
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [showBattleLoadout, setShowBattleLoadout] = useState(false);
  const [inspectedCreatureIndex, setInspectedCreatureIndex] = useState<number | null>(null);
  const [inspectedBestiaryCreatureId, setInspectedBestiaryCreatureId] = useState<string | null>(null);
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
    const selectedAlive = battle.enemies.some(
      (enemy) => enemy.id === selectedEnemyId && enemy.hpCurrent > 0,
    );
    if (!selectedAlive) {
      setSelectedEnemyId(
        battle.enemies.find((enemy) => enemy.hpCurrent > 0)?.id ?? null,
      );
    }
  }, [battle, selectedEnemyId]);

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
  const battleAbilities = preset
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
      const creatures = createInstanceEncounter(activeLevel.creaturePool, account.globalLevel);
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
  const takeTurn = (ability: AbilityDefinition) => {
    if (!battle || !selected) return;
    const cooldown = battle.cooldowns[ability.id] ?? 0;
    if (cooldown > 0) {
      setMessage(`${ability.name} estará disponível em ${cooldown} turno(s).`);
      return;
    }
    const target =
      battle.enemies.find(
        (enemy) => enemy.id === selectedEnemyId && enemy.hpCurrent > 0,
      ) ?? battle.enemies.find((enemy) => enemy.hpCurrent > 0);
    if (target && target.id !== selectedEnemyId) setSelectedEnemyId(target.id);
    const next = resolveHuntTurn(battle, ability, target?.id);
    setBattle(next);
    if (target) {
      setBattleEffect({
        kind: ability.damageFamily === "magical" ? "magical" : "physical",
        targetId: target.id,
      });
      window.setTimeout(() => {
        if (next.player.hpCurrent < battle.player.hpCurrent)
          setBattleEffect({ kind: "physical", targetId: battle.player.id });
      }, 330);
      window.setTimeout(() => {
        if (next.status !== "defeat" && next.lastPetTargetId)
          setBattleEffect({
            kind: "dragonfire",
            targetId: next.lastPetTargetId,
            damage: next.lastPetDamage,
          });
      }, 650);
      window.setTimeout(() => setBattleEffect(null), 1120);
    }
    if (next.status !== "active") {
      let settled = repository.settleHunt(account, selected, next);
      if (next.status === "victory" && pendingEncounterSpot) {
        const settledCharacter = settled.characters.find((entry) => entry.id === selected.id);
        if (settledCharacter) settled = repository.recordSpot(settled, settledCharacter, pendingEncounterSpot.levelId, pendingEncounterSpot.spotId);
      }
      setAccount(settled);
      setPendingEncounterSpot(null);
      setMessage(
        next.status === "victory"
          ? "Vitória registrada: XP, ouro e o spot da instância foram concluídos."
          : "Derrota registrada: o spot não foi consumido e poderá ser tentado novamente após a cura.",
      );
    }
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
          <strong>Conta Nv. {account.globalLevel}</strong>
        </header>
        <section className="panel intro">
          <span className="eyebrow">SLOTS DE PERSONAGEM · DEV</span>
          <h1>Escolha seu aventureiro</h1>
          <p>
            Os cinco arquétipos usam retratos e cartas próprias. Todos herdam o
            nível global da conta.
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
                <span>Nv. {account.globalLevel}</span>
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
              Conta Nv. {account.globalLevel} · XP {account.globalXp}/{xpToNextLevel(account.globalLevel)}
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
          <p className="notice">Habilidades de classe liberadas: {selected.ownedAbilityIds.filter((abilityId) => abilityId.startsWith(`${selected.classId}-`)).length}/7{account.globalLevel < 24 ? ` · Próxima no Nv. ${Math.max(4, (Math.floor(account.globalLevel / 4) + 1) * 4)}` : " · Todas liberadas"}</p>
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
                                className={`${discovered ? creatureFrameClassName(creature.family, creature.rarity) : "creature-family-frame frame-unknown"} ${inspectedBestiaryCreatureId === creature.id ? "selected" : ""} ${!discovered ? "unknown" : ""} ${mastered ? "mastered" : ""}`}
                                onClick={() => discovered && setInspectedBestiaryCreatureId(creature.id)}
                              >
                                {discovered && <CreatureFamilyBadge family={creature.family} rarity={creature.rarity} />}
                                {discovered ? <img src={creature.portraitPath ?? "/art/bestiary-drafts/fiordevalle-bestiary-sheet-v1.png"} alt={creature.name} /> : <div className="unknown-creature-art">?</div>}
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
              <article className={`instance-creature-preview ${creatureFrameClassName(inspected.family, inspected.rarity)}`}>
                <CreatureFamilyBadge family={inspected.family} rarity={inspected.rarity} />
                <img src={inspected.portraitPath ?? "/art/bestiary-drafts/fiordevalle-bestiary-sheet-v1.png"} alt={inspected.name} />
                <div>
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
                            const cost = innCost(adventureCity.id, account.globalLevel);
                            persist(repository.restAtInn(selected, cost));
                            setMessage(`${adventureCity.name}: descanso completo por ${cost} ouro.`);
                          } catch (error) {
                            setMessage(error instanceof Error ? error.message : "Não foi possível descansar.");
                          }
                        }}
                      >
                        Descansar · {innCost(adventureCity.id, account.globalLevel)} ouro
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
            <section className="battle-screen battle-screen-v6">
              <header className="battle-v6-header">
                <button
                  className="battle-v6-back"
                  aria-label="Recuar da batalha"
                  onClick={() => {
                    setShowBattleLoadout(false);
                    setBattle(null);
                    setSelectedEnemyId(null);
                    setPendingEncounterSpot(null);
                  }}
                >
                  ←
                </button>
                <div className="battle-v6-title">
                  <span>CAÇA SOLO</span>
                  <small>Turno {battle.turn}</small>
                </div>
                <div className="battle-v6-party-pill" title="O mesmo campo suporta equipe co-op de até 3 jogadores">
                  ♟ 1/1 <i />
                </div>
              </header>

              <div className="battle-v6-arena" style={battleBoardStyle}>
                <div className="battle-v6-section-title">
                  <span>INIMIGOS</span>
                </div>
                <div className={`battle-v6-enemy-grid enemy-count-${Math.min(3, battle.enemies.length)}`}>
                  {battle.enemies.map((enemy, index) => {
                    const selectedTarget = enemy.id === selectedEnemyId;
                    const defeated = enemy.hpCurrent <= 0;
                    const creature = battle.creatures[index];
                    return (
                      <article
                        className={`battle-v6-unit-card battle-v6-enemy-card ${creatureFrameClassName(creature.family, creature.rarity)} ${selectedTarget ? "target-selected" : ""} ${defeated ? "unit-defeated" : ""} ${battleEffect?.targetId === enemy.id ? `hit-${battleEffect.kind}` : ""}`}
                        key={enemy.id}
                        role="button"
                        tabIndex={defeated ? -1 : 0}
                        aria-pressed={selectedTarget}
                        aria-label={`${selectedTarget ? "Alvo atual" : "Selecionar"} ${enemy.name}`}
                        onClick={() => {
                          if (!defeated) {
                            setSelectedEnemyId(enemy.id);
                            setMessage(`${enemy.name} selecionado como alvo.`);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (!defeated && (event.key === "Enter" || event.key === " ")) {
                            event.preventDefault();
                            setSelectedEnemyId(enemy.id);
                            setMessage(`${enemy.name} selecionado como alvo.`);
                          }
                        }}
                      >
                        <CreatureFamilyBadge family={creature.family} rarity={creature.rarity} />
                        {selectedTarget && !defeated && (
                          <span className="battle-v6-target-reticle" aria-hidden="true">⌖</span>
                        )}
                        {battleEffect?.targetId === enemy.id && (
                          <span
                            className={`battle-impact ${battleEffect.kind}`}
                            aria-hidden="true"
                          >{battleEffect.damage ? `-${battleEffect.damage}` : ""}</span>
                        )}
                        {enemy.portraitPath ? (
                          <img src={enemy.portraitPath} alt={`Retrato de ${enemy.name}`} />
                        ) : (
                          <div className="monster-art">✦</div>
                        )}
                        <div className="battle-v6-card-copy">
                          <small>{creature.rarity === "common" ? `NV. ${creature.level}` : creatureRarityLabels[resolveCreatureRarity(creature.rarity)].toUpperCase()}</small>
                          <strong>{enemy.name}</strong>
                          <CombatEffects effects={enemy.activeEffects} />
                          <div className="battle-v6-bar hp" aria-label={`HP ${enemy.hpCurrent} de ${enemy.hpMax}`}>
                            <b style={{ width: `${Math.max(0, (enemy.hpCurrent / enemy.hpMax) * 100)}%` }} />
                          </div>
                          <div className="battle-v6-card-footer">
                            <span>{defeated ? "DERROTADO" : selectedTarget ? "ALVO" : "TOQUE PARA MIRAR"}</span>
                            <button
                              type="button"
                              aria-label={`Inspecionar ${enemy.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setInspectedCreatureIndex(index);
                              }}
                            >
                              i
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="battle-v6-versus" aria-hidden="true">
                  <span />
                  <b>VS</b>
                  <span />
                </div>

                <div className="battle-v6-section-title team-title">
                  <span>EQUIPE</span>
                </div>
                <div className="battle-v6-team-grid solo">
                  <article
                    className={`battle-v6-unit-card battle-v6-player-card ${battleEffect?.targetId === battle.player.id ? `hit-${battleEffect.kind}` : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label="Abrir equipamentos do herói"
                    onDoubleClick={() => setShowBattleLoadout(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setShowBattleLoadout(true);
                    }}
                  >
                    <span className="battle-v6-turn-ribbon">SUA VEZ</span>
                    {battleEffect?.targetId === battle.player.id && (
                      <span className={`battle-impact ${battleEffect.kind}`} aria-hidden="true">
                        {battleEffect.damage ? `-${battleEffect.damage}` : ""}
                      </span>
                    )}
                    <img src={summary!.portraitPath} alt={`Retrato de ${summary!.name}`} />
                    <div className="battle-v6-card-copy">
                      <small>{summary!.className} · Nv. {summary!.level}</small>
                      <strong>{summary!.name} <i className="online-dot" /></strong>
                      <CombatEffects effects={battle.player.activeEffects} />
                      <div className="battle-v6-bar hp">
                        <b style={{ width: `${Math.max(0, (battle.player.hpCurrent / battle.player.hpMax) * 100)}%` }} />
                      </div>
                      <div className="battle-v6-bar mp">
                        <b style={{ width: `${Math.max(0, (battle.player.mpCurrent / battle.player.mpMax) * 100)}%` }} />
                      </div>
                    </div>
                  </article>
                  {battle.companion && (
                    <article className="battle-v6-companion-card" title={battle.companion.description}>
                      <img src={battle.companion.portraitPath} alt={battle.companion.name} />
                      <div>
                        <small>COMPANHEIRO</small>
                        <strong>{battle.companion.name}</strong>
                      </div>
                    </article>
                  )}
                </div>
                <div className="battle-v6-mode-note">♟ Solo · estrutura preparada para Co-op 2–3 jogadores</div>
              </div>

              <section className="battle-v6-command-panel">
                <div className="battle-v6-active-hero">
                  <button
                    className="battle-v6-avatar-button"
                    onClick={() => setShowBattleLoadout(true)}
                    aria-label="Abrir equipamentos"
                  >
                    <img src={summary!.portraitPath} alt="" />
                  </button>
                  <div className="battle-v6-active-copy">
                    <strong>{summary!.name} <span>· {summary!.className} · Nv. {summary!.level}</span></strong>
                    <small>+{PLAYER_MP_REGEN_PER_TURN} MP no início do turno · CD reduz no início do seu turno</small>
                    <em>
                      Alvo: {battle.enemies.find((enemy) => enemy.id === selectedEnemyId)?.name ?? "selecione um inimigo"}
                    </em>
                  </div>
                  <div className="battle-v6-resource-pills">
                    <span className="hp-pill">♥ HP {battle.player.hpCurrent}/{battle.player.hpMax}</span>
                    <span className="mp-pill">◆ MP {battle.player.mpCurrent}/{battle.player.mpMax}</span>
                  </div>
                </div>

                {battle.status === "active" ? (
                  <section className="battle-v6-actions">
                    <div className="battle-v6-skill-grid">
                      {battleAbilities.map((ability, abilityIndex) => {
                        const cooldown = battle.cooldowns[ability.id] ?? 0;
                        const manaCost = ability.manaCost ?? 0;
                        const blockedByMana = battle.player.mpCurrent < manaCost;
                        const noTarget = !selectedEnemyId;
                        const disabled = cooldown > 0 || blockedByMana || noTarget;
                        const icon = ability.damageFamily === "magical"
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
                            onClick={() => takeTurn(ability)}
                            disabled={disabled}
                            className={`battle-v6-skill ${disabled ? "combat-action-disabled" : ""}`}
                          >
                            <b className="battle-v6-skill-icon" aria-hidden="true">{icon}</b>
                            <span>
                              <strong>{ability.name}</strong>
                              <small>{ability.damageFamily === "magical" ? "Dano mágico" : "Dano físico"}</small>
                            </span>
                            <em className="battle-v6-cost">{manaCost} MP</em>
                            {cooldown > 0 && <i className="battle-v6-cd">CD {cooldown}</i>}
                            {cooldown === 0 && blockedByMana && <i className="battle-v6-cd">SEM MP</i>}
                            {cooldown === 0 && !blockedByMana && noTarget && <i className="battle-v6-cd">SEM ALVO</i>}
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
          onClose={() => setShowBattleLoadout(false)}
        />
      )}
      {inspectedCreatureIndex !== null && battle && view === "hunt" && battle.creatures[inspectedCreatureIndex] && (
        <CreatureLoadoutModal
          creature={battle.creatures[inspectedCreatureIndex]}
          onClose={() => setInspectedCreatureIndex(null)}
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
      </nav>}
    </main>
  );
}
