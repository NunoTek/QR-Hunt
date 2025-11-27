import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

// This route handles direct QR code scans
// It redirects to the play page where the scan will be processed
export async function loader({ request, params }: LoaderFunctionArgs) {
  const { gameSlug, nodeKey } = params;

  const cookieHeader = request.headers.get("Cookie") || "";
  const tokenMatch = cookieHeader.match(/team_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;

  // If not logged in, redirect to join page with game context
  if (!token) {
    return redirect(`/join?game=${gameSlug}&scan=${nodeKey}`);
  }

  // Redirect to play page with scan parameter
  // The play page will handle the actual scan
  return redirect(`/play/${gameSlug}?scan=${nodeKey}`);
}
