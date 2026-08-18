export type DamageFamily = "physical" | "magical" | "hybrid";
export type StatusEffectKind =
  | "bleed"
  | "burn"
  | "poison"
  | "blind"
  | "stun"
  | "silence"
  | "marked"
  | "taunted"
  | "guard"
  | "evasion"
  | "position_lock"
  | "enraged";
export type CombatPosition = "front" | "center" | "back";
/** Coordenada axial de tabuleiro hexagonal. */
export interface Axial {
  q: number;
  r: number;
}

export type TerrainKind = "plain" | "forest" | "ruins" | "swamp" | "sand" | "glass" | "rift";
export type ObstacleKind = "tree" | "rock" | "pillar" | "wall" | "crystal";
export type VisionTrait = "fog_sight" | "darkvision" | "keen_sight";

/** Perfil de decisão espacial da IA. O arquétipo continua descrevendo stats;
 * o perfil tático descreve COMO a criatura usa o tabuleiro. */
export type AITacticalProfile =
  | "flanker"
  | "enforcer"
  | "artillery"
  | "predator"
  | "sentinel"
  | "swarm"
  | "controller";

export type AITacticalIntentKind =
  | "flank"
  | "advance"
  | "retreat"
  | "seek_cover"
  | "protect_leader"
  | "surround"
  | "hunt"
  | "hold"
  | "control_zone"
  | "attack";

export interface AITacticalIntent {
  kind: AITacticalIntentKind;
  label: string;
  /** Hex que a IA escolheu como destino nesta decisão, quando houver. */
  targetCell?: Axial;
}

export interface BattleTerrainCell {
  position: Axial;
  terrain: TerrainKind;
  /** Custo de movimento em pontos. 1 = normal, 2 = terreno difícil. */
  movementCost: number;
  /** Hex não pode ser ocupado. */
  blocked?: boolean;
  /** Obstáculo impede linha de visão através do hex. */
  blocksLineOfSight?: boolean;
  /** Cobertura leve/pesada aplicada a ataques à distância contra quem ocupa o hex. */
  coverPercent?: number;
  obstacle?: ObstacleKind;
}

export interface BattleFogState {
  enabled: boolean;
  /** Limite base de visão quando há neblina; traits da unidade podem modificar. */
  baseVisionRange: number;
  label: string;
}

export interface BattlefieldState {
  cells: BattleTerrainCell[];
  fog: BattleFogState;
}
export type AbilitySlotKind = "skill" | "ultimate" | "stance" | "passive";
export type SecretArtPath = "martial" | "mystic" | "arcane";
export type AbilitySource = "class" | "lineage" | "school" | "secret_art" | "creature";
export type EquipmentSlot = "weapon" | "secondary" | "head" | "chest" | "hands" | "feet" | "trinket";
export type ItemRarity = "common" | "rare" | "epic" | "legendary" | "mythic";
export type EquipmentFamily = "sword" | "dagger" | "rapier" | "claws" | "greatsword" | "greataxe" | "staff" | "orb" | "book" | "shield" | "bow" | "quiver" | "katana" | "sheath" | "armor";

export interface AdventureAttributes {
  perception: number;
  knowledge: number;
  strength: number;
  agility: number;
}

export interface CharacterCombatStats {
  /** Velocidade/Iniciativa. Opcional durante a migração; ausência usa valor neutro no motor futuro. */
  speed?: number;
  physicalDamage: number;
  magicalDamage: number;
  physicalDefense: number;
  magicalDefense: number;
  criticalChance: number;
  dodgeChance: number;
  /** Chance de bloquear parte de um golpe recebido (reduz o dano em vez de anulá-lo, ao contrário da esquiva). */
  blockChance: number;
  bleedChance: number;
  burnChance: number;
  poisonChance: number;
  blindChance: number;
  bleedResistance: number;
  burnResistance: number;
  poisonResistance: number;
  blindResistance: number;
}

export interface StatusEffectApplication {
  kind: StatusEffectKind;
  chance: number;
  turns: number;
  /** Dano fixo aplicado no fim da rodada. Prioritário sobre percentual. */
  flatDamage?: number;
  percentMaxHp?: number;
  /** Guarda: redução percentual do dano recebido enquanto ativo. */
  damageReductionPercent?: number;
  /** Evasão: bônus somado à chance de esquiva efetiva enquanto ativo. */
  dodgeBonus?: number;
  /** Buffs de bando/aliado: bônus percentual somado ao dano bruto causado. */
  damageBonusPercent?: number;
  criticalChanceBonus?: number;
  statusChanceBonus?: number;
  /** Id do combatente que aplicou o efeito (usado por "taunted" para forçar alvo). */
  sourceId?: string;
}

export interface CombatStatusEffect extends StatusEffectApplication {
  sourceName: string;
  /** Rodada em que o efeito entrou. DoTs nunca ticam nesta mesma rodada. */
  appliedTurn?: number;
}

/**
 * Habilidade de criatura estruturada (arquétipos comuns têm 2, raros/elite 3,
 * chefes 4, chefes de mundo 5). `aiTrigger` é uma pequena expressão textual
 * ("turn == 1", "hp_self < 30%", "target_position == back" etc.) avaliada por
 * `evaluateTrigger` em rules.ts. `specialEffects` é uma lista de efeitos com
 * forma livre (`kind` + campos específicos), interpretados por
 * `applySpecialEffects` em rules.ts.
 */
export interface CreatureSpecialEffect {
  kind: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

export type AbilityAreaShape = "single" | "radius" | "ring" | "line" | "cone" | "connected" | "all";

export interface AbilityAreaDefinition {
  /** Geometria tática desenhada e resolvida no tabuleiro hexagonal. */
  shape: AbilityAreaShape;
  /** Raio ao redor do hex alvo para áreas circulares/anel. */
  radius?: number;
  /** Área conectada customizada: offsets axiais relativos ao hex alvo. */
  offsets?: Axial[];
}

export type KnownAITrigger =
  | "always"
  | "turn == 1"
  | "hp_self == 0"
  | "hp_self < 30%"
  | "hp_self < 50%"
  | "target_hp < 40%"
  | "target_hp < 50%"
  | "target_adjacent"
  | "distance > 1"
  | "target_position == front"
  | "target_position == center"
  | "target_position == back"
  | "target_not_poisoned"
  | "target_not_blind"
  | "target_not_burning"
  | "target_has_poison"
  | "target_has_marked"
  | "target_has_buff"
  | "target_used_ability"
  | "target_changed_position"
  | "target_attempted_escape_or_position_change"
  | "dodged_last_turn"
  | "attacked_last_turn"
  | "allies_alive == 0"
  | "allies_alive <= 1"
  | "allies_alive >= 2";

export type AITriggerExpression = KnownAITrigger | (string & {});

export interface CreatureAbilityDefinition {
  id: string;
  name: string;
  damageFamily: "physical" | "magical" | "none";
  scaling: number;
  cooldownTurns: number;
  target: string;
  description: string;
  aiTrigger: AITriggerExpression;
  statusEffects?: StatusEffectApplication[];
  /** Efeitos aplicados no próprio usuário após a habilidade (ex.: evasão de recuo). */
  selfStatusEffects?: StatusEffectApplication[];
  specialEffects?: CreatureSpecialEffect[];
  /** Habilidade carregada: anuncia na rodada N, resolve na N+1. */
  chargeTurns?: number;
  /** Alcance tático em hexágonos. Ausente usa o alcance padrão do arquétipo/canal. */
  range?: number;
  /** Forma da área. Ausente = alvo único. */
  area?: AbilityAreaDefinition;
  /** Reação: não consome a ação normal e nunca dispara outra reação. */
  reaction?: boolean;
  oncePerBattle?: boolean;
}

export interface CharacterVitals {
  hpCurrent: number;
  hpMax: number;
  mpCurrent: number;
  mpMax: number;
  morale: number;
  gold: number;
}

export interface CharacterSummary extends CharacterVitals {
  name: string;
  className: string;
  kingdom: string;
  level: number;
  power: number;
  stats: CharacterCombatStats;
}

export interface ClassDefinition {
  id: string;
  name: string;
  description: string;
  role: string;
  portraitPath: string;
  baseVitals: Pick<CharacterVitals, "hpMax" | "mpMax" | "morale" | "gold">;
  baseStats: CharacterCombatStats;
  adventure: AdventureAttributes;
}

export interface AbilityDefinition {
  id: string;
  name: string;
  slotKind: AbilitySlotKind;
  description: string;
  damageFamily?: DamageFamily;
  physicalScaling?: number;
  magicalScaling?: number;
  manaCost?: number;
  cooldownTurns?: number;
  statusEffects?: StatusEffectApplication[];
  specialEffects?: CreatureSpecialEffect[];
  keywords?: string[];
  source: AbilitySource;
  /** Alcance em hexágonos no tabuleiro de batalha. Ausente = sem restrição de distância. */
  range?: number;
  /** Forma da área no grid. Ausente = alvo único. */
  area?: AbilityAreaDefinition;
  /** Tipo de dano V1 (ex: "holy", "slashing", "piercing", "fire", "nature", "death", "crushing"). */
  damageType?: string;
  /** Escala de Potência V1. */
  powerScaling?: number;
  /** Canal de defesa verificado pelo golpe ("physical" ou "magical"). */
  defenseChannel?: "physical" | "magical";
  /** Identificador de Ultimate (carrega por turnos). */
  isUltimate?: boolean;
  /** Turnos necessários para carregar a Ultimate (ex: 4 ou 5). */
  requiredChargeTurns?: number;
}

export interface SecretArtDefinition extends AbilityDefinition {
  source: "secret_art" | "creature";
  secretArtPath: SecretArtPath;
  discoveryText?: string;
}

export interface CombatLoadout {
  skill1: string | null;
  skill2: string | null;
  skill3: string | null;
  skill4: string | null;
  ultimate: string | null;
  stance: string | null;
  passive: string | null;
}

export type LoadoutSlot = keyof CombatLoadout;

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: ItemRarity;
  itemLevel: number;
  upgradeLevel: number;
  power: number;
  modifiers: Partial<CharacterCombatStats & Pick<CharacterVitals, "hpMax" | "mpMax">>;
  statusEffects?: StatusEffectApplication[];
  keywords?: string[];
  affixes?: string[];
  family?: EquipmentFamily;
  allowedProfiles?: string[];
  requiredHands?: 1 | 2;
  appearanceChance?: number;
  breakChance?: number;
  uniqueKeyword?: string;
  /** Restrição opcional de classe para equipamento de identidade forte. */
  allowedClassIds?: string[];
  /** Bônus mecânicos usados por itens de contra-ataque, como bainhas de Samurai. */
  counterAttackChanceBonus?: number;
  counterAttackScalingBonus?: number;
}

export interface EquippedItems {
  weapon: string | null;
  secondary: string | null;
  head: string | null;
  chest: string | null;
  hands: string | null;
  feet: string | null;
  trinket: string | null;
}

export interface CharacterPreset {
  id: string;
  name: string;
  loadout: CombatLoadout;
  equipment: EquippedItems;
}

export interface CharacterBuild {
  characterId: string;
  lineageId?: string;
  schoolId?: string;
  loadout: CombatLoadout;
  equippedPetId?: string;
  equippedTrophyId?: string;
  skinId?: string;
}


export type MoralAxis = "hero" | "neutral" | "villain";
export interface MoralInclination { hero: number; neutral: number; villain: number; }
export interface OrganizationProgress { level: number; reputation: number; }

export interface CharacterWorldProgress {
  exploredSpotsByLevel: Record<string, string[]>;
  discoveredCreatureIds: string[];
  creatureKills: Record<string, number>;
  defeatedBossIds: string[];
  activeQuestIds: string[];
  completedQuestIds: string[];
  materials: Record<string, number>;
  consumables: Record<string, number>;
  reputationByCity: Record<string, number>;
  notorietyByCity: Record<string, number>;
  /** Progressão independente por organização e por Reino. */
  heroGuildByCity?: Record<string, OrganizationProgress>;
  blackHouseByCity?: Record<string, OrganizationProgress>;
  /** Reservado ao terceiro caminho neutro (Companhia/Casa de Contratos). */
  neutralOrganizationByCity?: Record<string, OrganizationProgress>;
}

export interface GameCharacter {
  id: string;
  name: string;
  classId: string;
  kingdom: string;
  /** Progressão própria do personagem — não é compartilhada entre os personagens da conta. */
  level: number;
  xp: number;
  lineageId: string | null;
  schoolId: string | null;
  skinId: string;
  vitals: CharacterVitals;
  equipment: EquippedItems;
  ownedAbilityIds: string[];
  presets: CharacterPreset[];
  activePresetId: string;
  inventoryItemIds: string[];
  itemMemories?: Record<string, number>;
  fragments?: Partial<Record<ItemRarity, number>>;
  /** Moral individual: soma esperada = 100. Não concede buff/debuff de combate. */
  moralInclination?: MoralInclination;
  worldProgress?: CharacterWorldProgress;
}

export interface DevAccount {
  id: string;
  progressionVersion?: number;
  characterSlots: number;
  characters: GameCharacter[];
}

export interface HuntCreatureDefinition {
  id: string;
  name: string;
  description: string;
  portraitPath?: string;
  rarity: "common" | "rare" | "elite" | "boss" | "worldboss";
  family?: "beast" | "undead" | "humanoid" | "aberration" | "construct" | "elemental" | "insect" | "dragonkin";
  regionId: string;
  level: number;
  hpMax: number;
  physicalDamage: number;
  magicalDamage?: number;
  /** Velocidade da criatura para a futura fila de iniciativa. */
  speed?: number;
  physicalDefense: number;
  magicalDefense: number;
  blockChance?: number;
  xpReward: number;
  goldReward: number;
  statusEffects?: StatusEffectApplication[];
  equippedItem?: EquipmentItem;
  equippedItems?: EquipmentItem[];
  featuredItemCandidates?: EquipmentItem[];
  equipmentProfileId?: string;
  /** Perfil tático ("tank" | "skirmisher" | "brute" | "caster" | "swarm"), usado pela IA em combate. */
  archetype?: string;
  /** Override opcional do comportamento espacial. Sem override, o motor deriva pelo arquétipo/id. */
  tacticalProfile?: AITacticalProfile;
  /** Papel no bando ("leader" | "regular" | "fodder"), usado pela moral em combate. */
  role?: string;
  /** Kit estruturado de habilidades (2 comum, 3 raro/elite, 4 chefe, 5 chefe de mundo). */
  abilities?: CreatureAbilityDefinition[];
}

export interface HuntRegionDefinition {
  id: string;
  name: string;
  kingdom: string;
  description: string;
  danger: string;
  creatureIds: string[];
}

export interface HuntCombatant {
  id: string;
  /** Id de bestiário estável (sem sufixo de índice do encontro), usado por maestria e loot. */
  creatureId?: string;
  name: string;
  portraitPath?: string;
  hpCurrent: number;
  hpMax: number;
  mpCurrent: number;
  mpMax: number;
  stats: CharacterCombatStats;
  activeEffects: CombatStatusEffect[];
  onHitEffects: StatusEffectApplication[];
  /** Reação: não consome ação e nunca dispara outra reação. */
  counterAttack?: { chance: number; scaling: number; sourceName: string };
  /** Perfil tático herdado da criatura, usado pela IA em combate. */
  archetype?: string;
  /** Perfil de decisão espacial resolvido para esta criatura. */
  tacticalProfile?: AITacticalProfile;
  /** Intenção atual, usada pelo HUD apenas quando a criatura está visível. */
  tacticalIntent?: AITacticalIntent;
  /** Último hex em que este combatente realmente viu o alvo. Evita IA “enxergar” através da neblina. */
  lastKnownTargetPosition?: Axial;
  /** Papel no bando, usado pela moral em combate. */
  role?: string;
  /** Kit estruturado de habilidades, copiado da criatura de origem ao entrar em batalha. */
  abilities?: CreatureAbilityDefinition[];
  /** Recarga por habilidade, chave = CreatureAbilityDefinition.id. */
  abilityCooldowns?: Record<string, number>;
  /** Habilidade carregada na rodada anterior. A área é congelada no início do telegraph. */
  charging?: { abilityId: string; targetCell?: Axial; affectedCells?: Axial[]; startedTurn?: number } | null;
  /** Rodadas restantes de imunidade a novo atordoamento. */
  stunImmuneTurns?: number;
  /** Ids de habilidades oncePerBattle já usadas nesta luta. */
  usedOncePerBattle?: string[];
  /** Posição real no tabuleiro hexagonal durante a batalha. */
  position?: Axial;
  /** Direção 0–5 que a unidade encara. Base para frente/flanco/costas. */
  facing?: number;
  /** Alcance visual próprio. Em neblina limita quais hexes/alvos a unidade percebe. */
  visionRange?: number;
  /** Traços especiais de visão usados por classes/criaturas. */
  visionTraits?: VisionTrait[];
  /** Bônus tático somado ao RANGE das habilidades do Player (ex.: Olho de Falcão). */
  rangeBonus?: number;
  /** True só na rodada em que a posição mudou — consumido pelos gatilhos de reação. */
  changedPositionThisTurn?: boolean;
  /** Bônus percentual consumido pelo próximo dano causado por este combatente. */
  nextDamageBonusPercent?: number;
  /** Redução permanente de dano recebida por fases de chefe, independente da Defesa. */
  permanentDamageReductionPercent?: number;
  /** Rastro mínimo para gatilhos de IA como "dodged_last_turn"/"attacked_last_turn". */
  lastAbilityUsed?: string;
  dodgedLastTurn?: boolean;
  attackedLastTurn?: boolean;
  /** Potência V1: base unificada para habilidades. */
  power?: number;
  /** Tipo de dano característico da unidade. */
  damageType?: string;
  /** Canal de defesa padrão. */
  defenseChannel?: "physical" | "magical";
  /** Tags de formação e identidade (ex: ["paladin", "human"], ["samurai", "human"], ["goblin"]). */
  tags?: string[];
  /** Carga atual da Ultimate (0 a ultimateRequiredCharge). */
  ultimateCurrentCharge?: number;
  /** Turnos necessários para carregar a Ultimate. */
  ultimateRequiredCharge?: number;
  /** Se é membro da party jogável. */
  isPartyMember?: boolean;
  /** Nome da classe do Companion. */
  className?: string;
}

export interface HuntCompanion {
  id: string;
  name: string;
  portraitPath: string;
  description: string;
  magicalDamageScaling: number;
}

export interface HuntBattleLog {
  turn: number;
  text: string;
  tone: "system" | "player" | "enemy" | "victory" | "defeat";
}

export interface HuntBattleState {
  id: string;
  regionId: string;
  creatures: HuntCreatureDefinition[];
  /** Terreno, obstáculos, cobertura e condição de neblina desta batalha. */
  battlefield: BattlefieldState;
  player: HuntCombatant;
  /** Party completa de até 3 heróis controlados pelo jogador (ex: Aldren, Kael, Elyra). */
  party?: HuntCombatant[];
  /** Id do herói da party cujo turno está atualmente ativo. */
  activeHeroId?: string;
  companion: HuntCompanion | null;
  enemies: HuntCombatant[];
  /** Ids de criaturas dominadas no Bestiário (abates >= meta), com bônus de dano. */
  masteredCreatureIds?: string[];
  lastPetTargetId: string | null;
  lastPetDamage: number;
  cooldowns: Record<string, number>;
  /** Movimento e ação são recursos separados. Mover não encerra mais a rodada. */
  movementUsed?: boolean;
  /** Ordem real de iniciativa da rodada atual. Contém Heróis da Party + linha de frente viva. */
  initiativeOrder?: string[];
  /** Índice do ator que está com o turno aberto. */
  initiativeIndex?: number;
  /** Ator atual da fila de iniciativa. */
  currentActorId?: string | null;
  turn: number;
  status: "active" | "victory" | "defeat";
  log: HuntBattleLog[];
  reward: {
    xp: number;
    gold: number;
    itemIds: string[];
    fragments: Array<{ rarity: ItemRarity; amount: number }>;
    memoryUpdates: Array<{ itemId: string; stacks: number }>;
  } | null;
}

export type GridIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export interface BattleGridSide { slots: Partial<Record<GridIndex, string>>; }
export interface MirroredBattleGrid { player: BattleGridSide; enemy: BattleGridSide; }
