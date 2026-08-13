# CODEX — LEIA PRIMEIRO

## Projeto
RUPTERYA Browser é um RPG online browser-first, mobile-first, com interface de cards/personagens, exploração por Caça/Jornada, progressão de conta, economia de sobrevivência e combate tático 3x3 espelhado.

Este repositório é o novo ponto de partida. O projeto Godot anterior NÃO é a base técnica do produto atual. O lore, as regras de Jornada, Caça, Bestiário, eventos, classes e progressão continuam úteis, mas a apresentação e a implementação agora são web.

## Objetivo imediato
NÃO tente construir o jogo inteiro.

O primeiro marco é fechar verticalmente o fluxo de PERSONAGEM:

1. criar/ler Conta;
2. Conta possui Nível Global;
3. criar Personagem usando um personagem-base/classe já existente;
4. escolher Nome;
5. escolher Reino que o personagem defende;
6. abrir Lobby;
7. abrir Perfil/Ficha;
8. abrir Equipamentos;
9. abrir Habilidades;
10. configurar os 7 slots;
11. salvar e alternar Presets.

Somente depois disso conectar Caça/Missões e, depois, o combate 3x3.

---

# 1. PRINCÍPIOS QUE NÃO DEVEM SER QUEBRADOS

### 1.1 Conta e nível
- A CONTA possui `global_level` e `global_xp`.
- Todos os personagens da conta HERDAM o nível global atual.
- Não existe grind de nível separado por personagem.
- Dois personagens do mesmo nível podem ter força muito diferente por causa do PODER.
- PODER representa principalmente o desenvolvimento da ficha por equipamentos e fontes aprovadas de build.

Exemplo:

```text
Conta Nv.30
├── Guerreiro Nv.30 · Poder 1.250
├── Mago      Nv.30 · Poder 2.480
└── Monge     Nv.30 · Poder   730
```

### 1.2 Slots de personagem
- Durante desenvolvimento: liberar slots suficientes para testar todas as classes/personagens.
- No lançamento: 1 vaga de personagem gratuita.
- Vagas extras são desbloqueáveis por monetização/moeda premium.
- NÃO transformar slot pago em vantagem direta de combate.

### 1.3 Não existe sistema de Energia
RUPTERYA NÃO limita o jogador por uma barra de energia.

A pressão econômica vem de:
- HP;
- ouro;
- consumíveis;
- preparação;
- risco;
- equipamento;
- Moral;
- estado do personagem.

### 1.4 Vida não regenera automaticamente
- HP atual é persistente fora de modos que explicitamente normalizam vida, como Arena se essa regra for aprovada.
- Recuperação acontece via Estalagem, cura, item, habilidade ou outro serviço válido.
- Ouro precisa ter função real de sobrevivência.

### 1.5 Atributos de Jornada NÃO são stats de combate
Os atributos de aventura são:
- Percepção;
- Conhecimento;
- Força;
- Agilidade.

Eles servem para eventos, viagens, armadilhas e descobertas.

Exemplo:

```text
Armadilha no caminho
→ teste oculto/rolagem usando Agilidade
→ passou: evita a armadilha
→ falhou: sofre consequência
```

Não usar esses quatro valores como substitutos diretos de Dano Físico/Mágico.

### 1.6 Combate possui eixos próprios
O núcleo atual deve suportar pelo menos:
- HP;
- MP;
- Dano Físico;
- Dano Mágico;
- Defesa Física;
- Defesa Mágica;
- Crítico;
- Esquiva.

Regra conceitual:
- dano físico é mitigado por defesa física;
- dano mágico é mitigado por defesa mágica.

A fórmula matemática definitiva AINDA NÃO está congelada. Não espalhar números mágicos pela UI/API.

---

# 2. PERSONAGEM E HABILIDADES

## 2.1 Não é deckbuilder
Cada CARD visível no combate representa um PERSONAGEM/UNIDADE.

NÃO implementar:
- baralho com compra aleatória;
- mão de cartas;
- embaralhamento;
- mulligan;
- card draw como loop principal.

As habilidades do personagem são pré-configuradas antes da atividade.

## 2.2 Sete slots fixos
Cada preset possui exatamente:

```text
4 Habilidades normais
1 Ultimate
1 Postura
1 Passiva
--------------------
7 slots
```

A passiva ocupa slot. Ela NÃO é um bônus gratuito adicional.

## 2.3 Classe define afinidade, não uma prisão absoluta
Classes possuem crescimento base distinto.

Exemplo conceitual:
- Guerreiro: Dano Físico/HP/Defesa Física altos, MP/Dano Mágico baixos.
- Mago: Dano Mágico/MP/Defesa Mágica altos, físico baixo.
- Arcano: híbrido, capaz de explorar escalas físicas e mágicas, sem ser automaticamente melhor que os especialistas.

Não criar proibições arbitrárias do tipo “Guerreiro jamais pode tocar em magia” quando o conteúdo permitir acesso. A eficiência deve surgir da escala e da ficha.

## 2.4 Escala das habilidades
Uma habilidade pode ter:
- escala física;
- escala mágica;
- ambas.

Exemplos conceituais:

```text
Corte Demolidor
150% Dano Físico

Bola de Fogo
160% Dano Mágico

Lâmina Arcana
70% Dano Físico + 70% Dano Mágico
```

Os coeficientes são exemplos, NÃO balanceamento aprovado.

## 2.5 Linhagem
- Máximo: UMA linhagem por personagem.
- Ex.: Vampiro.
- A linhagem pode liberar habilidades e passivas.
- Para usar uma passiva de linhagem, ela precisa ocupar o slot de Passiva.
- Não permitir duas linhagens simultâneas.

## 2.6 Escolas/organizações
O personagem pode aprender repertórios externos à classe, incluindo escolas/organizações.
Exemplos conceituais:
- Escola de Fogo: magias/passivas de fogo;
- Escola Samurai: estilos/técnicas marciais;
- Escola de Guerreiro: especializações de armas/defesa.

O objetivo é aumentar repertório e permitir combinações, respeitando afinidade e escala.

## 2.7 Arte Secreta
Nome provisoriamente CANÔNICO: `Arte Secreta`.

É uma habilidade especial descoberta no mundo, por exemplo através de:
- criaturas;
- mestres;
- exploração;
- evento;
- livro;
- escola;
- segredo.

Artes Secretas podem ser classificadas conceitualmente como:
- Marcial;
- Mística;
- Arcana.

Uma criatura pode ensinar/desbloquear uma Arte Secreta compatível com determinado arquétipo/afinidade.

Exemplo:

```text
Lobo Sombrio
→ jogador observa/caça/progride conhecimento
→ descobre Arte Secreta: Investida Predatória
→ habilidade física aprendível por personagens compatíveis
```

---

# 3. PRESETS

Um preset salva no mínimo:
- 4 habilidades;
- Ultimate;
- Postura;
- Passiva;
- equipamentos;
- Pet equipado;
- Troféu equipado;
- futuramente posição/formação inicial se aplicável.

Presets desejados conceitualmente:
- Caça;
- Arena;
- Torre;
- Grupo/Co-op.

O jogador deve poder trocar preset FORA da atividade.
Quando uma run exigir snapshot travado, o loadout não pode ser alterado no meio.

---

# 4. PETS, TROFÉUS E SKINS

## Pets
- vários podem ser possuídos;
- no máximo 1 equipado;
- dão bônus/passivas/utilidade;
- podem ajudar Jornada/Percepção/Eventos;
- não devem virar um segundo personagem completo.

## Troféus
- coleção pode ter vários;
- apenas 1 Troféu ativo por personagem;
- representa especialização de caça;
- pode afetar combate, percepção e mundo.

## Skins
- cosméticas;
- não concedem Poder nem stats;
- podem mudar arte da carta/personagem, moldura e VFX permitidos;
- sistema importante de monetização.

---

# 5. CAÇA, MISSÕES E JORNADA — NÃO IMPLEMENTAR ANTES DO PERSONAGEM, MAS PRESERVAR O MODELO

## Caça
É a atividade básica.
- jogador escolhe região/cidade/local;
- encontra monstros/eventos;
- cada monstro pode conceder XP, ouro e loot;
- XP vai para a CONTA GLOBAL.

Exemplo conceitual:

```text
Goblin = 5 XP
3 Goblins = 15 XP global
```

## Missões
Missões precisam ser ATIVADAS antes.
Elas adicionam recompensa sobre a caça normal.

Exemplo:

```text
Missão: Mate 30 Goblins
Recompensa adicional: 100 XP + ouro

Durante a missão:
30 Goblins continuam concedendo XP individual
+
recompensa final da missão
```

Isso incentiva procurar cidades/regiões onde determinada criatura aparece mais.

## Jornada
Preservar a essência já definida anteriormente:
- viagens podem gerar eventos;
- armadilhas;
- NPCs;
- encontros;
- descobertas;
- rolagens usando Percepção/Conhecimento/Força/Agilidade;
- nem todo texto diferente significa segredo;
- falha oculta não deve denunciar que havia um evento secreto.

---

# 6. COMBATE 3x3 ESPELHADO — PRÓXIMA FASE

Campo conceitual:

```text
INIMIGO
[ ] [ ] [ ]
[ ] [ ] [ ]
[ ] [ ] [ ]

----------------

JOGADOR
[ ] [ ] [ ]
[ ] [ ] [ ]
[ ] [ ] [ ]
```

Cada card/unidade = personagem ou criatura.
Cada personagem usa suas 7 habilidades pré-configuradas.

NÃO construir engine 3D.
NÃO recriar Godot.
É browser/card UI.

O servidor deve ser autoridade para:
- RNG;
- dano;
- defesa;
- crítico;
- esquiva;
- cooldown;
- MP;
- morte;
- loot;
- XP;
- resultados de Arena.

O cliente apresenta/anima o resultado.

---

# 7. ARENA — MODELO FUTURO JÁ DEFINIDO

Arena é PvP ASSÍNCRONO.
- atacante joga contra snapshot da ficha de outro player;
- defensor não precisa estar online;
- IA controla o snapshot;
- pareamento considera Poder + rating/troféus quando o sistema for implementado;
- ranking Global;
- ranking de Level;
- ranking por Classe;
- futuramente ranking por Reino pode existir.

Snapshot de defesa deve congelar:
- stats;
- equipamentos;
- 7 slots;
- passivas;
- Pet;
- Troféu;
- estratégia da IA.

Não ler ficha mutável do defensor durante uma luta em andamento.

---

# 8. OUTROS SISTEMAS JÁ DESEJADOS, MAS FORA DO PRIMEIRO SPRINT

- Torre: subir até onde conseguir, checkpoints/recompensas.
- Estalagem: pagar ouro para recuperar HP e outros estados.
- Equipamentos: melhoram stats/Poder.
- Grupo de Aventureiros: substitui o conceito/nome de Guilda; hub social para jogadores que gostam de jogar juntos.
- Bestiário: conhecimento por personagem, ligado à caça e potencialmente Artes Secretas.
- Ranking de conta/level, global, classes.
- WorldClock/Dia-Noite e eventos ocultos continuam parte da visão, mas não são prioridade do sprint zero.

---

# 9. STACK E ARQUITETURA

Monorepo atual:

```text
apps/web            Next.js + React + TypeScript
apps/api            Fastify + TypeScript
packages/game-core  domínio/regras puras
supabase             migrations PostgreSQL
```

Regras:
- `apps/web` NÃO decide resultados importantes.
- `apps/api` autentica/valida/orquestra ações.
- `game-core` deve conter regras determinísticas e testáveis sem React/Fastify.
- Postgres é fonte persistente da verdade.
- Não adicionar Redis/WebSocket/filas sem necessidade demonstrada.
- Arena assíncrona não precisa WebSocket.
- Futuro co-op síncrono pode usar polling/SSE antes de adotar infraestrutura mais pesada.

---

# 10. PRIMEIRO SPRINT PARA CODEX

Implementar APENAS o fluxo de personagem usando mocks ou banco local onde necessário, mantendo interfaces prontas para Supabase.

### Entregáveis
1. Tela `Character Slots` de desenvolvimento com vários slots livres.
2. `Create Character`:
   - selecionar personagem/classe base de uma lista mock;
   - nome;
   - Reino que defende;
   - criar.
3. Conta fake/dev com Global Level 30 para facilitar testes.
4. Lobby principal do personagem escolhido.
5. Perfil:
   - nome;
   - classe;
   - Reino;
   - Lv herdado da conta;
   - Poder;
   - HP/MP/Moral/Ouro;
   - Dano Físico/Mágico;
   - Defesa Física/Mágica;
   - Crítico/Esquiva;
   - Percepção/Conhecimento/Força/Agilidade.
6. Equipamentos V0:
   - slots visuais;
   - mock de itens;
   - equipar/desequipar;
   - recalcular Poder/stats de forma centralizada no `game-core`.
7. Habilidades V0:
   - catálogo mock por classe/fonte;
   - distinguir `skill`, `ultimate`, `stance`, `passive`;
   - permitir preencher exatamente os 7 slots corretos.
8. Presets:
   - criar/renomear;
   - salvar loadout;
   - ativar preset;
   - impedir colocar Ultimate em Skill slot etc.
9. Linhagem/Escola/Arte Secreta:
   - somente estrutura de domínio + mocks suficientes para provar que habilidades de múltiplas fontes podem preencher os slots;
   - não construir sistema completo de obtenção ainda.
10. Persistência dev simples se Supabase ainda não estiver configurado, sem acoplar componentes diretamente a `localStorage`. Criar repository/service boundary para trocar por Supabase depois.

### Critérios de aceitação
- `npm install` e `npm run typecheck` funcionam.
- Web abre sem erro.
- É possível criar pelo menos 2 personagens em modo DEV.
- Ambos herdam `Conta Nv.30`.
- Cada um mantém Nome/Reino/equipamentos/loadout próprios.
- Equipar item altera Poder/stats através de função do `game-core`.
- Habilidades só entram no tipo de slot correto.
- Linhagem máxima = 1.
- Passiva de linhagem/escola ocupa o único slot de Passiva.
- Skin não altera Poder.
- Nenhum componente calcula dano/XP/loot diretamente.

---

# 11. O QUE NÃO FAZER NESTE MOMENTO

NÃO:
- recriar Godot;
- adicionar 3D;
- transformar em deckbuilder;
- implementar Arena completa;
- implementar Torre completa;
- implementar 29 classes completas;
- construir monetização real;
- criar sistema de Energia;
- fazer HP regenerar sozinho;
- inventar regras novas sem marcar claramente como proposta;
- colocar fórmulas de balanceamento espalhadas em componentes React;
- criar um caminho “teste” paralelo ao fluxo real do jogo.

Toda feature futura deve entrar no MESMO fluxo/domain, não num segundo jogo de demonstração.

---

# 12. REGRA PARA DECISÕES AINDA NÃO DEFINIDAS

Quando algo não estiver explicitamente fechado aqui ou em `docs/GAME_RULES_V0.md`:
1. não tratar suposição como cânone;
2. implementar da forma mais reversível possível;
3. marcar TODO/ADR quando a decisão afetar arquitetura;
4. não inventar economia/balanceamento definitivo.

Prioridade do Codex: fundação limpa, tipada, testável e simples de evoluir.
