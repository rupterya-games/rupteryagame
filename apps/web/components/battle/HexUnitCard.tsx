"use client";

import React from "react";

export type HexUnitCardProps = {
  id: string;
  name: string;
  portraitPath?: string;
  hpCurrent: number;
  hpMax: number;

  side: "player" | "enemy" | "companion";

  selected?: boolean;
  targetable?: boolean;
  activeTurn?: boolean;

  borderColor?: string;
  portraitPosition?: string;
  portraitScale?: number;
  unitKey?: string;

  style?: React.CSSProperties;
  className?: string;

  onClick?: () => void;
  onDoubleClick?: () => void;
  children?: React.ReactNode;
};

type TokenVisual = {
  mono: string;
  role: string;
  fillStart: string;
  fillEnd: string;
  core: string;
  frame: string;
  accent: string;
  text: string;
};

const SVG_HEX_POINTS = "50,3 92,28 92,78 50,103 8,78 8,28";
const SVG_HEX_INNER_POINTS = "50,10 85,31 85,75 50,96 15,75 15,31";
const SVG_HEX_CORE_POINTS = "50,16 80,34 80,72 50,90 20,72 20,34";

function normalizeKey(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function resolveVisual(unitKey: string, side: HexUnitCardProps["side"]): TokenVisual {
  const key = normalizeKey(unitKey);
  if (key.includes("samurai") || key.includes("kael")) return { mono: "SA", role: "Ryukuzan", fillStart: "#f3d176", fillEnd: "#a87418", core: "#f7e6aa", frame: "#f0cf71", accent: "#5b390d", text: "#2a1707" };
  if (key.includes("archer") || key.includes("arqueir") || key.includes("elyra")) return { mono: "AR", role: "Atirador", fillStart: "#67d4ca", fillEnd: "#2a8f90", core: "#d5fff8", frame: "#84f0df", accent: "#104948", text: "#062829" };
  if (key.includes("mage") || key.includes("mago")) return { mono: "MG", role: "Arcano", fillStart: "#7db6ff", fillEnd: "#435cd0", core: "#e5f0ff", frame: "#9fc4ff", accent: "#161f63", text: "#0c1439" };
  if (key.includes("palad") || key.includes("guard") || key.includes("aldren")) return { mono: "PL", role: "Vanguarda", fillStart: "#7aa6ff", fillEnd: "#325fba", core: "#e7f0ff", frame: "#9dc1ff", accent: "#102a5e", text: "#0a1736" };
  if (key.includes("orc")) return { mono: "OR", role: "Brutal", fillStart: "#c87058", fillEnd: "#70301f", core: "#ffd8c7", frame: "#e29982", accent: "#38140d", text: "#250d08" };
  if (key.includes("goblin") || key.includes("lebre") || key.includes("saqueador")) return { mono: "GB", role: "Bando", fillStart: "#8cc96b", fillEnd: "#426928", core: "#e6ffd8", frame: "#a8e67f", accent: "#18310b", text: "#0d2305" };
  if (key.includes("xama") || key.includes("shaman")) return { mono: "XM", role: "Ritual", fillStart: "#bc91f2", fillEnd: "#6f41b2", core: "#f0e4ff", frame: "#d2afff", accent: "#29114c", text: "#18092b" };
  if (side === "enemy") return { mono: "EN", role: "Inimigo", fillStart: "#d47474", fillEnd: "#7a252a", core: "#ffe0de", frame: "#ec8f8f", accent: "#3d1115", text: "#260b0d" };
  return { mono: "AL", role: side === "companion" ? "Aliado" : "Player", fillStart: "#78d8d6", fillEnd: "#2f8ca4", core: "#e3ffff", frame: "#93eff1", accent: "#12394b", text: "#0a2430" };
}

function shortName(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return first.length > 11 ? `${first.slice(0, 10)}…` : first;
}

export function HexUnitCard({
  id,
  name,
  hpCurrent,
  hpMax,
  side,
  selected = false,
  targetable = false,
  activeTurn = false,
  borderColor,
  unitKey,
  style,
  className,
  onClick,
  onDoubleClick,
  children,
}: HexUnitCardProps) {
  const hpPercent = hpMax > 0 ? Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100)) : 0;
  const visual = resolveVisual(unitKey ?? name, side);
  const frameColor = borderColor ?? visual.frame;
  const tokenId = `token-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  const dynamicStyle: React.CSSProperties = {
    ...style,
    ...(frameColor ? ({ "--unit-frame-color": frameColor } as React.CSSProperties) : {}),
    ...(visual.accent ? ({ "--unit-core-accent": visual.accent } as React.CSSProperties) : {}),
  };

  return (
    <button
      type="button"
      className={[
        "hex-unit-card",
        `hex-unit-${side}`,
        selected ? "is-selected" : "",
        targetable ? "is-targetable" : "",
        activeTurn ? "is-active-turn" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={dynamicStyle}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {children}

      <svg className="hex-unit-svg" viewBox="0 0 100 106" aria-hidden="true">
        <defs>
          <linearGradient id={`${tokenId}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={visual.fillStart} />
            <stop offset="100%" stopColor={visual.fillEnd} />
          </linearGradient>
          <linearGradient id={`${tokenId}-top`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,.36)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        <polygon points={SVG_HEX_POINTS} className="hex-unit-svg-shadow" />
        <polygon points={SVG_HEX_POINTS} fill={frameColor} className="hex-unit-svg-frame" />
        <polygon points={SVG_HEX_INNER_POINTS} fill={`url(#${tokenId}-fill)`} className="hex-unit-svg-inner" />
        <polygon points={SVG_HEX_CORE_POINTS} fill="rgba(6, 10, 12, 0.18)" className="hex-unit-svg-core" />
        <polygon points="50,16 80,34 80,52 50,69 20,52 20,34" fill={`url(#${tokenId}-top)`} className="hex-unit-svg-topshine" />

        <circle cx="50" cy="42" r="17" fill={visual.core} opacity="0.95" />
        <circle cx="50" cy="42" r="14.5" fill="rgba(255,255,255,.12)" stroke={visual.accent} strokeWidth="1.8" />
        <text x="50" y="46" textAnchor="middle" className="hex-unit-svg-mono" fill={visual.text}>
          {visual.mono}
        </text>

        <text x="50" y="18" textAnchor="middle" className="hex-unit-svg-role">
          {visual.role.toUpperCase()}
        </text>

        <path d="M22 67 L78 67 L72 84 L28 84 Z" className="hex-unit-svg-band" fill="rgba(8, 11, 13, 0.8)" stroke="rgba(255,255,255,.18)" strokeWidth="0.9" />
        <text x="50" y="75.5" textAnchor="middle" className="hex-unit-svg-name">
          {shortName(name)}
        </text>

        <rect x="24" y="87" width="52" height="4.8" rx="2.4" fill="rgba(15, 18, 20, 0.7)" stroke="rgba(255,255,255,.12)" strokeWidth="0.8" />
        <rect x="24" y="87" width={Math.max(4, 52 * hpPercent / 100)} height="4.8" rx="2.4" className="hex-unit-svg-hp" />
      </svg>
    </button>
  );
}
