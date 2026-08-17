# WP-02 — Posição real e movimento da IA

## Objetivo

Eliminar a geometria baseada em slots fixos sem remover, por enquanto, a regra de linha ativa/reserva. Toda unidade que participa ativamente da rodada ocupa um hex real.

## Tabuleiro

- Raio: 3.
- Total: 37 hexes.
- Player começa na metade inferior: `PLAYER_START_CELL = { q: 0, r: 2 }`.
- IA usa dois grupos de spawn: frente e retaguarda.
- Conjuradores preferem retaguarda; demais arquétipos preferem frente.

## Movimento provisório por arquétipo

Até MOVE virar atributo explícito por criatura:

- `caster`: 2
- `skirmisher`: 2
- `swarm`: 2
- `brute`: 1
- `tank`: 1
- desconhecido: 1

Esses valores são regras de transição e devem migrar para dados quando a fase de balanceamento de arquétipos for fechada.

## Alcance provisório da IA

`CreatureAbilityDefinition.range` agora existe e deve ser usado quando preenchido. Enquanto as 112 habilidades não forem catalogadas com RANGE explícito:

- dano mágico: 3 hexes;
- caster: 3 hexes;
- skirmisher físico: 2 hexes;
- demais físicos: 1 hex;
- `gap_close`: 3 hexes;
- self/buff/battlefield: não exige aproximação.

A Fase 4 substitui esses fallbacks por RANGE explícito em todas as habilidades.

## Comportamento da IA

1. A IA escolhe a habilidade pelas prioridades existentes.
2. Calcula distância real até o Player.
3. Se estiver fora do alcance, usa seu movimento para buscar um hex válido.
4. Casters também tentam recuperar distância quando o Player está perto demais.
5. O destino respeita borda do tabuleiro, Player e outras IAs ativas.
6. Se terminar dentro do alcance, usa a habilidade na mesma rodada.
7. Se continuar fora, não ataca e não coloca a habilidade em cooldown.

## Carregamento

Uma habilidade já carregada não permite reposicionamento gratuito na resolução. Se o Player sair do alcance entre o anúncio e a resolução, o golpe falha por alcance e mantém a recarga já comprometida.

## Geometria preparada

O motor agora expõe:

- `isAdjacent`;
- `isInZoneOfControl`;
- `hexDirectionToward`;
- `relativeArc` (`front`, `flank`, `back`).

Ataque de Oportunidade ainda não é automático: ele será conectado às Keywords para evitar que toda criatura gere reação apenas por existir adjacente.

## Reservas

A regra atual de linha ativa permanece. Uma reserva não ocupa o mapa enquanto está inativa. Quando é promovida para a linha ativa, recebe imediatamente um spawn válido e único conforme seu arquétipo.
