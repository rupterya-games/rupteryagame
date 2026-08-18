# WORKLOG — 2026-08-18 — Hex Token Restructure

## Objetivo
Reestruturar a apresentação visual da batalha hexagonal para o padrão R3 com 37 hexes, removendo a dependência de retratos no tabuleiro e substituindo-os por peças hexagonais coesas.

## Alterações realizadas

### 1) Peças do tabuleiro
- `HexUnitCard` foi reconstruído como token hexagonal nativo em SVG.
- As unidades deixam de usar retratos no tabuleiro.
- Cada peça agora contém:
  - moldura hexagonal;
  - preenchimento por gradiente;
  - monograma por classe/família;
  - faixa de nome;
  - barra de HP.

### 2) Coesão visual
- Players, companions e inimigos usam a mesma linguagem visual.
- Cores e monogramas foram padronizados para:
  - Samurai / Kael;
  - Arqueira / Elyra;
  - Mago;
  - Paladino / Aldren;
  - Orc;
  - Goblin / Saqueador / Lebre;
  - Xamã.

### 3) Centralização no hex
- O card continua ancorado pelo centro do hex com `translate(-50%, -50%)`.
- O hover deixou de empurrar a peça para cima.
- A escala do token foi reduzida e estabilizada para ficar melhor contida dentro do hex.

### 4) Interface de batalha
- A fita de iniciativa agora usa badges monogramados, sem retratos.
- O painel inferior do ator do turno agora usa badge coeso em vez de imagem.
- Isso elimina ícones quebrados e mantém a identidade do campo.

## Arquivos alterados
- `apps/web/components/battle/HexUnitCard.tsx`
- `apps/web/components/battle/BattleUnitBadge.tsx` (novo)
- `apps/web/app/page.tsx`
- `apps/web/app/globals.css`

## Observação
As imagens originais permanecem no projeto para outras telas, mas o combate passou a usar tokens hexagonais coesos por padrão.
