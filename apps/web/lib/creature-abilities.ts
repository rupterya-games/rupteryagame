import type { CreatureAbilityDefinition } from "@rupterya/game-core";

/**
 * Kit estruturado das 44 criaturas do bestiário (112 habilidades: 2 por Comum,
 * 3 por Raro/Elite, 4 por Chefe, 5 por Chefe de Mundo). Transcrito da
 * especificação anexada pelo usuário (CREATURE_ABILITIES_V1). Interpretado
 * por evaluateTrigger/applySpecialEffects em @rupterya/game-core.
 */
export const creatureAbilitiesById: Record<string, CreatureAbilityDefinition[]> = {
  "cellar-rat": [
    { id: "cellar-rat-bite", name: "Mordida de Adega", damageFamily: "physical", scaling: 1.0, cooldownTurns: 0, target: "single_enemy", description: "Mordida simples e rápida.", aiTrigger: "always" },
    { id: "cellar-rat-swarm", name: "Frenesi da Ninhada", damageFamily: "physical", scaling: 0.8, cooldownTurns: 2, target: "single_enemy", description: "O dano aumenta em 15% por outro Rato de Adega vivo, até +45%.", aiTrigger: "allies_alive >= 1", specialEffects: [{ kind: "damage_bonus_per_ally", bonusPercent: 15, capPercent: 45 }] },
  ],
  "leech-bat": [
    { id: "leech-bat-bite", name: "Mordida Sanguínea", damageFamily: "physical", scaling: 0.9, cooldownTurns: 0, target: "single_enemy", description: "Morde e tenta abrir uma ferida.", aiTrigger: "always", statusEffects: [{ kind: "bleed", chance: 10, turns: 2, percentMaxHp: 1 }] },
    { id: "leech-bat-hit-run", name: "Bater e Sumir", damageFamily: "physical", scaling: 0.75, cooldownTurns: 2, target: "single_enemy", description: "Ataca e ganha +20 pp de Esquiva até o início do próximo turno.", aiTrigger: "hp_self < 30%", statusEffects: [{ kind: "evasion", chance: 100, turns: 1, dodgeBonus: 20 }] },
  ],
  raider: [
    { id: "raider-cut", name: "Corte Oportunista", damageFamily: "physical", scaling: 1.0, cooldownTurns: 0, target: "single_enemy", description: "Golpe de lâmina com chance de Sangramento.", aiTrigger: "always", statusEffects: [{ kind: "bleed", chance: 8, turns: 2, percentMaxHp: 2 }] },
    { id: "raider-dirty-strike", name: "Golpe Sujo", damageFamily: "physical", scaling: 1.35, cooldownTurns: 2, target: "single_enemy", description: "Finalizador contra alvo ferido; causa +25% de dano se o alvo estiver abaixo de 40% de Vida.", aiTrigger: "target_hp < 40%", specialEffects: [{ kind: "conditional_damage_bonus", condition: "target_hp < 40%", bonusPercent: 25 }] },
  ],
  "graveyard-crow": [
    { id: "graveyard-crow-eye-peck", name: "Bicada nos Olhos", damageFamily: "physical", scaling: 0.8, cooldownTurns: 2, target: "single_enemy", description: "Prioriza os olhos e pode causar Cegueira.", aiTrigger: "turn == 1", statusEffects: [{ kind: "blind", chance: 12, turns: 1 }] },
    { id: "graveyard-crow-dive", name: "Rasante do Cemitério", damageFamily: "physical", scaling: 1.1, cooldownTurns: 0, target: "single_enemy", description: "Ataque direto em rasante.", aiTrigger: "always" },
  ],
  "pale-servant": [
    { id: "pale-servant-smash", name: "Pancada Cadavérica", damageFamily: "physical", scaling: 1.05, cooldownTurns: 0, target: "single_enemy", description: "Golpe pesado com o corpo morto-vivo.", aiTrigger: "always" },
    { id: "pale-servant-grapple", name: "Agarrão Pálido", damageFamily: "physical", scaling: 0.8, cooldownTurns: 3, target: "single_enemy", description: "Prende o alvo no lugar sem retirar sua ação.", aiTrigger: "always", statusEffects: [{ kind: "position_lock", chance: 100, turns: 1 }] },
  ],
  "hanged-vintner": [
    { id: "hanged-vintner-sickle", name: "Foice de Parreira", damageFamily: "physical", scaling: 1.0, cooldownTurns: 0, target: "single_enemy", description: "Corte contaminado pelas parreiras mortas.", aiTrigger: "always", statusEffects: [{ kind: "poison", chance: 12, turns: 3, percentMaxHp: 2 }] },
    { id: "hanged-vintner-rope", name: "Corda ao Pescoço", damageFamily: "physical", scaling: 0.85, cooldownTurns: 3, target: "single_enemy", description: "Laça o alvo e o atordoa por no máximo 1 rodada.", aiTrigger: "hp_self < 50%", statusEffects: [{ kind: "stun", chance: 35, turns: 1 }] },
  ],
  "ash-wolf": [
    { id: "ash-wolf-pounce", name: "Bote na Retaguarda", damageFamily: "physical", scaling: 1.15, cooldownTurns: 0, target: "single_enemy", description: "Morde com violência; causa Sangramento e recebe +20% de dano se o alvo estiver na retaguarda.", aiTrigger: "target_position == back", statusEffects: [{ kind: "bleed", chance: 18, turns: 3, percentMaxHp: 2 }], specialEffects: [{ kind: "conditional_damage_bonus", condition: "target_position == back", bonusPercent: 20 }] },
    { id: "ash-wolf-howl", name: "Uivo de Matilha", damageFamily: "none", scaling: 0, cooldownTurns: 3, target: "all_allies", description: "Aliados da Matilha Cinzenta ganham +15% de dano por 2 turnos.", aiTrigger: "allies_alive >= 2", specialEffects: [{ kind: "ally_damage_buff", bonusPercent: 15, turns: 2 }] },
  ],
  "vampire-wanderer": [
    { id: "vampire-wanderer-drain", name: "Drenar Sangue", damageFamily: "physical", scaling: 0.95, cooldownTurns: 2, target: "single_enemy", description: "Fere o alvo e cura 50% do dano causado.", aiTrigger: "hp_self < 55%", statusEffects: [{ kind: "bleed", chance: 14, turns: 2, percentMaxHp: 2 }], specialEffects: [{ kind: "lifesteal", percentOfDamage: 50 }] },
    { id: "vampire-wanderer-mist-step", name: "Passo de Névoa", damageFamily: "physical", scaling: 0.75, cooldownTurns: 2, target: "single_enemy", description: "Golpe curto seguido de reposicionamento; ganha +20 pp de Esquiva por 1 turno.", aiTrigger: "dodged_last_turn", statusEffects: [{ kind: "evasion", chance: 100, turns: 1, dodgeBonus: 20 }] },
  ],
  "barrel-witch": [
    { id: "barrel-witch-acid", name: "Borrifo Ácido", damageFamily: "magical", scaling: 1.0, cooldownTurns: 0, target: "single_enemy", description: "Ataque mágico corrosivo que pode Envenenar.", aiTrigger: "target_not_poisoned", statusEffects: [{ kind: "poison", chance: 20, turns: 3, percentMaxHp: 3 }] },
    { id: "barrel-witch-ferment", name: "Fermentação Maldita", damageFamily: "magical", scaling: 1.35, cooldownTurns: 2, target: "single_enemy", description: "Explode a fermentação no alvo; causa +25% de dano se ele estiver Envenenado.", aiTrigger: "target_has_poison", specialEffects: [{ kind: "conditional_damage_bonus", condition: "target_has_poison", bonusPercent: 25 }] },
  ],
  "rotted-knight": [
    { id: "rotted-knight-shield-bash", name: "Golpe de Escudo Corroído", damageFamily: "physical", scaling: 0.9, cooldownTurns: 0, target: "single_enemy", description: "Golpe de escudo que Provoca o alvo por 1 turno.", aiTrigger: "always", statusEffects: [{ kind: "taunted", chance: 100, turns: 1 }] },
    { id: "rotted-knight-guard", name: "Postura de Guarda", damageFamily: "none", scaling: 0, cooldownTurns: 3, target: "self", description: "Reduz em 30% o dano recebido por 2 turnos.", aiTrigger: "hp_self < 60%", statusEffects: [{ kind: "guard", chance: 100, turns: 2, damageReductionPercent: 30 }] },
  ],
  "crimson-herald": [
    { id: "crimson-herald-blood-lance", name: "Lança Hemática", damageFamily: "magical", scaling: 1.0, cooldownTurns: 0, target: "single_enemy", description: "Projétil de sangue condensado.", aiTrigger: "always", statusEffects: [{ kind: "bleed", chance: 22, turns: 3, percentMaxHp: 3 }] },
    { id: "crimson-herald-call", name: "Chamado de Sangue", damageFamily: "none", scaling: 0, cooldownTurns: 3, target: "all_allies", description: "Aliados da Corte Carmesim ganham +15% de dano e +10 pp de chance de Sangramento por 2 turnos.", aiTrigger: "allies_alive >= 1", specialEffects: [{ kind: "warband_buff", damageBonusPercent: 15, statusChanceBonus: 10, turns: 2 }] },
    { id: "crimson-herald-reap", name: "Ceifa Carmesim", damageFamily: "magical", scaling: 1.65, cooldownTurns: 3, target: "single_enemy", description: "Finalizador mágico. Causa +30% de dano se o alvo estiver abaixo de 45% de Vida.", aiTrigger: "target_hp < 45%", specialEffects: [{ kind: "conditional_damage_bonus", condition: "target_hp < 45%", bonusPercent: 30 }] },
  ],
  "vrannoc-bride": [
    { id: "vrannoc-bride-blind-song", name: "Canto Cego", damageFamily: "magical", scaling: 0.9, cooldownTurns: 2, target: "single_enemy", description: "Canto arcano que fere e pode causar Cegueira.", aiTrigger: "target_not_blind", statusEffects: [{ kind: "blind", chance: 25, turns: 2 }] },
    { id: "vrannoc-bride-lament", name: "Lamento de Vrannoc", damageFamily: "magical", scaling: 1.25, cooldownTurns: 2, target: "all_enemies", description: "O lamento atinge todos os inimigos do lado oposto.", aiTrigger: "always" },
    { id: "vrannoc-bride-veil", name: "Véu Nupcial", damageFamily: "none", scaling: 0, cooldownTurns: 3, target: "self", description: "Ganha +25 pp de Esquiva e 20% de redução de dano por 1 turno.", aiTrigger: "hp_self < 35%", statusEffects: [{ kind: "evasion", chance: 100, turns: 1, dodgeBonus: 25 }, { kind: "guard", chance: 100, turns: 1, damageReductionPercent: 20 }] },
  ],
  "mist-captain": [
    { id: "mist-captain-royal-bloodletting", name: "Sangria Real", damageFamily: "physical", scaling: 2.2, cooldownTurns: 4, target: "single_enemy", description: "Golpe carregado e telegrafado. Se resolver, causa dano massivo e Sangramento.", aiTrigger: "target_hp < 50%", statusEffects: [{ kind: "bleed", chance: 28, turns: 4, percentMaxHp: 4 }], chargeTurns: 1 },
    { id: "mist-captain-mist-strike", name: "Corte da Névoa", damageFamily: "physical", scaling: 1.05, cooldownTurns: 0, target: "single_enemy", description: "Surge da névoa para cortar o alvo; pode causar Cegueira.", aiTrigger: "always", statusEffects: [{ kind: "blind", chance: 18, turns: 2 }] },
    { id: "mist-captain-summon", name: "Convocar Servos", damageFamily: "none", scaling: 0, cooldownTurns: 4, target: "battlefield", description: "Convoca 1 Servo Pálido; se não houver espaço, fortalece um Servo Pálido vivo em +20% de dano por 2 turnos.", aiTrigger: "turn % 4 == 0", specialEffects: [{ kind: "summon", creatureId: "pale-servant", count: 1 }] },
    { id: "mist-captain-mist-form", name: "Forma de Névoa", damageFamily: "none", scaling: 0, cooldownTurns: 0, target: "self", description: "Uma vez por batalha, ao cair abaixo de 30% de Vida, reduz dano recebido em 50% e ganha +30 pp de Esquiva por 1 turno.", aiTrigger: "hp_self < 30%", statusEffects: [{ kind: "guard", chance: 100, turns: 1, damageReductionPercent: 50 }, { kind: "evasion", chance: 100, turns: 1, dodgeBonus: 30 }], oncePerBattle: true },
  ],
  "stray-apprentice": [
    { id: "stray-apprentice-dart", name: "Dardo Arcano", damageFamily: "magical", scaling: 1.0, cooldownTurns: 0, target: "single_enemy", description: "Projétil mágico direto.", aiTrigger: "mp_self > 20%" },
    { id: "stray-apprentice-flare", name: "Combustão Desajeitada", damageFamily: "magical", scaling: 1.2, cooldownTurns: 2, target: "single_enemy", description: "Explosão instável que pode causar Queimadura.", aiTrigger: "always", statusEffects: [{ kind: "burn", chance: 15, turns: 2, percentMaxHp: 2 }] },
  ],
  "ink-servant": [
    { id: "ink-servant-quill", name: "Golpe de Pena", damageFamily: "physical", scaling: 1.0, cooldownTurns: 0, target: "single_enemy", description: "Golpe rígido com o membro em forma de pena.", aiTrigger: "always" },
    { id: "ink-servant-spray", name: "Jato de Tinta", damageFamily: "physical", scaling: 0.75, cooldownTurns: 2, target: "single_enemy", description: "Jato de tinta que pode causar Cegueira.", aiTrigger: "target_not_blind", statusEffects: [{ kind: "blind", chance: 20, turns: 2 }] },
  ],
  "rupture-shard": [
    { id: "rupture-shard-cut", name: "Corte de Ruptura", damageFamily: "physical", scaling: 1.0, cooldownTurns: 0, target: "single_enemy", description: "Estilhaço atravessa o alvo e pode causar Sangramento.", aiTrigger: "always", statusEffects: [{ kind: "bleed", chance: 20, turns: 2, percentMaxHp: 2 }] },
    { id: "rupture-shard-shift", name: "Deslocamento Fraturado", damageFamily: "physical", scaling: 0.8, cooldownTurns: 2, target: "single_enemy", description: "Ataca enquanto muda de posição e ganha +15 pp de Esquiva por 1 turno.", aiTrigger: "attacked_last_turn", statusEffects: [{ kind: "evasion", chance: 100, turns: 1, dodgeBonus: 15 }] },
  ],
  "hollow-echo": [
    { id: "hollow-echo-reflect", name: "Reflexo Oco", damageFamily: "none", scaling: 0, cooldownTurns: 3, target: "last_enemy_actor", description: "Repete a última habilidade ativa usada pelo alvo com 60% do dano/efeito original; não copia ultimate, summon ou outra cópia.", aiTrigger: "target_used_ability", specialEffects: [{ kind: "copy_last_ability", effectPercent: 60 }] },
    { id: "hollow-echo-pulse", name: "Pulso de Eco", damageFamily: "magical", scaling: 1.0, cooldownTurns: 0, target: "single_enemy", description: "Onda mágica que pode causar Cegueira.", aiTrigger: "always", statusEffects: [{ kind: "blind", chance: 30, turns: 2 }] },
    { id: "hollow-echo-growing", name: "Eco Crescente", damageFamily: "magical", scaling: 1.25, cooldownTurns: 2, target: "single_enemy", description: "A partir do turno 4, ganha +10% de dano por turno transcorrido, até +50%.", aiTrigger: "turn % 4 == 0", specialEffects: [{ kind: "turn_scaling_damage", startTurn: 4, bonusPerTurnPercent: 10, capPercent: 50 }] },
  ],
  "library-golem": [
    { id: "library-golem-crush", name: "Esmagar Estante", damageFamily: "physical", scaling: 1.25, cooldownTurns: 0, target: "single_enemy", description: "Golpe pesado; causa +20% de dano contra alvo na posição central.", aiTrigger: "target_position == center", specialEffects: [{ kind: "conditional_damage_bonus", condition: "target_position == center", bonusPercent: 20 }] },
    { id: "library-golem-guard", name: "Postura de Guarda", damageFamily: "none", scaling: 0, cooldownTurns: 3, target: "self", description: "Reduz em 35% o dano recebido por 2 turnos.", aiTrigger: "hp_self < 50%", statusEffects: [{ kind: "guard", chance: 100, turns: 2, damageReductionPercent: 35 }] },
  ],
  "essence-leech": [
    { id: "essence-leech-bite", name: "Mordida de Essência", damageFamily: "physical", scaling: 0.95, cooldownTurns: 0, target: "single_enemy", description: "Morde o alvo e pode Envenenar.", aiTrigger: "always", statusEffects: [{ kind: "poison", chance: 18, turns: 3, percentMaxHp: 2 }] },
    { id: "essence-leech-drain", name: "Drenar Essência", damageFamily: "physical", scaling: 0.8, cooldownTurns: 2, target: "single_enemy", description: "Drena 12% do MP máximo do alvo e cura Vida igual a 50% do MP efetivamente drenado.", aiTrigger: "mp_self > 40%", specialEffects: [{ kind: "drain_mp", percentMaxMp: 12, healPercentOfDrained: 50 }] },
  ],
  "grimoire-owl": [
    { id: "grimoire-owl-pages", name: "Rajada de Pergaminho", damageFamily: "magical", scaling: 1.0, cooldownTurns: 0, target: "single_enemy", description: "Rajada de páginas encantadas que pode causar Cegueira.", aiTrigger: "always", statusEffects: [{ kind: "blind", chance: 24, turns: 2 }] },
    { id: "grimoire-owl-silence", name: "Selo de Silêncio", damageFamily: "magical", scaling: 0.75, cooldownTurns: 3, target: "single_enemy", description: "Selo arcano que causa Silêncio por 1 turno.", aiTrigger: "always", statusEffects: [{ kind: "silence", chance: 100, turns: 1 }] },
  ],
  "convergence-hound": [
    { id: "convergence-hound-bite", name: "Mordida Convergente", damageFamily: "physical", scaling: 1.0, cooldownTurns: 0, target: "single_enemy", description: "Mordida que rasga a realidade e pode causar Sangramento.", aiTrigger: "always", statusEffects: [{ kind: "bleed", chance: 26, turns: 3, percentMaxHp: 3 }] },
    { id: "convergence-hound-leap", name: "Salto de Fenda", damageFamily: "physical", scaling: 1.35, cooldownTurns: 2, target: "single_enemy", description: "Ignora distância/posição para alcançar o alvo.", aiTrigger: "distance > 1", specialEffects: [{ kind: "gap_close" }] },
    { id: "convergence-hound-pursuit", name: "Perseguição", damageFamily: "physical", scaling: 0.85, cooldownTurns: 0, target: "single_enemy", description: "Reação: ataca quando o alvo troca de posição. Máximo 1 vez por rodada; esta reação não pode gerar outra reação.", aiTrigger: "target_changed_position", reaction: true },
  ],
  "glass-inquisitor": [
    { id: "glass-inquisitor-hammer", name: "Martelo de Vidro", damageFamily: "physical", scaling: 1.1, cooldownTurns: 0, target: "single_enemy", description: "Impacto coberto por estilhaços incandescentes.", aiTrigger: "always", statusEffects: [{ kind: "burn", chance: 24, turns: 3, percentMaxHp: 3 }] },
    { id: "glass-inquisitor-judgment", name: "Julgamento", damageFamily: "physical", scaling: 1.45, cooldownTurns: 2, target: "single_enemy", description: "Causa +25% de dano se o alvo estiver acima de 70% de Vida.", aiTrigger: "target_hp > 70%", specialEffects: [{ kind: "conditional_damage_bonus", condition: "target_hp > 70%", bonusPercent: 25 }] },
    { id: "glass-inquisitor-purge", name: "Purgar", damageFamily: "physical", scaling: 0.9, cooldownTurns: 3, target: "single_enemy", description: "Remove 1 buff do alvo; se remover, o golpe causa +30% de dano.", aiTrigger: "target_has_buff", specialEffects: [{ kind: "remove_buff", count: 1 }, { kind: "conditional_damage_bonus", condition: "target_has_buff", bonusPercent: 30 }] },
  ],
  "rupture-weaver": [
    { id: "rupture-weaver-needle", name: "Agulha de Fenda", damageFamily: "magical", scaling: 1.0, cooldownTurns: 0, target: "single_enemy", description: "Agulha mágica que pode causar Cegueira.", aiTrigger: "always", statusEffects: [{ kind: "blind", chance: 28, turns: 2 }] },
    { id: "rupture-weaver-open-rift", name: "Abrir Fenda", damageFamily: "magical", scaling: 2.2, cooldownTurns: 4, target: "all_enemies", description: "Carrega por 1 turno e abre uma fenda que explode no turno seguinte; pode causar Queimadura.", aiTrigger: "turn % 3 == 0", statusEffects: [{ kind: "burn", chance: 20, turns: 3, percentMaxHp: 3 }], chargeTurns: 1 },
    { id: "rupture-weaver-fold", name: "Dobra de Posição", damageFamily: "magical", scaling: 0.75, cooldownTurns: 3, target: "single_enemy", description: "Distorce o espaço, causa dano mágico e força o alvo a trocar de posição.", aiTrigger: "target_position == front", specialEffects: [{ kind: "force_position_change" }] },
  ],
  "fractured-archon": [
    { id: "fractured-archon-shard", name: "Estilhaço Magistral", damageFamily: "magical", scaling: 1.05, cooldownTurns: 0, target: "single_enemy", description: "Projétil arcano que pode causar Queimadura.", aiTrigger: "always", statusEffects: [{ kind: "burn", chance: 30, turns: 4, percentMaxHp: 4 }] },
    { id: "fractured-archon-judgment", name: "Juízo Fraturado", damageFamily: "magical", scaling: 2.35, cooldownTurns: 5, target: "all_enemies", description: "Golpe carregado e telegrafado por 1 turno; atinge todos os inimigos e pode causar Cegueira.", aiTrigger: "turn % 5 == 0", statusEffects: [{ kind: "blind", chance: 22, turns: 2 }], chargeTurns: 1 },
    { id: "fractured-archon-converge", name: "Convergir", damageFamily: "none", scaling: 0, cooldownTurns: 4, target: "self", description: "Quando o recurso especial estiver cheio, fortalece a próxima habilidade ofensiva em +50% de dano.", aiTrigger: "resource_full", specialEffects: [{ kind: "empower_next_damage", bonusPercent: 50 }] },
    { id: "fractured-archon-phase-two", name: "Fase Dois — Autoridade Partida", damageFamily: "none", scaling: 0, cooldownTurns: 0, target: "self", description: "Uma vez por batalha abaixo de 50% de Vida: +20% de Dano Mágico e -15% de dano recebido pelo resto da batalha.", aiTrigger: "hp_self < 50%", specialEffects: [{ kind: "permanent_phase_buff", damageBonusPercent: 20, selfDefensePenaltyPercent: -15 }], oncePerBattle: true },
  ],
  "slag-beetle": [
    { id: "slag-beetle-bite", name: "Mandíbula de Escória", damageFamily: "physical", scaling: 1.0, cooldownTurns: 0, target: "single_enemy", description: "Ataque simples de mandíbula reforçada.", aiTrigger: "always" },
    { id: "slag-beetle-swarm", name: "Enxame de Carapaças", damageFamily: "physical", scaling: 0.8, cooldownTurns: 2, target: "single_enemy", description: "Causa +15% de dano por aliado vivo, até +45%.", aiTrigger: "allies_alive >= 1", specialEffects: [{ kind: "damage_bonus_per_ally", bonusPercent: 15, capPercent: 45 }] },
  ],
  "cracked-nomad": [
    { id: "cracked-nomad-stab", name: "Punhalada Rachada", damageFamily: "physical", scaling: 1.15, cooldownTurns: 0, target: "single_enemy", description: "Punhalada que pode causar Sangramento e recebe +20% de dano contra alvo abaixo de 50% de Vida.", aiTrigger: "target_hp < 50%", statusEffects: [{ kind: "bleed", chance: 20, turns: 3, percentMaxHp: 2 }], specialEffects: [{ kind: "conditional_damage_bonus", condition: "target_hp < 50%", bonusPercent: 20 }] },
    { id: "cracked-nomad-throw", name: "Arremesso de Lâmina", damageFamily: "physical", scaling: 0.9, cooldownTurns: 1, target: "single_enemy", description: "Ataque à distância que ignora exigência de adjacência.", aiTrigger: "distance > 1", specialEffects: [{ kind: "gap_close" }] },
  ],
  "iron-hyena": [
    { id: "iron-hyena-wounded-bite", name: "Morder o Ferido", damageFamily: "physical", scaling: 1.1, cooldownTurns: 0, target: "single_enemy", description: "Mordida que pode causar Sangramento; causa +25% de dano se o alvo estiver abaixo de 40% de Vida.", aiTrigger: "target_hp < 40%", statusEffects: [{ kind: "bleed", chance: 26, turns: 3, percentMaxHp: 3 }], specialEffects: [{ kind: "conditional_damage_bonus", condition: "target_hp < 40%", bonusPercent: 25 }] },
    { id: "iron-hyena-pack", name: "Caçada em Matilha", damageFamily: "physical", scaling: 0.85, cooldownTurns: 2, target: "single_enemy", description: "Causa +20% de dano por outra Hiena de Ferro viva, até +40%.", aiTrigger: "allies_alive >= 1", specialEffects: [{ kind: "damage_bonus_per_ally", bonusPercent: 20, capPercent: 40 }] },
  ],
  "dust-worm": [
    { id: "dust-worm-emerge", name: "Emergir da Poeira", damageFamily: "physical", scaling: 1.3, cooldownTurns: 3, target: "single_enemy", description: "No primeiro turno, emerge sob o alvo e ganha +20% de dano.", aiTrigger: "turn == 1", specialEffects: [{ kind: "conditional_damage_bonus", condition: "turn == 1", bonusPercent: 20 }] },
    { id: "dust-worm-swallow", name: "Engolir", damageFamily: "physical", scaling: 1.55, cooldownTurns: 3, target: "single_enemy", description: "Mordida esmagadora; causa +35% de dano se o alvo estiver abaixo de 25% de Vida e pode Envenenar.", aiTrigger: "target_hp < 25%", statusEffects: [{ kind: "poison", chance: 22, turns: 3, percentMaxHp: 3 }], specialEffects: [{ kind: "conditional_damage_bonus", condition: "target_hp < 25%", bonusPercent: 35 }] },
  ],
  "walking-cinder": [
    { id: "walking-cinder-flame", name: "Labareda Errante", damageFamily: "magical", scaling: 1.0, cooldownTurns: 0, target: "single_enemy", description: "Explosão mágica de cinzas que pode causar Queimadura.", aiTrigger: "target_not_burning", statusEffects: [{ kind: "burn", chance: 32, turns: 3, percentMaxHp: 4 }] },
    { id: "walking-cinder-implode", name: "Implodir", damageFamily: "magical", scaling: 1.9, cooldownTurns: 3, target: "all_enemies", description: "Abaixo de 20% de Vida, implode e perde 20% da própria Vida máxima após resolver o dano.", aiTrigger: "hp_self < 20%", specialEffects: [{ kind: "self_hp_cost_after_cast", percentMaxHp: 20 }] },
  ],
  "buried-sentinel": [
    { id: "buried-sentinel-hammer", name: "Martelo Sepultado", damageFamily: "physical", scaling: 1.15, cooldownTurns: 0, target: "single_enemy", description: "Golpe pesado; 25% de chance de Atordoar por 1 rodada.", aiTrigger: "always", statusEffects: [{ kind: "stun", chance: 25, turns: 1 }] },
    { id: "buried-sentinel-block-route", name: "Bloquear Rota", damageFamily: "physical", scaling: 0.8, cooldownTurns: 0, target: "single_enemy", description: "Reação quando o alvo tenta fugir ou trocar de posição: golpeia e Imobiliza por 1 turno. Máximo 1 vez por rodada.", aiTrigger: "target_attempted_escape_or_position_change", statusEffects: [{ kind: "position_lock", chance: 100, turns: 1 }], reaction: true },
    { id: "buried-sentinel-guard", name: "Postura de Guarda", damageFamily: "none", scaling: 0, cooldownTurns: 3, target: "self", description: "Reduz em 40% o dano recebido por 2 turnos.", aiTrigger: "hp_self < 60%", statusEffects: [{ kind: "guard", chance: 100, turns: 2, damageReductionPercent: 40 }] },
  ],
  "brood-mother": [
    { id: "brood-mother-sting", name: "Ferroada Materna", damageFamily: "physical", scaling: 1.1, cooldownTurns: 0, target: "single_enemy", description: "Ferroada que pode Envenenar.", aiTrigger: "always", statusEffects: [{ kind: "poison", chance: 35, turns: 4, percentMaxHp: 4 }] },
    { id: "brood-mother-spawn", name: "Desovar", damageFamily: "none", scaling: 0, cooldownTurns: 4, target: "battlefield", description: "Invoca até 2 crias menores, respeitando o limite do encontro.", aiTrigger: "allies_alive < 2", specialEffects: [{ kind: "summon_minions", count: 2, template: "broodling" }] },
    { id: "brood-mother-jaws", name: "Mandíbulas da Ninhada", damageFamily: "physical", scaling: 1.45, cooldownTurns: 2, target: "single_enemy", description: "Causa +30% de dano contra alvo Envenenado.", aiTrigger: "target_has_poison", specialEffects: [{ kind: "conditional_damage_bonus", condition: "target_has_poison", bonusPercent: 30 }] },
  ],
  "salt-knight": [
    { id: "salt-knight-charge", name: "Investida Salina", damageFamily: "physical", scaling: 1.4, cooldownTurns: 3, target: "single_enemy", description: "Investida pesada que pode causar Sangramento.", aiTrigger: "turn == 1", statusEffects: [{ kind: "bleed", chance: 28, turns: 3, percentMaxHp: 3 }] },
    { id: "salt-knight-crust", name: "Couraça de Sal", damageFamily: "none", scaling: 0, cooldownTurns: 3, target: "self", description: "Reduz em 35% o dano recebido por 2 turnos e remove Queimadura ou Veneno de si.", aiTrigger: "always", statusEffects: [{ kind: "guard", chance: 100, turns: 2, damageReductionPercent: 35 }], specialEffects: [{ kind: "cleanse_self", statuses: ["burn", "poison"] }] },
    { id: "salt-knight-rise", name: "Erguer-se", damageFamily: "none", scaling: 0, cooldownTurns: 0, target: "self", description: "Passiva: uma vez por batalha, ao chegar a 0 de Vida, retorna com 30% da Vida máxima.", aiTrigger: "hp_self == 0", specialEffects: [{ kind: "revive", hpPercent: 30 }], oncePerBattle: true },
  ],
  "slag-drake": [
    { id: "slag-drake-bite", name: "Mordida de Escória", damageFamily: "physical", scaling: 1.1, cooldownTurns: 0, target: "single_enemy", description: "Mordida superaquecida que pode causar Queimadura.", aiTrigger: "always", statusEffects: [{ kind: "burn", chance: 38, turns: 4, percentMaxHp: 5 }] },
    { id: "slag-drake-breath", name: "Sopro de Escória", damageFamily: "physical", scaling: 1.35, cooldownTurns: 3, target: "all_enemies", description: "Sopro de fragmentos incandescentes. Usa Dano Físico contra Defesa Física e pode causar Queimadura.", aiTrigger: "allies_alive >= 1", statusEffects: [{ kind: "burn", chance: 38, turns: 4, percentMaxHp: 5 }] },
    { id: "slag-drake-dive", name: "Voo Rasante", damageFamily: "physical", scaling: 1.5, cooldownTurns: 3, target: "single_enemy", description: "Ataque em mergulho; depois ganha +20 pp de Esquiva por 1 turno.", aiTrigger: "hp_self < 40%", statusEffects: [{ kind: "evasion", chance: 100, turns: 1, dodgeBonus: 20 }] },
  ],
  "slag-colossus": [
    { id: "slag-colossus-fist", name: "Punho de Escória", damageFamily: "physical", scaling: 1.1, cooldownTurns: 0, target: "single_enemy", description: "Golpe direto que pode causar Queimadura.", aiTrigger: "always", statusEffects: [{ kind: "burn", chance: 26, turns: 3, percentMaxHp: 4 }] },
    { id: "slag-colossus-sweep", name: "Varrer Linha", damageFamily: "physical", scaling: 1.4, cooldownTurns: 3, target: "all_enemies", description: "Varre uma linha inteira com o braço de escória.", aiTrigger: "turn % 3 == 0" },
    { id: "slag-colossus-guard", name: "Postura de Guarda", damageFamily: "none", scaling: 0, cooldownTurns: 4, target: "self", description: "Reduz em 45% o dano recebido por 2 turnos.", aiTrigger: "hp_self < 60%", statusEffects: [{ kind: "guard", chance: 100, turns: 2, damageReductionPercent: 45 }] },
    { id: "slag-colossus-collapse", name: "Desmoronar", damageFamily: "physical", scaling: 2.3, cooldownTurns: 5, target: "all_enemies", description: "Abaixo de 25% de Vida, carrega por 1 turno e desaba sobre o campo; 35% de chance de Atordoar por 1 rodada.", aiTrigger: "hp_self < 25%", statusEffects: [{ kind: "stun", chance: 35, turns: 1 }], chargeTurns: 1 },
  ],
  "buried-titan": [
    { id: "buried-titan-stomp", name: "Pisão Tectônico", damageFamily: "physical", scaling: 1.15, cooldownTurns: 0, target: "all_enemies", description: "Abala o campo inteiro e pode causar Sangramento.", aiTrigger: "always", statusEffects: [{ kind: "bleed", chance: 30, turns: 4, percentMaxHp: 5 }] },
    { id: "buried-titan-crater", name: "Impacto de Cratera", damageFamily: "physical", scaling: 2.4, cooldownTurns: 4, target: "all_enemies", description: "Carregamento telegrafado de 1 turno; ao resolver, causa dano massivo e pode causar Queimadura.", aiTrigger: "turn % 4 == 0", statusEffects: [{ kind: "burn", chance: 30, turns: 4, percentMaxHp: 5 }], chargeTurns: 1 },
    { id: "buried-titan-awaken", name: "Despertar", damageFamily: "none", scaling: 0, cooldownTurns: 0, target: "self", description: "No primeiro turno, ganha 25% de redução de dano por 1 turno e +15% de dano pelo resto da batalha.", aiTrigger: "turn == 1", statusEffects: [{ kind: "guard", chance: 100, turns: 1, damageReductionPercent: 25 }], specialEffects: [{ kind: "permanent_damage_buff", bonusPercent: 15 }], oncePerBattle: true },
    { id: "buried-titan-phase-two", name: "Fase Dois — Crosta Partida", damageFamily: "none", scaling: 0, cooldownTurns: 0, target: "self", description: "Uma vez abaixo de 66% de Vida: +20% de dano e -10% de Defesa Física/Mágica pelo resto da batalha.", aiTrigger: "hp_self < 66%", specialEffects: [{ kind: "permanent_phase_buff", damageBonusPercent: 20, selfDefensePenaltyPercent: 10 }], oncePerBattle: true },
    { id: "buried-titan-phase-three", name: "Fase Três — Coração Exposto", damageFamily: "none", scaling: 0, cooldownTurns: 0, target: "self", description: "Uma vez abaixo de 33% de Vida: +35% de dano e recarga de Impacto de Cratera é zerada imediatamente.", aiTrigger: "hp_self < 33%", specialEffects: [{ kind: "permanent_damage_buff", bonusPercent: 35 }, { kind: "reset_cooldown", abilityId: "buried-titan-crater" }], oncePerBattle: true },
  ],
  "goblin-batedor": [
    { id: "goblin-scout-stab", name: "Estocada de Batedor", damageFamily: "physical", scaling: 1.0, cooldownTurns: 0, target: "single_enemy", description: "Ataque rápido com arma curta.", aiTrigger: "always" },
    { id: "goblin-scout-alarm", name: "Grito de Alarme", damageFamily: "none", scaling: 0, cooldownTurns: 0, target: "all_allies", description: "Uma vez por batalha no turno 1, aliados da Horda Verde ganham +15% de dano por 2 turnos.", aiTrigger: "turn == 1", specialEffects: [{ kind: "warband_buff", damageBonusPercent: 15, turns: 2 }], oncePerBattle: true },
  ],
  "goblin-fundeiro": [
    { id: "goblin-slinger-shot", name: "Pedrada de Funda", damageFamily: "physical", scaling: 1.0, cooldownTurns: 0, target: "single_enemy", description: "Ataque à distância que pode causar Cegueira.", aiTrigger: "distance > 1", statusEffects: [{ kind: "blind", chance: 16, turns: 1 }] },
    { id: "goblin-slinger-retreat", name: "Recuo Covarde", damageFamily: "physical", scaling: 0.7, cooldownTurns: 2, target: "single_enemy", description: "Ataca enquanto recua e ganha +15 pp de Esquiva por 1 turno.", aiTrigger: "target_adjacent", statusEffects: [{ kind: "evasion", chance: 100, turns: 1, dodgeBonus: 15 }] },
  ],
  "goblin-montador": [
    { id: "goblin-rider-charge", name: "Investida Montada", damageFamily: "physical", scaling: 1.35, cooldownTurns: 3, target: "single_enemy", description: "Investida de abertura que pode causar Sangramento.", aiTrigger: "turn == 1", statusEffects: [{ kind: "bleed", chance: 14, turns: 2, percentMaxHp: 2 }] },
    { id: "goblin-rider-flank", name: "Flanquear", damageFamily: "physical", scaling: 1.15, cooldownTurns: 1, target: "single_enemy", description: "Causa +25% de dano contra alvo na retaguarda.", aiTrigger: "target_position == back", specialEffects: [{ kind: "conditional_damage_bonus", condition: "target_position == back", bonusPercent: 25 }] },
  ],
  "goblin-chefe": [
    { id: "goblin-chief-cleaver", name: "Cutelo do Chefe", damageFamily: "physical", scaling: 1.1, cooldownTurns: 0, target: "single_enemy", description: "Golpe de cutelo que pode causar Sangramento.", aiTrigger: "always", statusEffects: [{ kind: "bleed", chance: 20, turns: 3, percentMaxHp: 2 }] },
    { id: "goblin-chief-command", name: "Berro de Comando", damageFamily: "none", scaling: 0, cooldownTurns: 4, target: "all_allies", description: "Aliados da Horda Verde ganham +20% de dano e +10 pp de Crítico por 2 turnos.", aiTrigger: "allies_alive >= 1", specialEffects: [{ kind: "warband_buff", damageBonusPercent: 20, criticalChanceBonus: 10, turns: 2 }] },
    { id: "goblin-chief-shove", name: "Empurrar Subordinado", damageFamily: "none", scaling: 0, cooldownTurns: 4, target: "self", description: "Abaixo de 40% de Vida, redireciona o próximo ataque direto que receber para um aliado Tropa da Horda Verde.", aiTrigger: "hp_self < 40%" },
  ],
  "orc-saqueador": [
    { id: "orc-raider-axe", name: "Machado de Pilhagem", damageFamily: "physical", scaling: 1.1, cooldownTurns: 0, target: "single_enemy", description: "Golpe de machado que pode causar Sangramento.", aiTrigger: "always", statusEffects: [{ kind: "bleed", chance: 22, turns: 3, percentMaxHp: 3 }] },
    { id: "orc-raider-ignore-pain", name: "Ignorar Dor", damageFamily: "none", scaling: 0, cooldownTurns: 3, target: "self", description: "Abaixo de 30% de Vida, reduz em 30% o dano recebido por 1 turno.", aiTrigger: "hp_self < 30%", statusEffects: [{ kind: "guard", chance: 100, turns: 1, damageReductionPercent: 30 }] },
  ],
  "xama-goblin": [
    { id: "goblin-shaman-flame", name: "Labareda Tribal", damageFamily: "magical", scaling: 1.0, cooldownTurns: 0, target: "single_enemy", description: "Ataque mágico de fogo que pode causar Queimadura.", aiTrigger: "always", statusEffects: [{ kind: "burn", chance: 26, turns: 3, percentMaxHp: 3 }] },
    { id: "goblin-shaman-totem", name: "Totem da Horda", damageFamily: "none", scaling: 0, cooldownTurns: 4, target: "all_allies", description: "Ergue um totem por 2 turnos: aliados da Horda Verde ganham +15% de dano e +10 pp de chance de aplicar status.", aiTrigger: "turn % 4 == 0", specialEffects: [{ kind: "warband_buff", damageBonusPercent: 15, statusChanceBonus: 10, turns: 2 }] },
  ],
  "orc-carrasco": [
    { id: "orc-executioner-chop", name: "Golpe do Carrasco", damageFamily: "physical", scaling: 1.15, cooldownTurns: 0, target: "single_enemy", description: "Golpe brutal que pode causar Sangramento.", aiTrigger: "always", statusEffects: [{ kind: "bleed", chance: 30, turns: 4, percentMaxHp: 4 }] },
    { id: "orc-executioner-mark", name: "Marca da Execução", damageFamily: "none", scaling: 0, cooldownTurns: 3, target: "single_enemy", description: "Marca o alvo por 3 turnos; Execução causa +30% de dano contra ele.", aiTrigger: "turn == 1", statusEffects: [{ kind: "marked", chance: 100, turns: 3 }] },
    { id: "orc-executioner-execute", name: "Execução", damageFamily: "physical", scaling: 1.8, cooldownTurns: 3, target: "single_enemy", description: "Só prioriza alvo abaixo de 30% de Vida. Recebe +30% de dano se o alvo estiver Marcado.", aiTrigger: "target_hp < 30%", specialEffects: [{ kind: "conditional_damage_bonus", condition: "target_has_marked", bonusPercent: 30 }] },
  ],
  "senhor-da-guerra-orc": [
    { id: "orc-warlord-axe", name: "Machado do Senhor da Guerra", damageFamily: "physical", scaling: 1.15, cooldownTurns: 0, target: "single_enemy", description: "Golpe principal que pode causar Sangramento.", aiTrigger: "always", statusEffects: [{ kind: "bleed", chance: 32, turns: 4, percentMaxHp: 4 }] },
    { id: "orc-warlord-sweep", name: "Varrer Linha", damageFamily: "physical", scaling: 1.4, cooldownTurns: 3, target: "all_enemies", description: "Ataque amplo contra todos os inimigos.", aiTrigger: "allies_alive >= 1" },
    { id: "orc-warlord-summon", name: "Convocar Horda", damageFamily: "none", scaling: 0, cooldownTurns: 4, target: "battlefield", description: "Convoca até 2 membros da Horda Verde apropriados à região, respeitando o limite do encontro.", aiTrigger: "turn % 4 == 0", specialEffects: [{ kind: "summon_from_warband", count: 2 }] },
    { id: "orc-warlord-phase-two", name: "Fúria do Senhor da Guerra", damageFamily: "none", scaling: 0, cooldownTurns: 0, target: "self", description: "Uma vez abaixo de 45% de Vida: ganha +30% de dano e +15 pp de Crítico pelo resto da batalha.", aiTrigger: "hp_self < 45%", specialEffects: [{ kind: "permanent_phase_buff", damageBonusPercent: 30, criticalChanceBonus: 15 }], oncePerBattle: true },
  ],
  "minotauro-do-labirinto": [
    { id: "minotaur-horn-charge", name: "Investida de Chifre", damageFamily: "physical", scaling: 1.5, cooldownTurns: 3, target: "single_enemy", description: "Investida de abertura que pode causar Sangramento e 30% de chance de Atordoar por 1 rodada.", aiTrigger: "turn == 1", statusEffects: [{ kind: "bleed", chance: 34, turns: 4, percentMaxHp: 5 }, { kind: "stun", chance: 30, turns: 1 }] },
    { id: "minotaur-fury", name: "Fúria Labiríntica", damageFamily: "none", scaling: 0, cooldownTurns: 0, target: "self", description: "Uma vez abaixo de 50% de Vida, ganha +25% de dano pelo resto da batalha.", aiTrigger: "hp_self < 50%", specialEffects: [{ kind: "permanent_damage_buff", bonusPercent: 25 }], oncePerBattle: true },
    { id: "minotaur-pursuit", name: "Perseguição do Labirinto", damageFamily: "physical", scaling: 0.9, cooldownTurns: 0, target: "single_enemy", description: "Reação: ataca quando o alvo troca de posição. Máximo 1 vez por rodada; não gera outra reação.", aiTrigger: "target_changed_position", reaction: true },
  ],
};
