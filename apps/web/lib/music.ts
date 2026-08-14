export type MusicMode = "none" | "lobby" | "combat";

const tracks: Record<Exclude<MusicMode, "none">, string> = {
  lobby: "/audio/lobby-minstrels.mp3",
  combat: "/audio/combat-battle-of-dragons.mp3",
};

class RupteryaMusicDirector {
  private background: HTMLAudioElement | null = null;
  private journeyCue: HTMLAudioElement | null = null;
  private mode: MusicMode = "none";

  private getBackground() {
    if (this.background) return this.background;
    this.background = new Audio();
    this.background.loop = true;
    this.background.preload = "auto";
    this.background.volume = 0.5;
    return this.background;
  }

  private getJourneyCue() {
    if (this.journeyCue) return this.journeyCue;
    this.journeyCue = new Audio("/audio/journey-call.mp3");
    this.journeyCue.preload = "auto";
    this.journeyCue.volume = 0.82;
    return this.journeyCue;
  }

  async setMode(mode: MusicMode) {
    this.mode = mode;
    const player = this.getBackground();
    if (mode === "none") {
      player.pause();
      return;
    }
    const source = tracks[mode];
    if (player.src.endsWith(source)) {
      await player.play().catch(() => undefined);
      return;
    }
    player.pause();
    player.src = source;
    player.currentTime = 0;
    await player.play().catch(() => undefined);
  }

  stop() {
    this.mode = "none";
    this.background?.pause();
    this.journeyCue?.pause();
  }

  async playJourneyCue() {
    if (this.mode === "none") return;
    const cue = this.getJourneyCue();
    cue.pause();
    cue.currentTime = 0;
    await cue.play().catch(() => undefined);
  }
}

export const musicDirector = new RupteryaMusicDirector();
