# Arquitetura de Cidade, Instâncias e Progressão

## Objetivo

A Jornada não é mais uma árvore única com todos os lugares misturados. Cada cidade é um hub próprio e possui serviços internos, quatro saídas e uma árvore de instâncias externas com progressão sequencial.

Fluxo principal:

```text
Cidade
├── Centro
├── Mercado
├── Mural de Missões
├── Black Market
└── Portões
    ├── Saída Norte
    │   ├── Nível 1 → 6/7 spots
    │   ├── Nível 2 → 6/7 spots
    │   └── Nível 3 → 6/7 spots
    ├── Saída Sul
    ├── Saída Leste
    └── Saída Oeste
```

O mesmo modelo é aplicado a FiorDeValle, Eldravia e Dustfall.

## Dados

A definição das cidades fica em `apps/web/lib/catalog.ts`, no objeto `adventureCities`.

Cada cidade possui:

- `sections`: serviços internos;
- `market`: itens e preços do mercado normal;
- `blackMarket`: itens e preços do mercado clandestino;
- `missions`: contratos ligados a uma instância específica;
- `exits`: quatro rotas externas;
- `levels`: três níveis por rota;
- `creaturePool`: criaturas possíveis daquela instância;
- `eventPool`: eventos de exploração daquele mapa;
- `spotCount`: quantidade de pontos exploráveis.

## Progressão das instâncias

O Nível 1 de cada saída começa liberado. O Nível 2 só é liberado quando todos os spots do Nível 1 daquela mesma saída forem explorados. O Nível 3 só é liberado depois da conclusão do Nível 2.

A progressão de spots é mantida por personagem no `localStorage`, separada da conta principal, usando a chave:

```text
rupterya-adventure-progress-v1:<characterId>
```

O snapshot guarda:

- spots explorados por nível;
- contrato ativo;
- progresso do contrato;
- contratos concluídos.

Essa persistência é temporária para o protótipo browser-first. Quando o backend de conta estiver conectado, esse estado deve migrar para a API/Supabase.

## Encontros e Bestiário

As instâncias não inventam um monstro genérico. Os IDs em `creaturePool` são resolvidos em `apps/web/lib/bestiary.ts`.

A conversão para o combate de Caça usa os stats do bestiário:

- HP;
- dano físico;
- dano mágico;
- defesa física;
- defesa mágica;
- efeitos de status;
- XP e ouro;
- raridade;
- tamanho de grupo/alcateia.

Isso permite que cada bioma e faixa de progressão tenha criaturas próprias.

Exemplos:

- FiorDeValle: Rato de Adega, Morcego Sanguessuga, Saqueadores, mortos-vivos e corte vampírica;
- Eldravia: aprendizes perdidos, constructos de biblioteca, criaturas de essência e aberrações da Ruptura;
- Dustfall: Horda Verde, criaturas de escória, sentinelas das salinas e monstros da Cratera.

## Mural de Missões

Cada cidade possui três contratos iniciais.

Regras atuais:

1. só pode existir um contrato ativo por vez;
2. o contrato aponta para um `levelId` específico;
3. o jogador precisa explorar a quantidade solicitada de spots;
4. contratos de níveis bloqueados não podem ser aceitos até a rota anterior ser concluída;
5. a recompensa pode conceder ouro, XP global e item;
6. contratos concluídos ficam marcados para aquele personagem.

## Mercado

O Mercado usa ouro persistente do personagem. Comprar um item:

1. verifica se o item existe;
2. verifica se o jogador já possui o item;
3. verifica se há ouro suficiente;
4. desconta o ouro;
5. adiciona o item ao inventário.

A função está no `DevCharacterRepository.buyItem`.

## Black Market

O Black Market usa o mesmo núcleo econômico do Mercado, mas possui catálogo separado e preços maiores. Ele é usado para itens épicos/lendários e funciona como uma fonte de poder cara, não como loja inicial.

Eldravia e Dustfall já possuem equipamento próprio de cidade no catálogo (por exemplo, Cajado de Vidro Rúnico, Orbe da Fenda Contida, Lâmina de Escória, Couraça das Salinas e Núcleo da Cratera), permitindo que mercado, contratos e progressão de bioma conversem entre si.

No futuro, ele pode receber:

- rotação de estoque;
- reputação;
- taxa clandestina;
- itens únicos por cidade;
- risco/eventos após compras raras.

## Pontos de extensão

Para criar uma nova cidade, o Codex deve preferir adicionar uma nova entrada em `adventureCities` em vez de criar uma UI separada.

Checklist mínimo de uma cidade nova:

- nome, reino, descrição e arte;
- cinco seções internas;
- mercado e Black Market;
- três contratos;
- quatro saídas;
- três níveis por saída;
- 6 ou 7 spots por nível;
- `creaturePool` com IDs válidos do bestiário;
- `eventPool` próprio do bioma;
- battle board/arte regional quando disponível.

## Próxima migração recomendada

Quando a API autoritativa entrar, mover para o backend:

- compra de item;
- aceite/conclusão de missão;
- progresso de spots;
- desbloqueio de níveis;
- recompensa de XP/ouro;
- seed de encontro e loot.

A UI pode continuar consumindo a mesma estrutura conceitual, mas o cliente não deve ser a autoridade final sobre economia ou recompensa.
