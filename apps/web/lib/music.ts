export type MusicMode = "none" | "lobby" | "combat";

type AudioTrack = Exclude<MusicMode, "none"> | "journey";

const tracks: Record<AudioTrack, string> = {
  lobby: "/audio/lobby-minstrels.mp3",
  combat: "/audio/combat-battle-of-dragons.mp3",
  journey: "/audio/journey-call.mp3",
};

class RupteryaMusicDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private background: AudioBufferSourceNode | null = null;
  private readonly buffers = new Map<AudioTrack, AudioBuffer>();
  private mode: MusicMode = "none";

  private ensureContext() {
    if (this.context && this.master) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.52;
    this.master.connect(this.context.destination);
  }

  private async load(track: AudioTrack) {
    const cached = this.buffers.get(track);
    if (cached) return cached;
    this.ensureContext();
    const response = await fetch(tracks[track], { cache: "force-cache" });
    if (!response.ok || !this.context) throw new Error("Não foi possível carregar o áudio.");
    const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
    this.buffers.set(track, buffer);
    return buffer;
  }

  private stopBackground() {
    if (!this.background) return;
    try { this.background.stop(); } catch { /* source já foi finalizado */ }
    this.background.disconnect();
    this.background = null;
  }

  async setMode(mode: MusicMode) {
    this.mode = mode;
    this.stopBackground();
    if (mode === "none") return;
    this.ensureContext();
    if (!this.context || !this.master) return;
    await this.context.resume();
    const buffer = await this.load(mode);
    if (this.mode !== mode || this.context.state !== "running") return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.master);
    source.start();
    this.background = source;
  }

  stop() {
    this.mode = "none";
    this.stopBackground();
  }

  async playJourneyCue() {
    if (this.mode === "none") return;
    this.ensureContext();
    if (!this.context || !this.master) return;
    await this.context.resume();
    const buffer = await this.load("journey");
    if (this.context.state !== "running") return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.master);
    source.start();
  }
}

export const musicDirector = new RupteryaMusicDirector();
