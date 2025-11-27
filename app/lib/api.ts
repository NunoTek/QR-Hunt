// API base URL for server-side requests
// In development, the API runs on port 3002
// In production, it runs on the same server
export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    // Client-side: use relative URLs (Vite proxy handles it)
    return "";
  }
  // Server-side: connect directly to API server
  return process.env.API_URL || "http://localhost:3002";
}
