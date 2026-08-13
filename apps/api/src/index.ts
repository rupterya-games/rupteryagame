import Fastify from "fastify";
import { GAME_VERSION } from "@rupterya/game-core";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true, game: "RUPTERYA", version: GAME_VERSION }));

app.post<{ Body: { seed?: number } }>("/combat/simulate", async (request) => {
  // O motor determinístico entrará aqui. O cliente nunca decidirá dano, loot ou resultado.
  return {
    seed: request.body?.seed ?? Date.now(),
    status: "prototype",
    log: ["Motor de combate ainda não implementado."],
  };
});

const port = Number(process.env.PORT ?? 3333);
await app.listen({ port, host: "0.0.0.0" });
