"use client";

function normalizeKey(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

type Side = "player" | "enemy" | "companion";

type BadgeVisual = {
  mono: string;
  start: string;
  end: string;
  text: string;
};

function resolveBadgeVisual(unitKey: string, side: Side): BadgeVisual {
  const key = normalizeKey(unitKey);
  if (key.includes("samurai") || key.includes("kael")) return { mono: "SA", start: "#f3d176", end: "#a87418", text: "#2a1707" };
  if (key.includes("archer") || key.includes("arqueir") || key.includes("elyra")) return { mono: "AR", start: "#67d4ca", end: "#2a8f90", text: "#062829" };
  if (key.includes("mage") || key.includes("mago")) return { mono: "MG", start: "#7db6ff", end: "#435cd0", text: "#0c1439" };
  if (key.includes("palad") || key.includes("guard") || key.includes("aldren")) return { mono: "PL", start: "#7aa6ff", end: "#325fba", text: "#0a1736" };
  if (key.includes("orc")) return { mono: "OR", start: "#c87058", end: "#70301f", text: "#250d08" };
  if (key.includes("goblin") || key.includes("lebre") || key.includes("saqueador")) return { mono: "GB", start: "#8cc96b", end: "#426928", text: "#0d2305" };
  if (key.includes("xama") || key.includes("shaman")) return { mono: "XM", start: "#bc91f2", end: "#6f41b2", text: "#18092b" };
  if (side === "enemy") return { mono: "EN", start: "#d47474", end: "#7a252a", text: "#260b0d" };
  return { mono: "AL", start: "#78d8d6", end: "#2f8ca4", text: "#0a2430" };
}

export function BattleUnitBadge({
  name,
  unitKey,
  side,
  size = "md",
}: {
  name: string;
  unitKey?: string;
  side: Side;
  size?: "sm" | "md" | "lg";
}) {
  const visual = resolveBadgeVisual(unitKey ?? name, side);
  return (
    <div
      className={`battle-unit-badge ${size} ${side}`}
      style={{
        background: `linear-gradient(180deg, ${visual.start}, ${visual.end})`,
        color: visual.text,
      }}
      aria-hidden="true"
    >
      <span>{visual.mono}</span>
    </div>
  );
}
