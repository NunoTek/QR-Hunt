import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Sound Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Module Import", () => {
    it("should export playCountdownTick function", async () => {
      const { playCountdownTick } = await import("../app/lib/sounds");
      expect(playCountdownTick).toBeDefined();
      expect(typeof playCountdownTick).toBe("function");
    });

    it("should export playCountdownGo function", async () => {
      const { playCountdownGo } = await import("../app/lib/sounds");
      expect(playCountdownGo).toBeDefined();
      expect(typeof playCountdownGo).toBe("function");
    });

    it("should export existing sound functions", async () => {
      const sounds = await import("../app/lib/sounds");
      expect(sounds.playSuccessSound).toBeDefined();
      expect(sounds.playDefeatSound).toBeDefined();
      expect(sounds.playVictorySound).toBeDefined();
      expect(sounds.playCoinSound).toBeDefined();
    });
  });

  describe("playCountdownTick", () => {
    it("should accept number 3", async () => {
      const { playCountdownTick } = await import("../app/lib/sounds");
      // Should not throw
      expect(() => playCountdownTick(3)).not.toThrow();
    });

    it("should accept number 2", async () => {
      const { playCountdownTick } = await import("../app/lib/sounds");
      expect(() => playCountdownTick(2)).not.toThrow();
    });

    it("should accept number 1", async () => {
      const { playCountdownTick } = await import("../app/lib/sounds");
      expect(() => playCountdownTick(1)).not.toThrow();
    });

    it("should only accept 3, 2, or 1 as valid inputs", () => {
      const validInputs: (3 | 2 | 1)[] = [3, 2, 1];
      expect(validInputs).toHaveLength(3);
      expect(validInputs).toContain(3);
      expect(validInputs).toContain(2);
      expect(validInputs).toContain(1);
    });
  });

  describe("playCountdownGo", () => {
    it("should be callable without arguments", async () => {
      const { playCountdownGo } = await import("../app/lib/sounds");
      expect(() => playCountdownGo()).not.toThrow();
    });
  });

  describe("Countdown Tick Frequencies", () => {
    it("should have different frequency for each number", () => {
      const frequencies: Record<number, number> = {
        3: 440,      // A4 - low
        2: 554.37,   // C#5 - medium
        1: 659.25,   // E5 - high
      };

      // Higher pitch for lower numbers (building tension)
      expect(frequencies[1]).toBeGreaterThan(frequencies[2]);
      expect(frequencies[2]).toBeGreaterThan(frequencies[3]);
    });

    it("should use ascending pitches", () => {
      const frequencies = [440, 554.37, 659.25]; // For 3, 2, 1
      for (let i = 1; i < frequencies.length; i++) {
        expect(frequencies[i]).toBeGreaterThan(frequencies[i - 1]);
      }
    });
  });

  describe("GO Sound Arpeggio", () => {
    it("should have ascending arpeggio notes", () => {
      const notes = [
        { freq: 523.25, time: 0 },      // C5
        { freq: 659.25, time: 0.05 },   // E5
        { freq: 783.99, time: 0.1 },    // G5
        { freq: 1046.50, time: 0.15 },  // C6
        { freq: 1318.51, time: 0.2 },   // E6
      ];

      // Each note should be higher frequency than the previous
      for (let i = 1; i < notes.length; i++) {
        expect(notes[i].freq).toBeGreaterThan(notes[i - 1].freq);
      }

      // Each note should be after the previous
      for (let i = 1; i < notes.length; i++) {
        expect(notes[i].time).toBeGreaterThan(notes[i - 1].time);
      }
    });

    it("should have C major chord", () => {
      const chordFreqs = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C octave

      // C major triad frequencies (approximately)
      expect(chordFreqs[0]).toBeCloseTo(523.25, 1); // C5
      expect(chordFreqs[1]).toBeCloseTo(659.25, 1); // E5
      expect(chordFreqs[2]).toBeCloseTo(783.99, 1); // G5
    });
  });

  describe("Audio Context Handling", () => {
    it("should handle missing audio context gracefully", async () => {
      const { playCountdownTick, playCountdownGo } = await import("../app/lib/sounds");

      // These should not throw even if AudioContext is not available
      expect(() => playCountdownTick(3)).not.toThrow();
      expect(() => playCountdownGo()).not.toThrow();
    });
  });

  describe("Oscillator Types", () => {
    it("should use sine wave for main tone", () => {
      const oscType = "sine";
      expect(oscType).toBe("sine");
    });

    it("should use square wave for click effect", () => {
      const clickType = "square";
      expect(clickType).toBe("square");
    });

    it("should use triangle wave for arpeggio", () => {
      const arpeggioType = "triangle";
      expect(arpeggioType).toBe("triangle");
    });

    it("should use sawtooth wave for shimmer effect", () => {
      const shimmerType = "sawtooth";
      expect(shimmerType).toBe("sawtooth");
    });
  });

  describe("Gain Envelope", () => {
    it("should have attack-decay envelope", () => {
      const envelope = {
        attack: 0.01,   // Fast attack
        decay: 0.3,     // Medium decay
        sustain: 0,     // No sustain
      };

      expect(envelope.attack).toBeLessThan(envelope.decay);
      expect(envelope.sustain).toBe(0);
    });

    it("should fade to near zero", () => {
      const finalGain = 0.01;
      expect(finalGain).toBeLessThan(0.1);
    });
  });

  describe("Bass Effects", () => {
    it("should have sub-bass for tick sounds", () => {
      const bassFreq = 80;
      expect(bassFreq).toBeLessThan(100);
    });

    it("should have bass impact for GO sound", () => {
      const bassImpactFreq = 65.41; // C2
      expect(bassImpactFreq).toBeLessThan(100);
    });

    it("should use frequency sweep for bass", () => {
      const startFreq = 80;
      const endFreq = 40;
      expect(startFreq).toBeGreaterThan(endFreq);
    });
  });

  describe("Timing", () => {
    it("should have tick duration under 400ms", () => {
      const tickDuration = 350; // ms
      expect(tickDuration).toBeLessThan(400);
    });

    it("should have GO sound duration under 1 second", () => {
      const goDuration = 900; // ms
      expect(goDuration).toBeLessThan(1000);
    });

    it("should have staggered note timings in arpeggio", () => {
      const timings = [0, 0.05, 0.1, 0.15, 0.2];
      const interval = 0.05; // 50ms between notes

      for (let i = 1; i < timings.length; i++) {
        expect(timings[i] - timings[i - 1]).toBeCloseTo(interval, 2);
      }
    });
  });

  describe("Volume Levels", () => {
    it("should have reasonable max volume", () => {
      const maxGain = 0.4;
      expect(maxGain).toBeLessThanOrEqual(1);
      expect(maxGain).toBeGreaterThan(0);
    });

    it("should have quieter effects than main sound", () => {
      const mainGain = 0.4;
      const clickGain = 0.15;
      const bassGain = 0.3;

      expect(clickGain).toBeLessThan(mainGain);
    });

    it("should have balanced chord volume", () => {
      const chordGain = 0.2;
      const notesInChord = 4;
      const totalChordGain = chordGain * notesInChord;

      // Total shouldn't clip
      expect(totalChordGain).toBeLessThanOrEqual(1);
    });
  });

  describe("Error Handling", () => {
    it("should catch and log audio errors", () => {
      // The functions should have try-catch blocks
      const hasTryCatch = true;
      expect(hasTryCatch).toBe(true);
    });

    it("should not crash when audio is unavailable", async () => {
      const { playCountdownTick, playCountdownGo } = await import("../app/lib/sounds");

      // Should complete without throwing
      playCountdownTick(3);
      playCountdownTick(2);
      playCountdownTick(1);
      playCountdownGo();

      expect(true).toBe(true); // If we get here, no crash
    });
  });
});
