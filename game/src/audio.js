// audio.js — every sound in Comet Courier is synthesized live with
// WebAudio. No audio files, no network: oscillators and filtered noise,
// shaped by short gain envelopes. The context is created lazily on the
// first user gesture, so headless screenshot runs stay silent.

function loadMuted() {
  try {
    return window.localStorage.getItem('comet-courier-muted') === '1';
  } catch (err) {
    return false;
  }
}

function saveMuted(muted) {
  try {
    window.localStorage.setItem('comet-courier-muted', muted ? '1' : '0');
  } catch (err) {
    // Storage may be unavailable; mute still works for this session.
  }
}

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    muted: loadMuted(),
    pad: null,
  };

  audio.ensure = () => {
    if (!audio.ctx) {
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return;
        audio.ctx = new Ctor();
        audio.master = audio.ctx.createGain();
        audio.master.gain.value = audio.muted ? 0 : 0.5;
        audio.master.connect(audio.ctx.destination);
      } catch (err) {
        audio.ctx = null;
      }
    }
    if (audio.ctx && audio.ctx.state === 'suspended') {
      audio.ctx.resume().catch(() => {});
    }
  };

  audio.toggleMute = () => {
    audio.muted = !audio.muted;
    saveMuted(audio.muted);
    if (audio.master && audio.ctx) {
      audio.master.gain.setTargetAtTime(
        audio.muted ? 0 : 0.5,
        audio.ctx.currentTime,
        0.02,
      );
    }
    return audio.muted;
  };

  // One oscillator note with an attack/decay envelope.
  function tone(freq, dur, type, vol, delay, slideTo) {
    if (!audio.ctx || !audio.master) return;
    const t0 = audio.ctx.currentTime + (delay || 0);
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Short burst of filtered noise, for impacts.
  function noiseBurst(dur, vol, filterFreq) {
    if (!audio.ctx || !audio.master) return;
    const t0 = audio.ctx.currentTime;
    const len = Math.max(1, Math.floor(audio.ctx.sampleRate * dur));
    const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = audio.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 900;
    const gain = audio.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    src.start(t0);
  }

  audio.click = () => {
    audio.ensure();
    tone(520, 0.07, 'triangle', 0.18);
  };

  // Bright launch jingle when a run starts.
  audio.launch = () => {
    audio.ensure();
    tone(392, 0.12, 'triangle', 0.22);
    tone(523.25, 0.12, 'triangle', 0.22, 0.09);
    tone(783.99, 0.2, 'triangle', 0.24, 0.18);
  };

  audio.pickup = () => {
    audio.ensure();
    tone(660, 0.12, 'sine', 0.26);
    tone(990, 0.18, 'sine', 0.22, 0.07);
  };

  audio.deliver = (combo) => {
    audio.ensure();
    const base = [523.25, 659.25, 783.99, 1046.5];
    base.forEach((freq, i) => tone(freq, 0.16, 'triangle', 0.24, i * 0.06));
    if (combo >= 2) tone(1318.5, 0.22, 'triangle', 0.2, 0.26);
    if (combo >= 3) tone(1568, 0.3, 'triangle', 0.2, 0.32);
  };

  audio.wrongDock = () => {
    audio.ensure();
    tone(220, 0.14, 'square', 0.1);
    tone(174, 0.18, 'square', 0.1, 0.09);
  };

  audio.hit = () => {
    audio.ensure();
    tone(170, 0.32, 'sine', 0.5, 0, 48);
    noiseBurst(0.28, 0.4, 700);
  };

  audio.waveClear = () => {
    audio.ensure();
    [392, 523.25, 659.25, 783.99].forEach((freq, i) =>
      tone(freq, 0.2, 'triangle', 0.22, i * 0.08),
    );
  };

  audio.gameOver = () => {
    audio.ensure();
    [392, 329.63, 261.63, 196].forEach((freq, i) =>
      tone(freq, 0.34, 'triangle', 0.24, i * 0.16),
    );
    noiseBurst(0.5, 0.2, 400);
  };

  // A slow, quiet two-oscillator pad that hums under the game.
  audio.startPad = () => {
    audio.ensure();
    if (!audio.ctx || !audio.master || audio.pad) return;
    const gain = audio.ctx.createGain();
    gain.gain.value = 0.0;
    gain.gain.setTargetAtTime(0.045, audio.ctx.currentTime, 1.2);
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;
    const oscA = audio.ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = 110;
    const oscB = audio.ctx.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.value = 164.81;
    const lfo = audio.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const lfoGain = audio.ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    oscA.start();
    oscB.start();
    lfo.start();
    audio.pad = { gain, oscA, oscB, lfo };
  };

  return audio;
}
