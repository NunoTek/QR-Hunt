import { describe, expect, it } from "vitest";

describe("YouTube URL Detection", () => {
  describe("isYouTubeUrl", () => {
    it("should detect standard youtube.com watch URLs", async () => {
      const { isYouTubeUrl } = await import("../app/components/YouTubeEmbed");
      expect(isYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
      expect(isYouTubeUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
      expect(isYouTubeUrl("http://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    });

    it("should detect youtu.be short URLs", async () => {
      const { isYouTubeUrl } = await import("../app/components/YouTubeEmbed");
      expect(isYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
      expect(isYouTubeUrl("http://youtu.be/dQw4w9WgXcQ")).toBe(true);
    });

    it("should detect youtube.com embed URLs", async () => {
      const { isYouTubeUrl } = await import("../app/components/YouTubeEmbed");
      expect(isYouTubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(true);
      expect(isYouTubeUrl("https://youtube.com/embed/dQw4w9WgXcQ")).toBe(true);
    });

    it("should detect youtube.com shorts URLs", async () => {
      const { isYouTubeUrl } = await import("../app/components/YouTubeEmbed");
      expect(isYouTubeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(true);
      expect(isYouTubeUrl("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe(true);
    });

    it("should detect music.youtube.com URLs", async () => {
      const { isYouTubeUrl } = await import("../app/components/YouTubeEmbed");
      expect(isYouTubeUrl("https://music.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    });

    it("should return false for non-YouTube URLs", async () => {
      const { isYouTubeUrl } = await import("../app/components/YouTubeEmbed");
      expect(isYouTubeUrl("https://vimeo.com/123456789")).toBe(false);
      expect(isYouTubeUrl("https://example.com/video.mp4")).toBe(false);
      expect(isYouTubeUrl("https://dailymotion.com/video/x123456")).toBe(false);
      expect(isYouTubeUrl("https://facebook.com/watch?v=123456")).toBe(false);
    });

    it("should return false for empty or invalid URLs", async () => {
      const { isYouTubeUrl } = await import("../app/components/YouTubeEmbed");
      expect(isYouTubeUrl("")).toBe(false);
      expect(isYouTubeUrl("not-a-url")).toBe(false);
      expect(isYouTubeUrl("youtube")).toBe(false);
    });

    it("should handle URLs with additional parameters", async () => {
      const { isYouTubeUrl } = await import("../app/components/YouTubeEmbed");
      expect(isYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120")).toBe(true);
      expect(isYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf")).toBe(true);
    });
  });

  describe("extractYouTubeVideoId", () => {
    it("should extract video ID from standard watch URLs", async () => {
      const { extractYouTubeVideoId } = await import("../app/components/YouTubeEmbed");
      expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
      expect(extractYouTubeVideoId("https://youtube.com/watch?v=abc123_-XYZ")).toBe("abc123_-XYZ");
    });

    it("should extract video ID from youtu.be short URLs", async () => {
      const { extractYouTubeVideoId } = await import("../app/components/YouTubeEmbed");
      expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
      expect(extractYouTubeVideoId("https://youtu.be/abc123_-XYZ")).toBe("abc123_-XYZ");
    });

    it("should extract video ID from embed URLs", async () => {
      const { extractYouTubeVideoId } = await import("../app/components/YouTubeEmbed");
      expect(extractYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
      expect(extractYouTubeVideoId("https://youtube.com/embed/abc123_-XYZ")).toBe("abc123_-XYZ");
    });

    it("should extract video ID from shorts URLs", async () => {
      const { extractYouTubeVideoId } = await import("../app/components/YouTubeEmbed");
      expect(extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
      expect(extractYouTubeVideoId("https://youtube.com/shorts/abc123_-XYZ")).toBe("abc123_-XYZ");
    });

    it("should extract video ID from v/ URLs", async () => {
      const { extractYouTubeVideoId } = await import("../app/components/YouTubeEmbed");
      expect(extractYouTubeVideoId("https://www.youtube.com/v/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("should extract video ID from music.youtube.com URLs", async () => {
      const { extractYouTubeVideoId } = await import("../app/components/YouTubeEmbed");
      expect(extractYouTubeVideoId("https://music.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("should extract video ID from URLs with additional parameters", async () => {
      const { extractYouTubeVideoId } = await import("../app/components/YouTubeEmbed");
      expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120")).toBe("dQw4w9WgXcQ");
      expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf")).toBe("dQw4w9WgXcQ");
      expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=120")).toBe("dQw4w9WgXcQ");
    });

    it("should return null for non-YouTube URLs", async () => {
      const { extractYouTubeVideoId } = await import("../app/components/YouTubeEmbed");
      expect(extractYouTubeVideoId("https://vimeo.com/123456789")).toBe(null);
      expect(extractYouTubeVideoId("https://example.com/video.mp4")).toBe(null);
    });

    it("should return null for empty or invalid URLs", async () => {
      const { extractYouTubeVideoId } = await import("../app/components/YouTubeEmbed");
      expect(extractYouTubeVideoId("")).toBe(null);
      expect(extractYouTubeVideoId("not-a-url")).toBe(null);
    });

    it("should handle YouTube URLs without video ID", async () => {
      const { extractYouTubeVideoId } = await import("../app/components/YouTubeEmbed");
      expect(extractYouTubeVideoId("https://www.youtube.com/")).toBe(null);
      expect(extractYouTubeVideoId("https://www.youtube.com/feed/subscriptions")).toBe(null);
    });
  });
});

describe("YouTubeEmbed Component", () => {
  it("should export YouTubeEmbed component", async () => {
    const { YouTubeEmbed } = await import("../app/components/YouTubeEmbed");
    expect(YouTubeEmbed).toBeDefined();
    expect(typeof YouTubeEmbed).toBe("function");
  });

  it("should export isYouTubeUrl utility", async () => {
    const { isYouTubeUrl } = await import("../app/components/YouTubeEmbed");
    expect(isYouTubeUrl).toBeDefined();
    expect(typeof isYouTubeUrl).toBe("function");
  });

  it("should export extractYouTubeVideoId utility", async () => {
    const { extractYouTubeVideoId } = await import("../app/components/YouTubeEmbed");
    expect(extractYouTubeVideoId).toBeDefined();
    expect(typeof extractYouTubeVideoId).toBe("function");
  });
});

describe("YouTube and Non-YouTube URL Differentiation", () => {
  it("should correctly differentiate YouTube video from regular video", async () => {
    const { isYouTubeUrl } = await import("../app/components/YouTubeEmbed");

    // YouTube video URLs
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);

    // Regular video URLs
    expect(isYouTubeUrl("https://example.com/video.mp4")).toBe(false);
    expect(isYouTubeUrl("https://cdn.example.com/videos/my-video.webm")).toBe(false);
    expect(isYouTubeUrl("https://storage.googleapis.com/bucket/video.mp4")).toBe(false);
  });

  it("should correctly differentiate YouTube audio from regular audio", async () => {
    const { isYouTubeUrl } = await import("../app/components/YouTubeEmbed");

    // YouTube URLs that could be used for audio
    expect(isYouTubeUrl("https://music.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=audioOnly123")).toBe(true);

    // Regular audio URLs
    expect(isYouTubeUrl("https://example.com/audio.mp3")).toBe(false);
    expect(isYouTubeUrl("https://cdn.example.com/sounds/music.ogg")).toBe(false);
    expect(isYouTubeUrl("https://storage.example.com/audio.wav")).toBe(false);
  });

  it("should correctly differentiate YouTube links from regular links", async () => {
    const { isYouTubeUrl } = await import("../app/components/YouTubeEmbed");

    // YouTube links
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(true);

    // Regular links
    expect(isYouTubeUrl("https://google.com")).toBe(false);
    expect(isYouTubeUrl("https://example.com/page")).toBe(false);
    expect(isYouTubeUrl("https://vimeo.com/123456789")).toBe(false);
  });

  it("should handle edge cases for YouTube URL detection", async () => {
    const { isYouTubeUrl, extractYouTubeVideoId } = await import("../app/components/YouTubeEmbed");

    // URLs that look like YouTube but aren't
    expect(isYouTubeUrl("https://fakeyoutube.com/watch?v=test")).toBe(false);
    expect(isYouTubeUrl("https://youtube.fake.com/watch?v=test")).toBe(false);

    // YouTube URLs with unusual formatting
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=test123&feature=share")).toBe(true);
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=test123&feature=share")).toBe("test123");
  });
});
