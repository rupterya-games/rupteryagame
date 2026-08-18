/**
 * battle-layout.ts — Geometria e Escala Visual do Campo Hexagonal de Rupterya
 *
 * Fonte única de verdade para dimensões, escala de unidades e conversão axial -> pixel.
 */

export const BATTLE_HEX_RADIUS = 54;
export const BATTLE_UNIT_SCALE = 0.88;
export const BATTLE_PORTRAIT_SCALE = 1.15;

export const BATTLE_HEX_WIDTH = Math.sqrt(3) * BATTLE_HEX_RADIUS; // ~93.53px
export const BATTLE_HEX_HEIGHT = BATTLE_HEX_RADIUS * 2; // 108px

export const BATTLE_UNIT_WIDTH = BATTLE_HEX_WIDTH * BATTLE_UNIT_SCALE;
export const BATTLE_UNIT_HEIGHT = BATTLE_HEX_HEIGHT * BATTLE_UNIT_SCALE;

export type Axial = {
  q: number;
  r: number;
};

/**
 * Retorna as coordenadas em pixels do CENTRO do hexágono.
 * Use sempre transform: translate(-50%, -50%) para centralizar peças.
 */
export function axialToPixel(cell: Axial, radius = BATTLE_HEX_RADIUS): { x: number; y: number } {
  return {
    x: radius * Math.sqrt(3) * (cell.q + cell.r / 2),
    y: radius * 1.5 * cell.r,
  };
}

/**
 * Retorna a lista de pontos SVG para desenhar o polígono do hexágono pontudo/pointy-topped.
 */
export function hexCorners(cx: number, cy: number, radius = BATTLE_HEX_RADIUS): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i + 30);
    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return points.join(" ");
}

export interface UnitPortraitCrop {
  portraitPosition: string;
  portraitScale: number;
}

const DEFAULT_CROP: UnitPortraitCrop = {
  portraitPosition: "50% 18%",
  portraitScale: 1.06,
};

const CROP_MAP: Record<string, UnitPortraitCrop> = {
  samurai: { portraitPosition: "50% 18%", portraitScale: 1.12 },
  kael: { portraitPosition: "50% 18%", portraitScale: 1.12 },
  archer: { portraitPosition: "50% 14%", portraitScale: 1.08 },
  arqueira: { portraitPosition: "50% 14%", portraitScale: 1.08 },
  elyra: { portraitPosition: "50% 14%", portraitScale: 1.08 },
  mage: { portraitPosition: "50% 16%", portraitScale: 1.10 },
  mago: { portraitPosition: "50% 16%", portraitScale: 1.10 },
  paladin: { portraitPosition: "50% 16%", portraitScale: 1.10 },
  paladino: { portraitPosition: "50% 16%", portraitScale: 1.10 },
  aldren: { portraitPosition: "50% 16%", portraitScale: 1.10 },
  orc: { portraitPosition: "50% 12%", portraitScale: 1.06 },
  goblin: { portraitPosition: "50% 12%", portraitScale: 1.04 },
  shaman: { portraitPosition: "50% 10%", portraitScale: 1.08 },
  xama: { portraitPosition: "50% 10%", portraitScale: 1.08 },
  xamã: { portraitPosition: "50% 10%", portraitScale: 1.08 },
  undead: { portraitPosition: "50% 15%", portraitScale: 1.10 },
  necromancer: { portraitPosition: "50% 15%", portraitScale: 1.10 },
  stone_guardian: { portraitPosition: "50% 14%", portraitScale: 1.08 },
  guardiao: { portraitPosition: "50% 14%", portraitScale: 1.08 },
};

/**
 * Retorna o enquadramento ideal de retrato (cintura/peito para cima, sem cortar cabeça).
 */
export function getUnitPortraitCrop(identifier?: string): UnitPortraitCrop {
  if (!identifier) return DEFAULT_CROP;
  const key = identifier.toLowerCase().trim();
  for (const [k, crop] of Object.entries(CROP_MAP)) {
    if (key.includes(k)) return crop;
  }
  return DEFAULT_CROP;
}
