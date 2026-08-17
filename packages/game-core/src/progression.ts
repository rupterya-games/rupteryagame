import type { GameCharacter, MoralAxis, MoralInclination, OrganizationProgress } from "./domain";

export const DEFAULT_MORAL_INCLINATION: MoralInclination = { hero: 0, neutral: 100, villain: 0 };

/**
 * Garante que Hero/Neutral/Villain permaneçam entre 0 e 100 e somem 100.
 * É uma função de migração segura para saves antigos e futuras escolhas narrativas.
 */
export function normalizeMoralInclination(input?: Partial<MoralInclination> | null): MoralInclination {
  if (!input) return { ...DEFAULT_MORAL_INCLINATION };
  const raw = {
    hero: Math.max(0, Number(input.hero ?? 0)),
    neutral: Math.max(0, Number(input.neutral ?? 0)),
    villain: Math.max(0, Number(input.villain ?? 0)),
  };
  const total = raw.hero + raw.neutral + raw.villain;
  if (total <= 0) return { ...DEFAULT_MORAL_INCLINATION };
  const exact = {
    hero: (raw.hero / total) * 100,
    neutral: (raw.neutral / total) * 100,
    villain: (raw.villain / total) * 100,
  };
  const base = {
    hero: Math.floor(exact.hero),
    neutral: Math.floor(exact.neutral),
    villain: Math.floor(exact.villain),
  };
  let remainder = 100 - base.hero - base.neutral - base.villain;
  const order: MoralAxis[] = (["hero", "neutral", "villain"] as MoralAxis[])
    .sort((left, right) => (exact[right] - base[right]) - (exact[left] - base[left]));
  const result = { ...base };
  for (const axis of order) {
    if (remainder <= 0) break;
    result[axis] += 1;
    remainder -= 1;
  }
  return result;
}

/** Média moral dos personagens ativos. A formação oficial usa até 3 membros. */
export function groupMoralInclination(characters: GameCharacter[], maxMembers = 3): MoralInclination {
  const active = characters.slice(0, Math.max(1, maxMembers));
  if (!active.length) return { ...DEFAULT_MORAL_INCLINATION };
  const total = active.reduce(
    (sum, character) => {
      const moral = normalizeMoralInclination(character.moralInclination);
      return { hero: sum.hero + moral.hero, neutral: sum.neutral + moral.neutral, villain: sum.villain + moral.villain };
    },
    { hero: 0, neutral: 0, villain: 0 },
  );
  return normalizeMoralInclination({
    hero: total.hero / active.length,
    neutral: total.neutral / active.length,
    villain: total.villain / active.length,
  });
}

export type MoralMissionTier = "none" | "common" | "rare" | "epic" | "legendary";

/** Faixas aprovadas: 30–49 comum, 50–69 rara, 70–89 épica, 90+ lendária/especial. */
export function moralMissionTier(score: number): MoralMissionTier {
  if (score >= 90) return "legendary";
  if (score >= 70) return "epic";
  if (score >= 50) return "rare";
  if (score >= 30) return "common";
  return "none";
}

export function moralAxisScore(moral: MoralInclination, axis: MoralAxis): number {
  return moral[axis];
}

/**
 * Gate puro para missões de organização. Não inventa curva de reputação:
 * conteúdo informa explicitamente o nível requerido e a moral requerida.
 */
export function qualifiesForOrganizationMission(input: {
  organization?: OrganizationProgress;
  requiredOrganizationLevel: number;
  groupMoral: MoralInclination;
  moralAxis: MoralAxis;
  requiredMoral: number;
}): boolean {
  return (input.organization?.level ?? 0) >= input.requiredOrganizationLevel
    && moralAxisScore(input.groupMoral, input.moralAxis) >= input.requiredMoral;
}
