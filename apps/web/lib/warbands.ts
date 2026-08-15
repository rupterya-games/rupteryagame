import type { Warband } from "@rupterya/game-core";

/**
 * Bandos de Rupterya.
 *
 * Regra central: duas criaturas só compartilham um encontro se pertencem ao
 * mesmo bando, ou se os bandos delas se declaram aliados. Goblins e orcs
 * dividem a Horda Verde e lutam juntos; um orc e um minotauro nunca aparecem
 * lado a lado, porque o minotauro é solitário e não pertence a bando nenhum.
 *
 * Uma criatura pode pertencer a mais de um bando. A Hiena de Ferro corre com
 * a Matilha Cinzenta e também com a Carniça de Dustfall.
 */
export const warbands: Warband[] = [
  {
    id: "praga-menor",
    name: "Praga Menor",
    description: "Fauna oportunista. Não tem hierarquia, só número.",
    kingdoms: ["FiorDeValle"],
    weight: 120,
    minSize: 2,
    maxSize: 5,
    leaderChance: 0,
    allies: [],
    allyChance: 0,
    composition: { leaders: [], regulars: [], fodder: ["cellar-rat", "leech-bat", "graveyard-crow"] },
  },
  {
    id: "bando-do-saque",
    name: "Bando do Saque",
    description: "Humanos que vivem das rotas isoladas. Trabalham por ouro, não por causa.",
    kingdoms: ["FiorDeValle", "Dustfall"],
    weight: 90,
    minSize: 1,
    maxSize: 3,
    leaderChance: 0,
    allies: [],
    allyChance: 0,
    composition: { leaders: [], regulars: ["raider", "cracked-nomad"], fodder: [] },
  },
  {
    id: "horda-verde",
    name: "Horda Verde",
    description: "Goblins e orcs sob a mesma bandeira. Goblins abrem o caminho, orcs terminam a briga.",
    kingdoms: ["FiorDeValle", "Dustfall"],
    weight: 110,
    minSize: 2,
    maxSize: 5,
    leaderChance: 0.3,
    allies: ["matilha-cinzenta"],
    allyChance: 0.22,
    composition: {
      leaders: ["goblin-chefe", "orc-carrasco", "senhor-da-guerra-orc"],
      regulars: ["goblin-montador", "xama-goblin", "orc-saqueador"],
      fodder: ["goblin-batedor", "goblin-fundeiro"],
    },
  },
  {
    id: "matilha-cinzenta",
    name: "Matilha Cinzenta",
    description: "Feras de caça coordenada. A Horda Verde as monta; elas toleram.",
    kingdoms: ["FiorDeValle", "Dustfall"],
    weight: 80,
    minSize: 2,
    maxSize: 4,
    leaderChance: 0,
    allies: ["horda-verde"],
    allyChance: 0.15,
    composition: { leaders: [], regulars: ["iron-hyena"], fodder: ["ash-wolf"] },
  },
  {
    id: "corte-carmesim",
    name: "Corte Carmesim",
    description: "A nobreza vampírica de FiorDeValle e os servos que ela fabricou.",
    kingdoms: ["FiorDeValle"],
    weight: 100,
    minSize: 1,
    maxSize: 3,
    leaderChance: 0.25,
    allies: ["guarda-podre"],
    allyChance: 0.2,
    composition: {
      leaders: ["crimson-herald", "vrannoc-bride", "mist-captain"],
      regulars: ["vampire-wanderer", "hanged-vintner"],
      fodder: ["pale-servant"],
    },
  },
  {
    id: "guarda-podre",
    name: "Guarda Podre",
    description: "Mortos que ainda vestem a armadura de uma ordem extinta.",
    kingdoms: ["FiorDeValle", "Dustfall"],
    weight: 60,
    minSize: 1,
    maxSize: 2,
    leaderChance: 0,
    allies: ["corte-carmesim"],
    allyChance: 0.18,
    composition: { leaders: [], regulars: ["rotted-knight", "salt-knight"], fodder: [] },
  },
  {
    id: "ordem-de-vidro",
    name: "Ordem de Vidro",
    description: "O que Eldravia mandou fechar a Fenda e nunca mais recolheu.",
    kingdoms: ["Eldravia"],
    weight: 85,
    minSize: 1,
    maxSize: 3,
    leaderChance: 0.28,
    allies: ["restos-do-arquivo"],
    allyChance: 0.25,
    composition: { leaders: ["glass-inquisitor"], regulars: [], fodder: ["stray-apprentice"] },
  },
  {
    id: "restos-do-arquivo",
    name: "Restos do Arquivo",
    description: "Constructos que continuam cumprindo ordens de uma administração morta.",
    kingdoms: ["Eldravia"],
    weight: 90,
    minSize: 1,
    maxSize: 3,
    leaderChance: 0,
    allies: ["ordem-de-vidro"],
    allyChance: 0.2,
    composition: { leaders: [], regulars: ["library-golem"], fodder: ["ink-servant"] },
  },
  {
    id: "prole-da-fenda",
    name: "Prole da Fenda",
    description: "Aberrações da Ruptura. Não fazem alianças — nem com o resto de Eldravia, nem entre si.",
    kingdoms: ["Eldravia"],
    weight: 105,
    minSize: 1,
    maxSize: 4,
    leaderChance: 0.3,
    allies: [],
    allyChance: 0,
    composition: {
      leaders: ["hollow-echo", "rupture-weaver", "fractured-archon"],
      regulars: ["essence-leech", "convergence-hound"],
      fodder: ["rupture-shard"],
    },
  },
  {
    id: "ninhada-de-escoria",
    name: "Ninhada de Escória",
    description: "Insetos de Dustfall. Onde há três, há trinta a poucos metros.",
    kingdoms: ["Dustfall"],
    weight: 110,
    minSize: 3,
    maxSize: 6,
    leaderChance: 0.18,
    allies: [],
    allyChance: 0,
    composition: { leaders: ["brood-mother"], regulars: [], fodder: ["slag-beetle"] },
  },
  {
    id: "carnica-de-dustfall",
    name: "Carniça de Dustfall",
    description: "Feras que seguem caravanas e esperam a primeira baixa.",
    kingdoms: ["Dustfall"],
    weight: 85,
    minSize: 1,
    maxSize: 3,
    leaderChance: 0,
    allies: [],
    allyChance: 0,
    composition: { leaders: [], regulars: ["dust-worm"], fodder: ["iron-hyena"] },
  },
  {
    id: "cinzas-vivas",
    name: "Cinzas Vivas",
    description: "Elementais e sentinelas que restaram do fogo industrial de Dustfall.",
    kingdoms: ["Dustfall"],
    weight: 80,
    minSize: 1,
    maxSize: 3,
    leaderChance: 0.26,
    allies: [],
    allyChance: 0,
    composition: { leaders: ["buried-sentinel", "slag-colossus"], regulars: [], fodder: ["walking-cinder"] },
  },
  {
    id: "rotas-do-vinhedo",
    name: "Rotas do Vinhedo",
    description: "Feras e predadores que dominaram as saídas Norte e Sul de FiorDeValle.",
    kingdoms: ["FiorDeValle"],
    weight: 95,
    minSize: 1,
    maxSize: 4,
    leaderChance: 0.24,
    allies: ["vigias-da-bruma"],
    allyChance: 0.14,
    composition: {
      leaders: ["alfa-uivo-cinzento", "horror-da-prensa"],
      regulars: ["sacristao-oco", "aranha-de-adega"],
      fodder: ["cabra-ladra", "lebre-de-brasa"],
    },
  },
  {
    id: "vigias-da-bruma",
    name: "Vigias da Bruma",
    description: "Caçadores, mortos e oportunistas das rotas Leste e Oeste de FiorDeValle.",
    kingdoms: ["FiorDeValle"],
    weight: 92,
    minSize: 1,
    maxSize: 3,
    leaderChance: 0.26,
    allies: ["rotas-do-vinhedo"],
    allyChance: 0.14,
    composition: {
      leaders: ["noiva-do-mausoleu", "barao-da-bruma"],
      regulars: ["falcao-do-vigia", "assombro-do-mosto"],
      fodder: ["cobrador-goblin", "cacador-sem-rosto"],
    },
  },
  {
    id: "arquivo-vivo",
    name: "Arquivo Vivo",
    description: "Entidades que nasceram da rotina acadêmica e aprenderam a defendê-la.",
    kingdoms: ["Eldravia"],
    weight: 88,
    minSize: 1,
    maxSize: 3,
    leaderChance: 0.24,
    allies: ["fraturas-do-observatorio"],
    allyChance: 0.18,
    composition: {
      leaders: ["bibliotecario-invertido", "prelado-prismatico"],
      regulars: ["devora-tinta", "gemeo-de-espelho"],
      fodder: ["pajem-de-pergaminho", "sentinela-de-vitrine"],
    },
  },
  {
    id: "fraturas-do-observatorio",
    name: "Fraturas do Observatório",
    description: "Aberrações e resíduos arcanos das rotas Sul e Oeste de Eldravia.",
    kingdoms: ["Eldravia"],
    weight: 96,
    minSize: 1,
    maxSize: 4,
    leaderChance: 0.28,
    allies: ["arquivo-vivo"],
    allyChance: 0.18,
    composition: {
      leaders: ["astronomo-partido", "arconte-da-fenda"],
      regulars: ["sanguessuga-de-mana", "tecelao-de-falha"],
      fodder: ["faisca-discente", "cao-de-margem"],
    },
  },
  {
    id: "sal-e-horda",
    name: "Sal e Horda",
    description: "Criaturas que disputam as rotas Norte e Leste de Dustfall.",
    kingdoms: ["Dustfall"],
    weight: 102,
    minSize: 1,
    maxSize: 4,
    leaderChance: 0.28,
    allies: ["forja-da-cratera"],
    allyChance: 0.12,
    composition: {
      leaders: ["matriarca-da-horda", "rainha-salina"],
      regulars: ["chifrudo-salino", "cavaleiro-calcificado"],
      fodder: ["catador-verde", "abutre-de-sal"],
    },
  },
  {
    id: "forja-da-cratera",
    name: "Forja da Cratera",
    description: "Escória viva e predadores moldados pelo impacto a Oeste e Sul de Dustfall.",
    kingdoms: ["Dustfall"],
    weight: 98,
    minSize: 1,
    maxSize: 3,
    leaderChance: 0.3,
    allies: ["sal-e-horda"],
    allyChance: 0.12,
    composition: {
      leaders: ["forjador-carbonizado", "tita-da-cratera"],
      regulars: ["capataz-de-escoria", "draco-de-cinza"],
      fodder: ["besouro-de-escoria", "verme-de-impacto"],
    },
  },
];

export const warbandsById = new Map(warbands.map((band) => [band.id, band]));

/**
 * Criaturas que nunca aparecem acompanhadas — nem do próprio tipo.
 * O Minotauro é o caso de referência: divide região com a Horda Verde,
 * mas jamais divide encontro com ela.
 */
export const solitaryCreatureIds = new Set<string>([
  "barrel-witch",
  "grimoire-owl",
  "minotauro-do-labirinto",
  "slag-drake",
  "buried-titan",
]);

/** Índice reverso: criatura -> bandos aos quais pertence, e papel. */
export const warbandMembership = (() => {
  const bands = new Map<string, string[]>();
  const roles = new Map<string, "fodder" | "regular" | "leader">();
  for (const band of warbands) {
    const groups = [
      ["leader", band.composition.leaders],
      ["regular", band.composition.regulars],
      ["fodder", band.composition.fodder],
    ] as const;
    for (const [role, ids] of groups) {
      for (const id of ids) {
        bands.set(id, [...(bands.get(id) ?? []), band.id]);
        const current = roles.get(id);
        if (!current || (current === "fodder" && role !== "fodder") || (current === "regular" && role === "leader")) {
          roles.set(id, role);
        }
      }
    }
  }
  return { bands, roles };
})();
