import { describe, it, expect } from "vitest";
import { extractNodeKeyFromUrl } from "./useQRScanner";

describe("useQRScanner", () => {
  describe("extractNodeKeyFromUrl", () => {
    it("should extract node key from valid QR Hunt URL", () => {
      const url = "https://example.com/g/my-game/n/ABC123";
      const nodeKey = extractNodeKeyFromUrl(url);
      expect(nodeKey).toBe("ABC123");
    });

    it("should extract node key with complex key", () => {
      const url = "https://qrhunt.app/g/summer-hunt/n/node-key-123-xyz";
      const nodeKey = extractNodeKeyFromUrl(url);
      expect(nodeKey).toBe("node-key-123-xyz");
    });

    it("should handle URL with trailing slash", () => {
      const url = "https://example.com/g/game/n/NODEKEY/";
      const nodeKey = extractNodeKeyFromUrl(url);
      expect(nodeKey).toBe("NODEKEY");
    });

    it("should handle URL with query parameters", () => {
      const url = "https://example.com/g/game/n/KEY123?ref=qr";
      const nodeKey = extractNodeKeyFromUrl(url);
      expect(nodeKey).toBe("KEY123");
    });

    it("should handle localhost URLs", () => {
      const url = "http://localhost:3000/g/test-game/n/LOCAL123";
      const nodeKey = extractNodeKeyFromUrl(url);
      expect(nodeKey).toBe("LOCAL123");
    });

    it("should return null for URL without /n/ path", () => {
      const url = "https://example.com/g/game/other/path";
      const nodeKey = extractNodeKeyFromUrl(url);
      expect(nodeKey).toBeNull();
    });

    it("should return null for URL with /n/ but no key after it", () => {
      const url = "https://example.com/g/game/n/";
      const nodeKey = extractNodeKeyFromUrl(url);
      // Empty string is not a valid key, so returns null
      expect(nodeKey).toBeNull();
    });

    it("should return null for invalid URL", () => {
      const invalidUrl = "not-a-valid-url";
      const nodeKey = extractNodeKeyFromUrl(invalidUrl);
      expect(nodeKey).toBeNull();
    });

    it("should return null for empty string", () => {
      const nodeKey = extractNodeKeyFromUrl("");
      expect(nodeKey).toBeNull();
    });

    it("should handle URL with only /n in path", () => {
      const url = "https://example.com/n";
      const nodeKey = extractNodeKeyFromUrl(url);
      expect(nodeKey).toBeNull();
    });

    it("should handle case-sensitive node keys", () => {
      const url = "https://example.com/g/game/n/AbCdEf123";
      const nodeKey = extractNodeKeyFromUrl(url);
      expect(nodeKey).toBe("AbCdEf123");
    });

    it("should extract from URL with multiple /n/ occurrences (first match)", () => {
      const url = "https://example.com/n/first/g/game/n/second";
      const nodeKey = extractNodeKeyFromUrl(url);
      // Should find the first /n/ and return what's after it
      expect(nodeKey).toBe("first");
    });
  });
});
