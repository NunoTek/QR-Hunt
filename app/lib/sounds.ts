// Sound effects using Web Audio API - no external files needed
// Generates sounds programmatically for instant playback

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

// Coin/money drop sound - ascending chime
export function playCoinSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Create multiple oscillators for a rich coin sound
    const frequencies = [880, 1108.73, 1318.51]; // A5, C#6, E6 (A major chord)

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.05);

      gain.gain.setValueAtTime(0, now + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.3);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.35);
    });

    // Add a subtle "clink" with noise
    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.type = "triangle";
    noise.frequency.setValueAtTime(4000, now);
    noise.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
    noiseGain.gain.setValueAtTime(0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    noise.start(now);
    noise.stop(now + 0.15);
  } catch (e) {
    console.log("Audio not available", e);
  }
}

// Success/scan sound - quick ascending notes
export function playSuccessSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.25, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.15);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  } catch (e) {
    console.log("Audio not available", e);
  }
}

// Victory fanfare - triumphant ascending melody
export function playVictorySound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Main melody - triumphant fanfare
    const melody = [
      { freq: 523.25, time: 0, duration: 0.15 },     // C5
      { freq: 659.25, time: 0.15, duration: 0.15 },  // E5
      { freq: 783.99, time: 0.3, duration: 0.15 },   // G5
      { freq: 1046.50, time: 0.45, duration: 0.4 },  // C6 (hold)
      { freq: 987.77, time: 0.85, duration: 0.15 },  // B5
      { freq: 1046.50, time: 1.0, duration: 0.5 },   // C6 (final hold)
    ];

    melody.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.3, now + time + 0.03);
      gain.gain.setValueAtTime(0.3, now + time + duration - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + time + duration);

      osc.start(now + time);
      osc.stop(now + time + duration + 0.1);
    });

    // Add harmonics for richness
    const harmonics = [
      { freq: 261.63, time: 0.45, duration: 0.5 },  // C4
      { freq: 329.63, time: 0.45, duration: 0.5 },  // E4
      { freq: 392.00, time: 0.45, duration: 0.5 },  // G4
    ];

    harmonics.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.15, now + time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + time + duration);

      osc.start(now + time);
      osc.stop(now + time + duration + 0.1);
    });
  } catch (e) {
    console.log("Audio not available", e);
  }
}

// Defeat/game over sound - descending minor notes
export function playDefeatSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [
      { freq: 440, time: 0, duration: 0.3 },      // A4
      { freq: 392, time: 0.3, duration: 0.3 },    // G4
      { freq: 349.23, time: 0.6, duration: 0.3 }, // F4
      { freq: 329.63, time: 0.9, duration: 0.6 }, // E4 (hold)
    ];

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.2, now + time + 0.05);
      gain.gain.setValueAtTime(0.2, now + time + duration - 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + time + duration);

      osc.start(now + time);
      osc.stop(now + time + duration + 0.1);
    });

    // Add low bass note for impact
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    bass.type = "sine";
    bass.frequency.setValueAtTime(82.41, now + 0.9); // E2
    bassGain.gain.setValueAtTime(0, now + 0.9);
    bassGain.gain.linearRampToValueAtTime(0.3, now + 0.95);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
    bass.start(now + 0.9);
    bass.stop(now + 1.6);
  } catch (e) {
    console.log("Audio not available", e);
  }
}

// Error sound - quick dissonant tone
export function playErrorSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.type = "square";
    osc2.type = "square";
    osc1.frequency.setValueAtTime(200, now);
    osc2.frequency.setValueAtTime(210, now); // Slight detuning for dissonance

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  } catch (e) {
    console.log("Audio not available", e);
  }
}

// Notification/ping sound for leaderboard updates
export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1174.66, now + 0.1); // D6

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {
    console.log("Audio not available", e);
  }
}

// Rank up sound - quick ascending swoosh
export function playRankUpSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Fast ascending sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.25);

    // Sparkle overtone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(800, now + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(2000, now + 0.25);

    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.1, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc2.start(now + 0.1);
    osc2.stop(now + 0.35);
  } catch (e) {
    console.log("Audio not available", e);
  }
}

// Rank down sound - descending tone
export function playRankDownSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    console.log("Audio not available", e);
  }
}

// Countdown tick sound - different pitch for each number (3, 2, 1)
export function playCountdownTick(number: 3 | 2 | 1): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Higher pitch for lower numbers (building tension)
    const frequencies: Record<number, number> = {
      3: 440,   // A4 - low
      2: 554.37, // C#5 - medium
      1: 659.25, // E5 - high
    };

    const freq = frequencies[number] || 440;

    // Main tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.start(now);
    osc.stop(now + 0.35);

    // Add a subtle click for impact
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();

    click.connect(clickGain);
    clickGain.connect(ctx.destination);

    click.type = "square";
    click.frequency.setValueAtTime(freq * 2, now);
    click.frequency.exponentialRampToValueAtTime(freq, now + 0.05);

    clickGain.gain.setValueAtTime(0.15, now);
    clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    click.start(now);
    click.stop(now + 0.1);

    // Add sub-bass thump
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();

    bass.connect(bassGain);
    bassGain.connect(ctx.destination);

    bass.type = "sine";
    bass.frequency.setValueAtTime(80, now);
    bass.frequency.exponentialRampToValueAtTime(40, now + 0.15);

    bassGain.gain.setValueAtTime(0.3, now);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    bass.start(now);
    bass.stop(now + 0.2);
  } catch (e) {
    console.log("Audio not available", e);
  }
}

// Countdown "GO!" sound - exciting ascending arpeggio
export function playCountdownGo(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Fast ascending arpeggio
    const notes = [
      { freq: 523.25, time: 0 },      // C5
      { freq: 659.25, time: 0.05 },   // E5
      { freq: 783.99, time: 0.1 },    // G5
      { freq: 1046.50, time: 0.15 },  // C6
      { freq: 1318.51, time: 0.2 },   // E6
    ];

    notes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.25, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + time + 0.25);

      osc.start(now + time);
      osc.stop(now + time + 0.3);
    });

    // Big final chord
    const chordFreqs = [523.25, 659.25, 783.99, 1046.50]; // C major
    chordFreqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + 0.25);

      gain.gain.setValueAtTime(0, now + 0.25);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.28);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

      osc.start(now + 0.25);
      osc.stop(now + 0.9);
    });

    // Crash/shimmer effect
    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();

    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.type = "sawtooth";
    noise.frequency.setValueAtTime(3000, now + 0.25);
    noise.frequency.exponentialRampToValueAtTime(1500, now + 0.5);

    noiseGain.gain.setValueAtTime(0.08, now + 0.25);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    noise.start(now + 0.25);
    noise.stop(now + 0.6);

    // Bass impact
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();

    bass.connect(bassGain);
    bassGain.connect(ctx.destination);

    bass.type = "sine";
    bass.frequency.setValueAtTime(65.41, now + 0.25); // C2

    bassGain.gain.setValueAtTime(0.4, now + 0.25);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    bass.start(now + 0.25);
    bass.stop(now + 0.7);
  } catch (e) {
    console.log("Audio not available", e);
  }
}
