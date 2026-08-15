/**
 * Arquitetura do mundo: cidades -> serviços -> portões -> saídas -> instâncias.
 *
 * Este arquivo não contém regras de combate nem economia. Ele descreve apenas
 * topologia, progressão e pools de conteúdo, permitindo que UI, missões e
 * persistência consumam a mesma fonte de verdade.
 */


export type AdventureCityId = "fiordevalle" | "eldravia" | "dustfall";

export interface AdventureSectionDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  detail: string;
}

export interface AdventureLevelDefinition {
  id: string;
  level: number;
  name: string;
  spotCount: number;
  recommendedLevel: string;
  signatureCreatureId: string;
  bossId?: string;
  creaturePool: string[];
  eventPool: string[];
}

export interface AdventureExitDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  levels: AdventureLevelDefinition[];
}

export interface AdventureCityDefinition {
  id: AdventureCityId;
  kingdom: string;
  name: string;
  heroArtPath: string;
  description: string;
  sections: AdventureSectionDefinition[];
  exits: AdventureExitDefinition[];
}

export const adventureCities: Record<AdventureCityId, AdventureCityDefinition> = {
  fiordevalle: {
    id: "fiordevalle",
    kingdom: "FiorDeValle",
    name: "FiorDeValle",
    heroArtPath: "/art/maps/cities/fiordevalle.jpg",
    description: "Cidade-hub inicial. O jogador entra na cidade, usa os serviços internos e sai pelos Portões para instâncias externas divididas em três níveis de progressão.",
    sections: [
      { id: "centro", name: "Centro", icon: "⌂", description: "Coração da cidade e ponto de preparação.", detail: "O Centro concentra descanso, informações e acesso rápido aos serviços de FiorDeValle." },
      { id: "mercado", name: "Mercado", icon: "⚖", description: "Compra de equipamentos básicos e raros.", detail: "Compre equipamento usando ouro. Itens adquiridos entram diretamente no inventário do personagem." },
      { id: "mural", name: "Mural de Missões", icon: "✦", description: "Contratos ligados à exploração das instâncias.", detail: "Aceite um contrato por vez. Explore os spots pedidos e volte ao Mural para receber ouro, XP global e, em alguns contratos, equipamento." },
      { id: "black-market", name: "Black Market", icon: "☾", description: "Itens caros, raros e de risco alto.", detail: "O Black Market oferece equipamento épico e lendário por preços muito maiores. É um atalho de poder, não uma loja de início de jogo." },
      { id: "portoes", name: "Portões", icon: "⚑", description: "Saídas Norte, Sul, Leste e Oeste.", detail: "Cada saída abre uma árvore própria de instâncias. Cada rota possui Nível 1, 2 e 3, e cada nível contém de 6 a 7 spots exploráveis." },
    ],
    exits: [
      { id: "north", name: "Saída Norte", icon: "↑", description: "Bosques frios, capelas quebradas e grutas de alcateia.", levels: [
        { id: "north-lv1", level: 1, name: "Bosque da Cinza", spotCount: 6, recommendedLevel: "Nv. 1–6", signatureCreatureId: "cabra-ladra", creaturePool: ["cabra-ladra", "cellar-rat", "leech-bat", "ash-wolf"], eventPool: ["Pegadas frescas cortam o barro.", "Uma clareira guarda ervas simples.", "Um acampamento abandonado ainda está quente."] },
        { id: "north-lv2", level: 2, name: "Capela Quebrada", spotCount: 7, recommendedLevel: "Nv. 7–13", signatureCreatureId: "sacristao-oco", creaturePool: ["sacristao-oco", "graveyard-crow", "pale-servant", "rotted-knight"], eventPool: ["Sinos rachados balançam sem vento.", "Velas antigas ardem sobre um altar destruído.", "Marcas de garras e sangue seco cobrem a pedra."] },
        { id: "north-lv3", level: 3, name: "Gruta do Uivo", spotCount: 7, recommendedLevel: "Nv. 14–20", signatureCreatureId: "alfa-uivo-cinzento", bossId: "alfa-uivo-cinzento", creaturePool: ["alfa-uivo-cinzento", "ash-wolf", "crimson-herald", "mist-captain"], eventPool: ["Um uivo sacode a moral do grupo.", "Restos de caçadores revelam um predador dominante.", "A névoa responde aos seus passos."] },
      ] },
      { id: "south", name: "Saída Sul", icon: "↓", description: "Vinhedos, estrada velha e áreas tomadas por saqueadores.", levels: [
        { id: "south-lv1", level: 1, name: "Estrada dos Vinhedos", spotCount: 6, recommendedLevel: "Nv. 1–6", signatureCreatureId: "lebre-de-brasa", creaturePool: ["lebre-de-brasa", "cellar-rat", "leech-bat", "raider"], eventPool: ["Barris partidos deixam um rastro doce.", "Corvos disputam algo no meio da estrada.", "Um carro virado esconde suprimentos úteis."] },
        { id: "south-lv2", level: 2, name: "Casas Desoladas", spotCount: 7, recommendedLevel: "Nv. 7–13", signatureCreatureId: "aranha-de-adega", creaturePool: ["aranha-de-adega", "raider", "hanged-vintner", "pale-servant"], eventPool: ["Portas batem sozinhas.", "Uma lareira apagada sugere ocupação recente.", "Símbolos de proteção foram riscados às pressas."] },
        { id: "south-lv3", level: 3, name: "Pântano Rubro", spotCount: 7, recommendedLevel: "Nv. 14–20", signatureCreatureId: "horror-da-prensa", bossId: "horror-da-prensa", creaturePool: ["horror-da-prensa", "barrel-witch", "vampire-wanderer", "crimson-herald"], eventPool: ["Água avermelhada borbulha entre raízes.", "Uma oferenda profana vibra com magia de sangue.", "A névoa transforma cada passo em ameaça."] },
      ] },
      { id: "east", name: "Saída Leste", icon: "→", description: "Colinas abertas, passo quebrado e guardas mortos-vivos.", levels: [
        { id: "east-lv1", level: 1, name: "Passo Quebrado", spotCount: 6, recommendedLevel: "Nv. 3–8", signatureCreatureId: "cobrador-goblin", creaturePool: ["cobrador-goblin", "goblin-batedor", "goblin-fundeiro", "raider"], eventPool: ["Uma bandeira verde foi presa a uma pedra.", "Armadilhas simples cercam a trilha.", "Moedas velhas marcam um pedágio improvisado."] },
        { id: "east-lv2", level: 2, name: "Colinas do Vigia", spotCount: 7, recommendedLevel: "Nv. 8–13", signatureCreatureId: "falcao-do-vigia", creaturePool: ["falcao-do-vigia", "goblin-montador", "ash-wolf", "hanged-vintner"], eventPool: ["Uma torre caída oferece visão da fronteira.", "Uma fogueira recente marca a passagem da Horda.", "Pedras soltas escondem uma bolsa esquecida."] },
        { id: "east-lv3", level: 3, name: "Cemitério Velado", spotCount: 7, recommendedLevel: "Nv. 14–20", signatureCreatureId: "noiva-do-mausoleu", bossId: "noiva-do-mausoleu", creaturePool: ["noiva-do-mausoleu", "rotted-knight", "vrannoc-bride", "crimson-herald"], eventPool: ["Lápides tombadas formam um corredor de névoa.", "Um mausoléu aberto exala magia antiga.", "Rosários partidos indicam uma defesa fracassada."] },
      ] },
      { id: "west", name: "Saída Oeste", icon: "←", description: "Floresta pesada e domínio vampírico crescente.", levels: [
        { id: "west-lv1", level: 1, name: "Trilha Sombria", spotCount: 6, recommendedLevel: "Nv. 5–10", signatureCreatureId: "cacador-sem-rosto", creaturePool: ["cacador-sem-rosto", "raider", "graveyard-crow", "pale-servant"], eventPool: ["Galhos partidos denunciam passagem recente.", "Um marco antigo aponta uma rota esquecida.", "Os insetos silenciam de repente."] },
        { id: "west-lv2", level: 2, name: "Floresta Sombria", spotCount: 7, recommendedLevel: "Nv. 11–16", signatureCreatureId: "assombro-do-mosto", creaturePool: ["assombro-do-mosto", "ash-wolf", "vampire-wanderer", "barrel-witch"], eventPool: ["A copa fecha toda a luz.", "Um altar está coberto por sangue seco.", "Uma brisa fria traz cheiro de ferro."] },
        { id: "west-lv3", level: 3, name: "Corte Nebulosa", spotCount: 7, recommendedLevel: "Nv. 17–20", signatureCreatureId: "barao-da-bruma", bossId: "barao-da-bruma", creaturePool: ["barao-da-bruma", "crimson-herald", "vrannoc-bride", "mist-captain"], eventPool: ["A névoa se move como se obedecesse a alguém.", "Uma carruagem nobre foi destruída.", "O silêncio anuncia algo dominante."] },
      ] },
    ],
  },
  eldravia: {
    id: "eldravia",
    kingdom: "Eldravia",
    name: "Eldravia",
    heroArtPath: "/art/maps/cities/eldravia.jpg",
    description: "Cidade arcana construída em torno de arquivos, vidro e cicatrizes da Convergência. Suas instâncias começam no Arquivo Externo e avançam até a Fenda Aberta.",
    sections: [
      { id: "centro", name: "Centro Arcano", icon: "⌂", description: "Academias, descanso e preparação.", detail: "O Centro Arcano é a área segura de Eldravia e funciona como retorno entre expedições." },
      { id: "mercado", name: "Mercado de Runas", icon: "⚖", description: "Equipamentos para builds mágicas e híbridas.", detail: "Vendedores licenciados comercializam armas, armaduras e focos aceitos pela Academia." },
      { id: "mural", name: "Arquivo de Contratos", icon: "✦", description: "Pedidos de pesquisa e contenção.", detail: "Contratos de Eldravia recompensam exploração de arquivos, claustros e zonas de ruptura." },
      { id: "black-market", name: "Círculo Proibido", icon: "☾", description: "Artefatos que a Academia prefere não catalogar.", detail: "Itens raros e caros aparecem aqui sem registro oficial. O preço reflete o risco." },
      { id: "portoes", name: "Portais Externos", icon: "⚑", description: "Quatro rotas para as zonas instáveis.", detail: "Cada portal leva a uma instância de três níveis com 6 ou 7 spots de exploração." },
    ],
    exits: [
      { id: "north", name: "Portal Norte", icon: "↑", description: "Arquivos externos e corredores que se reorganizam.", levels: [
        { id: "eld-north-lv1", level: 1, name: "Arquivo Exterior", spotCount: 6, recommendedLevel: "Nv. 15–20", signatureCreatureId: "pajem-de-pergaminho", creaturePool: ["pajem-de-pergaminho", "stray-apprentice", "ink-servant"], eventPool: ["Estantes trocam de lugar atrás de você.", "Uma nota aparece escrita com tinta ainda fresca.", "Um corredor termina numa porta que não existia antes."] },
        { id: "eld-north-lv2", level: 2, name: "Galeria de Tinta", spotCount: 7, recommendedLevel: "Nv. 18–23", signatureCreatureId: "devora-tinta", creaturePool: ["devora-tinta", "ink-servant", "rupture-shard", "hollow-echo"], eventPool: ["Tinta negra escorre contra a gravidade.", "Um selo acadêmico foi quebrado por dentro.", "Vozes repetem uma aula esquecida."] },
        { id: "eld-north-lv3", level: 3, name: "Arquivo Invertido", spotCount: 7, recommendedLevel: "Nv. 22–28", signatureCreatureId: "bibliotecario-invertido", bossId: "bibliotecario-invertido", creaturePool: ["bibliotecario-invertido", "hollow-echo", "library-golem", "grimoire-owl"], eventPool: ["Livros flutuam em órbita lenta.", "O teto parece mais sólido que o chão.", "Uma página descreve sua chegada antes de acontecer."] },
      ] },
      { id: "south", name: "Portal Sul", icon: "↓", description: "Salas de estudo abandonadas e essência solta.", levels: [
        { id: "eld-south-lv1", level: 1, name: "Pátio dos Aprendizes", spotCount: 6, recommendedLevel: "Nv. 16–21", signatureCreatureId: "faisca-discente", creaturePool: ["faisca-discente", "stray-apprentice", "rupture-shard"], eventPool: ["Círculos de treino ainda brilham no chão.", "Um caderno carbonizado contém fórmulas incompletas.", "A luz muda de cor quando você atravessa o pátio."] },
        { id: "eld-south-lv2", level: 2, name: "Poço de Essência", spotCount: 7, recommendedLevel: "Nv. 22–27", signatureCreatureId: "sanguessuga-de-mana", creaturePool: ["sanguessuga-de-mana", "essence-leech", "hollow-echo", "library-golem"], eventPool: ["Uma corrente de mana puxa objetos leves.", "Cristais vibram quando alguém lança magia.", "O ar tem gosto metálico."] },
        { id: "eld-south-lv3", level: 3, name: "Observatório Partido", spotCount: 7, recommendedLevel: "Nv. 27–33", signatureCreatureId: "astronomo-partido", bossId: "astronomo-partido", creaturePool: ["astronomo-partido", "convergence-hound", "glass-inquisitor", "rupture-weaver"], eventPool: ["As estrelas aparecem em posições erradas.", "Uma lente de vidro mostra uma sala diferente.", "O tempo parece perder alguns segundos."] },
      ] },
      { id: "east", name: "Portal Leste", icon: "→", description: "Claustros de vidro e guardiões de biblioteca.", levels: [
        { id: "eld-east-lv1", level: 1, name: "Claustro Menor", spotCount: 6, recommendedLevel: "Nv. 20–24", signatureCreatureId: "sentinela-de-vitrine", creaturePool: ["sentinela-de-vitrine", "hollow-echo", "library-golem"], eventPool: ["Pegadas aparecem sob o vidro sem ninguém por perto.", "Um sino de estudo toca sozinho.", "Uma estátua muda de posição quando você pisca."] },
        { id: "eld-east-lv2", level: 2, name: "Claustro de Vidro", spotCount: 7, recommendedLevel: "Nv. 23–28", signatureCreatureId: "gemeo-de-espelho", creaturePool: ["gemeo-de-espelho", "library-golem", "essence-leech", "grimoire-owl"], eventPool: ["Paredes refletem versões atrasadas do grupo.", "Um tomo tenta escapar de sua própria corrente.", "Runas defensivas reconhecem sua presença."] },
        { id: "eld-east-lv3", level: 3, name: "Câmara Prismática", spotCount: 7, recommendedLevel: "Nv. 27–31", signatureCreatureId: "prelado-prismatico", bossId: "prelado-prismatico", creaturePool: ["prelado-prismatico", "grimoire-owl", "convergence-hound", "glass-inquisitor"], eventPool: ["Feixes de luz cortam o corredor em ângulos impossíveis.", "Um reflexo continua andando sem você.", "Uma porta de vidro se fecha sem fazer som."] },
      ] },
      { id: "west", name: "Portal Oeste", icon: "←", description: "A rota mais perigosa, diretamente para a Fenda.", levels: [
        { id: "eld-west-lv1", level: 1, name: "Margem da Ruptura", spotCount: 6, recommendedLevel: "Nv. 27–30", signatureCreatureId: "cao-de-margem", creaturePool: ["cao-de-margem", "convergence-hound", "glass-inquisitor"], eventPool: ["O chão se desloca alguns centímetros.", "Uma rachadura emite luz sem calor.", "Sombras apontam para direções diferentes."] },
        { id: "eld-west-lv2", level: 2, name: "Tecido Partido", spotCount: 7, recommendedLevel: "Nv. 30–33", signatureCreatureId: "tecelao-de-falha", creaturePool: ["tecelao-de-falha", "glass-inquisitor", "rupture-weaver"], eventPool: ["Fios luminosos costuram o ar.", "Um passo seu ecoa antes de ser dado.", "Fragmentos de realidade giram como poeira."] },
        { id: "eld-west-lv3", level: 3, name: "Fenda Aberta", spotCount: 7, recommendedLevel: "Nv. 32–35", signatureCreatureId: "arconte-da-fenda", bossId: "arconte-da-fenda", creaturePool: ["arconte-da-fenda", "rupture-weaver", "fractured-archon"], eventPool: ["A geometria do lugar muda enquanto você observa.", "Uma voz conhece seu nome sem ter boca.", "A Convergência parece respirar do outro lado."] },
      ] },
    ],
  },
  dustfall: {
    id: "dustfall",
    kingdom: "Dustfall",
    name: "Dustfall",
    heroArtPath: "/art/maps/cities/dustfall.jpg",
    description: "Cidade de fronteira industrial cercada por sal, escória e crateras da Convergência. A progressão externa vai da Horda Verde até o Titã Soterrado.",
    sections: [
      { id: "centro", name: "Bastião", icon: "⌂", description: "Área segura e ponto de retorno.", detail: "O Bastião de Dustfall mantém caravanas, curandeiros e o último trecho seguro antes das salinas." },
      { id: "mercado", name: "Mercado de Sucata", icon: "⚖", description: "Armas robustas e equipamento de sobrevivência.", detail: "Sucata de guerra, couro e metal reaproveitado viram equipamento funcional para a fronteira." },
      { id: "mural", name: "Quadro de Recompensas", icon: "✦", description: "Caçadas e expedições de alto risco.", detail: "Os contratos de Dustfall pagam mais, mas mandam o jogador para regiões com níveis muito superiores." },
      { id: "black-market", name: "Forja Clandestina", icon: "☾", description: "Peças poderosas sem procedência.", detail: "Ferreiros clandestinos trabalham com materiais que os mercadores comuns não aceitam tocar." },
      { id: "portoes", name: "Portões de Cinza", icon: "⚑", description: "Quatro saídas para escória, sal e cratera.", detail: "Cada saída contém três níveis de instância e 6 ou 7 spots, permitindo progressão clara dentro de Dustfall." },
    ],
    exits: [
      { id: "north", name: "Saída Norte", icon: "↑", description: "Labirinto de Sal e presença da Horda Verde.", levels: [
        { id: "dust-north-lv1", level: 1, name: "Acampamento da Horda", spotCount: 6, recommendedLevel: "Nv. 24–28", signatureCreatureId: "catador-verde", creaturePool: ["catador-verde", "orc-saqueador", "xama-goblin"], eventPool: ["Tambores ecoam por trás das paredes de sal.", "Uma fogueira verde ainda fuma.", "Pegadas pesadas apontam para o interior."] },
        { id: "dust-north-lv2", level: 2, name: "Labirinto de Sal", spotCount: 7, recommendedLevel: "Nv. 28–32", signatureCreatureId: "chifrudo-salino", creaturePool: ["chifrudo-salino", "orc-carrasco", "minotauro-do-labirinto"], eventPool: ["O corredor termina onde antes havia uma passagem.", "Chifres riscam as paredes cristalizadas.", "O sal preserva corpos antigos demais para reconhecer."] },
        { id: "dust-north-lv3", level: 3, name: "Trono da Horda", spotCount: 7, recommendedLevel: "Nv. 30–34", signatureCreatureId: "matriarca-da-horda", bossId: "matriarca-da-horda", creaturePool: ["matriarca-da-horda", "orc-carrasco", "senhor-da-guerra-orc"], eventPool: ["Bandeiras verdes cobrem uma muralha improvisada.", "Armas confiscadas formam uma pilha enorme.", "Um rugido de comando cala todo o acampamento."] },
      ] },
      { id: "south", name: "Saída Sul", icon: "↓", description: "Campos de escória e restos industriais.", levels: [
        { id: "dust-south-lv1", level: 1, name: "Campos de Escória", spotCount: 6, recommendedLevel: "Nv. 30–34", signatureCreatureId: "besouro-de-escoria", creaturePool: ["besouro-de-escoria", "slag-beetle", "cracked-nomad"], eventPool: ["Metal quente estala sob a poeira.", "Uma máquina antiga ainda tenta funcionar.", "Pegadas humanas terminam numa pilha de cinza."] },
        { id: "dust-south-lv2", level: 2, name: "Ferro Partido", spotCount: 7, recommendedLevel: "Nv. 34–38", signatureCreatureId: "capataz-de-escoria", creaturePool: ["capataz-de-escoria", "iron-hyena", "dust-worm", "cracked-nomad"], eventPool: ["Uma mandíbula mecânica fecha no vazio.", "O chão vibra com algo escavando abaixo.", "Um depósito de guerra foi saqueado pela metade."] },
        { id: "dust-south-lv3", level: 3, name: "Forja Morta", spotCount: 7, recommendedLevel: "Nv. 37–41", signatureCreatureId: "forjador-carbonizado", bossId: "forjador-carbonizado", creaturePool: ["forjador-carbonizado", "dust-worm", "walking-cinder", "buried-sentinel"], eventPool: ["Fornos apagados ainda irradiam calor.", "Uma corrente se move sem ser tocada.", "Cinzas formam pegadas contra o vento."] },
      ] },
      { id: "east", name: "Saída Leste", icon: "→", description: "Salinas abertas e sentinelas enterradas.", levels: [
        { id: "dust-east-lv1", level: 1, name: "Planície Branca", spotCount: 6, recommendedLevel: "Nv. 36–40", signatureCreatureId: "abutre-de-sal", creaturePool: ["abutre-de-sal", "walking-cinder", "buried-sentinel"], eventPool: ["O horizonte branco apaga qualquer referência.", "Algo metálico emerge do sal.", "O vento carrega cinza quente sobre a planície."] },
        { id: "dust-east-lv2", level: 2, name: "Salinas Mortas", spotCount: 7, recommendedLevel: "Nv. 40–44", signatureCreatureId: "cavaleiro-calcificado", creaturePool: ["cavaleiro-calcificado", "buried-sentinel", "brood-mother", "salt-knight"], eventPool: ["O sal conserva uma batalha inteira.", "O solo racha como casca de ovo.", "Uma armadura vazia está de pé no horizonte."] },
        { id: "dust-east-lv3", level: 3, name: "Fortaleza de Sal", spotCount: 7, recommendedLevel: "Nv. 43–46", signatureCreatureId: "rainha-salina", bossId: "rainha-salina", creaturePool: ["rainha-salina", "salt-knight", "slag-drake"], eventPool: ["Torres cristalizadas refletem a luz da cratera.", "Escamas negras foram presas nos espinhos de sal.", "Um portão antigo range sem vento."] },
      ] },
      { id: "west", name: "Saída Oeste", icon: "←", description: "A Cratera e as criaturas mais perigosas de Dustfall.", levels: [
        { id: "dust-west-lv1", level: 1, name: "Borda da Cratera", spotCount: 6, recommendedLevel: "Nv. 43–46", signatureCreatureId: "verme-de-impacto", creaturePool: ["verme-de-impacto", "salt-knight", "slag-drake"], eventPool: ["A terra pulsa em intervalos regulares.", "Pedras negras flutuam por segundos antes de cair.", "Um rugido distante atravessa o vale."] },
        { id: "dust-west-lv2", level: 2, name: "Escória Profunda", spotCount: 7, recommendedLevel: "Nv. 46–49", signatureCreatureId: "draco-de-cinza", creaturePool: ["draco-de-cinza", "slag-drake", "slag-colossus"], eventPool: ["O calor dobra o ar diante de você.", "Partes de constructos se movem numa pilha.", "Uma trilha de escamas desce para o centro."] },
        { id: "dust-west-lv3", level: 3, name: "Coração da Cratera", spotCount: 7, recommendedLevel: "Nv. 49–50", signatureCreatureId: "tita-da-cratera", bossId: "tita-da-cratera", creaturePool: ["tita-da-cratera", "slag-colossus", "buried-titan"], eventPool: ["O chão parece respirar.", "Uma fissura revela algo colossal abaixo.", "Tudo fica silencioso antes de um impacto profundo."] },
      ] },
    ],
  },
};



export const adventureCityList = Object.values(adventureCities);

export function findAdventureLevel(city: AdventureCityDefinition, levelId: string) {
  for (const exit of city.exits) {
    const index = exit.levels.findIndex((level) => level.id === levelId);
    if (index >= 0) return { exit, level: exit.levels[index], index };
  }
  return null;
}

export function findAdventureLevelGlobal(levelId: string) {
  for (const city of adventureCityList) {
    const found = findAdventureLevel(city, levelId);
    if (found) return { city, ...found };
  }
  return null;
}

export function isAdventureLevelUnlocked(
  city: AdventureCityDefinition,
  levelId: string,
  exploredByLevel: Record<string, string[]>,
) {
  const found = findAdventureLevel(city, levelId);
  if (!found || found.index === 0) return true;
  const previous = found.exit.levels[found.index - 1];
  return (exploredByLevel[previous.id]?.length ?? 0) >= previous.spotCount;
}

export const cityUnlockRules: Record<AdventureCityId, {
  requiredBossIds: readonly string[];
  requiredCount: number;
  description: string;
}> = {
  fiordevalle: {
    requiredBossIds: [],
    requiredCount: 0,
    description: "Cidade inicial.",
  },
  eldravia: {
    requiredBossIds: ["alfa-uivo-cinzento", "horror-da-prensa", "noiva-do-mausoleu", "barao-da-bruma"],
    requiredCount: 2,
    description: "Derrote 2 chefes de instância Nível 3 de FiorDeValle.",
  },
  dustfall: {
    requiredBossIds: ["bibliotecario-invertido", "astronomo-partido", "prelado-prismatico", "arconte-da-fenda"],
    requiredCount: 2,
    description: "Derrote 2 chefes de instância Nível 3 de Eldravia.",
  },
};

export function cityUnlockProgress(cityId: AdventureCityId, defeatedBossIds: readonly string[]) {
  const rule = cityUnlockRules[cityId];
  const defeated = rule.requiredBossIds.filter((id) => defeatedBossIds.includes(id)).length;
  return {
    defeated,
    required: rule.requiredCount,
    unlocked: defeated >= rule.requiredCount,
    description: rule.description,
  };
}

export function isCityUnlocked(cityId: AdventureCityId, defeatedBossIds: readonly string[]) {
  return cityUnlockProgress(cityId, defeatedBossIds).unlocked;
}
