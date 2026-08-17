/**
 * morality-kingdoms.ts — Moralidade (Herói/Neutro/Vilão) e Quatro Reinos (Rupterya V1)
 *
 * MORALIDADE:
 * - Herói / Neutro / Vilão somam 100%.
 * - Não concede buffs/debuffs numéricos. Determina acesso a contratos, itens temáticos e reputação.
 * - Formação ativa: a média dos 3 personagens define a Moralidade do Grupo.
 *
 * QUATRO REINOS:
 * 1. Fiordevalle: Comércio, fiordes, portos, cidades e contratos.
 * 2. Ryukuzan: Clãs, disciplina, armas, montanhas e tradição marcial.
 * 3. Eldravya: Florestas, magia, ruínas e conhecimento antigo.
 * 4. Kadesh-ael: Deserto, caravanas, templos, relíquias e tumbas.
 *
 * ORGANIZAÇÕES:
 * - Renome Regional (progresso da região).
 * - Guilda de Heróis (contratos heroicos).
 * - Black House (contratos vilânicos).
 */

export interface MoralityProfile {
  hero: number;    // %
  neutral: number; // %
  villain: number; // %
}

export type KingdomId = "fiordevalle" | "ryukuzan" | "eldravya" | "kadesh_ael";

export interface KingdomDefinition {
  id: KingdomId;
  name: string;
  theme: string;
  description: string;
}

export const KINGDOMS: Record<KingdomId, KingdomDefinition> = {
  fiordevalle: {
    id: "fiordevalle",
    name: "Fiordevalle",
    theme: "Comércio & Portos",
    description: "Cidades costeiras, rotas mercantis, estalagens ricas e contratos marítimos.",
  },
  ryukuzan: {
    id: "ryukuzan",
    name: "Ryukuzan",
    theme: "Clãs & Tradição Marcial",
    description: "Fortalezas nas montanhas, clãs honrados, armarias lendárias e duelo marcial.",
  },
  eldravya: {
    id: "eldravya",
    name: "Eldravya",
    theme: "Florestas & Magia Antiga",
    description: "Bosques ancestrais, ruínas arcanas, círculos druídicos e relíquias místicas.",
  },
  kadesh_ael: {
    id: "kadesh_ael",
    name: "Kadesh-ael",
    theme: "Deserto & Tumbas Perdidas",
    description: "Dunas infinitas, caravanas do deserto, templos solares e criptas esquecidas.",
  },
};

export interface KingdomProgressionState {
  kingdomId: KingdomId;
  regionalRenown: number;    // 1-10
  heroGuildLevel: number;    // 1-10
  blackHouseLevel: number;   // 1-10
}

/**
 * Calcula a moralidade resultante da Party combinando os 3 personagens ativos.
 */
export function calculatePartyMorality(partyMorals: MoralityProfile[]): MoralityProfile {
  if (!partyMorals.length) return { hero: 33, neutral: 34, villain: 33 };

  const count = partyMorals.length;
  const heroSum = partyMorals.reduce((sum, m) => sum + m.hero, 0);
  const neutralSum = partyMorals.reduce((sum, m) => sum + m.neutral, 0);
  const villainSum = partyMorals.reduce((sum, m) => sum + m.villain, 0);

  return {
    hero: Math.round(heroSum / count),
    neutral: Math.round(neutralSum / count),
    villain: Math.round(villainSum / count),
  };
}
