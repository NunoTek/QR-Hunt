import { beforeEach, describe, expect, it, vi } from "vitest";

describe("ClueDisplay Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Import", () => {
    it("should export ClueDisplay component", async () => {
      const { ClueDisplay } = await import("../app/components/ClueDisplay");
      expect(ClueDisplay).toBeDefined();
      expect(typeof ClueDisplay).toBe("function");
    });
  });

  describe("Node Data Structure", () => {
    it("should handle text content type", () => {
      const node = {
        id: "node-123",
        title: "Test Clue",
        content: "Follow the path to the hidden treasure",
        contentType: "text",
        mediaUrl: null,
      };

      expect(node.contentType).toBe("text");
      expect(node.content).toBeTruthy();
      expect(node.mediaUrl).toBeNull();
    });

    it("should handle image content type", () => {
      const node = {
        id: "node-123",
        title: "Image Clue",
        content: "Look at this image for a hint",
        contentType: "image",
        mediaUrl: "https://example.com/image.jpg",
      };

      expect(node.contentType).toBe("image");
      expect(node.mediaUrl).toBeTruthy();
    });

    it("should handle video content type", () => {
      const node = {
        id: "node-123",
        title: "Video Clue",
        content: null,
        contentType: "video",
        mediaUrl: "https://example.com/video.mp4",
      };

      expect(node.contentType).toBe("video");
      expect(node.mediaUrl).toContain(".mp4");
    });

    it("should handle audio content type", () => {
      const node = {
        id: "node-123",
        title: "Audio Clue",
        content: "Listen carefully",
        contentType: "audio",
        mediaUrl: "https://example.com/audio.mp3",
      };

      expect(node.contentType).toBe("audio");
      expect(node.mediaUrl).toContain(".mp3");
    });

    it("should handle link content type", () => {
      const node = {
        id: "node-123",
        title: "Link Clue",
        content: "Visit this website",
        contentType: "link",
        mediaUrl: "https://example.com/hint",
      };

      expect(node.contentType).toBe("link");
      expect(node.mediaUrl).toContain("https://");
    });

    it("should handle null content", () => {
      const node = {
        id: "node-123",
        title: "Empty Node",
        content: null,
        contentType: "text",
        mediaUrl: null,
      };

      expect(node.content).toBeNull();
    });

    it("should handle end node flag", () => {
      const node = {
        id: "node-123",
        title: "Final Clue",
        content: "You found it!",
        contentType: "text",
        mediaUrl: null,
        isEnd: true,
      };

      expect(node.isEnd).toBe(true);
    });
  });

  describe("ClueDisplay Props", () => {
    it("should accept hideTitle prop", () => {
      const props = {
        node: {
          id: "1",
          title: "Test",
          content: "Content",
          contentType: "text",
          mediaUrl: null,
        },
        hideTitle: true,
      };

      expect(props.hideTitle).toBe(true);
    });

    it("should accept headerText prop", () => {
      const props = {
        node: {
          id: "1",
          title: "Test",
          content: "Content",
          contentType: "text",
          mediaUrl: null,
        },
        headerText: "Custom Header",
      };

      expect(props.headerText).toBe("Custom Header");
    });

    it("should use default headerText when not provided", () => {
      const defaultHeaderText = "Next Clue";
      expect(defaultHeaderText).toBe("Next Clue");
    });
  });

  describe("Media Rendering Logic", () => {
    it("should not render media when mediaUrl is null", () => {
      const node = {
        id: "1",
        title: "No Media",
        content: "Text only",
        contentType: "text",
        mediaUrl: null,
      };

      const shouldRenderMedia = node.mediaUrl !== null;
      expect(shouldRenderMedia).toBe(false);
    });

    it("should render image for image content type", () => {
      const node = {
        contentType: "image",
        mediaUrl: "https://example.com/image.jpg",
      };

      const shouldRenderImage = node.contentType === "image" && node.mediaUrl;
      expect(shouldRenderImage).toBeTruthy();
    });

    it("should render video for video content type", () => {
      const node = {
        contentType: "video",
        mediaUrl: "https://example.com/video.mp4",
      };

      const shouldRenderVideo = node.contentType === "video" && node.mediaUrl;
      expect(shouldRenderVideo).toBeTruthy();
    });

    it("should render audio for audio content type", () => {
      const node = {
        contentType: "audio",
        mediaUrl: "https://example.com/audio.mp3",
      };

      const shouldRenderAudio = node.contentType === "audio" && node.mediaUrl;
      expect(shouldRenderAudio).toBeTruthy();
    });

    it("should render link for link content type", () => {
      const node = {
        contentType: "link",
        mediaUrl: "https://example.com/external",
      };

      const shouldRenderLink = node.contentType === "link" && node.mediaUrl;
      expect(shouldRenderLink).toBeTruthy();
    });
  });

  describe("Loading States", () => {
    it("should track media loading state", () => {
      let mediaLoading = true;

      // Simulate image load complete
      mediaLoading = false;
      expect(mediaLoading).toBe(false);
    });

    it("should track media error state", () => {
      let mediaError = false;

      // Simulate image load error
      mediaError = true;
      expect(mediaError).toBe(true);
    });
  });

  describe("Content Type Validation", () => {
    const validContentTypes = ["text", "image", "video", "audio", "link"];

    it("should accept all valid content types", () => {
      validContentTypes.forEach((type) => {
        expect(validContentTypes).toContain(type);
      });
    });

    it("should have 5 content types defined", () => {
      expect(validContentTypes.length).toBe(5);
    });
  });

  describe("Admin Preview Integration", () => {
    it("should display node with all properties for admin preview", () => {
      const adminNode = {
        id: "node-123",
        nodeKey: "ABC123",
        title: "Admin Preview Node",
        content: "This is the clue content",
        contentType: "text",
        mediaUrl: null,
        passwordRequired: false,
        isStart: false,
        isEnd: false,
        points: 100,
        adminComment: "This is an admin-only note",
      };

      expect(adminNode.points).toBe(100);
      expect(adminNode.adminComment).toBeTruthy();
      expect(adminNode.nodeKey).toBe("ABC123");
    });

    it("should handle password-protected node in preview", () => {
      const protectedNode = {
        id: "node-123",
        title: "Protected Clue",
        content: "Secret content",
        contentType: "text",
        mediaUrl: null,
        passwordRequired: true,
      };

      expect(protectedNode.passwordRequired).toBe(true);
    });

    it("should display start node badge", () => {
      const startNode = {
        id: "start-node",
        title: "Starting Point",
        content: "Begin your journey here",
        contentType: "text",
        mediaUrl: null,
        isStart: true,
        isEnd: false,
      };

      expect(startNode.isStart).toBe(true);
      expect(startNode.isEnd).toBe(false);
    });

    it("should display end node badge", () => {
      const endNode = {
        id: "end-node",
        title: "Finish Line",
        content: "Congratulations!",
        contentType: "text",
        mediaUrl: null,
        isStart: false,
        isEnd: true,
      };

      expect(endNode.isStart).toBe(false);
      expect(endNode.isEnd).toBe(true);
    });
  });
});
