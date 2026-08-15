"use client";

import type { CharacterWorldProgress } from "@rupterya/game-core";
import type { QuestDefinition } from "@/lib/quests";
import { questIsReady, questPrerequisitesMet, questProgress, questTarget } from "@/lib/quests";

const rankLabel: Record<QuestDefinition["rank"], string> = {
  Cobre: "Cobre",
  Ferro: "Ferro",
  Prata: "Prata",
  Ouro: "Ouro",
  Obsidiana: "Obsidiana",
};

export function QuestBoard({
  quests,
  progress,
  itemName,
  onAccept,
  onClaim,
  onOpenRoute,
}: {
  quests: QuestDefinition[];
  progress: CharacterWorldProgress;
  itemName: (id: string) => string;
  onAccept: (questId: string) => void;
  onClaim: (questId: string) => void;
  onOpenRoute: (questId: string) => void;
}) {
  return (
    <div className="mission-board-grid">
      {quests.map((quest) => {
        const active = progress.activeQuestIds.includes(quest.id);
        const completed = progress.completedQuestIds.includes(quest.id);
        const prerequisites = questPrerequisitesMet(quest, progress.completedQuestIds);
        const current = questProgress(quest, progress);
        const target = questTarget(quest);
        const ready = active && questIsReady(quest, progress);
        const repeatableReady = quest.repeatable || !completed;
        return (
          <article className={`mission-card ${active ? "active" : ""} ${completed ? "completed" : ""} ${!prerequisites ? "locked" : ""}`} key={quest.id}>
            <span>{rankLabel[quest.rank]} · {quest.objective.kind.toUpperCase()}</span>
            <strong>{quest.title}</strong>
            <p>{quest.description}</p>
            <small>
              Recompensa: {quest.rewardGold} ouro · {quest.rewardXp} XP · +{quest.rewardReputation} reputação
              {quest.rewardItemId ? ` · ${itemName(quest.rewardItemId)}` : ""}
            </small>
            {(active || completed) && <em>Progresso: {current}/{target}</em>}
            {active ? (
              <div className="inline-actions">
                <button onClick={() => onOpenRoute(quest.id)}>Abrir rota</button>
                <button className="primary" disabled={!ready} onClick={() => onClaim(quest.id)}>
                  {ready ? "Receber recompensa" : "Em andamento"}
                </button>
              </div>
            ) : (
              <button
                className="primary"
                disabled={!prerequisites || !repeatableReady || progress.activeQuestIds.length >= 3}
                onClick={() => onAccept(quest.id)}
              >
                {!prerequisites
                  ? "Pré-requisito pendente"
                  : !repeatableReady
                    ? "Concluído"
                    : progress.activeQuestIds.length >= 3
                      ? "Limite de 3 contratos"
                      : completed && quest.repeatable
                        ? "Aceitar novamente"
                        : "Aceitar contrato"}
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
