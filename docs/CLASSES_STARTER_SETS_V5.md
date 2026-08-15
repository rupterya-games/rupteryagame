# Classes e Sets Iniciais — V5

## Objetivo de balanceamento

Os atributos-base existentes foram preservados para Guardião, Duelista, Arqueiro e Mago. O Samurai foi inserido entre Duelista e Arqueiro em sobrevivência, mas acima deles em pressão reativa. O set inicial é propositalmente **Comum Nv.1** e oferece identidade sem substituir loot de progressão.

| Classe | HP base | MP | Dano principal | Def. Física | Def. Mágica | Identidade |
|---|---:|---:|---:|---:|---:|---|
| Guardião | 360 | 54 | 49 Físico | 46 | 20 | tanque / escudo |
| Duelista | 292 | 62 | 61 Físico | 27 | 19 | DPS crítico / esquiva |
| Arqueiro | 258 | 72 | 56 Físico | 23 | 23 | DPS à distância / munição |
| Mago | 225 | 132 | 70 Mágico | 16 | 37 | burst mágico / MP |
| Samurai | 278 | 68 | 65 Físico | 26 | 21 | DPS + contra-ataque |

## Sets iniciais

- **Guardião:** Espada do Recruta + Escudo de Carvalho Ferrado + conjunto Bastião Jovem.
- **Duelista:** Espada Leve de Treino + Lâmina de Mão Fraca + conjunto leve do Duelista.
- **Arqueiro:** Arco de Freixo + Aljava de Flechas Simples (Flechas Básicas Nv.1) + conjunto do Batedor.
- **Mago:** Cajado de Aprendiz + Foco Arcano de Cobre + conjunto do Aprendiz.
- **Samurai:** Katana de Aço Simples + Bainha de Madeira Laqueada + conjunto de viagem Samurai.

## Samurai — Retaliação Iai

A Passiva precisa ocupar o slot de Passiva. Sem ela equipada, não existe contra-ataque automático.

- Base: **30%** de chance depois de sofrer um ataque direto que acertou.
- Dano: **65% do Dano Físico** do Samurai, mitigado pela Defesa Física do alvo.
- Bainha inicial: **+5 pp** de chance e **+0,10×** de escala.
- Com a Bainha inicial: **35% / 0,75×**.
- Não consome ação.
- Não pode disparar outra reação.
- Não ativa simplesmente por receber DoT; exige ataque direto.

Isso mantém o Samurai como DPS: sua defesa-base continua próxima do Duelista, enquanto a sobrevivência vem de pressionar inimigos que o acertam, não de absorver dano como um Guardião.

## Balanceamento de encontros fracos

O bestiário mantém os stats canônicos por nível. Para evitar que um personagem Nv.30 seja cercado por cinco criaturas Nv.1, a composição de encontro agora considera a diferença de nível:

- diferença ≥ 15 níveis: 1 inimigo;
- diferença ≥ 8 níveis: até 2;
- diferença ≥ 4 níveis: até 3;
- criatura 6+ níveis acima do jogador: encontro limitado a até 2 inimigos.

Também foram corrigidos pools de instância que continham criaturas acima da faixa recomendada.
