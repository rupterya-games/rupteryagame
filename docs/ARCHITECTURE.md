# Arquitetura inicial

## Stack escolhida
- Web: Next.js 16 + React 19 + TypeScript + Tailwind CSS.
- API de jogo: Fastify em processo Node persistente.
- Núcleo de regras: pacote TypeScript puro e determinístico (`@rupterya/game-core`).
- Dados/Auth: Supabase (Postgres + Auth + RLS).
- Realtime futuro: Supabase Realtime para presença/notificações e, se necessário, sessões cooperativas; o motor nunca confia no cliente.

## Regra de autoridade
O navegador envia intenção. O servidor valida e resolve dano, RNG, loot, Arena, Torre e resultados de eventos.

## Por que separar `game-core`
O mesmo motor pode ser usado pela API para Caça, Missões, Torre, Arena assíncrona e IA. A UI apenas anima o resultado.
