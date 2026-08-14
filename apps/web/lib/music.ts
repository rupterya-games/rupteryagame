export type MusicMode = "none" | "lobby" | "combat";

const loFiLead = [220, 261.63, 293.66, 329.63, 293.66, 261.63, 246.94, 196];
const loFiBass = [55, 55, 61.74, 49, 55, 65.41, 61.74, 49];
const gothicLead = [220, 261.63, 311.13, 293.66, 220, 329.63, 311.13, 293.66, 246.94, 293.66, 369.99, 329.63, 261.63, 329.63, 311.13, 261.63];
const gothicBass = [55, 55, 49, 49, 46.25, 46.25, 49, 49];

class RupteryaMusicDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private mode: MusicMode = "none";
  private step = 0;

  private ensureAudio() {
    if (this.context && this.master) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.45;
    this.master.connect(this.context.destination);
  }

  async setMode(mode: MusicMode) {
    this.mode = mode;
    this.stopLoop();
    if (mode === "none") return;
    this.ensureAudio();
    if (!this.context || !this.master) return;
    await this.context.resume();
    if (this.context.state !== "running") return;
    this.master.gain.setTargetAtTime(mode === "combat" ? 0.52 : 0.46, this.context.currentTime, 0.08);
    this.step = 0;
    this.playLoop();
  }

  stop() { this.mode = "none"; this.stopLoop(); }

  private stopLoop() { if (this.timer !== null) window.clearTimeout(this.timer); this.timer = null; }

  private playLoop() {
    if (!this.context || !this.master || this.mode === "none") return;
    const combat = this.mode === "combat";
    const lead = combat ? gothicLead : loFiLead;
    const bass = combat ? gothicBass : loFiBass;
    const beat = combat ? 170 : 520;
    const index = this.step % lead.length;
    this.note(lead[index], combat ? "square" : "triangle", combat ? 0.19 : 0.15, beat / 1000 * 0.82, combat ? 0.17 : 0.35);
    this.note(bass[this.step % bass.length], combat ? "sawtooth" : "sine", combat ? 0.18 : 0.16, beat / 1000, combat ? 0.14 : 0.26);
    if (combat && this.step % 2 === 0) this.note(lead[index] / 2, "square", 0.12, 0.08, 0.08);
    if (!combat && this.step % 4 === 0) this.note(lead[index] * 1.5, "sine", 0.08, 0.72, 0.18);
    this.step += 1;
    this.timer = window.setTimeout(() => this.playLoop(), beat);
  }

  private note(frequency: number, type: OscillatorType, volume: number, length: number, cutoff: number) {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff * 6000 + 700, now);
    filter.Q.value = 1.6;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    oscillator.connect(filter); filter.connect(gain); gain.connect(this.master);
    oscillator.start(now); oscillator.stop(now + length + 0.04);
  }
}

export const musicDirector = new RupteryaMusicDirector();
