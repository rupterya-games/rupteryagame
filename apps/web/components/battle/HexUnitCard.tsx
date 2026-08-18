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

      <svg className="hex-unit-frame" viewBox="0 0 100 116" aria-hidden="true">
        <polygon
          className="hex-unit-frame-outer"
          points="50,2 94,27 94,89 50,114 6,89 6,27"
        />
        <polygon
          className="hex-unit-frame-inner"
          points="50,8 88,30 88,86 50,108 12,86 12,30"
        />
        <circle className="hex-unit-frame-gem" cx="50" cy="5" r="2.4" />
        <circle className="hex-unit-frame-gem" cx="92" cy="29" r="1.8" />
        <circle className="hex-unit-frame-gem" cx="92" cy="87" r="1.8" />
        <circle className="hex-unit-frame-gem" cx="50" cy="111" r="2.4" />
        <circle className="hex-unit-frame-gem" cx="8" cy="87" r="1.8" />
        <circle className="hex-unit-frame-gem" cx="8" cy="29" r="1.8" />
      </svg>

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
