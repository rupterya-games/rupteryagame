# RUPTERYA Browser v0.2

Nova base browser-first do Rupterya. O protótipo Godot permanece apenas como legado: esta é a base que deve evoluir.

## Rodar

Requer Node.js 22 LTS ou superior.

```bash
npm install
npm run dev:web
```

Em outro terminal:

```bash
npm run dev:api
```

Web: http://localhost:3000
API: http://localhost:3333/health

## Estado atual

- Conta de desenvolvimento global no nível 30 e seis slots de personagem.
- Criação de personagem com nome, reino e classe base (Guerreiro, Arqueiro ou Mago).
- Lobby, ficha de combate, equipamentos e cálculo centralizado de atributos.
- Exatamente sete slots de habilidades: quatro técnicas, postura, suprema e passiva.
- Linhagem, escola, arte secreta e visuais em mocks de domínio.
- Presets criáveis, renomeáveis e ativáveis.
- Persistência de desenvolvimento isolada em repositório (`localStorage`), pronta para ser trocada pela API/Supabase.
- API e migração inicial para Supabase/Postgres mantidas no monorepo.

## Validação

```bash
npm run typecheck
npm run build
```

## Próximo marco

Conectar a persistência ao Supabase e à API autoritativa. Caça/Missões, arena, combate 3x3 e 3D continuam deliberadamente fora deste primeiro sprint.

## Para agentes de código

Leia [CODEX_START_HERE.md](CODEX_START_HERE.md) antes de alterar a arquitetura ou implementar sistemas. Consulte também `docs/ROADMAP_CODEX.md`, `docs/DOMAIN_GLOSSARY.md`, `docs/GAME_RULES_V0.md` e `docs/ARCHITECTURE.md`.

## Mundo V3

O fluxo de cidade e exploração foi reorganizado em `world.ts`, `quests.ts` e `economy.ts`, com UI separada em `CityHub`, `GateMap`, `QuestBoard` e `MarketPanels`. FiorDeValle, Eldravia e Dustfall possuem 4 saídas x 3 níveis e progressão persistente por personagem. Consulte `docs/WORLD_V3_IMPLEMENTATION.md` antes de expandir novas cidades ou instâncias.


## Roadmap

O plano oficial de evolução está em `docs/ROADMAP_RUPTERYA.md`. Consulte também `docs/WORKLOG_2026-08-17.md` antes de mexer no motor tático.
