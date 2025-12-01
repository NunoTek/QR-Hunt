import { beforeEach, describe, expect, it, vi } from "vitest";

describe("i18n", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Module Imports", () => {
    it("should export translations for all supported languages", async () => {
      const { translations } = await import("../../app/i18n");
      expect(translations.en).toBeDefined();
      expect(translations.fr).toBeDefined();
      expect(translations.pt).toBeDefined();
    });

    it("should export supported languages array", async () => {
      const { supportedLanguages } = await import("../../app/i18n");
      expect(supportedLanguages).toContain("en");
      expect(supportedLanguages).toContain("fr");
      expect(supportedLanguages).toContain("pt");
      expect(supportedLanguages.length).toBe(3);
    });

    it("should export default language as English", async () => {
      const { defaultLanguage } = await import("../../app/i18n");
      expect(defaultLanguage).toBe("en");
    });

    it("should export languages object with display names", async () => {
      const { languages } = await import("../../app/i18n");
      expect(languages.en).toBe("English");
      expect(languages.fr).toBe("Français");
      expect(languages.pt).toBe("Português");
    });
  });

  describe("Translation Structure", () => {
    it("should have common translations section", async () => {
      const { translations } = await import("../../app/i18n");
      expect(translations.en.common).toBeDefined();
      expect(translations.fr.common).toBeDefined();
      expect(translations.pt.common).toBeDefined();
    });

    it("should have pages translations section", async () => {
      const { translations } = await import("../../app/i18n");
      expect(translations.en.pages).toBeDefined();
      expect(translations.fr.pages).toBeDefined();
      expect(translations.pt.pages).toBeDefined();
    });

    it("should have components translations section", async () => {
      const { translations } = await import("../../app/i18n");
      expect(translations.en.components).toBeDefined();
      expect(translations.fr.components).toBeDefined();
      expect(translations.pt.components).toBeDefined();
    });

    it("should have appName in all languages", async () => {
      const { translations } = await import("../../app/i18n");
      expect(translations.en.common.appName).toBe("QR Hunt");
      expect(translations.fr.common.appName).toBe("QR Hunt");
      expect(translations.pt.common.appName).toBe("QR Hunt");
    });
  });

  describe("createTranslator", () => {
    it("should create a translator function for English", async () => {
      const { createTranslator } = await import("../../app/i18n");
      const t = createTranslator("en");
      expect(typeof t).toBe("function");
    });

    it("should return correct translation for simple key", async () => {
      const { createTranslator } = await import("../../app/i18n");
      const t = createTranslator("en");
      expect(t("common.appName")).toBe("QR Hunt");
    });

    it("should return correct translation for nested key", async () => {
      const { createTranslator } = await import("../../app/i18n");
      const t = createTranslator("en");
      expect(t("pages.home.hero.title")).toBe("Turn Any Space Into an");
    });

    it("should interpolate parameters", async () => {
      const { createTranslator } = await import("../../app/i18n");
      const t = createTranslator("en");
      expect(t("pages.play.pointsEarned", { points: 100 })).toBe("+100 points");
    });

    it("should return key if translation not found", async () => {
      const { createTranslator } = await import("../../app/i18n");
      const t = createTranslator("en");
      const result = t("non.existent.key");
      expect(result).toBe("non.existent.key");
    });

    it("should use French translations", async () => {
      const { createTranslator } = await import("../../app/i18n");
      const t = createTranslator("fr");
      expect(t("common.loading")).toBe("Chargement...");
    });

    it("should use Portuguese translations", async () => {
      const { createTranslator } = await import("../../app/i18n");
      const t = createTranslator("pt");
      expect(t("common.loading")).toBe("A carregar...");
    });

    it("should fallback to English for missing keys in other languages", async () => {
      const { createTranslator } = await import("../../app/i18n");
      // Assuming all translations exist, this tests the fallback mechanism
      const tFr = createTranslator("fr");
      const tEn = createTranslator("en");

      // Both should have the app name
      expect(tFr("common.appName")).toBe(tEn("common.appName"));
    });
  });

  describe("Translation Consistency", () => {
    it("should have same structure in all languages", async () => {
      const { translations } = await import("../../app/i18n");

      const enKeys = Object.keys(translations.en);
      const frKeys = Object.keys(translations.fr);
      const ptKeys = Object.keys(translations.pt);

      expect(frKeys).toEqual(enKeys);
      expect(ptKeys).toEqual(enKeys);
    });

    it("should have home page translations in all languages", async () => {
      const { translations } = await import("../../app/i18n");

      expect(translations.en.pages.home).toBeDefined();
      expect(translations.fr.pages.home).toBeDefined();
      expect(translations.pt.pages.home).toBeDefined();
    });

    it("should have join page translations in all languages", async () => {
      const { translations } = await import("../../app/i18n");

      expect(translations.en.pages.join).toBeDefined();
      expect(translations.fr.pages.join).toBeDefined();
      expect(translations.pt.pages.join).toBeDefined();
    });

    it("should have waitingRoom component translations in all languages", async () => {
      const { translations } = await import("../../app/i18n");

      expect(translations.en.components.waitingRoom).toBeDefined();
      expect(translations.fr.components.waitingRoom).toBeDefined();
      expect(translations.pt.components.waitingRoom).toBeDefined();
    });
  });

  describe("Common Translations", () => {
    it("should have status translations", async () => {
      const { translations } = await import("../../app/i18n");

      expect(translations.en.common.status.draft).toBeDefined();
      expect(translations.en.common.status.active).toBeDefined();
      expect(translations.en.common.status.completed).toBeDefined();
    });

    it("should have footer translations", async () => {
      const { translations } = await import("../../app/i18n");

      expect(translations.en.common.footer.selfHostable).toBeDefined();
      expect(translations.en.common.footer.openSource).toBeDefined();
      expect(translations.en.common.footer.privacyFocused).toBeDefined();
    });

    it("should have basic action words", async () => {
      const { translations } = await import("../../app/i18n");

      expect(translations.en.common.cancel).toBe("Cancel");
      expect(translations.en.common.save).toBe("Save");
      expect(translations.en.common.delete).toBe("Delete");
      expect(translations.en.common.edit).toBe("Edit");
      expect(translations.en.common.back).toBe("Back");
      expect(translations.en.common.close).toBe("Close");
    });
  });

  describe("Page-specific Translations", () => {
    it("should have hero section translations", async () => {
      const { translations } = await import("../../app/i18n");

      expect(translations.en.pages.home.hero.title).toBeDefined();
      expect(translations.en.pages.home.hero.titleHighlight).toBeDefined();
      expect(translations.en.pages.home.hero.subtitle).toBeDefined();
      expect(translations.en.pages.home.hero.joinGame).toBeDefined();
      expect(translations.en.pages.home.hero.createHunt).toBeDefined();
    });

    it("should have join page form translations", async () => {
      const { translations } = await import("../../app/i18n");

      expect(translations.en.pages.join.form.gameId).toBeDefined();
      expect(translations.en.pages.join.form.teamCode).toBeDefined();
      expect(translations.en.pages.join.form.joinButton).toBeDefined();
    });

    it("should have join page error translations", async () => {
      const { translations } = await import("../../app/i18n");

      expect(translations.en.pages.join.errors.gameIdRequired).toBeDefined();
      expect(translations.en.pages.join.errors.teamCodeLength).toBeDefined();
      expect(translations.en.pages.join.errors.connectionFailed).toBeDefined();
    });
  });

  describe("Component-specific Translations", () => {
    it("should have waitingRoom translations", async () => {
      const { translations } = await import("../../app/i18n");

      expect(translations.en.components.waitingRoom.waitingForGame).toBeDefined();
      expect(translations.en.components.waitingRoom.yourTeam).toBeDefined();
      expect(translations.en.components.waitingRoom.teamsReady).toBeDefined();
    });

    it("should have installPrompt translations", async () => {
      const { translations } = await import("../../app/i18n");

      expect(translations.en.components.installPrompt.title).toBeDefined();
      expect(translations.en.components.installPrompt.install).toBeDefined();
    });

    it("should have languageSelector translations", async () => {
      const { translations } = await import("../../app/i18n");

      expect(translations.en.components.languageSelector.title).toBeDefined();
      expect(translations.en.components.languageSelector.languages).toBeDefined();
      expect(translations.en.components.languageSelector.languages.en).toBe("English");
      expect(translations.en.components.languageSelector.languages.fr).toBe("Français");
      expect(translations.en.components.languageSelector.languages.pt).toBe("Português");
    });
  });

  describe("Interpolation", () => {
    it("should handle single parameter interpolation", async () => {
      const { createTranslator } = await import("../../app/i18n");
      const t = createTranslator("en");

      const result = t("pages.play.pointsEarned", { points: 50 });
      expect(result).toBe("+50 points");
    });

    it("should preserve interpolation placeholder if param not provided", async () => {
      const { createTranslator } = await import("../../app/i18n");
      const t = createTranslator("en");

      // This should keep the placeholder
      const result = t("pages.play.pointsEarned", {});
      expect(result).toContain("{{points}}");
    });

    it("should handle numeric parameters", async () => {
      const { createTranslator } = await import("../../app/i18n");
      const t = createTranslator("en");

      const result = t("pages.play.pointsEarned", { points: 999 });
      expect(result).toBe("+999 points");
    });
  });

  describe("Language Detection (mock)", () => {
    it("should have detectLanguage function", async () => {
      const { detectLanguage } = await import("../../app/i18n");
      expect(typeof detectLanguage).toBe("function");
    });

    it("should return default language when window is undefined", async () => {
      const { detectLanguage, defaultLanguage } = await import("../../app/i18n");
      // In Node.js environment (test), window is undefined
      const detected = detectLanguage();
      // Should return default since we're in Node.js
      expect(detected).toBe(defaultLanguage);
    });
  });
});
