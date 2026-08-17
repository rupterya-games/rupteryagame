# WP-06 — IA Tática por Arquétipo e Criatura

Status: **Concluído no solo — 17/08/2026**

## Objetivo

Fazer a IA usar o mesmo tabuleiro que o Player usa: distância, alcance, facing, frente/flanco/costas, cobertura, terreno, linha de visão, neblina, cooldown e condição de habilidade passam a influenciar a decisão.

## Perfis implementados

- **Flanker** — Goblins/Skirmishers: procuram flanco e costas; se ainda estão longe, primeiro aproximam e depois giram em torno do alvo.
- **Enforcer** — Orcs/Brutes: avançam para adjacência e pressionam território, aceitando maior risco.
- **Artillery** — Casters: procuram RANGE útil, linha de visão e cobertura; recuam se o alvo invade a distância segura.
- **Predator** — Vampiros/predadores da bruma: favorecem flanco/costas e posições em que conseguem ver sem serem facilmente vistos; contra alvo ferido aumentam a pressão.
- **Sentinel** — Tanks: protegem primeiro líderes, depois casters/aliados vulneráveis; procuram interceptar a linha Player → aliado.
- **Swarm** — enxames: tentam ocupar direções diferentes ao redor do alvo para cercar em vez de empilhar no mesmo lado.
- **Controller** — líderes/bosses com área ou carregamento: mantêm posição adequada para ameaçar zonas do campo.

## Memória e neblina

A IA não usa a posição real do Player quando não poderia vê-la. Cada combatente possui `lastKnownTargetPosition`.

1. Se vê o Player, atualiza a memória.
2. Se perde a visão, busca o último hex conhecido.
3. Se nunca viu o Player, procura o centro/rota provável em vez de “rastrear por código”.
4. Se reencontra o Player durante o movimento, pode escolher a melhor habilidade disponível naquele momento.

Isso mantém a neblina como mecânica real para os dois lados.

## Seleção de habilidade

A habilidade não é mais escolhida apenas pela primeira entrada disponível. A pontuação considera:

- `aiTrigger`;
- cooldown;
- `oncePerBattle`;
- silêncio para magia;
- possibilidade de entrar em RANGE após o movimento;
- linha de visão;
- scaling;
- utilidade defensiva em HP baixo;
- presença de aliados;
- área/carregamento para Controllers.

Habilidades condicionais continuam prioritárias, mas uma habilidade impossível espacialmente pode perder para uma opção realmente executável.

## Formação e líder

- Líderes evitam mergulhar em adjacência enquanto ainda possuem apoio.
- Sentinelas tentam proteger líder/caster/aliado vulnerável.
- A regra anterior de moral do bando continua ativa: se a formação teve um líder e ele morreu, unidades `fodder` causam **25% menos dano**.

## Intenção no HUD

Inimigos visíveis podem mostrar intenções como:

- Flanquear / Buscar costas
- Avançar / Pressionar
- Recuar / Buscar cobertura / Manter distância
- Proteger líder / Proteger formação
- Cercar
- Caçar alvo
- Controlar zona

Inimigos ocultos pela neblina **não revelam intenção**, para não vazar informação.

## Validações executadas

- `@rupterya/game-core` typecheck: **PASS**
- `@rupterya/game-core` build: **PASS**
- Goblin: frente → flanco → costas em rodadas sucessivas: **PASS**
- Caster: manutenção de distância 3: **PASS**
- Tank: intenção de proteger formação: **PASS**
- Perfis Vampire/Orc/Swarm/Tank derivados corretamente: **PASS**
- Neblina sem contato: IA permanece sem `lastKnownTargetPosition` e entra em `Procurar alvo`: **PASS**
- Controller derivado para líder com habilidade de área/carregamento: **PASS**

## Limitações deliberadas

- Em solo existe apenas um alvo Player. A prioridade de Vampiro por “personagem isolado/ferido” só poderá selecionar entre personagens diferentes quando o estado de batalha suportar 2–3 Players (Fase 8).
- Pathfinding ainda usa custo de terreno e ocupação, mas não possui mapa de influência persistente de vários turnos; não é necessário para o critério do WP-06.
- Bosses já ameaçam zonas via WP-04. Alteração permanente/destrutível do terreno pode ser acrescentada futuramente como conteúdo de boss, sem mudar o contrato da IA.

## Próximo work

**WP-07 — Keywords e equipamento tático.**
