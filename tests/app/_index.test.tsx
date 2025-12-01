import { describe, expect, it, vi } from "vitest";
import { meta } from "~/routes/_index";

// Mock the i18n context
vi.mock("~/i18n/I18nContext", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      // Handle array keys separately
      if (key === "pages.home.features.list") {
        return [
          "Clue-based navigation guides teams to each QR code",
          "Real-time leaderboards with live updates",
          "Built-in chat between teams and organizers",
          "QR code generator with custom logos",
          "Media clues (images, videos, audio)",
          "Works on any device - no app needed",
          "Self-hosted - your data stays private"
        ];
      }

      const translations: Record<string, string> = {
        "pages.home.hero.title": "Turn Any Space Into an",
        "pages.home.hero.titleHighlight": "Adventure",
        "pages.home.hero.subtitle": "Create engaging QR code scavenger hunts for team building, parties, and events. Real-time scoring, instant setup.",
        "pages.home.hero.joinGame": "Join a Game",
        "pages.home.hero.createHunt": "Create a Hunt",
        "pages.home.howItWorks.title": "How It Works",
        "pages.home.howItWorks.steps.create.title": "1. Create QR Codes",
        "pages.home.howItWorks.steps.create.description": "Generate unique QR codes for each checkpoint with custom hints and point values.",
        "pages.home.howItWorks.steps.invite.title": "2. Invite Teams",
        "pages.home.howItWorks.steps.invite.description": "Share your game code. Teams join instantly from any device with a camera.",
        "pages.home.howItWorks.steps.hunt.title": "3. Hunt & Scan",
        "pages.home.howItWorks.steps.hunt.description": "Teams explore, find QR codes, and scan them to earn points in real-time.",
        "pages.home.howItWorks.steps.leaderboard.title": "4. Live Leaderboard",
        "pages.home.howItWorks.steps.leaderboard.description": "Watch the excitement with live score updates and team rankings.",
        "pages.home.perfectFor.title": "Perfect For",
        "pages.home.perfectFor.items.teamBuilding.title": "Team Building",
        "pages.home.perfectFor.items.teamBuilding.description": "Build stronger teams through collaboration",
        "pages.home.perfectFor.items.parties.title": "Parties & Events",
        "pages.home.perfectFor.items.parties.description": "Make any celebration memorable",
        "pages.home.perfectFor.items.education.title": "Education",
        "pages.home.perfectFor.items.education.description": "Make learning fun and engaging",
        "pages.home.perfectFor.items.camps.title": "Camps & Retreats",
        "pages.home.perfectFor.items.camps.description": "Perfect outdoor activities",
        "pages.home.perfectFor.items.museums.title": "Museums & Tours",
        "pages.home.perfectFor.items.museums.description": "Create engaging self-guided experiences",
        "pages.home.perfectFor.items.weddings.title": "Weddings",
        "pages.home.perfectFor.items.weddings.description": "Fun activities for guests to enjoy",
        "pages.home.features.title": "Everything You Need",
        "pages.home.features.mockup.teamName": "Team Alpha",
        "pages.home.features.mockup.nextClue": "Next Clue",
        "pages.home.features.mockup.clueTitle": "The Hidden Garden",
        "pages.home.features.mockup.clueHint": "Find the place where roses bloom...",
        "pages.home.features.mockup.adminHint": "Hint from admin",
        "pages.home.features.mockup.scanButton": "Scan QR Code",
        "pages.home.playerExperience.title": "Player Experience",
        "pages.home.playerExperience.subtitle": "How players experience the hunt",
        "pages.home.playerExperience.steps.join.title": "Join",
        "pages.home.playerExperience.steps.join.description": "Scan the QR code to join",
        "pages.home.playerExperience.steps.clue.title": "Get Clue",
        "pages.home.playerExperience.steps.clue.description": "Follow the hints to find QR codes",
        "pages.home.playerExperience.steps.hunt.title": "Hunt",
        "pages.home.playerExperience.steps.hunt.description": "Explore and find QR codes",
        "pages.home.playerExperience.steps.scan.title": "Scan",
        "pages.home.playerExperience.steps.scan.description": "Scan QR codes to score points",
        "pages.home.playerExperience.repeat": "Repeat until you finish!",
        "pages.home.cta.title": "Ready to Start Your Hunt?",
        "pages.home.cta.subtitle": "Join thousands of teams creating memorable experiences.",
        "pages.home.cta.button": "Create Your First Hunt",
        "common.footer.selfHostable": "Self-hostable",
        "common.footer.openSource": "Open source",
        "common.footer.privacyFocused": "Privacy-focused",
        "common.appName": "QR Hunt",
        "common.points": "pts",
      };
      return translations[key] || key;
    },
    language: "en",
  }),
}));

interface MetaTag {
  title?: string;
  name?: string;
  content?: string;
  [key: string]: unknown;
}

describe("Index Page", () => {
  describe("Meta Tags", () => {
    it("should have proper title", () => {
      const result = meta({ data: null, params: {}, matches: [], location: { pathname: "/", search: "", hash: "", state: null, key: "" } });

      expect(result).toBeDefined();
      const titleTag = result?.find((tag: MetaTag) => "title" in tag);
      expect(titleTag).toBeDefined();
      expect((titleTag as MetaTag)?.title).toBe("QR Hunt - QR Code Scavenger Hunt Platform");
    });

    it("should have proper description", () => {
      const result = meta({ data: null, params: {}, matches: [], location: { pathname: "/", search: "", hash: "", state: null, key: "" } });

      const descTag = result?.find((tag: MetaTag) => tag.name === "description");
      expect(descTag).toBeDefined();
      expect((descTag as MetaTag)?.content).toContain("QR code scavenger hunts");
      expect((descTag as MetaTag)?.content).toContain("team building");
    });
  });

  describe("Component Structure", () => {
    it("should export a default component", async () => {
      const module = await import("~/routes/_index");
      const Index = module.default;
      expect(Index).toBeDefined();
      expect(typeof Index).toBe("function");
    });

    it("should render without crashing", async () => {
      const module = await import("~/routes/_index");
      const Index = module.default;

      // Basic smoke test - ensure component returns valid JSX
      expect(() => Index()).not.toThrow();
    });
  });

  describe("Content Validation", () => {
    it("should contain the main title text", async () => {
      const module = await import("~/routes/_index");
      const Index = module.default;
      const result = Index();
      const html = JSON.stringify(result);

      expect(html).toContain("Turn Any Space Into an");
      expect(html).toContain("Adventure");
    });

    it("should ensure Adventure text has gradient classes to be visible", async () => {
      const module = await import("~/routes/_index");
      const Index = module.default;
      const result = Index();
      const html = JSON.stringify(result);

      // Verify gradient classes are present for the Adventure span
      expect(html).toContain("bg-gradient-to-r");
      expect(html).toContain("bg-clip-text");
      expect(html).toContain("text-transparent");
      expect(html).toContain("from-amber");
      expect(html).toContain("to-amber");
    });

    it("should have high opacity overlay on hero section", async () => {
      const module = await import("~/routes/_index");
      const Index = module.default;
      const result = Index();
      const html = JSON.stringify(result);

      // Check for gradient overlay
      expect(html).toContain("/70");
      expect(html).toContain("bg-gradient-to-br");
    });

    it("should contain QR Hunt branding", async () => {
      const module = await import("~/routes/_index");
      const Index = module.default;
      const result = Index();
      const html = JSON.stringify(result);

      expect(html).toContain("QR Hunt");
      expect(html).toContain("🎯");
    });

    it("should have both CTA buttons with correct links", async () => {
      const module = await import("~/routes/_index");
      const Index = module.default;
      const result = Index();
      const html = JSON.stringify(result);

      expect(html).toContain("Join a Game");
      expect(html).toContain("Create a Hunt");
      expect(html).toContain("/join");
      expect(html).toContain("/admin");
    });

    it("should contain How It Works section", async () => {
      const module = await import("~/routes/_index");
      const Index = module.default;
      const result = Index();
      const html = JSON.stringify(result);

      expect(html).toContain("How It Works");
      expect(html).toContain("1. Create QR Codes");
      expect(html).toContain("2. Invite Teams");
      expect(html).toContain("3. Hunt & Scan");
      expect(html).toContain("4. Live Leaderboard");
    });

    it("should contain Perfect For section with all use cases", async () => {
      const module = await import("~/routes/_index");
      const Index = module.default;
      const result = Index();
      const html = JSON.stringify(result);

      expect(html).toContain("Perfect For");
      expect(html).toContain("Team Building");
      expect(html).toContain("Parties & Events");
      expect(html).toContain("Education");
      expect(html).toContain("Camps & Retreats");
      expect(html).toContain("Museums & Tours");
      expect(html).toContain("Weddings");
    });

    it("should contain Everything You Need section", async () => {
      const module = await import("~/routes/_index");
      const Index = module.default;
      const result = Index();
      const html = JSON.stringify(result);

      expect(html).toContain("Everything You Need");
      expect(html).toContain("Real-time leaderboards");
      expect(html).toContain("Built-in chat");
      expect(html).toContain("QR code generator");
      expect(html).toContain("no app needed");
    });

    it("should contain phone mockup with demo content", async () => {
      const module = await import("~/routes/_index");
      const Index = module.default;
      const result = Index();
      const html = JSON.stringify(result);

      expect(html).toContain("Team Alpha");
      expect(html).toContain("245");
      expect(html).toContain("pts");
      expect(html).toContain("The Hidden Garden");
    });

    it("should contain final CTA section", async () => {
      const module = await import("~/routes/_index");
      const Index = module.default;
      const result = Index();
      const html = JSON.stringify(result);

      expect(html).toContain("Ready to Start Your Hunt?");
    });

    it("should contain footer with key values", async () => {
      const module = await import("~/routes/_index");
      const Index = module.default;
      const result = Index();
      const html = JSON.stringify(result);

      expect(html).toContain("Self-hostable");
      expect(html).toContain("Open source");
      expect(html).toContain("Privacy-focused");
    });

    it("should use amber colors for gradient text (not invisible warning colors)", async () => {
      const module = await import("~/routes/_index");
      const Index = module.default;
      const result = Index();
      const html = JSON.stringify(result);

      // Ensure we're using amber colors that are visible, not problematic color variables
      expect(html).toContain("amber-200");
      expect(html).toContain("amber-400");

      // Should NOT use warning with opacity that might not render
      expect(html).not.toContain("warning/80");
    });
  });
});

