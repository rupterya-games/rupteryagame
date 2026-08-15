# Rupterya V4 — mapas interativos, criaturas visuais e regras de turno

## Objetivo

Esta revisão corrige duas regressões do V3:

1. a navegação de cidade/instância não pode ser apenas uma imagem conceitual estática;
2. o combate precisa deixar MP e recarga claros e funcionais por turno.

## Mapas

- `CityHub.tsx` usa uma imagem de mapa real como superfície de navegação e posiciona Centro, Mercado, Mural, Black Market e Portões como botões DOM sobre a imagem.
- `GateMap.tsx` posiciona as quatro saídas como botões sobre o mapa da cidade.
- Cada um dos 36 níveis de instância possui uma arte em `public/art/maps/instances/`.
- Os 6/7 spots são botões sobre a própria imagem da instância. A imagem é cenário; os spots continuam sendo elementos interativos e acessíveis.
- Os níveis 1 → 2 → 3 continuam respeitando o desbloqueio pela conclusão dos spots do nível anterior.

## Criaturas

- Toda criatura do bestiário agora recebe `portraitPath`.
- As criaturas que já possuíam arte mantêm a arte original.
- As demais recebem cartas visuais geradas a partir das folhas de arte do bestiário e salvas em `public/art/creatures/generated/`.
- `GateMap` mostra uma galeria clicável das criaturas possíveis antes da exploração.
- Ao clicar numa criatura, o jogador vê imagem, família, raridade, nível, descrição e stats básicos.
- Em combate, o mesmo `portraitPath` é encaminhado para a carta do inimigo, eliminando cartas sem imagem.

## MP por turno

A regeneração está centralizada em:

`packages/game-core/src/rules.ts`

```ts
export const PLAYER_MP_REGEN_PER_TURN = 6;
```

O valor é aplicado no início de cada turno do jogador, inclusive no primeiro turno da batalha, sem ultrapassar `mpMax`.

## Recarga

A regra preservada é:

> Recarga desce no início do turno do dono.

A habilidade usada recebe sua recarga cheia. Quando começa o próximo turno do jogador, todas as recargas descem em 1. A UI bloqueia a habilidade enquanto o contador restante for maior que zero e mostra `Recarga: XT` no próprio botão.

Exemplo com Recarga 2:

- Turno 1: usa a habilidade.
- Início do Turno 2: 2 → 1, habilidade ainda bloqueada.
- Início do Turno 3: 1 → 0, habilidade volta a ficar disponível.

## Arquivos principais

- `apps/web/components/CityHub.tsx`
- `apps/web/components/GateMap.tsx`
- `apps/web/app/globals.css`
- `apps/web/app/page.tsx`
- `apps/web/lib/bestiary.ts`
- `packages/game-core/src/rules.ts`
- `apps/web/public/art/maps/cities/`
- `apps/web/public/art/maps/instances/`
- `apps/web/public/art/creatures/generated/`
