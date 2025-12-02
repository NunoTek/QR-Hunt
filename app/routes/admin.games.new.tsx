import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { Button } from "~/components/Button";
import { getApiUrl } from "~/lib/api";
import { useTranslation } from "~/i18n/I18nContext";

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
  const { t } = useTranslation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/admin/games" className="text-muted hover:text-[var(--color-primary)] text-sm transition-colors">
          {t("pages.admin.newGame.backToGames")}
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mt-2">{t("pages.admin.newGame.title")}</h1>
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
              {t("pages.admin.newGame.form.gameName")}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="w-full px-4 py-3 bg-secondary border rounded-xl text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              placeholder={t("pages.admin.newGame.form.gameNamePlaceholder")}
              required
            />
            {actionData?.fieldErrors?.name?.[0] && (
              <p className="mt-2 text-sm text-[var(--color-error)]">{actionData.fieldErrors.name[0]}</p>
            )}
          </div>

          {/* URL Slug */}
          <div>
            <label htmlFor="publicSlug" className="block text-sm font-medium text-secondary mb-2">
              {t("pages.admin.newGame.form.urlSlug")}
            </label>
            <input
              type="text"
              id="publicSlug"
              name="publicSlug"
              className="w-full px-4 py-3 bg-secondary border rounded-xl text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              placeholder={t("pages.admin.newGame.form.urlSlugPlaceholder")}
              pattern="[a-z0-9\-]+"
              required
            />
            <p className="mt-2 text-xs text-muted">
              {t("pages.admin.newGame.form.urlSlugHelp")}
            </p>
            {actionData?.fieldErrors?.publicSlug?.[0] && (
              <p className="mt-2 text-sm text-[var(--color-error)]">{actionData.fieldErrors.publicSlug[0]}</p>
            )}
          </div>

          {/* Ranking Mode */}
          <div>
            <label htmlFor="rankingMode" className="block text-sm font-medium text-secondary mb-2">
              {t("pages.admin.newGame.form.rankingMode")}
            </label>
            <select
              id="rankingMode"
              name="rankingMode"
              className="w-full px-4 py-3 bg-secondary border rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
            >
              <option value="points">{t("pages.admin.newGame.form.rankingModes.points")}</option>
              <option value="nodes">{t("pages.admin.newGame.form.rankingModes.nodes")}</option>
              <option value="time">{t("pages.admin.newGame.form.rankingModes.time")}</option>
            </select>
          </div>

          {/* Logo URL */}
          <div>
            <label htmlFor="logoUrl" className="block text-sm font-medium text-secondary mb-2">
              {t("pages.admin.newGame.form.logoUrl")} <span className="text-muted">{t("pages.admin.newGame.form.logoUrlOptional")}</span>
            </label>
            <input
              type="url"
              id="logoUrl"
              name="logoUrl"
              className="w-full px-4 py-3 bg-secondary border rounded-xl text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              placeholder={t("pages.admin.newGame.form.logoUrlPlaceholder")}
            />
            <p className="mt-2 text-xs text-muted">
              {t("pages.admin.newGame.form.logoUrlHelp")}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? t("pages.admin.newGame.buttons.creating") : t("pages.admin.newGame.buttons.createGame")}
            </Button>
            <Button
              as="link"
              to="/admin/games"
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              {t("pages.admin.newGame.buttons.cancel")}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
