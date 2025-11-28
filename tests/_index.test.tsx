import { describe, it, expect } from "vitest";
import { meta } from "../app/routes/_index";

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
      const Index = (await import("../app/routes/_index")).default;
      expect(Index).toBeDefined();
      expect(typeof Index).toBe("function");
    });

    it("should render without crashing", async () => {
      const Index = (await import("../app/routes/_index")).default;
      
      // Basic smoke test - ensure component returns valid JSX
      expect(() => Index()).not.toThrow();
    });
  });

  describe("Content Validation", () => {
    it("should contain the main title text", async () => {
      const Index = (await import("../app/routes/_index")).default;
      const result = Index();
      const html = JSON.stringify(result);
      
      expect(html).toContain("Turn Any Space Into an");
      expect(html).toContain("Adventure");
    });

    it("should ensure Adventure text has gradient classes to be visible", async () => {
      const Index = (await import("../app/routes/_index")).default;
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
      const Index = (await import("../app/routes/_index")).default;
      const result = Index();
      const html = JSON.stringify(result);

      // Check for gradient overlay
      expect(html).toContain("/70");
      expect(html).toContain("bg-gradient-to-br");
    });

    it("should contain QR Hunt branding", async () => {
      const Index = (await import("../app/routes/_index")).default;
      const result = Index();
      const html = JSON.stringify(result);
      
      expect(html).toContain("QR Hunt");
      expect(html).toContain("🎯");
    });

    it("should have both CTA buttons with correct links", async () => {
      const Index = (await import("../app/routes/_index")).default;
      const result = Index();
      const html = JSON.stringify(result);
      
      expect(html).toContain("Join a Game");
      expect(html).toContain("Create a Hunt");
      expect(html).toContain("/join");
      expect(html).toContain("/admin");
    });

    it("should contain How It Works section", async () => {
      const Index = (await import("../app/routes/_index")).default;
      const result = Index();
      const html = JSON.stringify(result);
      
      expect(html).toContain("How It Works");
      expect(html).toContain("1. Create QR Codes");
      expect(html).toContain("2. Invite Teams");
      expect(html).toContain("3. Hunt & Scan");
      expect(html).toContain("4. Live Leaderboard");
    });

    it("should contain Perfect For section with all use cases", async () => {
      const Index = (await import("../app/routes/_index")).default;
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
      const Index = (await import("../app/routes/_index")).default;
      const result = Index();
      const html = JSON.stringify(result);
      
      expect(html).toContain("Everything You Need");
      expect(html).toContain("Real-time leaderboards");
      expect(html).toContain("Built-in chat");
      expect(html).toContain("QR code generator");
      expect(html).toContain("no app needed");
    });

    it("should contain phone mockup with demo content", async () => {
      const Index = (await import("../app/routes/_index")).default;
      const result = Index();
      const html = JSON.stringify(result);
      
      expect(html).toContain("Team Alpha");
      expect(html).toContain("245 pts");
      expect(html).toContain("The Hidden Garden");
    });

    it("should contain final CTA section", async () => {
      const Index = (await import("../app/routes/_index")).default;
      const result = Index();
      const html = JSON.stringify(result);
      
      expect(html).toContain("Ready to Start Your Hunt?");
    });

    it("should contain footer with key values", async () => {
      const Index = (await import("../app/routes/_index")).default;
      const result = Index();
      const html = JSON.stringify(result);
      
      expect(html).toContain("Self-hostable");
      expect(html).toContain("Open source");
      expect(html).toContain("Privacy-focused");
    });

    it("should use amber colors for gradient text (not invisible warning colors)", async () => {
      const Index = (await import("../app/routes/_index")).default;
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

