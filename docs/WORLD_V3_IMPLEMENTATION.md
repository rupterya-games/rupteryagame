# Mundo V3 — cidades, instâncias, missões e economia

Esta versão consolida o fluxo de exploração de Rupterya em uma arquitetura única e modular.

## Fluxo principal

`Cidade -> serviço interno -> Portões -> saída -> instância Nv. 1/2/3 -> 6/7 spots -> evento ou combate`

As três cidades atuais são `FiorDeValle`, `Eldravia` e `Dustfall`. Cada cidade possui quatro saídas e três instâncias por saída, totalizando 36 instâncias. Cada instância possui uma criatura de assinatura exclusiva e as instâncias de Nível 3 possuem chefe.

## Fonte de verdade

- `apps/web/lib/world.ts`: topologia do mundo, cidades, saídas, níveis, spots, pools de criatura e regras de desbloqueio.
- `apps/web/lib/bestiary.ts`: criaturas e estatísticas; o mundo referencia IDs deste catálogo.
- `apps/web/lib/warbands.ts`: coesão de encontros e criaturas solitárias.
- `apps/web/lib/quests.ts`: contratos reais e objetivos de exploração, abate, chefe e entrega.
- `apps/web/lib/economy.ts`: consumíveis, estoque rotativo, Mercado, Black Market, receptação e custo da Estalagem.
- `apps/web/lib/dev-character-repository.ts`: persistência V3 de progresso, economia e recompensas.

Evite duplicar dados de loja ou missões dentro de `world.ts`. O mundo deve continuar descrevendo topologia e pools; economia e contratos têm módulos próprios.

## UI modular

- `components/CityHub.tsx`: troca de cidade, bloqueios e serviços internos.
- `components/GateMap.tsx`: saídas, níveis e spots.
- `components/QuestBoard.tsx`: contratos e progresso.
- `components/MarketPanels.tsx`: Mercado, Black Market, consumíveis e venda de materiais.

`app/page.tsx` continua orquestrando personagem e combate, mas não deve voltar a concentrar a implementação detalhada desses quatro sistemas.

## Progressão

Dentro de uma mesma saída, Nível 2 só abre quando todos os spots do Nível 1 forem explorados; Nível 3 só abre depois do Nível 2.

Progressão entre cidades:

- FiorDeValle: inicial.
- Eldravia: exige derrotar 2 dos 4 chefes de Nível 3 de FiorDeValle.
- Dustfall: exige derrotar 2 dos 4 chefes de Nível 3 de Eldravia.

O progresso é salvo em `GameCharacter.worldProgress`, não em um segundo `localStorage` paralelo.

## Missões

Há 36 contratos derivados das 36 instâncias. O personagem pode manter até 3 ativos. Objetivos suportados:

- `explore`: explorar spots;
- `kill`: derrotar a criatura de assinatura;
- `boss`: derrotar o chefe da instância;
- `deliver`: entregar materiais coletados.

Contratos concedem ouro, XP global, reputação e, em alguns casos, equipamento. Contratos de chefe não são repetíveis.

## Economia

O Mercado possui estoque determinístico rotativo a cada 6 horas. Reputação libera uma prateleira adicional.

O Black Market usa preços maiores, Notoriedade, uma Caixa Selada e receptação de materiais com multiplicador de 1,45x. Comprar ou vender no Black Market aumenta Notoriedade.

A Estalagem cobra ouro de acordo com a cidade e o nível global.

## Regras para continuar no Codex

1. Novas cidades devem entrar em `world.ts` e receber uma regra explícita de desbloqueio.
2. Toda instância deve ter `signatureCreatureId`; Nível 3 deve ter `bossId`.
3. Todo ID de criatura usado em `world.ts` precisa existir em `bestiary.ts`.
4. Novas missões devem continuar derivadas do mundo sempre que possível, em vez de duplicar rotas manualmente.
5. Toda mudança persistente de ouro, inventário, missões, materiais ou progresso deve passar pelo repositório.
6. Não reintroduzir um save paralelo para exploração.
