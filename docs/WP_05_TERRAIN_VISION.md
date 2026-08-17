# WP-05 — Terreno, Obstáculos, Cobertura, Linha de Visão e Neblina Real

Status: **concluído para combate solo / base preparada para IA tática e co-op**

## Objetivo

Fazer o mapa hexagonal alterar decisões de combate de verdade. O mesmo grupo deve jogar de forma diferente em campo aberto, mapa com obstáculos e mapa com neblina.

## Estrutura adicionada ao domínio

- `BattlefieldState`: estado físico da arena.
- `BattleTerrainCell`: terreno, custo de movimento, cobertura e obstáculo por hex.
- `BattleFogState`: condição de neblina e visão-base.
- `TerrainKind`: `plain`, `forest`, `ruins`, `swamp`, `sand`, `glass`, `rift`.
- `ObstacleKind`: `tree`, `rock`, `pillar`, `wall`, `crystal`.
- `visionRange`, `visionTraits` e `rangeBonus` em `HuntCombatant`.

## Terreno e movimento

- O board permanece com 37 hexes.
- Terreno normal custa 1 ponto de movimento.
- Floresta, pântano e fenda podem custar 2.
- Hex bloqueado nunca entra em `reachableCells()`.
- A IA usa a mesma função de pathfinding/custo do Player.
- Push/Pull não atravessa obstáculo bloqueado.

## Perfis por região

### FiorDeValle

- floresta, ruínas e pântano;
- árvores, parede e rocha;
- maior incidência de Neblina.

### Eldravia

- vidro, ruínas e fendas;
- cristais e pilares;
- pode receber Névoa de Ruptura.

### Dustfall

- areia, ruínas e terreno lodoso/escória;
- rochas e paredes;
- pode receber Bruma de Escória.

`createBattlefield(regionId, variant)` permite batalhas abertas ou com baixa visão no mesmo Reino sem mudar o motor.

## Linha de visão

- `hexLine()` continua sendo a geometria base.
- `hasLineOfSight()` rejeita ataques quando existe obstáculo bloqueador entre atacante e alvo.
- Campo aberto não significa visão através de parede.
- Habilidades ofensivas e debuffs dirigidos ao Player respeitam linha de visão.
- Reações de movimento respeitam range + linha de visão.
- Companion só seleciona alvo que o Player consegue enxergar.

## Neblina e percepção

- Neblina agora é condição da batalha, não toggle do jogador.
- `canUnitSeeCell()` combina distância visual + linha de visão.
- Inimigo fora da visão não pode ser selecionado.
- A UI mascara nome, retrato, HP e Speed de inimigos ocultos.
- Hexes fora da visão ficam escurecidos.
- Telegraph só aparece nos hexes que o Player consegue perceber.

## Visão por classe/criatura

Base atual:

- Guardião: 3.
- Duelista: 3.
- Samurai: 4.
- Mago: 3 + `darkvision` = 4 em neblina.
- Arqueiro: 3 + `keen_sight` = 4.
- Arqueiro com `Olho de Falcão`: visão-base 4 + `keen_sight` = 5 e `RANGE +1`.

Criaturas caster/skirmisher começam com visão maior. Vampiros, criaturas de névoa e alguns predadores noturnos recebem `fog_sight`, que ignora o limite de distância da neblina, mas não atravessa obstáculo que bloqueia LoS.

## Cobertura

- Cobertura pertence ao hex ocupado pelo defensor.
- Só reduz ataques à distância (`distância > 1`).
- É aplicada antes de Defesa Física/Mágica.
- Ruínas fornecem a cobertura mais forte nos perfis iniciais.
- Forestas podem oferecer cobertura leve.
- A regra é compartilhada por Player, IA, reações e companion.

## UI

- terreno tem leitura visual própria;
- obstáculos recebem glyph no hex;
- cobertura usa borda tracejada;
- inimigos ocultos aparecem como `Presença Oculta` na ribbon;
- inimigos ocultos da iniciativa viram `?` e escondem Speed;
- painel de condição mostra Neblina ativa/inativa e alcance visual do herói;
- a neblina não pode ser desligada pelo Player durante a luta.

## Validação executada

- 37 hexes no board.
- FiorDeValle: 4 obstáculos físicos no perfil-base.
- Nenhum hex bloqueado aparece como alcançável.
- Linha de visão de `(0,2)` para `(-2,0)` foi bloqueada por obstáculo.
- Disparo contra alvo sem LoS foi recusado sem causar dano.
- Herói comum em neblina: visão 3.
- Arqueiro: visão 4.
- `Olho de Falcão`: visão 5 e range de uma habilidade RANGE 3 passa a 4.
- Cobertura de 50% reduziu dano bruto de 100 para 50 antes da Defesa.
- `@rupterya/game-core`: typecheck e build aprovados.
- `page.tsx` + componentes importados: checagem TypeScript com stubs de React/Supabase aprovada; `apps/web/lib/**/*.ts` também passou typecheck isolado com path para o `game-core`.

## Limitações deliberadas

- A IA ainda usa a posição real do Player como direção abstrata de busca quando não o enxerga; memória de última posição conhecida e exploração de neblina entram na Fase 6.
- Cobertura é por hex, ainda não direcional por lado do obstáculo.
- Terreno é perfil de região + variante de batalha; ligação fina a cada spot/instância pode ser adicionada na produção de conteúdo sem alterar o motor.
- Co-op ainda precisa calcular visão combinada/compartilhada entre Players na Fase 8.

## Próximo

**WP-06 — IA tática por arquétipo e criatura.**
