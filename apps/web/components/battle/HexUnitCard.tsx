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

  style?: React.CSSProperties;
  className?: string;

  onClick?: () => void;
  onDoubleClick?: () => void;
  children?: React.ReactNode;
};

export function HexUnitCard({
  name,
  portraitPath,
  hpCurrent,
  hpMax,
  side,
  selected = false,
  targetable = false,
  activeTurn = false,
  borderColor,
  portraitPosition,
  portraitScale,
  style,
  className,
  onClick,
  onDoubleClick,
  children,
}: HexUnitCardProps) {
  const hpPercent =
    hpMax > 0
      ? Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100))
      : 0;

  const dynamicStyle: React.CSSProperties = {
    ...style,
    ...(borderColor ? ({ "--unit-frame-color": borderColor } as React.CSSProperties) : {}),
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
      <div className="hex-unit-portrait-mask">
        {portraitPath ? (
          <img
            className="hex-unit-portrait"
            src={portraitPath}
            alt={`Retrato de ${name}`}
            draggable={false}
            style={{
              objectPosition: portraitPosition ?? "50% 18%",
              transform: `scale(${portraitScale ?? 1.06})`,
            }}
          />
        ) : (
          <div className="hex-unit-placeholder">
            {side === "player" || side === "companion" ? "♞" : "☠"}
          </div>
        )}

        <div className="hex-unit-bottom-shade" />
      </div>

      <div className="hex-unit-frame" />

      <div className="hex-unit-info">
        <strong>{name}</strong>

        <div className="hex-unit-hp-track">
          <span
            className="hex-unit-hp-value"
            style={{
              width: `${hpPercent}%`,
            }}
          />
        </div>
      </div>
    </button>
  );
}
