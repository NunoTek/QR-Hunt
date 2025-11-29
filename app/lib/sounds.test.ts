import { describe, it, expect } from "vitest";
import {
  playCoinSound,
  playSuccessSound,
  playVictorySound,
  playDefeatSound,
  playErrorSound,
  playNotificationSound,
  playRankUpSound,
  playRankDownSound,
} from "./sounds";

/**
 * Sound functions tests.
 * These functions use the Web Audio API which is not available in Node.js.
 * The functions gracefully handle this by catching errors and logging them.
 * We test that they don't throw errors when called in a non-browser environment.
 */
describe("Sound Functions", () => {
  describe("playRankUpSound", () => {
    it("should not throw in non-browser environment", () => {
      expect(() => playRankUpSound()).not.toThrow();
    });
  });

  describe("playRankDownSound", () => {
    it("should not throw in non-browser environment", () => {
      expect(() => playRankDownSound()).not.toThrow();
    });
  });

  describe("playCoinSound", () => {
    it("should not throw in non-browser environment", () => {
      expect(() => playCoinSound()).not.toThrow();
    });
  });

  describe("playSuccessSound", () => {
    it("should not throw in non-browser environment", () => {
      expect(() => playSuccessSound()).not.toThrow();
    });
  });

  describe("playVictorySound", () => {
    it("should not throw in non-browser environment", () => {
      expect(() => playVictorySound()).not.toThrow();
    });
  });

  describe("playDefeatSound", () => {
    it("should not throw in non-browser environment", () => {
      expect(() => playDefeatSound()).not.toThrow();
    });
  });

  describe("playErrorSound", () => {
    it("should not throw in non-browser environment", () => {
      expect(() => playErrorSound()).not.toThrow();
    });
  });

  describe("playNotificationSound", () => {
    it("should not throw in non-browser environment", () => {
      expect(() => playNotificationSound()).not.toThrow();
    });
  });
});
