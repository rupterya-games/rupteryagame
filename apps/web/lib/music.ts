export type MusicMode = "none" | "lobby" | "combat";

const lobbyNotes = [146.83, 174.61, 196, 174.61, 146.83, 130.81, 146.83, 110];
const combatNotes = [110, 110, 146.83, 123.47, 110, 164.81, 146.83, 123.47];

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
    this.master.gain.value = 0.46;
    this.master.connect(this.context.destination);
  }

  async setMode(mode: MusicMode) {
    this.mode = mode;
    this.stopLoop();
    if (mode === "none") return;
    this.ensureAudio();
    if (!this.context || !this.master) return;
    this.master.gain.value = mode === "combat" ? 0.5 : 0.42;
    await this.context.resume();
    if (this.context.state !== "running") return;
    this.step = 0;
    this.playLoop();
  }

  stop() {
    this.mode = "none";
    this.stopLoop();
  }

  private stopLoop() {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }

  private playLoop() {
    if (!this.context || !this.master || this.mode === "none") return;
    const combat = this.mode === "combat";
    const notes = combat ? combatNotes : lobbyNotes;
    const beatMs = combat ? 300 : 650;
    const note = notes[this.step % notes.length];
    this.playNote(note, combat ? 0.18 : 0.22, combat ? "sawtooth" : "sine", combat ? 0.28 : 0.2, beatMs / 1000);
    if (combat && this.step % 2 === 0) this.playNote(note / 2, 0.13, "triangle", 0.22, beatMs / 1000);
    if (!combat && this.step % 2 === 0) this.playNote(note * 1.5, 0.13, "triangle", 0.5, beatMs / 1000);
    this.step += 1;
    this.timer = window.setTimeout(() => this.playLoop(), beatMs);
  }

  private playNote(frequency: number, volume: number, wave: OscillatorType, length: number, delay: number) {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + length + 0.03);
  }
}

export const musicDirector = new RupteryaMusicDirector();
