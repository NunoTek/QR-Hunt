import { describe, expect, it, vi } from "vitest";
import { meta } from "~/routes/_index";

// Mock remix router
vi.mock("@remix-run/react", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => ({ type: "a", props: { href: to, children } }),
}));

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

    it("should return a valid React element", async () => {
      const module = await import("~/routes/_index");
      const Index = module.default;
      const result = Index();

      expect(result).toBeDefined();
      expect(result.type).toBe("div");
      expect(result.props.className).toContain("min-h-screen");
      expect(result.props.className).toContain("bg-primary");
    });

    it("should contain all section components", async () => {
      const module = await import("~/routes/_index");
      const Index = module.default;
      const result = Index();

      // The Index component should have 7 children (all section components)
      expect(result.props.children).toHaveLength(7);
    });
  });

  describe("Home Section Components", () => {
    it("should export HeroSection component", async () => {
      const { HeroSection } = await import("~/components/home");
      expect(HeroSection).toBeDefined();
      expect(typeof HeroSection).toBe("function");
    });

    it("should export PlayerExperienceSection component", async () => {
      const { PlayerExperienceSection } = await import("~/components/home");
      expect(PlayerExperienceSection).toBeDefined();
      expect(typeof PlayerExperienceSection).toBe("function");
    });

    it("should export HowItWorksSection component", async () => {
      const { HowItWorksSection } = await import("~/components/home");
      expect(HowItWorksSection).toBeDefined();
      expect(typeof HowItWorksSection).toBe("function");
    });

    it("should export PerfectForSection component", async () => {
      const { PerfectForSection } = await import("~/components/home");
      expect(PerfectForSection).toBeDefined();
      expect(typeof PerfectForSection).toBe("function");
    });

    it("should export FeaturesSection component", async () => {
      const { FeaturesSection } = await import("~/components/home");
      expect(FeaturesSection).toBeDefined();
      expect(typeof FeaturesSection).toBe("function");
    });

    it("should export CTASection component", async () => {
      const { CTASection } = await import("~/components/home");
      expect(CTASection).toBeDefined();
      expect(typeof CTASection).toBe("function");
    });

    it("should export Footer component", async () => {
      const { Footer } = await import("~/components/home");
      expect(Footer).toBeDefined();
      expect(typeof Footer).toBe("function");
    });

    it("should render HeroSection without crashing", async () => {
      const { HeroSection } = await import("~/components/home");
      expect(() => HeroSection()).not.toThrow();
    });

    it("should render all sections without crashing", async () => {
      const {
        HeroSection,
        PlayerExperienceSection,
        HowItWorksSection,
        PerfectForSection,
        FeaturesSection,
        CTASection,
        Footer,
      } = await import("~/components/home");

      expect(() => HeroSection()).not.toThrow();
      expect(() => PlayerExperienceSection()).not.toThrow();
      expect(() => HowItWorksSection()).not.toThrow();
      expect(() => PerfectForSection()).not.toThrow();
      expect(() => FeaturesSection()).not.toThrow();
      expect(() => CTASection()).not.toThrow();
      expect(() => Footer()).not.toThrow();
    });
  });

  describe("Content Validation via Section Components", () => {
    it("HeroSection should contain main title and CTA buttons", async () => {
      const { HeroSection } = await import("~/components/home");
      const result = HeroSection();
      const html = JSON.stringify(result);

      expect(html).toContain("Turn Any Space Into an");
      expect(html).toContain("Adventure");
      expect(html).toContain("Join a Game");
      expect(html).toContain("Create a Hunt");
      expect(html).toContain("/join");
      expect(html).toContain("/admin");
    });

    it("HeroSection should use amber colors for gradient text", async () => {
      const { HeroSection } = await import("~/components/home");
      const result = HeroSection();
      const html = JSON.stringify(result);

      expect(html).toContain("bg-gradient-to-r");
      expect(html).toContain("bg-clip-text");
      expect(html).toContain("text-transparent");
      expect(html).toContain("amber-200");
      expect(html).toContain("amber-400");
    });

    it("HowItWorksSection should contain all steps", async () => {
      const { HowItWorksSection } = await import("~/components/home");
      const result = HowItWorksSection();
      const html = JSON.stringify(result);

      expect(html).toContain("How It Works");
      expect(html).toContain("1. Create QR Codes");
      expect(html).toContain("2. Invite Teams");
      expect(html).toContain("3. Hunt & Scan");
      expect(html).toContain("4. Live Leaderboard");
    });

    it("PerfectForSection should contain all use cases", async () => {
      const { PerfectForSection } = await import("~/components/home");
      const result = PerfectForSection();
      const html = JSON.stringify(result);

      expect(html).toContain("Perfect For");
      expect(html).toContain("Team Building");
      expect(html).toContain("Parties & Events");
      expect(html).toContain("Education");
      expect(html).toContain("Camps & Retreats");
      expect(html).toContain("Museums & Tours");
      expect(html).toContain("Weddings");
    });

    it("FeaturesSection should contain feature list", async () => {
      const { FeaturesSection } = await import("~/components/home");
      const result = FeaturesSection();
      const html = JSON.stringify(result);

      expect(html).toContain("Everything You Need");
      expect(html).toContain("Real-time leaderboards");
      expect(html).toContain("Built-in chat");
      expect(html).toContain("QR code generator");
    });

    it("FeaturesSection should contain phone mockup container", async () => {
      const { FeaturesSection } = await import("~/components/home");
      const result = FeaturesSection();
      const html = JSON.stringify(result);

      // The phone mockup component is rendered but nested - verify the container exists
      expect(html).toContain("justify-center");
      expect(html).toContain("lg:justify-end");
    });

    it("CTASection should contain call to action", async () => {
      const { CTASection } = await import("~/components/home");
      const result = CTASection();
      const html = JSON.stringify(result);

      expect(html).toContain("Ready to Start Your Hunt?");
      expect(html).toContain("Join a Game");
      expect(html).toContain("Create a Hunt");
    });

    it("Footer should contain key values", async () => {
      const { Footer } = await import("~/components/home");
      const result = Footer();
      const html = JSON.stringify(result);

      expect(html).toContain("Self-hostable");
      expect(html).toContain("Open source");
      expect(html).toContain("Privacy-focused");
      expect(html).toContain("QR Hunt");
    });
  });
});
