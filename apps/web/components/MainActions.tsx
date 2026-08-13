const actions = [
  ["Caçar", "Escolha uma cidade e saia em busca de criaturas.", "🗡"],
  ["Missões", "Aceite contratos antes de sair para maximizar XP e ouro.", "📜"],
  ["Torre", "Suba até onde sua preparação permitir.", "🏰"],
  ["Arena", "Enfrente snapshots de outros aventureiros.", "🏆"],
  ["Estalagem", "Pague ouro para recuperar sua vida.", "🍺"],
  ["Equipamentos", "Aumente o Poder e ajuste sua build.", "🛡"],
  ["Pets", "Equipe um companheiro para bônus e utilidade.", "🐺"],
  ["Grupo de Aventureiros", "Encontre jogadores que gostam de jogar juntos.", "🧭"],
] as const;

export function MainActions() {
  return (
    <section className="action-grid">
      {actions.map(([title, description, icon]) => (
        <button className="action-card" key={title} type="button">
          <span className="action-icon">{icon}</span>
          <span><strong>{title}</strong><small>{description}</small></span>
        </button>
      ))}
    </section>
  );
}
