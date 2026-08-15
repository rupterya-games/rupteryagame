# Battlefield V6 — seleção de alvo

## Objetivo

O campo de batalha foi reorganizado para o layout vertical aprovado:

1. cabeçalho da caça;
2. fileira de inimigos;
3. divisor VS;
4. equipe;
5. painel do personagem ativo;
6. habilidades;
7. registro de combate recolhível.

## Seleção real de alvo

A carta inimiga não é apenas visual. Clicar ou pressionar Enter/Espaço na carta define `selectedEnemyId`.

`resolveHuntTurn(state, ability, targetId?)` recebe o alvo escolhido. Se o alvo morrer ou deixar de ser válido, a UI seleciona automaticamente o primeiro inimigo ainda vivo.

Não voltar a usar sempre `enemies.find(enemy => enemy.hpCurrent > 0)` na UI, pois isso quebraria a escolha manual de alvo.

## Inspeção

- Clique na carta: seleciona alvo.
- Botão `i` dentro da carta: abre inspeção/equipamentos da criatura sem alterar o alvo.
- Alvo atual recebe borda vermelha, brilho e retículo.

## Solo e co-op

O motor atual é solo. A interface mostra uma carta de herói centralizada e identifica `CAÇA SOLO / 1/1`.

O grid de equipe foi construído para receber 2 ou 3 cartas quando o estado autoritativo de co-op existir. Não simular aliados falsos apenas para preencher visualmente três slots.

## Recarga e MP

As regras existentes permanecem:

- +6 MP no início do turno do jogador;
- cooldown reduz no início do turno do dono;
- habilidade com CD > 0 fica bloqueada;
- habilidade sem MP suficiente fica bloqueada;
- habilidade ofensiva exige um alvo vivo selecionado.
