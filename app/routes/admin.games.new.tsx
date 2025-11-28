import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { getApiUrl } from "~/lib/api";

export const meta: MetaFunction = () => {
  return [{ title: "Create Game - QR Hunt Admin" }];
};

interface ActionData {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function action({ request }: ActionFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const adminCodeMatch = cookieHeader.match(/admin_code=([^;]+)/);
  const adminCode = adminCodeMatch ? adminCodeMatch[1] : "";

  const formData = await request.formData();
  const name = formData.get("name")?.toString().trim();
  const publicSlug = formData.get("publicSlug")?.toString().trim().toLowerCase();
  const rankingMode = formData.get("rankingMode")?.toString() || "points";
  const logoUrl = formData.get("logoUrl")?.toString().trim() || undefined;

  if (!name || !publicSlug) {
    return json<ActionData>({
      fieldErrors: {
        name: name ? [] : ["Name is required"],
        publicSlug: publicSlug ? [] : ["Slug is required"],
      },
    });
  }

  const baseUrl = getApiUrl();

  try {
    const response = await fetch(`${baseUrl}/api/v1/admin/games`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-code": adminCode,
      },
      body: JSON.stringify({
        name,
        publicSlug,
        logoUrl,
        settings: { rankingMode },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return json<ActionData>({ error: data.error || "Failed to create game" });
    }

    return redirect(`/admin/games/${data.game.id}`);
  } catch {
    return json<ActionData>({ error: "Failed to connect to server" });
  }
}

export default function NewGame() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/admin/games" className="text-muted hover:text-[var(--color-primary)] text-sm transition-colors">
          ← Back to games
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mt-2">Create New Game</h1>
      </div>

      {/* Form Card */}
      <div className="bg-elevated rounded-xl border p-6 shadow-sm">
        {actionData?.error && (
          <div className="flex items-center gap-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 text-[var(--color-error)] px-4 py-3 rounded-xl mb-6">
            <span className="text-lg">⚠</span>
            <span className="text-sm">{actionData.error}</span>
          </div>
        )}

        <Form method="post" className="space-y-6">
          {/* Game Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-secondary mb-2">
              Game Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="w-full px-4 py-3 bg-secondary border rounded-xl text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              placeholder="e.g., Summer Festival Hunt"
              required
            />
            {actionData?.fieldErrors?.name?.[0] && (
              <p className="mt-2 text-sm text-[var(--color-error)]">{actionData.fieldErrors.name[0]}</p>
            )}
          </div>

          {/* URL Slug */}
          <div>
            <label htmlFor="publicSlug" className="block text-sm font-medium text-secondary mb-2">
              URL Slug
            </label>
            <input
              type="text"
              id="publicSlug"
              name="publicSlug"
              className="w-full px-4 py-3 bg-secondary border rounded-xl text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              placeholder="e.g., summer-2024"
              pattern="[a-z0-9\-]+"
              required
            />
            <p className="mt-2 text-xs text-muted">
              Lowercase letters, numbers, and hyphens only. Used in URLs.
            </p>
            {actionData?.fieldErrors?.publicSlug?.[0] && (
              <p className="mt-2 text-sm text-[var(--color-error)]">{actionData.fieldErrors.publicSlug[0]}</p>
            )}
          </div>

          {/* Ranking Mode */}
          <div>
            <label htmlFor="rankingMode" className="block text-sm font-medium text-secondary mb-2">
              Ranking Mode
            </label>
            <select
              id="rankingMode"
              name="rankingMode"
              className="w-full px-4 py-3 bg-secondary border rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
            >
              <option value="points">By Points (fastest teams get more points)</option>
              <option value="nodes">By Nodes Found (most clues wins)</option>
              <option value="time">By Time (fastest total time wins)</option>
            </select>
          </div>

          {/* Logo URL */}
          <div>
            <label htmlFor="logoUrl" className="block text-sm font-medium text-secondary mb-2">
              Game Logo URL <span className="text-muted">(optional)</span>
            </label>
            <input
              type="url"
              id="logoUrl"
              name="logoUrl"
              className="w-full px-4 py-3 bg-secondary border rounded-xl text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              placeholder="https://example.com/logo.png"
            />
            <p className="mt-2 text-xs text-muted">
              Logo will be used as default for QR codes. Can be changed later.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Game"}
            </button>
            <Link
              to="/admin/games"
              className="flex-1 sm:flex-none px-6 py-3 text-center text-secondary border hover:border-strong rounded-xl transition-colors"
            >
              Cancel
            </Link>
          </div>
        </Form>
      </div>
    </div>
  );
}
