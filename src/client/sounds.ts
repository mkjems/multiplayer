export interface Sounds {
  isMuted(): boolean;
  toggleMute(): boolean;
  playShoot(): void;
  playCactusHit(): void;
  playRicochet(): void;
  playHit(isLocalPlayer: boolean): void;
  playDeath(): void;
  playReload(): void;
}

export function createSounds(): Sounds {
  let audioCtx: AudioContext | null = null;
  let muted = false;

  function getCtx(): AudioContext {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function makeNoise(durationSeconds: number): AudioBuffer {
    const ctx = getCtx();
    const sampleCount = Math.ceil(ctx.sampleRate * durationSeconds);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function playShoot(): void {
    if (muted) return;
    const ctx = getCtx();
    const t = ctx.currentTime;

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = makeNoise(0.045);
    const noiseBandpass = ctx.createBiquadFilter();
    noiseBandpass.type = "bandpass";
    noiseBandpass.frequency.value = 2200;
    noiseBandpass.Q.value = 1.2;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(1.0, t);
    noiseGain.gain.linearRampToValueAtTime(0, t + 0.05);
    noiseSource.connect(noiseBandpass);
    noiseBandpass.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(t);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.10);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.35, t);
    oscGain.gain.linearRampToValueAtTime(0, t + 0.12);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  function playCactusHit(): void {
    if (muted) return;
    const ctx = getCtx();
    const t = ctx.currentTime;

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = makeNoise(0.08);
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 400;
    bandpass.Q.value = 2.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    noiseSource.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);
    noiseSource.start(t);
  }

  function playRicochet(): void {
    if (muted) return;
    const ctx = getCtx();
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(2200, t + 0.025);
    osc.frequency.exponentialRampToValueAtTime(550, t + 0.45);

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 900;
    bandpass.Q.value = 4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.38, t + 0.01);
    gain.gain.linearRampToValueAtTime(0, t + 0.48);

    osc.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  function playHit(isLocalPlayer: boolean): void {
    if (muted) return;
    const ctx = getCtx();
    const t = ctx.currentTime;
    const volumeScale = isLocalPlayer ? 1 : 0.43;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.18);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.65 * volumeScale, t);
    oscGain.gain.linearRampToValueAtTime(0, t + 0.20);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.20);

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = makeNoise(0.035);
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 500;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5 * volumeScale, t);
    noiseGain.gain.linearRampToValueAtTime(0, t + 0.04);
    noiseSource.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(t);
  }

  function playDeath(): void {
    if (muted) return;
    const ctx = getCtx();
    const t = ctx.currentTime;

    const bassOsc = ctx.createOscillator();
    bassOsc.type = "sine";
    bassOsc.frequency.setValueAtTime(85, t);
    bassOsc.frequency.exponentialRampToValueAtTime(18, t + 1.1);
    const bassGain = ctx.createGain();
    bassGain.gain.setValueAtTime(0.8, t);
    bassGain.gain.setValueAtTime(0.8, t + 0.05);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    bassOsc.connect(bassGain);
    bassGain.connect(ctx.destination);
    bassOsc.start(t);
    bassOsc.stop(t + 1.2);

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = makeNoise(0.09);
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 350;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.85, t);
    noiseGain.gain.linearRampToValueAtTime(0, t + 0.10);
    noiseSource.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(t);

    const keenOsc = ctx.createOscillator();
    keenOsc.type = "sine";
    keenOsc.frequency.setValueAtTime(1400, t + 0.05);
    keenOsc.frequency.exponentialRampToValueAtTime(180, t + 1.4);
    const keenGain = ctx.createGain();
    keenGain.gain.setValueAtTime(0, t);
    keenGain.gain.linearRampToValueAtTime(0.12, t + 0.08);
    keenGain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    keenOsc.connect(keenGain);
    keenGain.connect(ctx.destination);
    keenOsc.start(t + 0.05);
    keenOsc.stop(t + 1.4);
  }

  function playReload(): void {
    if (muted) return;
    const ctx = getCtx();
    const t = ctx.currentTime;

    function makeClick(
      startTime: number,
      filterFreq: number,
      gainValue: number,
    ): void {
      const source = ctx.createBufferSource();
      source.buffer = makeNoise(0.012);
      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = filterFreq;
      highpass.Q.value = 1.5;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(gainValue, startTime);
      gain.gain.linearRampToValueAtTime(0, startTime + 0.014);
      source.connect(highpass);
      highpass.connect(gain);
      gain.connect(ctx.destination);
      source.start(startTime);
    }

    makeClick(t, 4200, 0.55);
    makeClick(t + 0.09, 3600, 0.45);
  }

  function isMuted(): boolean {
    return muted;
  }

  function toggleMute(): boolean {
    muted = !muted;
    if (muted && audioCtx) audioCtx.suspend();
    return muted;
  }

  return {
    isMuted,
    toggleMute,
    playShoot,
    playCactusHit,
    playRicochet,
    playHit,
    playDeath,
    playReload,
  };
}
