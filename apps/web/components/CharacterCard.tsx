import type { CharacterSummary } from "@rupterya/game-core";

export function CharacterCard({ character }: { character: CharacterSummary }) {
  const hpPct = Math.max(0, Math.min(100, (character.hpCurrent / character.hpMax) * 100));

  return (
    <section className="character-card">
      <div className="portrait" aria-hidden="true">
        <span>⚔</span>
      </div>
      <div className="character-main">
        <div className="eyebrow">{character.kingdom}</div>
        <h1>{character.name}</h1>
        <p>{character.className} · Nv. {character.level}</p>
        <div className="hp-row">
          <span>VIDA</span>
          <strong>{character.hpCurrent}/{character.hpMax}</strong>
        </div>
        <div className="bar"><div className="bar-fill hp" style={{ width: `${hpPct}%` }} /></div>
        <div className="resource-grid">
          <div><small>PODER</small><strong>{character.power.toLocaleString("pt-BR")}</strong></div>
          <div><small>OURO</small><strong>{character.gold.toLocaleString("pt-BR")}</strong></div>
          <div><small>MP</small><strong>{character.mpCurrent}/{character.mpMax}</strong></div>
          <div><small>MORAL</small><strong>{character.morale}/100</strong></div>
        </div>
      </div>
    </section>
  );
}
