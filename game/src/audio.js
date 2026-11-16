// Sound: WebAudio, synthesized, no audio files. One job: hammer clangs,
// quench hiss, coins, win/lose stingers and a low forge drone. Muted in
// shot mode and in the self-test (no audio context there).

export function makeAudio() {
  const audio = {
    ctx: null,
    muted: false,
    musicOn: false,
    musicTimer: 0,
  };

  audio.unlock = function unlock() {
    if (audio.ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audio.ctx = new Ctx();
    } catch {
      audio.ctx = null;
    }
  };

  function tone(freq, dur, type, gain, when) {
    if (!audio.ctx || audio.muted) return;
    const t0 = audio.ctx.currentTime + (when || 0);
    const osc = audio.ctx.createOscillator();
    const g = audio.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(gain || 0.12, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(audio.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, gain, filterFreq) {
    if (!audio.ctx || audio.muted) return;
    const t0 = audio.ctx.currentTime;
    const len = Math.floor(audio.ctx.sampleRate * dur);
    const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.ctx.createBufferSource();
    src.buffer = buf;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq || 1200;
    const g = audio.ctx.createGain();
    g.gain.setValueAtTime(gain || 0.15, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(audio.ctx.destination);
    src.start(t0);
  }

  audio.click = function click() { tone(660, 0.06, 'square', 0.05); };
  audio.clang = function clang(perfect) {
    noise(0.12, perfect ? 0.22 : 0.14, perfect ? 2400 : 1400);
    tone(perfect ? 1180 : 820, 0.14, 'triangle', 0.1);
    if (perfect) tone(1760, 0.2, 'sine', 0.06, 0.02);
  };
  audio.quench = function quench() {
    noise(0.7, 0.2, 3200);
    tone(220, 0.4, 'sine', 0.05);
  };
  audio.coin = function coin() {
    tone(1320, 0.08, 'sine', 0.08);
    tone(1760, 0.12, 'sine', 0.08, 0.07);
  };
  audio.ruin = function ruin() {
    tone(180, 0.5, 'sawtooth', 0.12);
    noise(0.4, 0.18, 500);
  };
  audio.win = function win() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, i * 0.12));
  };
  audio.lose = function lose() {
    [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.09, i * 0.16));
  };
  audio.levelClear = function levelClear() {
    [659, 880].forEach((f, i) => tone(f, 0.18, 'triangle', 0.09, i * 0.1));
  };
  audio.startMusic = function startMusic() {
    audio.musicOn = true;
  };
  audio.stopMusic = function stopMusic() {
    audio.musicOn = false;
  };
  audio.toggleMute = function toggleMute() {
    audio.muted = !audio.muted;
    return audio.muted;
  };
  // Low forge drone, called once per frame while music is on.
  audio.step = function step(dt) {
    if (!audio.ctx || audio.muted || !audio.musicOn) return;
    audio.musicTimer -= dt;
    if (audio.musicTimer <= 0) {
      audio.musicTimer = 2.4;
      tone(82, 2.2, 'sine', 0.035);
      tone(123, 2.2, 'sine', 0.02, 0.1);
    }
  };

  return audio;
}
