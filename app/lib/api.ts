// API base URL for server-side requests
// In development, the API runs on port 3002
// In production, it runs on the same server
export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    // Client-side: use relative URLs (Vite proxy handles it)
    return "";
  }
  // Server-side: connect directly to API server
  // Use API_URL env var, or fall back to localhost with the current PORT
  const port = process.env.PORT || "3002";
  return process.env.API_URL || `http://localhost:${port}`;
}
