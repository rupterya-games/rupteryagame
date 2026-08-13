import type { CharacterCombatStats } from "@rupterya/game-core";

export function CombatStats({ stats }: { stats: CharacterCombatStats }) {
  const rows = [
    ["Dano Físico", stats.physicalDamage],
    ["Dano Mágico", stats.magicalDamage],
    ["Defesa Física", stats.physicalDefense],
    ["Defesa Mágica", stats.magicalDefense],
    ["Crítico", `${stats.criticalChance}%`],
    ["Esquiva", `${stats.dodgeChance}%`],
  ];

  return (
    <section className="panel">
      <div className="section-title"><span>Ficha de Combate</span><button type="button">Ver personagem</button></div>
      <div className="stats-grid">
        {rows.map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}
      </div>
    </section>
  );
}
