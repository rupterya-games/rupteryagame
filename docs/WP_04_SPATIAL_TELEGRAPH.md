# WP-04 — Alcance, Áreas e Intenção Visual

Status: **concluído para combate solo / base preparada para co-op**

## Objetivo

Transformar alcance e carregamento em informação espacial real no tabuleiro, de modo que o jogador consiga prever o resultado antes de gastar a ação.

## Implementado no motor

- `AbilityAreaDefinition` compartilhada por habilidades do Player e das criaturas.
- Formas: `single`, `radius`, `ring`, `line`, `cone`, `connected` e `all`.
- `abilityAreaCells()` é a fonte única da geometria usada por preview e resolução.
- Habilidades do Player com área acertam todos os inimigos ativos cujas posições estão nos hexes afetados.
- Carregamentos da IA salvam `targetCell`, `affectedCells` e `startedTurn`.
- A resolução de um carregamento consulta a área congelada; mover para fora dela evita o golpe.
- Dano que acerta uma IA carregando continua interrompendo o cast e aplicando recarga completa.
- Push / Pull / deslocamento forçado procuram hex válido, respeitam borda do tabuleiro e ocupação.
- `Golpe de Escudo` do Guardião: Push 1.
- `Dobra de Posição` do Tecelão da Ruptura passa a deslocar o Player de verdade.

## Implementado na UI

- alcance geral da habilidade recebe contorno próprio;
- área final física e mágica são diferenciadas;
- hexes ameaçados por carregamentos da IA pulsam em vermelho;
- card/ribbon da IA mostra `⚠ habilidade` enquanto carrega;
- barra de habilidade exibe forma espacial (`Linha`, `Cone`, `Raio`, etc.);
- indicador tático informa quantos carregamentos estão ativos.

## Habilidades de classe com geometria inicial

- Guardião: `Lança do Bastião` = Linha; Ultimate = Cone; `Golpe de Escudo` = Push 1.
- Duelista: `Dança das Lâminas` = Raio 1; Ultimate = Raio 1.
- Arqueiro: `Tiro Perfurante` = Linha; `Chuva de Fiordevalle` = Raio 2.
- Mago: `Lança de Brasa` = Linha; `Prisma Congelante` e `Ruptura Arcana` = Raio 1; `Tempestade de Rupterya` = Raio 2.
- Samurai: `Corte Ascendente` = Linha; `Lua Partida` e Ultimate = Cone.

## Testes executados

1. Geometria em board de 37 hexes: single=1, raio1=7, anel1=6, linha3=3, cone1=3, connected custom=3, all=37.
2. Habilidade Raio 1 mirando uma IA atingiu 3 IAs posicionadas dentro da área.
3. IA iniciou carregamento em `(0,2)`; Player moveu para `(1,1)`; resolução não causou dano e removeu o carregamento.
4. `@rupterya/game-core`: `typecheck` e `build` aprovados.
5. `page.tsx`: parser TypeScript sem erros de sintaxe; typecheck Web completo continua dependente das dependências Next/React não presentes no ZIP.

## Pendências deliberadas

- atribuir `range` e `area` manualmente às 112 habilidades de criatura; hoje todas funcionam por fallback/inferência, mas a revisão final deve ser explícita;
- áreas que acertam múltiplos Players dependem da migração do estado de batalha para co-op;
- obstáculos e linha de visão não fazem parte deste WP.

## Próximo

**WP-05 — Terreno, obstáculos, linha de visão e neblina real.**
