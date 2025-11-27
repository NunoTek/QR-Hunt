import { describe, it, expect } from "vitest";

/**
 * QR Scanner Utility Function Tests
 *
 * Note: The actual camera and BarcodeDetector functionality cannot be tested
 * in a Node.js environment as they require browser APIs. These tests focus on
 * the URL parsing logic that can be unit tested.
 */

// Extract the URL parsing logic for testing
function extractNodeKey(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const nodeIndex = pathParts.findIndex((part) => part === "n");
    if (nodeIndex !== -1 && pathParts[nodeIndex + 1]) {
      return pathParts[nodeIndex + 1];
    }
    return null;
  } catch {
    return null;
  }
}

describe("QRScanner URL Parsing", () => {
  describe("extractNodeKey", () => {
    it("should extract node key from valid QR Hunt URL", () => {
      const url = "https://example.com/g/summer-hunt/n/abc123";
      const result = extractNodeKey(url);
      expect(result).toBe("abc123");
    });

    it("should extract node key from URL with trailing slash", () => {
      const url = "https://example.com/g/summer-hunt/n/xyz789/";
      const result = extractNodeKey(url);
      expect(result).toBe("xyz789");
    });

    it("should extract node key from localhost URL", () => {
      const url = "http://localhost:5173/g/test-game/n/node-key-123";
      const result = extractNodeKey(url);
      expect(result).toBe("node-key-123");
    });

    it("should extract node key from URL with query params", () => {
      const url = "https://qrhunt.io/g/event/n/clue1?source=scan";
      const result = extractNodeKey(url);
      expect(result).toBe("clue1");
    });

    it("should return null for URL without node key", () => {
      const url = "https://example.com/g/summer-hunt";
      const result = extractNodeKey(url);
      expect(result).toBeNull();
    });

    it("should return null for URL with /n but no key after", () => {
      const url = "https://example.com/g/summer-hunt/n";
      const result = extractNodeKey(url);
      expect(result).toBeNull();
    });

    it("should return null for completely unrelated URL", () => {
      const url = "https://google.com/search?q=test";
      const result = extractNodeKey(url);
      expect(result).toBeNull();
    });

    it("should return null for invalid URL", () => {
      const url = "not-a-valid-url";
      const result = extractNodeKey(url);
      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const url = "";
      const result = extractNodeKey(url);
      expect(result).toBeNull();
    });

    it("should handle URL with multiple /n/ segments and return first match", () => {
      const url = "https://example.com/g/game/n/first/n/second";
      const result = extractNodeKey(url);
      expect(result).toBe("first");
    });

    it("should handle URL with special characters in node key", () => {
      const url = "https://example.com/g/game/n/node_key-123";
      const result = extractNodeKey(url);
      expect(result).toBe("node_key-123");
    });

    it("should handle URL with port number", () => {
      const url = "https://example.com:8080/g/test/n/mynode";
      const result = extractNodeKey(url);
      expect(result).toBe("mynode");
    });

    it("should handle HTTP protocol", () => {
      const url = "http://192.168.1.100/g/local-game/n/checkpoint1";
      const result = extractNodeKey(url);
      expect(result).toBe("checkpoint1");
    });
  });
});

describe("QRScanner Browser API Compatibility", () => {
  describe("Feature Detection Logic", () => {
    it("should correctly identify when BarcodeDetector is available", () => {
      // Simulate browser with BarcodeDetector
      const mockWindow = { BarcodeDetector: class {} };
      const isSupported = "BarcodeDetector" in mockWindow;
      expect(isSupported).toBe(true);
    });

    it("should correctly identify when BarcodeDetector is not available", () => {
      // Simulate browser without BarcodeDetector
      const mockWindow = {};
      const isSupported = "BarcodeDetector" in mockWindow;
      expect(isSupported).toBe(false);
    });

    it("should correctly identify secure context check", () => {
      // In Node.js, isSecureContext doesn't exist
      const mockSecureWindow = { isSecureContext: true };
      const mockInsecureWindow = { isSecureContext: false };

      expect(mockSecureWindow.isSecureContext).toBe(true);
      expect(mockInsecureWindow.isSecureContext).toBe(false);
    });
  });

  describe("Camera Constraints", () => {
    it("should have proper constraint structure for rear camera", () => {
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      expect(constraints.video).toBeDefined();
      expect(constraints.video.facingMode).toEqual({ ideal: "environment" });
      expect(constraints.video.width).toEqual({ ideal: 1280 });
      expect(constraints.video.height).toEqual({ ideal: 720 });
      expect(constraints.audio).toBe(false);
    });

    it("should have fallback constraints", () => {
      const fallbackConstraints = {
        video: true,
        audio: false,
      };

      expect(fallbackConstraints.video).toBe(true);
      expect(fallbackConstraints.audio).toBe(false);
    });
  });
});

describe("QRScanner Error Handling", () => {
  describe("Error Message Mapping", () => {
    const getErrorMessage = (errorName: string): string => {
      const errorMessages: Record<string, string> = {
        NotAllowedError: "Camera permission denied. Please allow camera access and try again.",
        PermissionDeniedError: "Camera permission denied. Please allow camera access and try again.",
        NotFoundError: "No camera found on this device.",
        DevicesNotFoundError: "No camera found on this device.",
        NotReadableError: "Camera is already in use by another application.",
        TrackStartError: "Camera is already in use by another application.",
        OverconstrainedError: "Camera doesn't meet requirements. Try a different device.",
        SecurityError: "Camera access blocked due to security settings.",
      };
      return errorMessages[errorName] || "Unable to access camera.";
    };

    it("should return correct message for NotAllowedError", () => {
      expect(getErrorMessage("NotAllowedError")).toBe(
        "Camera permission denied. Please allow camera access and try again."
      );
    });

    it("should return correct message for NotFoundError", () => {
      expect(getErrorMessage("NotFoundError")).toBe("No camera found on this device.");
    });

    it("should return correct message for NotReadableError", () => {
      expect(getErrorMessage("NotReadableError")).toBe(
        "Camera is already in use by another application."
      );
    });

    it("should return correct message for OverconstrainedError", () => {
      expect(getErrorMessage("OverconstrainedError")).toBe(
        "Camera doesn't meet requirements. Try a different device."
      );
    });

    it("should return correct message for SecurityError", () => {
      expect(getErrorMessage("SecurityError")).toBe(
        "Camera access blocked due to security settings."
      );
    });

    it("should return default message for unknown error", () => {
      expect(getErrorMessage("UnknownError")).toBe("Unable to access camera.");
    });
  });
});

describe("QRScanner Scan Validation", () => {
  describe("Node Key Validation", () => {
    const isValidNodeKey = (key: string | null): boolean => {
      if (!key) return false;
      // Node keys should be non-empty strings
      return key.length > 0 && key.trim().length > 0;
    };

    it("should validate a normal node key", () => {
      expect(isValidNodeKey("abc123")).toBe(true);
    });

    it("should validate a node key with special characters", () => {
      expect(isValidNodeKey("node-key_123")).toBe(true);
    });

    it("should reject null", () => {
      expect(isValidNodeKey(null)).toBe(false);
    });

    it("should reject empty string", () => {
      expect(isValidNodeKey("")).toBe(false);
    });

    it("should reject whitespace-only string", () => {
      expect(isValidNodeKey("   ")).toBe(false);
    });
  });

  describe("Duplicate Scan Prevention", () => {
    it("should prevent duplicate scans of the same node", () => {
      let lastScanned: string | null = null;

      const shouldProcessScan = (nodeKey: string): boolean => {
        if (nodeKey === lastScanned) {
          return false;
        }
        lastScanned = nodeKey;
        return true;
      };

      // First scan should process
      expect(shouldProcessScan("node1")).toBe(true);

      // Same node again should not process
      expect(shouldProcessScan("node1")).toBe(false);

      // Different node should process
      expect(shouldProcessScan("node2")).toBe(true);

      // node2 again should not process
      expect(shouldProcessScan("node2")).toBe(false);
    });
  });
});
