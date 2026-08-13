"use client";

import { useEffect, useMemo, useState } from "react";
import { LOADOUT_SLOTS, activePreset, resolveHuntTurn } from "@rupterya/game-core";
import type { AbilityDefinition, GameCharacter, HuntBattleState, LoadoutSlot } from "@rupterya/game-core";
import { abilities, classes, equipment, fiordevalleJourneyNodes, huntCreatures, huntRegions, kingdoms, rollFiordevalleEncounter, sharedAbilities } from "@/lib/catalog";
import { repository } from "@/lib/dev-character-repository";

type View = "slots" | "lobby" | "profile" | "equipment" | "abilities" | "presets" | "hunt";
type BattleEffect = { kind: "physical" | "magical"; targetId: string } | null;
const slotLabels: Record<string, string> = { weapon: "Arma", head: "Cabeça", chest: "Peito", hands: "Mãos", feet: "Pés", trinket: "Amuleto" };

export default function HomePage() {
  const [account, setAccount] = useState(() => repository.emptyAccount());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>("slots");
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("guardian");
  const [kingdom, setKingdom] = useState(kingdoms[0]);
  const [message, setMessage] = useState("Conta DEV pronta: Nv. Global 30.");
  const [presetName, setPresetName] = useState("");
  const [regionId, setRegionId] = useState(huntRegions[0].id);
  const [journeyNodeId, setJourneyNodeId] = useState("vinhedos");
  const [battle, setBattle] = useState<HuntBattleState | null>(null);
  const [battleEffect, setBattleEffect] = useState<BattleEffect>(null);

  useEffect(() => {
    const stored = repository.load();
    setAccount(stored);
    setSelectedId(stored.characters[0]?.id ?? null);
    setView(stored.characters.length ? "lobby" : "slots");
  }, []);

  const selected = account.characters.find((character) => character.id === selectedId) ?? null;
  const summary = useMemo(() => selected ? repository.summary(account, selected) : null, [account, selected]);
  const region = huntRegions.find((entry) => entry.id === regionId) ?? huntRegions[0];
  const journeyNode = fiordevalleJourneyNodes.find((node) => node.id === journeyNodeId) ?? fiordevalleJourneyNodes[0];
  const preset = selected ? activePreset(selected) : null;
  const ownedAbilities = selected ? [...abilities, ...sharedAbilities].filter((ability) => selected.ownedAbilityIds.includes(ability.id)) : [];
  const battleAbilities = preset ? Array.from(new Map(Object.values(preset.loadout).flatMap((abilityId) => ownedAbilities.filter((ability) => ability.id === abilityId && ability.damageFamily)).map((ability) => [ability.id, ability])).values()) : [];

  const persist = (character: GameCharacter) => setAccount(repository.update(account, character));
  const open = (character: GameCharacter, next: View = "lobby") => { setSelectedId(character.id); setBattle(null); setView(next); };
  const create = () => {
    try {
      const next = repository.create(account, { name, classId, kingdom });
      const newest = next.characters.at(-1)!;
      setAccount(next); setSelectedId(newest.id); setView("lobby"); setName(""); setMessage(`${newest.name} entrou no Lobby de ${newest.kingdom}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível criar o personagem."); }
  };
  const chooseAbility = (slot: LoadoutSlot, abilityId: string) => {
    if (!selected || !abilityId) return;
    try { persist(repository.assignAbility(selected, slot, abilityId)); setMessage("Habilidade salva no preset ativo."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Slot inválido."); }
  };
  const startJourney = () => {
    if (!selected || selected.vitals.hpCurrent <= 0) { setMessage("Seu personagem está sem HP. Descanse na Estalagem antes de caçar."); return; }
    const creature = huntCreatures[0];
    if (!creature) return;
    const creatures = region.id === "fiordevalle" ? rollFiordevalleEncounter() : [creature];
    setBattle(repository.beginHunt(account, selected, region.id, creatures));
    setMessage(`Jornada para ${journeyNode.name}: encontro revelado.`);
  };
  const takeTurn = (ability: AbilityDefinition) => {
    if (!battle || !selected) return;
    const target = battle.enemies.find((enemy) => enemy.hpCurrent > 0);
    const next = resolveHuntTurn(battle, ability);
    setBattle(next);
    if (target) {
      setBattleEffect({ kind: ability.damageFamily === "magical" ? "magical" : "physical", targetId: target.id });
      window.setTimeout(() => {
        if (next.player.hpCurrent < battle.player.hpCurrent) setBattleEffect({ kind: "physical", targetId: battle.player.id });
      }, 330);
      window.setTimeout(() => setBattleEffect(null), 760);
    }
    if (next.status !== "active") {
      setAccount(repository.settleHunt(account, selected, next));
      setMessage(next.status === "victory" ? "Vitória registrada: XP global e ouro foram adicionados." : "Derrota registrada: sua vida permanece em 0 até receber cura.");
    }
  };

  if (!selected || view === "slots") return <main className="shell">
    <header className="topbar"><div><span className="brand">RUPTERYA</span><small>Browser prototype · Caça V0</small></div><strong>Conta Nv. {account.globalLevel}</strong></header>
    <section className="panel intro"><span className="eyebrow">SLOTS DE PERSONAGEM · DEV</span><h1>Escolha seu aventureiro</h1><p>Os quatro arquétipos usam retratos e cartas próprias. Todos herdam o nível global da conta.</p></section>
    <section className="slot-grid">{Array.from({ length: account.characterSlots }, (_, index) => {
      const character = account.characters[index];
      const definition = character && classes.find((entry) => entry.id === character.classId);
      return character && definition ? <button className="slot-card occupied portrait-slot" onClick={() => open(character)} key={character.id}><img src={definition.portraitPath} alt="" /><span>Nv. {account.globalLevel}</span><strong>{character.name}</strong><small>{definition.name} · {character.kingdom}</small></button> : <div className="slot-card" key={index}><span>SLOT {index + 1}</span><strong>Livre</strong><small>Disponível no modo DEV</small></div>;
    })}</section>
    {account.characters.length < account.characterSlots && <section className="panel form-panel"><div className="section-title"><span>Novo personagem</span><span className="badge">DEV</span></div><label>Nome<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Eldrin" maxLength={24} /></label><span className="field-label">Classe e retrato</span><div className="class-picker">{classes.map((entry) => <button type="button" className={`class-option ${classId === entry.id ? "selected" : ""}`} onClick={() => setClassId(entry.id)} key={entry.id}><img src={entry.portraitPath} alt="" /><strong>{entry.name}</strong><small>{entry.role}</small></button>)}</div><label>Reino que defende<select value={kingdom} onChange={(event) => setKingdom(event.target.value)}>{kingdoms.map((entry) => <option key={entry}>{entry}</option>)}</select></label><button className="primary" onClick={create}>Criar personagem</button></section>}
    <p className="notice">{message}</p>
  </main>;

  return <main className="shell">
    <header className="topbar"><button className="back" onClick={() => { setBattle(null); setView("slots"); }}>Slots</button><div><span className="brand">RUPTERYA</span><small>Conta Nv. {account.globalLevel} · XP {account.globalXp}</small></div><span className="badge">Poder {summary!.power.toLocaleString("pt-BR")}</span></header>
    {view === "lobby" && <>
      <section className="hero-card"><img className="hero-portrait" src={summary!.portraitPath} alt={`Retrato de ${summary!.className}`} /><div><span className="eyebrow">LOBBY · {summary!.kingdom}</span><h1>{summary!.name}</h1><p>{summary!.className} · {summary!.classRole} · Nv. {summary!.level}</p><div className="vitals"><span>HP <b>{summary!.hpCurrent}/{summary!.hpMax}</b></span><span>MP <b>{summary!.mpCurrent}/{summary!.mpMax}</b></span><span>Moral <b>{summary!.morale}</b></span><span>Ouro <b>{summary!.gold}</b></span></div></div></section>
      <section className="action-grid">{([ ["hunt", "Campo de Caça", "Escolha região, encontre criaturas e entre em batalha."], ["profile", "Perfil", "Ficha, combate e atributos de Jornada."], ["equipment", "Equipamentos", "Equipe itens e recalcule Poder."], ["abilities", "Habilidades", "Configure os sete slots do preset."], ["presets", "Presets", "Crie, renomeie e alterne builds."] ] as const).map(([key, title, description]) => <button className="action-card" onClick={() => setView(key)} key={key}><strong>{title}</strong><small>{description}</small></button>)}</section>
      <section className="panel"><div className="section-title"><span>Preset ativo: {preset!.name}</span><button onClick={() => setView("presets")}>Alterar</button></div><p className="rule-copy">Sem Energia. Vida não regenera sozinha. A Caça solo resolve encontros de 1×1 a 1×3; o tabuleiro 3×3 é reservado ao co-op.</p></section>
    </>}
    {view === "profile" && <section className="panel"><div className="section-title"><span>Perfil e Ficha</span><button onClick={() => setView("lobby")}>Lobby</button></div><div className="profile-name"><h1>{summary!.name}</h1><p>{summary!.className} · {summary!.classRole} · {summary!.kingdom} · Conta Nv. {summary!.level}</p></div><div className="stats-grid">{Object.entries({ "Dano físico": summary!.stats.physicalDamage, "Dano mágico": summary!.stats.magicalDamage, "Defesa física": summary!.stats.physicalDefense, "Defesa mágica": summary!.stats.magicalDefense, Crítico: `${summary!.stats.criticalChance}%`, Esquiva: `${summary!.stats.dodgeChance}%`, Percepção: summary!.adventure.perception, Conhecimento: summary!.adventure.knowledge, Força: summary!.adventure.strength, Agilidade: summary!.adventure.agility }).map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div></section>}
    {view === "equipment" && <section className="panel"><div className="section-title"><span>Equipamentos V0</span><button onClick={() => setView("lobby")}>Lobby</button></div><p className="rule-copy">Clique em um item para equipar ou desequipar. Poder e atributos são calculados no game-core.</p><div className="equipment-grid">{equipment.map((item) => { const active = selected.equipment[item.slot] === item.id; return <button className={`item-card ${active ? "selected" : ""}`} key={item.id} onClick={() => { persist(repository.equip(selected, item)); setMessage(`${active ? "Desequipado" : "Equipado"}: ${item.name}.`); }}><small>{slotLabels[item.slot]} · {item.rarity}</small><strong>{item.name}</strong><span>Poder +{item.power}</span></button>; })}</div><p className="notice">{message}</p></section>}
    {view === "abilities" && <section className="panel"><div className="section-title"><span>Habilidades · 7 slots fixos</span><button onClick={() => setView("lobby")}>Lobby</button></div><p className="rule-copy">Uma passiva de classe, linhagem ou escola ocupa o mesmo único slot de Passiva.</p><div className="loadout-grid">{LOADOUT_SLOTS.map((slot) => <label className="loadout-slot" key={slot.key}><span>{slot.label}</span><select value={preset!.loadout[slot.key] ?? ""} onChange={(event) => chooseAbility(slot.key, event.target.value)}><option value="">Selecionar {slot.kind}</option>{ownedAbilities.filter((ability) => ability.slotKind === slot.kind).map((ability) => <option key={ability.id} value={ability.id}>{ability.name} · {ability.source}</option>)}</select><small>{preset!.loadout[slot.key] ? ownedAbilities.find((ability) => ability.id === preset!.loadout[slot.key])?.description : "Vazio"}</small></label>)}</div><section className="subpanel"><strong>Fontes de build</strong><div className="inline-actions"><button className={selected.lineageId ? "selected" : ""} onClick={() => persist(repository.setLineage(selected, selected.lineageId ? null : "vampire"))}>Linhagem: {selected.lineageId ? "Vampiro" : "Nenhuma"}</button><button className={selected.schoolId ? "selected" : ""} onClick={() => persist(repository.setSchool(selected, selected.schoolId ? null : "fire"))}>Escola: {selected.schoolId ? "Fogo" : "Nenhuma"}</button><button className={selected.skinId === "crimson" ? "selected" : ""} onClick={() => persist(repository.setSkin(selected, selected.skinId === "crimson" ? "default" : "crimson"))}>Skin Carmesim (cosmética)</button></div><small>Skin não modifica Poder. Linhagem máxima: uma.</small></section></section>}
    {view === "presets" && <section className="panel"><div className="section-title"><span>Presets</span><button onClick={() => setView("lobby")}>Lobby</button></div><p className="rule-copy">A troca é permitida fora de atividades. Cada preset armazena equipamentos e sete slots.</p><div className="preset-list">{selected.presets.map((entry) => <div className={`preset-row ${entry.id === selected.activePresetId ? "active" : ""}`} key={entry.id}><input defaultValue={entry.name} onBlur={(event) => persist(repository.renamePreset(selected, entry.id, event.target.value))} /><button onClick={() => persist(repository.activatePreset(selected, entry.id))}>{entry.id === selected.activePresetId ? "Ativo" : "Ativar"}</button></div>)}</div><div className="create-preset"><input value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="Nome do novo preset" /><button className="primary" onClick={() => { persist(repository.addPreset(selected, presetName)); setPresetName(""); }}>Criar preset</button></div></section>}
    {view === "hunt" && <section className="hunt-view">
      {!battle ? <><section className="journey-panel"><div className="section-title"><span>FiorDeValle</span><button onClick={() => setView("lobby")}>×</button></div><div className="journey-status"><span>SEED ATIVA</span><strong>{journeyNode.icon} {journeyNode.name}</strong></div><div className="journey-map" aria-label="Mapa de Jornada de FiorDeValle">{fiordevalleJourneyNodes.map((node) => <button key={node.id} onClick={() => setJourneyNodeId(node.id)} className={`journey-node ${journeyNodeId === node.id ? "selected" : ""}`} style={{ gridColumn: node.column, gridRow: node.row }}><b>{node.icon}</b><small>{node.name}</small></button>)}</div><button className="primary journey-go" onClick={startJourney}>Iniciar Jornada</button><div className="journey-key"><span>◉ destino</span><span>⚔ encontro</span><span>✦ evento</span></div></section><section className="inn-card"><div><span>☾ ESTALAGEM</span><strong>Recuperar HP e MP</strong></div><button className="primary" onClick={() => { persist(repository.restAtInn(selected)); setMessage("A Estalagem restaurou HP e MP."); }}>Descansar</button></section></> : <section className="battle-screen"><div className="section-title"><span>Caça solo · {battle.enemies.length} inimigo(s)</span><button onClick={() => { setBattle(null); }}>Recuar</button></div><div className="battle-table"><article className={`battle-card player-card ${battleEffect?.targetId === battle.player.id ? `hit-${battleEffect.kind}` : ""}`}>{battleEffect?.targetId === battle.player.id && <span className={`battle-impact ${battleEffect.kind}`} aria-hidden="true" />}<img src={summary!.portraitPath} alt="" /><div><small>{summary!.className} · Nv. {summary!.level}</small><strong>{summary!.name}</strong><div className="battle-resource"><span>HP {battle.player.hpCurrent}/{battle.player.hpMax}</span><i><b style={{ width: `${(battle.player.hpCurrent / battle.player.hpMax) * 100}%` }} /></i></div><div className="battle-resource mana"><span>MP {battle.player.mpCurrent}/{battle.player.mpMax}</span><i><b style={{ width: `${(battle.player.mpCurrent / battle.player.mpMax) * 100}%` }} /></i></div></div></article><div className="versus">VS</div><div className="enemy-pack">{battle.enemies.map((enemy, index) => <article className={`battle-card enemy-card rarity-${battle.creatures[index].rarity} ${battleEffect?.targetId === enemy.id ? `hit-${battleEffect.kind}` : ""}`} key={enemy.id}>{battleEffect?.targetId === enemy.id && <span className={`battle-impact ${battleEffect.kind}`} aria-hidden="true" />}{enemy.portraitPath ? <img src={enemy.portraitPath} alt={`Carta de ${enemy.name}`} /> : <div className="monster-art">✦</div>}<div><small>{battle.creatures[index].rarity === "boss" ? "BOSS" : battle.creatures[index].rarity === "rare" ? "RARO" : "COMUM"} · Nv. {battle.creatures[index].level}</small><strong>{enemy.name}</strong><div className="battle-resource"><span>HP {enemy.hpCurrent}/{enemy.hpMax}</span><i><b style={{ width: `${(enemy.hpCurrent / enemy.hpMax) * 100}%` }} /></i></div><p>{battle.creatures[index].description}</p></div></article>)}</div></div><section className="combat-log">{battle.log.slice(-4).map((line, index) => <p className={line.tone} key={`${line.turn}-${index}`}>{line.text}</p>)}</section>{battle.status === "active" ? <section className="battle-actions"><span>Turno {battle.turn} · O ataque atinge o primeiro inimigo vivo</span><div>{battleAbilities.map((ability) => <button key={ability.id} onClick={() => takeTurn(ability)}><strong>{ability.name}</strong><small>{ability.manaCost ? `${ability.manaCost} MP` : "Sem custo"} · {ability.damageFamily === "magical" ? "Mágico" : "Físico"}</small></button>)}</div></section> : <section className={`battle-result ${battle.status}`}><h2>{battle.status === "victory" ? "Vitória na Caça" : "Você foi derrotado"}</h2><p>{battle.status === "victory" ? `+${battle.reward?.xp} XP global · +${battle.reward?.gold} ouro` : "Procure cura antes da próxima caçada."}</p><button className="primary" onClick={() => setBattle(null)}>Voltar às rotas</button></section>}</section>}
    </section>}
    <p className="notice">{message}</p>
    <nav className="bottom-nav"><button className={view === "lobby" ? "active" : ""} onClick={() => { setBattle(null); setView("lobby"); }}>Lobby</button><button className={view === "hunt" ? "active" : ""} onClick={() => setView("hunt")}>Caça</button><button className={view === "profile" ? "active" : ""} onClick={() => setView("profile")}>Perfil</button><button className={view === "equipment" ? "active" : ""} onClick={() => setView("equipment")}>Itens</button><button className={view === "abilities" ? "active" : ""} onClick={() => setView("abilities")}>Habilidades</button><button className={view === "presets" ? "active" : ""} onClick={() => setView("presets")}>Presets</button></nav>
  </main>;
}
