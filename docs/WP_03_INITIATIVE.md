# WP-03 — Velocidade e Iniciativa Real

Data: 17/08/2026
Status: **IMPLEMENTADO NO SOLO**

## Objetivo

Substituir a faixa visual simulada de ordem de turno por uma fila de iniciativa calculada pelo motor usando `speed`. A ordem deve afetar quem realmente age primeiro.

## Regras implementadas

- `Speed` maior age antes.
- Empate entre Player e IA favorece o Player.
- Empate entre IAs usa id estável para desempate determinístico.
- A fila considera Player + até 3 IAs da linha ativa.
- Reservas não recebem turno até entrarem na linha ativa; entram na iniciativa na rodada seguinte.
- IA mais rápida pode agir antes do primeiro turno do Player.
- Ao terminar a ação do Player, atores posteriores na fila agem.
- Ao virar a rodada, a fila é recalculada e atores mais rápidos podem agir antes do Player.
- Cada unidade da fila age no máximo uma vez por rodada.
- Movimento do Player continua separado da ação e não avança a iniciativa.
- `Aguardar` consome a ação e avança a fila normalmente.
- Cooldown do Player reduz quando o turno dele abre; cooldown da IA reduz quando a própria IA recebe seu turno.

## Speed inicial

### Classes

| Classe | Speed |
|---|---:|
| Duelista | 14 |
| Arqueiro | 12 |
| Samurai | 11 |
| Mago | 10 |
| Guardião | 8 |

### Arquétipos de IA

| Arquétipo | Speed |
|---|---:|
| Skirmisher | 14 |
| Swarm | 13 |
| Caster | 10 |
| Brute | 8 |
| Tank | 7 |

Esses valores são ponto inicial de balanceamento, não valores finais.

## Estado de batalha adicionado

- `initiativeOrder: string[]`
- `initiativeIndex: number`
- `currentActorId: string | null`

## UI

A faixa `PRÓXIMO` usa `battle.initiativeOrder` real. Ela gira a partir do ator atual e mostra `⚡ Speed` em cada card da fila.

## Validação

Cenário de runtime:

- Skirmisher Speed 14
- Player Speed 10
- Caster Speed 10
- Tank Speed 7

Ordem obtida:

`Skirmisher → Player → Caster → Tank`

O Skirmisher agiu antes do primeiro turno do Player. Depois da ação do Player, Caster e Tank receberam seus turnos. Na rodada seguinte, Skirmisher voltou a agir antes do Player. Empate Player/Caster foi vencido pelo Player.

## Pendências deliberadas

- `Slow` e `Haste` serão status modificadores de Speed em fase posterior.
- Co-op exigirá múltiplos atores Player na mesma fila.
- O companion continua como efeito de fim de rodada por enquanto, não como unidade de iniciativa.
- DoTs permanecem com a semântica de rodada existente; a revisão fina de timing será tratada junto aos efeitos/telegraph para não misturar duas migrações grandes.

## Próximo WP

**WP-04 — Alcance, áreas e intenção visual.**

Objetivo: dar forma espacial explícita às habilidades (alvo único, linha, cone, raio/área), preview antes de confirmar e telegraph real de carregamentos no chão.
