import { adventureCityList, findAdventureLevelGlobal } from "./world";
import type { AdventureCityId } from "./world";

export type QuestRank = "Cobre" | "Ferro" | "Prata" | "Ouro" | "Obsidiana";
export type QuestObjective =
  | { kind: "explore"; levelId: string; target: number }
  | { kind: "kill"; creatureId: string; target: number }
  | { kind: "boss"; creatureId: string; target: 1 }
  | { kind: "deliver"; materialId: string; target: number };

export interface QuestDefinition {
  id: string;
  cityId: AdventureCityId;
  rank: QuestRank;
  title: string;
  description: string;
  objective: QuestObjective;
  rewardGold: number;
  rewardXp: number;
  rewardReputation: number;
  rewardItemId?: string;
  prerequisites: string[];
  repeatable: boolean;
}

export interface QuestProgressState {
  exploredSpotsByLevel: Record<string, string[]>;
  creatureKills: Record<string, number>;
  defeatedBossIds: string[];
  materials: Record<string, number>;
  completedQuestIds: string[];
}

const deliveryMaterialByCity: Record<AdventureCityId, string> = {
  fiordevalle: "sangue-coagulado",
  eldravia: "fragmento-de-ruptura",
  dustfall: "essencia-ascendente",
};

const rewardItemByLevel: Record<string, string> = {
  "west-lv3": "serrated-blade",
  "eld-west-lv3": "eldravia-rift-orb",
  "dust-west-lv3": "dustfall-crater-core",
};

const rankFor = (cityId: AdventureCityId, level: number): QuestRank => {
  if (cityId === "fiordevalle") return level === 1 ? "Cobre" : level === 2 ? "Ferro" : "Prata";
  if (cityId === "eldravia") return level === 1 ? "Prata" : level === 2 ? "Ouro" : "Ouro";
  return level < 3 ? "Ouro" : "Obsidiana";
};

const rewardScaleByCity: Record<AdventureCityId, number> = {
  fiordevalle: 1,
  eldravia: 2.1,
  dustfall: 3.8,
};

const directionLabel: Record<string, string> = {
  north: "Norte",
  south: "Sul",
  east: "Leste",
  west: "Oeste",
};

function objectiveFor(cityId: AdventureCityId, exitId: string, level: { id: string; level: number; spotCount: number; signatureCreatureId: string; bossId?: string }): QuestObjective {
  if (level.level === 3 && level.bossId) return { kind: "boss", creatureId: level.bossId, target: 1 };
  if (exitId === "south" && level.level === 2) return { kind: "deliver", materialId: deliveryMaterialByCity[cityId], target: cityId === "dustfall" ? 3 : 4 };
  if (exitId === "west" && level.level === 1) return { kind: "deliver", materialId: deliveryMaterialByCity[cityId], target: cityId === "dustfall" ? 2 : 3 };
  if ((exitId === "north" && level.level === 2) || (exitId === "east" && level.level === 1) || (exitId === "west" && level.level === 2)) {
    return { kind: "kill", creatureId: level.signatureCreatureId, target: level.level === 1 ? 2 : 3 };
  }
  return { kind: "explore", levelId: level.id, target: Math.min(level.spotCount, level.level === 1 ? 3 : 5) };
}

function questTitle(exitId: string, levelName: string, objective: QuestObjective) {
  const route = directionLabel[exitId] ?? exitId;
  if (objective.kind === "boss") return `Chefe do ${route}: ${levelName}`;
  if (objective.kind === "kill") return `Limpeza do ${route}: ${levelName}`;
  if (objective.kind === "deliver") return `Suprimentos do ${route}: ${levelName}`;
  return `Reconhecimento do ${route}: ${levelName}`;
}

function objectiveDescription(objective: QuestObjective, levelName: string) {
  if (objective.kind === "explore") return `Explore ${objective.target} spots em ${levelName}.`;
  if (objective.kind === "kill") return `Derrote ${objective.target} criatura(s) de assinatura da instância.`;
  if (objective.kind === "boss") return `Derrote o chefe de ${levelName}.`;
  return `Entregue ${objective.target} unidade(s) do material solicitado no Mural.`;
}

export const quests: QuestDefinition[] = adventureCityList.flatMap((city) =>
  city.exits.flatMap((exit) =>
    exit.levels.map((level, index) => {
      const objective = objectiveFor(city.id, exit.id, level);
      const scale = rewardScaleByCity[city.id];
      const base = 85 + level.level * 95;
      const id = `quest-${level.id}`;
      const previous = index > 0 ? `quest-${exit.levels[index - 1].id}` : null;
      return {
        id,
        cityId: city.id,
        rank: rankFor(city.id, level.level),
        title: questTitle(exit.id, level.name, objective),
        description: objectiveDescription(objective, level.name),
        objective,
        rewardGold: Math.round(base * scale),
        rewardXp: Math.round((20 + level.level * 35) * scale),
        rewardReputation: 4 + level.level * 3,
        rewardItemId: rewardItemByLevel[level.id],
        prerequisites: previous ? [previous] : [],
        repeatable: objective.kind === "kill" || objective.kind === "deliver",
      } satisfies QuestDefinition;
    }),
  ),
);

export const questsById = new Map(quests.map((quest) => [quest.id, quest]));
export const questsByCity = (cityId: AdventureCityId) => quests.filter((quest) => quest.cityId === cityId);

export function questProgress(quest: QuestDefinition, state: QuestProgressState) {
  const objective = quest.objective;
  if (objective.kind === "explore") return Math.min(objective.target, state.exploredSpotsByLevel[objective.levelId]?.length ?? 0);
  if (objective.kind === "kill") return Math.min(objective.target, state.creatureKills[objective.creatureId] ?? 0);
  if (objective.kind === "boss") return state.defeatedBossIds.includes(objective.creatureId) ? 1 : 0;
  return Math.min(objective.target, state.materials[objective.materialId] ?? 0);
}

export function questTarget(quest: QuestDefinition) {
  return quest.objective.target;
}

export function questIsReady(quest: QuestDefinition, state: QuestProgressState) {
  return questProgress(quest, state) >= questTarget(quest);
}

export function questPrerequisitesMet(quest: QuestDefinition, completedQuestIds: readonly string[]) {
  return quest.prerequisites.every((id) => completedQuestIds.includes(id));
}

export function questDestinationLevelId(quest: QuestDefinition) {
  if (quest.objective.kind === "explore") return quest.objective.levelId;
  if (quest.objective.kind === "kill" || quest.objective.kind === "boss") {
    const creatureId = quest.objective.creatureId;
    const match = adventureCityList.flatMap((city) => city.exits.flatMap((exit) => exit.levels)).find((level) =>
      level.creaturePool.includes(creatureId),
    );
    return match?.id ?? null;
  }
  const firstLevel = adventureCityList.find((city) => city.id === quest.cityId)?.exits[0]?.levels[0];
  return firstLevel?.id ?? null;
}

export function validateQuests() {
  const problems: string[] = [];
  for (const quest of quests) {
    const destination = questDestinationLevelId(quest);
    if (!destination || !findAdventureLevelGlobal(destination)) problems.push(`${quest.id}: destino inválido`);
    for (const dependency of quest.prerequisites) if (!questsById.has(dependency)) problems.push(`${quest.id}: pré-requisito ${dependency} inexistente`);
  }
  return problems;
}
