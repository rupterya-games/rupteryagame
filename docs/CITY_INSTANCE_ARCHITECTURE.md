# Arquitetura de cidades e instâncias

## Fluxo principal

O mapa de jornada deixa de ser uma árvore única com bairro, casas, portão e floresta misturados no mesmo plano.

O fluxo passa a ser:

`Cidade -> Núcleo urbano -> Portões/Portais -> Saída -> Instância Nível 1/2/3 -> 6 ou 7 spots -> Evento ou Combate`

Cada cidade é um hub independente. Atualmente existem três configurações: `FiorDeValle`, `Eldravia` e `Dustfall`.

## Núcleo urbano

Toda cidade possui cinco áreas internas:

- Centro: descanso e preparação.
- Mercado: compra real de itens com ouro; a compra adiciona o item ao inventário.
- Mural/Arquivo de Missões: contratos ligados a uma instância específica.
- Black Market: itens de raridade e preço maiores.
- Portões/Portais: quatro saídas externas.

## Saídas e níveis de instância

Cada cidade tem quatro saídas: Norte, Sul, Leste e Oeste. Cada saída possui três níveis de instância.

Cada nível declara:

- nome;
- faixa de nível recomendada;
- quantidade de spots (6 ou 7);
- pool de criaturas;
- pool de eventos.

Os spots só podem ser explorados uma vez por tentativa. Cada clique pode resultar em encontro, evento ou travessia sem combate.

## Progressão por cidade

### FiorDeValle

Faixa geral de início: aproximadamente níveis 1 a 20. Usa animais, saqueadores, Horda Verde, mortos-vivos e vampiros já definidos no bestiário.

### Eldravia

Faixa intermediária: aproximadamente níveis 15 a 35. Usa criaturas arcanas do Arquivo Externo, Claustro de Vidro e Fenda Aberta.

### Dustfall

Faixa avançada: aproximadamente níveis 24 a 50. Usa Horda Verde, Campos de Escória, Salinas e Cratera.

## Bestiário e combate

As instâncias usam IDs do bestiário real (`apps/web/lib/bestiary.ts`) em vez de uma lista genérica por cidade. Assim, cada bioma e nível controla quais criaturas podem aparecer.

As criaturas do bestiário são convertidas para o formato de caça no momento do encontro. Raridades `elite`, `boss` e `worldboss` entram no combate de caça como categoria de chefe.

O combate agora preserva também `magicalDamage` das criaturas. Se o dano mágico de uma criatura for maior que o físico, o ataque inimigo usa dano mágico e é reduzido pela defesa mágica do personagem. Caso contrário, usa dano físico e defesa física.

## Missões

Cada cidade possui três contratos iniciais. Um contrato aponta para um `levelId` de instância e exige explorar uma quantidade de spots.

Fluxo:

`Aceitar contrato -> Abrir rota -> Explorar spots -> Voltar ao mural -> Receber ouro/XP/item`

O sistema foi feito para ser ampliado depois para objetivos de abate, coleta, chefe, escolta e eventos narrativos.

## Lojas

O Mercado e o Black Market utilizam o catálogo real de equipamentos. A compra:

1. verifica se o personagem já possui o item;
2. verifica o ouro;
3. desconta o preço;
4. adiciona o item ao inventário;
5. persiste a conta no repositório DEV/localStorage.

## Onde alterar conteúdo

A configuração de cidades, saídas, níveis, pools de criaturas, eventos, lojas e missões está centralizada em:

`apps/web/lib/catalog.ts -> adventureCities`

A lista e os atributos completos das criaturas continuam em:

`apps/web/lib/bestiary.ts`

A interface e navegação estão em:

`apps/web/app/page.tsx`

O estilo da interface está em:

`apps/web/app/globals.css`

As regras de dano físico/mágico da caça estão em:

`packages/game-core/src/rules.ts`
