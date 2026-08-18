# Worklog — Battle Lab Integration R1

Data: 2026-08-18

## Objetivo
Transportar para a batalha real do projeto o padrão visual aprovado no laboratório HTML de Rupterya, sem alterar regras do motor de combate.

## Implementado
- Mantidos os 37 hexes e a geometria axial existente.
- Campo real passa a usar arte de cenário como fundo visível, com grid translúcido por cima.
- Adicionado cenário Ryukuzan com torii em cima/baixo para uso do reino e fallback visual.
- `HexUnitCard` agora escala proporcionalmente ao board em vez de manter dimensões fixas em pixels.
- Peças continuam ancoradas no centro do hex por `translate(-50%, -50%)`.
- Moldura das unidades refeita em SVG hexagonal e mantida integralmente dentro da peça.
- Enquadramento individual de retratos por classe/monstro, privilegiando peito/cintura para cima.
- Molduras genéricas por identidade/raridade no campo.
- Skins básicas aprovadas aplicadas a Samurai, Arqueira e Mago.
- Artes básicas adicionadas para Orc, Goblin e Xamã.
- Corrigidos caminhos quebrados dos portraits de companions: Aldren/Kael/Elyra.
- Aldren usa temporariamente a arte base do Guardião até existir uma skin básica específica de Paladino.
- Grid/terrain/alcance permanecem visíveis sobre o cenário sem ocultá-lo completamente.

## Arquivos principais alterados
- `apps/web/app/page.tsx`
- `apps/web/app/globals.css`
- `apps/web/components/battle/HexUnitCard.tsx`
- `apps/web/lib/battle-layout.ts`
- `apps/web/lib/catalog.ts`
- `apps/web/lib/bestiary.ts`
- `packages/game-core/src/companions.ts`

## Assets adicionados
- `apps/web/public/art/boards/ryukuzan-torii-board.png`
- `apps/web/public/art/creatures/basic/orc-basic.png`
- `apps/web/public/art/creatures/basic/goblin-basic.png`
- `apps/web/public/art/creatures/basic/shaman-basic.png`

## Assets base atualizados
- `apps/web/public/art/classes/samurai.jpeg`
- `apps/web/public/art/classes/archer.jpeg`
- `apps/web/public/art/classes/mage.jpeg`

## Validação
- `game-core`: checagem semântica TypeScript e build passaram com declaração temporária somente para `process`, necessária porque o ZIP não contém `@types/node` instalado.
- Arquivos TS/TSX modificados: sintaxe validada via TypeScript `transpileModule`.
- Todos os novos caminhos de assets foram verificados no filesystem.
- `node_modules` não é incluído no ZIP; portanto não foi executado `next build` completo nesta sessão.
