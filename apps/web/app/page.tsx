"use client";

import { useMemo, useState } from "react";
import { LOADOUT_SLOTS, activePreset } from "@rupterya/game-core";
import type { GameCharacter, LoadoutSlot } from "@rupterya/game-core";
import { abilities, classes, equipment, kingdoms, sharedAbilities } from "@/lib/catalog";
import { repository } from "@/lib/dev-character-repository";

type View = "slots" | "lobby" | "profile" | "equipment" | "abilities" | "presets";
const slotLabels: Record<string, string> = { weapon: "Arma", head: "Cabeca", chest: "Peito", hands: "Maos", feet: "Pes", trinket: "Amuleto" };

export default function HomePage() {
  const [account, setAccount] = useState(() => repository.load());
  const [selectedId, setSelectedId] = useState<string | null>(account.characters[0]?.id ?? null);
  const [view, setView] = useState<View>(account.characters.length ? "lobby" : "slots");
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("warrior");
  const [kingdom, setKingdom] = useState(kingdoms[0]);
  const [message, setMessage] = useState("Conta DEV pronta: Nv. Global 30.");
  const [presetName, setPresetName] = useState("");
  const selected = account.characters.find((character) => character.id === selectedId) ?? null;
  const summary = useMemo(() => selected ? repository.summary(account, selected) : null, [account, selected]);

  const persist = (character: GameCharacter) => setAccount(repository.update(account, character));
  const open = (character: GameCharacter, next: View = "lobby") => { setSelectedId(character.id); setView(next); };
  const create = () => {
    try {
      const next = repository.create(account, { name, classId, kingdom });
      const newest = next.characters.at(-1)!;
      setAccount(next); setSelectedId(newest.id); setView("lobby"); setName(""); setMessage(`${newest.name} entrou no Lobby de ${newest.kingdom}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Nao foi possivel criar o personagem."); }
  };
  const chooseAbility = (slot: LoadoutSlot, abilityId: string) => {
    if (!selected) return;
    try { persist(repository.assignAbility(selected, slot, abilityId)); setMessage("Habilidade salva no preset ativo."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Slot invalido."); }
  };

  if (!selected || view === "slots") return (
    <main className="shell">
      <header className="topbar"><div><span className="brand">RUPTERYA</span><small>Browser prototype</small></div><strong>Conta Nv. {account.globalLevel}</strong></header>
      <section className="panel intro"><span className="eyebrow">CHARACTER SLOTS - DEV</span><h1>Crie seus aventureiros</h1><p>Todos herdam o nivel global da conta. Nome, reino, equipamentos e presets permanecem individuais.</p></section>
      <section className="slot-grid">{Array.from({ length: account.characterSlots }, (_, index) => {
        const character = account.characters[index];
        return character ? <button className="slot-card occupied" onClick={() => open(character)} key={character.id}><span>NV. {account.globalLevel}</span><strong>{character.name}</strong><small>{classes.find((entry) => entry.id === character.classId)?.name} · {character.kingdom}</small></button> : <div className="slot-card" key={index}><span>SLOT {index + 1}</span><strong>Livre</strong><small>Disponivel no modo DEV</small></div>;
      })}</section>
      {account.characters.length < account.characterSlots && <section className="panel form-panel"><div className="section-title"><span>Novo personagem</span><span className="badge">DEV</span></div><label>Nome<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Eldrin" maxLength={24} /></label><label>Classe<select value={classId} onChange={(event) => setClassId(event.target.value)}>{classes.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} — {entry.description}</option>)}</select></label><label>Reino que defende<select value={kingdom} onChange={(event) => setKingdom(event.target.value)}>{kingdoms.map((entry) => <option key={entry}>{entry}</option>)}</select></label><button className="primary" onClick={create}>Criar personagem</button></section>}
      <p className="notice">{message}</p>
    </main>
  );

  const preset = activePreset(selected);
  const ownedAbilities = [...abilities, ...sharedAbilities].filter((ability) => selected.ownedAbilityIds.includes(ability.id));
  return <main className="shell">
    <header className="topbar"><button className="back" onClick={() => setView("slots")}>Slots</button><div><span className="brand">RUPTERYA</span><small>Conta Nv. {account.globalLevel}</small></div><span className="badge">Poder {summary!.power.toLocaleString("pt-BR")}</span></header>
    {view === "lobby" && <>
      <section className="hero-card"><div><span className="eyebrow">LOBBY · {summary!.kingdom}</span><h1>{summary!.name}</h1><p>{summary!.className} · Nv. herdado {summary!.level}</p><div className="vitals"><span>HP <b>{summary!.hpCurrent}/{summary!.hpMax}</b></span><span>MP <b>{summary!.mpCurrent}/{summary!.mpMax}</b></span><span>Moral <b>{summary!.morale}</b></span><span>Ouro <b>{summary!.gold}</b></span></div></div><div className="avatar">{summary!.className.slice(0, 1)}</div></section>
      <section className="action-grid">{([ ["profile", "Perfil", "Ficha, combate e atributos de Jornada"], ["equipment", "Equipamentos", "Equipe itens e recalcule Poder"], ["abilities", "Habilidades", "Preencha os 7 slots do preset"], ["presets", "Presets", "Crie, renomeie e alterne builds"] ] as const).map(([key, title, description]) => <button className="action-card" onClick={() => setView(key)} key={key}><strong>{title}</strong><small>{description}</small></button>)}</section>
      <section className="panel"><div className="section-title"><span>Preset ativo: {preset.name}</span><button onClick={() => setView("presets")}>Alterar</button></div><p className="rule-copy">Sem Energia. Vida nao regenera sozinha. A proxima etapa sera Caca/Jornada; combate 3x3 permanece fora deste sprint.</p></section>
    </>}
    {view === "profile" && <section className="panel"><div className="section-title"><span>Perfil e Ficha</span><button onClick={() => setView("lobby")}>Lobby</button></div><div className="profile-name"><h1>{summary!.name}</h1><p>{summary!.className} · {summary!.kingdom} · Conta Nv. {summary!.level}</p></div><div className="stats-grid">{Object.entries({ "Dano fisico": summary!.stats.physicalDamage, "Dano magico": summary!.stats.magicalDamage, "Defesa fisica": summary!.stats.physicalDefense, "Defesa magica": summary!.stats.magicalDefense, Critico: `${summary!.stats.criticalChance}%`, Esquiva: `${summary!.stats.dodgeChance}%`, Percepcao: summary!.adventure.perception, Conhecimento: summary!.adventure.knowledge, Forca: summary!.adventure.strength, Agilidade: summary!.adventure.agility }).map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div></section>}
    {view === "equipment" && <section className="panel"><div className="section-title"><span>Equipamentos V0</span><button onClick={() => setView("lobby")}>Lobby</button></div><p className="rule-copy">Clique em um item para equipar ou desequipar. Poder e stats sao calculados no game-core.</p><div className="equipment-grid">{equipment.map((item) => { const active = selected.equipment[item.slot] === item.id; return <button className={`item-card ${active ? "selected" : ""}`} key={item.id} onClick={() => { persist(repository.equip(selected, item)); setMessage(`${active ? "Desequipado" : "Equipado"}: ${item.name}.`); }}><small>{slotLabels[item.slot]} · {item.rarity}</small><strong>{item.name}</strong><span>Poder +{item.power}</span></button>; })}</div><p className="notice">{message}</p></section>}
    {view === "abilities" && <section className="panel"><div className="section-title"><span>Habilidades · 7 slots fixos</span><button onClick={() => setView("lobby")}>Lobby</button></div><p className="rule-copy">Uma passiva de classe, linhagem ou escola ocupa o mesmo unico slot de Passiva.</p><div className="loadout-grid">{LOADOUT_SLOTS.map((slot) => <label className="loadout-slot" key={slot.key}><span>{slot.label}</span><select value={preset.loadout[slot.key] ?? ""} onChange={(event) => event.target.value && chooseAbility(slot.key, event.target.value)}><option value="">Selecionar {slot.kind}</option>{ownedAbilities.filter((ability) => ability.slotKind === slot.kind).map((ability) => <option key={ability.id} value={ability.id}>{ability.name} · {ability.source}</option>)}</select><small>{preset.loadout[slot.key] ? ownedAbilities.find((ability) => ability.id === preset.loadout[slot.key])?.description : "Vazio"}</small></label>)}</div><section className="subpanel"><strong>Fontes de build</strong><div className="inline-actions"><button className={selected.lineageId ? "selected" : ""} onClick={() => persist(repository.setLineage(selected, selected.lineageId ? null : "vampire"))}>Linhagem: {selected.lineageId ? "Vampiro" : "Nenhuma"}</button><button className={selected.schoolId ? "selected" : ""} onClick={() => persist(repository.setSchool(selected, selected.schoolId ? null : "fire"))}>Escola: {selected.schoolId ? "Fogo" : "Nenhuma"}</button><button className={selected.skinId === "crimson" ? "selected" : ""} onClick={() => persist(repository.setSkin(selected, selected.skinId === "crimson" ? "default" : "crimson"))}>Skin Carmesim (cosmetica)</button></div><small>Skin nao modifica Poder. Linhagem maxima: uma.</small></section></section>}
    {view === "presets" && <section className="panel"><div className="section-title"><span>Presets</span><button onClick={() => setView("lobby")}>Lobby</button></div><p className="rule-copy">A troca e permitida fora de atividades. Cada preset armazena equipamentos e sete slots.</p><div className="preset-list">{selected.presets.map((entry) => <div className={`preset-row ${entry.id === selected.activePresetId ? "active" : ""}`} key={entry.id}><input defaultValue={entry.name} onBlur={(event) => persist(repository.renamePreset(selected, entry.id, event.target.value))} /><button onClick={() => persist(repository.activatePreset(selected, entry.id))}>{entry.id === selected.activePresetId ? "Ativo" : "Ativar"}</button></div>)}</div><div className="create-preset"><input value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="Nome do novo preset" /><button className="primary" onClick={() => { persist(repository.addPreset(selected, presetName)); setPresetName(""); }}>Criar preset</button></div></section>}
    <p className="notice">{message}</p>
    <nav className="bottom-nav"><button className={view === "lobby" ? "active" : ""} onClick={() => setView("lobby")}>Lobby</button><button className={view === "profile" ? "active" : ""} onClick={() => setView("profile")}>Perfil</button><button className={view === "equipment" ? "active" : ""} onClick={() => setView("equipment")}>Itens</button><button className={view === "abilities" ? "active" : ""} onClick={() => setView("abilities")}>Habilidades</button><button className={view === "presets" ? "active" : ""} onClick={() => setView("presets")}>Presets</button></nav>
  </main>;
}
