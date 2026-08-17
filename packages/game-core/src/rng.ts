/**
 * rng.ts — Geradores de número aleatório determinísticos (Rupterya V1)
 *
 * O motor de combate (action-resolver.ts) aceita um `rng: () => number` injetável.
 * Por padrão usa Math.random, mas testes e replays determinísticos podem injetar
 * um gerador com semente fixa, mantendo o servidor como autoridade reproduzível de RNG.
 */

/** PRNG mulberry32 — rápido, determinístico, mesma semente sempre produz a mesma sequência em [0, 1). */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RNG de teste: devolve exatamente os valores fornecidos em ordem; repete o último valor se a sequência acabar. */
export function createSequenceRng(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[Math.min(index, values.length - 1)] ?? 0;
    index += 1;
    return value;
  };
}

/** Sempre "acerta" rolagens percentuais (retorna 0 — qualquer chance > 0% dispara). */
export const ALWAYS_ROLL_RNG = () => 0;

/** Sempre "erra" rolagens percentuais (retorna valor próximo de 1 — só chances de 100% disparam). */
export const NEVER_ROLL_RNG = () => 0.999999;
