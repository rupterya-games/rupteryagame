export type MusicMode = "none" | "lobby" | "combat";

type AudioTrack = Exclude<MusicMode, "none">;

const tracks: Record<AudioTrack, string> = {
  lobby: "/audio/lobby-theme.mpeg",
  combat: "/audio/combat-quest.mpeg",
};

class RupteryaMusicDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private background: AudioBufferSourceNode | null = null;
  private readonly buffers = new Map<AudioTrack, AudioBuffer>();
  private readonly loading = new Map<AudioTrack, Promise<AudioBuffer>>();
  private mode: MusicMode = "none";
  private playbackRequest = 0;

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
    const inFlight = this.loading.get(track);
    if (inFlight) return inFlight;
    this.ensureContext();
    const request = (async () => {
      const response = await fetch(tracks[track], { cache: "force-cache" });
      if (!response.ok || !this.context) throw new Error("Unable to load audio.");
      const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
      this.buffers.set(track, buffer);
      return buffer;
    })();
    this.loading.set(track, request);
    try {
      return await request;
    } finally {
      this.loading.delete(track);
    }
  }

  private stopBackground() {
    if (!this.background) return;
    try {
      this.background.stop();
    } catch {
      // Source already stopped.
    }
    this.background.disconnect();
    this.background = null;
  }

  async setMode(mode: MusicMode) {
    const request = ++this.playbackRequest;
    const sameTrackAlreadyPlaying = this.mode === mode && this.background;
    this.mode = mode;
    if (sameTrackAlreadyPlaying) {
      await this.context?.resume();
      return;
    }

    this.stopBackground();
    if (mode === "none") return;
    this.ensureContext();
    if (!this.context || !this.master) return;
    await this.context.resume();
    if (request !== this.playbackRequest || this.mode !== mode) return;
    const buffer = await this.load(mode);
    if (
      request !== this.playbackRequest ||
      this.mode !== mode ||
      this.context.state !== "running"
    ) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.master);
    source.start();
    this.background = source;
    source.onended = () => {
      if (this.background === source) this.background = null;
    };
  }

  stop() {
    this.playbackRequest += 1;
    this.mode = "none";
    this.stopBackground();
  }
}

export const musicDirector = new RupteryaMusicDirector();
