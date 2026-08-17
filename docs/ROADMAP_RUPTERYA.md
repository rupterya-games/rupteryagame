# Roadmap Oficial — Rupterya

> Fonte de direção: decisões de combate, bestiário, moral e organizações consolidadas em 17/08/2026.
> Regra de trabalho: todo sistema novo entra primeiro neste roadmap, com dependências e critérios de aceite.

## Norte do produto

Rupterya permanece browser/mobile-first nesta fase. A batalha principal é portrait, com cards de heróis e criaturas como peças sobre um tabuleiro hexagonal. A inspiração externa serve para clareza de leitura; identidade visual, regras, progressão, bestiário e profundidade continuam próprias de Rupterya.

## Contratos imutáveis do combate

- Dano Físico usa Defesa Física; Dano Mágico usa Defesa Mágica.
- Comum: exatamente 2 habilidades. Raro/Elite: 3. Chefe: 4. Chefe Mundial: 5.
- Recarga reduz no início do turno do dono.
- Carregamento anuncia na rodada N e resolve na N+1.
- Interromper carregamento envia a habilidade para recarga cheia.
- Atordoamento: máximo 1 rodada; depois 2 rodadas de imunidade.
- Reação não consome ação e reação não dispara reação.
- Efeitos contínuos (Sangramento/Queimadura/Veneno) ticam no fim da rodada, nunca na rodada em que foram aplicados, e produzem exatamente a quantidade declarada de ticks.
- Player não recebe fraqueza elemental racial; fraquezas pertencem à IA/criaturas.

---

# Fase 0 — Contratos e fundações

Status: **EM ANDAMENTO**

- [x] Bestiário com habilidades estruturadas.
- [x] Dano físico/mágico separado no motor.
- [x] Campo hexagonal real no combate.
- [x] Layout vertical mobile com cards.
- [x] Seleção de alvo pelo campo/card.
- [x] UI de neblina ON/OFF como visual inicial.
- [x] Estruturas de domínio reservadas para Velocidade, Moral e organizações.
- [x] Roadmap oficial versionado no projeto.

Critério de saída: nenhum sistema posterior precisa reinterpretar as regras acima.

# Fase 1 — Economia de turno: Movimento + Ação

Status: **IMPLEMENTAÇÃO INICIADA**

Objetivo: abandonar o modelo antigo “mover OU atacar”.

- [x] Movimento passa a ser recurso separado da ação.
- [x] Um movimento válido não executa automaticamente a fase inimiga.
- [x] Após mover, o Player ainda pode usar habilidade.
- [x] Reações ao movimento continuam resolvendo imediatamente.
- [x] “Aguardar” encerra explicitamente a ação e chama a fase inimiga.
- [x] Bloquear segundo movimento na mesma rodada.
- [ ] Permitir habilidades que também movem sem consumir o movimento normal quando a habilidade declarar isso.
- [ ] Exibir contador visual MOVE/AÇÃO no HUD.

Critério de aceite: Player consegue Mover -> escolher alvo -> usar habilidade -> IA age -> novo turno.

# Fase 2 — Posições reais para todas as unidades

Status: **IMPLEMENTAÇÃO AVANÇADA**

A linha ativa deixou de depender de slots geométricos fixos. Reservas continuam inativas por regra de encontro, mas recebem um hex real quando entram na linha ativa.

- [x] `position` garantido em runtime para Player e toda IA ativa.
- [x] Spawn por formação/arquétipo: conjuradores preferem retaguarda; demais arquétipos preferem linha frontal.
- [x] IA pode mover antes de atacar.
- [x] Movimento da IA varia por arquétipo (caster/skirmisher/swarm 2; brute/tank 1).
- [x] Ocupação e bloqueio de hex entre Player e IAs ativas.
- [x] Distância real para habilidades do Player e da IA.
- [x] Alcance provisório por canal/arquétipo até as 112 habilidades receberem `range` explícito na Fase 4.
- [x] Frente / flanco / costas disponíveis por geometria + `facing`.
- [x] Adjacência disponível no motor.
- [x] Zona de controle disponível como consulta geométrica.
- [ ] Ataque de oportunidade ao sair de zona de controle — será ligado às Keywords para não tornar todo combatente uma fonte automática de reação.

Critério de aceite: trocar a posição de qualquer unidade muda decisões e resultados da luta.

# Fase 3 — Velocidade e iniciativa

Status: **IMPLEMENTADA — BASE REAL DE INICIATIVA**

- [x] Campo opcional `speed` reservado no domínio para migração.
- [x] Velocidade base das classes: Guardião 8, Duelista 14, Arqueiro 12, Mago 10, Samurai 11.
- [x] Velocidade por arquétipo: Tank 7, Brute 8, Caster 10, Swarm 13, Skirmisher 14.
- [x] Fila de iniciativa ordenada por Speed no motor.
- [x] Empates determinísticos; Player vence empate, IA usa id estável como desempate.
- [x] IA mais rápida pode agir antes do primeiro turno do Player.
- [x] Após a ação do Player, a fila continua de onde parou; cada ator age no máximo uma vez por rodada.
- [x] Nova fila é recalculada ao abrir cada rodada, permitindo buffs/debuffs futuros de Speed.
- [x] UI “PRÓXIMO” ligada à fila real e exibe ⚡ Speed.
- [ ] Lentidão/Aceleração como status — adiada para a camada de efeitos/Keywords.
- [ ] Iniciativa para 2–3 Players — será concluída junto ao WP de Co-op.

Critério de aceite: Escaramuçador rápido e Muralha lenta possuem ordem de ação diferente de forma previsível. **ATINGIDO no solo.**

# Fase 4 — Alcance, áreas e intenção visual

Status: **IMPLEMENTAÇÃO AVANÇADA — WP-04 CONCLUÍDO NO SOLO**

- [x] Alcance calculado por hex para habilidades do Player e da IA; habilidades de criatura sem `range` explícito usam fallback tático até catalogação final.
- [x] Formas suportadas no motor: alvo único, linha, cone, anel, raio, área conectada customizada e campo inteiro.
- [x] Preview da área antes de confirmar uma habilidade do Player.
- [x] Habilidades de área do Player atingem múltiplos cards realmente posicionados nos hexes afetados.
- [x] Hex vermelho pulsante = área telegrafada por carregamento inimigo.
- [x] Hex roxo = área mágica; área física possui leitura distinta.
- [x] Carregamentos congelam `targetCell + affectedCells` ao iniciar; sair da marcação evita a resolução.
- [x] Interromper carregamento continua removendo o telegraph e aplicando recarga cheia.
- [x] Empurrar/puxar/deslocamento forçado reposiciona unidades em hex válido; `Golpe de Escudo` do Guardião já usa Push 1.
- [x] `Dobra de Posição` da IA passa a executar troca forçada real de hex.
- [ ] Catalogar `range + area` explicitamente nas 112 habilidades de criatura; fallback permanece funcional até essa revisão de conteúdo.
- [ ] Resolver áreas contra vários Players simultâneos — depende da Fase 8 (Co-op).

Critério de aceite: o jogador entende o efeito espacial antes de gastar a ação. **ATINGIDO no solo para Player + carregamentos da IA.**

# Fase 5 — Terreno, obstáculos e visão

- [x] Hexes bloqueados.
- [x] Obstáculos e cobertura.
- [x] Terrenos por bioma/região (`fiordevalle`, `eldravia`, `dustfall`).
- [x] Linha de visão.
- [x] Neblina como regra de gameplay, não somente efeito visual.
- [x] Visão por unidade/classe/criatura.
- [x] Criaturas com visão especial (`fog_sight`).
- [x] Arqueiro e habilidades/posturas podem modificar visão/alcance (`Olho de Falcão`).

Critério de aceite: o mesmo grupo enfrenta decisões diferentes em mapa aberto e mapa com neblina. **ATINGIDO no solo.**

Notas desta fase:
- terreno difícil custa 2 pontos de movimento;
- obstáculos bloqueiam ocupação e alguns também bloqueiam linha de visão;
- cobertura reduz dano de ataques à distância antes da Defesa;
- neblina limita alvo/visão pelo `visionRange` da unidade;
- fora da neblina, obstáculos continuam bloqueando linha de visão;
- IA que perde o Player de vista pode se reposicionar, mas não atacar/debuffar através da névoa/obstáculo; memória/caça mais sofisticada fica para a Fase 6.

# Fase 6 — IA tática por arquétipo e criatura

Status: **WP-06 CONCLUÍDO NO SOLO**

- [x] Goblins/Skirmishers tentam flanquear e buscar costas; líderes recebem regra extra de autopreservação enquanto houver tropa.
- [x] Brutamontes/Orcs avançam, pressionam adjacência e valorizam controle direto de território.
- [x] Casters mantêm distância, procuram linha de visão e valorizam cobertura; recuam quando o Player entra perto demais.
- [x] Vampiros/predadores buscam flanco/costas, valorizam ocultação e ficam mais agressivos contra alvo ferido.
- [x] Tanks/Sentinelas protegem líder, caster ou aliado vulnerável e tentam ocupar a linha entre esse aliado e o Player.
- [x] Bosses/controladores com áreas/carregamentos recebem perfil de controle de zona; ameaças espaciais continuam usando o telegraph real do WP-04.
- [x] Passiva de bando depende da presença do líder: fodder perde 25% de dano quando a formação teve líder e ele caiu.
- [x] IA avalia alcance, linha de visão, risco/HP, cobertura, objetivo espacial, gatilho e cooldown antes de agir.
- [x] Memória tática: IA guarda o último hex realmente visto do Player; sem memória, procura rota provável/centro e não consulta a posição escondida.
- [x] HUD mostra intenção tática somente para inimigos visíveis (Flanquear, Buscar cobertura, Proteger formação, Cercar, etc.).
- [ ] Escolha entre múltiplos Players isolados/feridos — depende da Fase 8 (Co-op); no solo o perfil Predator já altera posicionamento e agressividade pelo HP do único alvo.

Critério de aceite: duas famílias de inimigo com stats parecidos jogam de forma claramente diferente. **ATINGIDO NO SOLO.**

# Fase 7 — Keywords e equipamento tático

- [ ] Esquiva.
- [ ] Bloqueio.
- [ ] Contra-golpe.
- [ ] Ataque de Oportunidade.
- [ ] Ataque pelas Costas.
- [ ] Vampirismo.
- [ ] Provocar.
- [ ] Interromper.
- [ ] Carregamento.
- [ ] Tipos físicos: Cortante / Perfurante / Impacto.
- [ ] Tipos especiais: Sagrado / Dark / Natureza e futuros.
- [ ] Fraquezas de criatura (+30% conforme bestiário/regra).
- [ ] Equipamentos amplificam keywords sem criar loop infinito de reação.

Critério de aceite: duas builds da mesma classe mudam sua tomada de decisão no mapa.

# Fase 8 — Solo e Co-op no mesmo motor

- [ ] Estado de batalha suporta 1–3 Players ativos.
- [ ] Cada Player possui posição, movimento, ação e cooldown próprios.
- [ ] Formação inicial cooperativa.
- [ ] Turnos/iniciativa comuns ao mesmo campo.
- [ ] Seleção de aliados para buffs/cura.
- [ ] Reconexão e ausência temporária.
- [ ] Escalonamento de encontro por quantidade de Players.

Critério de aceite: nenhuma regra precisa de uma implementação separada “solo” e “coop”.

# Fase 9 — Moral individual e moral da formação

Status: **FUNDAÇÃO DE DADOS CRIADA**

- [x] Estrutura individual `Hero / Neutral / Villain` no personagem.
- [x] Novo personagem começa Neutro 100% como estado inicial seguro.
- [x] Normalização para soma = 100, incluindo migração/valores fracionados sem erro de arredondamento.
- [ ] Escolhas de missão alteram valores em passos pequenos.
- [x] Helper de composição ativa calcula a média Hero/Neutral/Villain da formação; integração com catálogo de missões permanece pendente.
- [x] Helper de faixas de acesso: 30–49 comum, 50–69 rara, 70–89 épica, 90+ lendária/especial; integração de conteúdo permanece pendente.
- [ ] Moral não concede debuff de combate.
- [ ] Recompensas têm valor equivalente entre Herói/Vilão/Neutro, mas temas diferentes.

Critério de aceite: trocar a formação pode trocar o catálogo de missões sem enfraquecer o grupo artificialmente.

# Fase 10 — Guilda de Heróis e Black House por Reino

Status: **FUNDAÇÃO DE DADOS CRIADA**

- [x] Campos independentes reservados por cidade/Reino para Guilda e Black House.
- [ ] Progressão Nv.1–5.
- [ ] Reputação interna da organização.
- [x] Helper de requisito combina nível da organização + moral da formação; aplicação aos catálogos de missão permanece pendente.
- [ ] Catálogos de missão próprios por Reino.
- [ ] Recompensas temáticas próprias.
- [ ] Guilda e Black House não substituem Renome geral do Reino.

Identidades já definidas:

- Fiordevalle — Guilda: proteção/rotas/monstros costeiros. Black House: docas/contrabando/roubo de cargas.
- Ryukuzan — Guilda: clãs/duelos/montanhas. Black House: assassinatos entre clãs/espionagem/técnicas.
- Eldravya — Guilda: ruínas/magia/desaparecimentos. Black House: artefatos proibidos/relíquias/magia clandestina.
- Kadesh-ael — Guilda: caravanas/tumbas/peregrinos. Black House: relíquias roubadas/contrabando/assassinatos políticos.

# Fase 11 — Caminho Neutro

- [x] Campo de dados reservado sem nome definitivo.
- [ ] Definir nome oficial: Companhia de Mercenários / Casa dos Contratos / outro.
- [ ] Progressão equivalente Nv.1–5.
- [ ] Caça, exploração, comércio, escolta, contratos políticos e mercenarismo.
- [ ] Recompensas próprias de valor equivalente.

# Fase 12 — Conteúdo, UX e balanceamento final

- [ ] Tutorial mobile do hex.
- [ ] Feedback tátil/visual de seleção.
- [ ] Tooltips compactos para alcance, dano e defesa afetada.
- [ ] Estados claros para cooldown, MP, silêncio e stun.
- [ ] Acessibilidade e redução de movimento.
- [ ] Testes de 1v1, 1v3, 1v5, 3v3 e boss.
- [ ] Simulação de TTK e economia de MP/cooldown.
- [ ] Performance em celulares medianos.

---

## Revisão de estabilidade V6-R1 — 17/08/2026

Status: **APROVADA COM PENDÊNCIAS DE CONTEÚDO DOCUMENTADAS**

Antes do WP-05 foi feita uma auditoria cruzada das Fases 0–4. Foram corrigidos:

- timing de DoT para fim de rodada, sem tick na rodada de aplicação;
- duração de stun/imunidade de stun por turno do dono;
- buffs de autoaplicação que estavam indo para o alvo;
- habilidades `oncePerBattle` e múltiplas fases de boss;
- prioridade da IA para condições específicas antes do fallback `always`;
- fallback seguro para criaturas cujo kit inteiro é condicional;
- bônus ativos de dano/crítico/chance de status que estavam armazenados mas não aplicados;
- interrupção de carregamento: dano comum não interrompe sozinho; stun/deslocamento/efeito explícito de interrupção interrompem;
- summons genéricos deixam de clonar integralmente kits/fases de boss;
- geometria de AoE não força o alvo primário para dentro de uma área que não o contém;
- normalização de Moral passa a fechar exatamente 100%;
- migração de saves/progressão atualizada;
- prop incorreta de `StatusEffectIcon` na UI;
- texto antigo que dizia que mover encerrava a rodada.

Validação da revisão:

- `@rupterya/game-core`: typecheck e build aprovados;
- suíte de regressão local: aprovada;
- 44 criaturas / 112 habilidades e contagem por raridade: validada;
- módulos de bestiário, catálogo e habilidades: checagens TypeScript direcionadas aprovadas;
- build completo do Next permanece dependente da instalação das dependências Web, que não acompanha o ZIP neste ambiente.

Pendências deliberadas antes de considerar **todas as 112 habilidades plenamente simuladas**:

- `mp_self > 20%`, `mp_self > 40%` e `resource_full` exigem recurso/MP funcional para IA;
- `copy_last_ability` ainda usa aproximação enquanto `game-core` não conhece o catálogo completo de habilidades do Player;
- `range + area` explícitos ainda precisam ser catalogados em todas as habilidades, apesar dos fallbacks atuais.

Essas pendências não bloquearam os WP-05/WP-06; continuam registradas para a Fase 7 e para a revisão fina de conteúdo das 112 habilidades.

---

## Ordem de execução recomendada

1. Fase 1 — Movimento + Ação.
2. Fase 2 — Posição real de todas as unidades (**base implementada; falta Ataque de Oportunidade/Keyword**).
3. Fase 3 — Velocidade/Iniciativa (**base solo implementada**).
4. Fase 4 — Áreas/telegraph (**base solo implementada; catalogação fina das 112 habilidades continua**).
5. Fase 5 — Terreno/Neblina (**base solo implementada**).
6. Fase 6 — IA tática (**concluída no solo**).
7. Fase 7 — Keywords completas.
8. Fase 8 — Co-op.
9. Fases 9–11 — Moral e organizações, em paralelo ao conteúdo de mundo.
10. Fase 12 — balanceamento/polimento.

## Regra para novas ideias

Toda nova mecânica deve responder antes de entrar no código:

1. Qual problema de gameplay resolve?
2. De quais fases depende?
3. Interage com movimento, ação, reação ou iniciativa?
4. Qual é o canal de dano/defesa?
5. Precisa de feedback visual no hex?
6. Funciona em solo e co-op?
7. Exige migração de save?
8. Qual critério objetivo prova que está pronta?
