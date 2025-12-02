import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, Outlet, useActionData, useLoaderData, useLocation, useNavigation } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { Button } from "~/components/Button";
import { LogOut } from "~/components/icons";
import { useToast } from "~/components/Toast";
import { Version } from "~/components/Version";
import { useTranslation } from "~/i18n/I18nContext";

export const meta: MetaFunction = () => {
  return [{ title: "Admin Dashboard - QR Hunt" }];
};

interface LoaderData {
  isAuthenticated: boolean;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const adminCodeMatch = cookieHeader.match(/admin_code=([^;]+)/);
  const adminCode = adminCodeMatch ? adminCodeMatch[1] : null;

  const expectedCode = process.env.ADMIN_CODE || "admin123";
  const isAuthenticated = adminCode === expectedCode;

  return json<LoaderData>({ isAuthenticated });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "login") {
    const adminCode = formData.get("adminCode")?.toString();
    const expectedCode = process.env.ADMIN_CODE || "admin123";

    if (adminCode === expectedCode) {
      const headers = new Headers();
      const isSecure = new URL(request.url).protocol === "https:";
      const secureFlag = isSecure ? "; Secure" : "";
      headers.append(
        "Set-Cookie",
        `admin_code=${adminCode}; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=${7 * 24 * 60 * 60}`
      );
      return redirect("/admin", { headers });
    }

    return json({ error: "Invalid admin code" }, { status: 401 });
  }

  if (action === "logout") {
    const headers = new Headers();
    headers.append("Set-Cookie", "admin_code=; Path=/; Max-Age=0");
    return redirect("/admin", { headers });
  }

  return null;
}

function AdminLogin() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const actionData = useActionData<{ error?: string }>();
  const isSubmitting = navigation.state === "submitting";
  const toast = useToast();
  const lastActionDataRef = useRef<typeof actionData | null>(null);

  useEffect(() => {
    if (!actionData || actionData === lastActionDataRef.current) return;
    lastActionDataRef.current = actionData;

    if (actionData?.error) {
      toast.error(actionData.error);
    }
  }, [actionData, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary">
      <div className="w-full max-w-md bg-elevated rounded-2xl shadow-2xl p-6 sm:p-8 border animate-fade-in">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <span className="text-4xl" aria-label="Target">🎯</span>
            <span className="text-2xl font-bold text-primary">{t("common.appName")}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary mb-2">{t("pages.admin.login.title")}</h1>
          <p className="text-tertiary text-sm">{t("pages.admin.login.subtitle")}</p>
        </div>

        {actionData?.error && (
          <div className="flex items-center gap-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 text-[var(--color-error)] px-4 py-3 rounded-xl mb-4 sm:mb-6 animate-slide-in-down">
            <span className="text-lg" aria-label="Warning">⚠</span>
            <span className="text-sm">{actionData.error}</span>
          </div>
        )}

        <Form method="post">
          <input type="hidden" name="_action" value="login" />
          <div className="mb-5 sm:mb-6">
            <label htmlFor="adminCode" className="block text-sm font-medium text-secondary mb-2">
              {t("pages.admin.login.label")}
            </label>
            <input
              type="password"
              id="adminCode"
              name="adminCode"
              className={`w-full px-4 py-3 bg-secondary border rounded-xl text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all ${
                actionData?.error ? 'border-[var(--color-error)]' : 'border-border'
              }`}
              placeholder={t("pages.admin.login.placeholder")}
              autoFocus
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            className="mt-4 w-full"
          >
            {isSubmitting ? t("pages.admin.login.signingIn") : t("pages.admin.login.signIn")}
          </Button>
        </Form>

        <div className="mt-8 text-center mt-5 sm:mt-6">
          <Link to="/" className="text-tertiary hover:text-[var(--color-primary)] text-sm transition-colors">
            {t("pages.admin.login.backToHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdminLayout() {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { path: "/admin", labelKey: "pages.admin.nav.dashboard", exact: true },
    { path: "/admin/games", labelKey: "pages.admin.nav.games", exact: false },
  ];

  return (
    <div className="min-h-screen bg-primary">
      {/* Top Navigation */}
      <header className="bg-[var(--bg-elevated)] border-b border-[var(--border-color)] sticky top-0 z-50 shadow-sm">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top row: Logo and Logout */}
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 text-primary font-bold text-lg hover:text-[var(--color-primary)] transition-colors">
              <span className="text-2xl" aria-label="Target">🎯</span>
              <span className="hidden sm:flex">{t("common.appName")}</span>
            </Link>

            {/* Navigation */}
            <nav className="items-center gap-1">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                        : 'text-tertiary hover:text-primary hover:bg-secondary'
                    }`}
                  >
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <Form method="post">
              <input type="hidden" name="_action" value="logout" />
              <Button
                type="submit"
                variant="outline"
                size="small"
                leftIcon={<LogOut size={16} />}
                title={t("pages.admin.nav.signOut")}
              >
                <span className="hidden sm:inline-flex">{t("pages.admin.nav.signOut")}</span>
              </Button>
            </Form>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default function Admin() {
  const data = useLoaderData<typeof loader>();

  return (
    <>
      {data.isAuthenticated ? <AdminLayout /> : <AdminLogin />}
      <Version />
    </>
  );
}
