# Molduras de criaturas

O sistema visual separa família e raridade: a família define o material e o símbolo da moldura; a raridade define a cor do símbolo e dos pontos internos.

Famílias disponíveis: Feras, Mortos-Vivos, Humanoides, Aberrações, Constructos, Elementais, Insetos e Dracônicos.

Raridades disponíveis: Comum, Raro, Elite, Boss e World Boss.

As cartas usam as classes `creature-family-frame`, `family-{família}` e `rarity-{raridade}`. O componente `CreatureFamilyBadge` desenha o selo vetorial sem imagens externas. Criaturas antigas sem família continuam funcionando com o fallback Humanoide/Comum.
