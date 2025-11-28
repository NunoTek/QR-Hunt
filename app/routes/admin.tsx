import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, Outlet, useActionData, useLoaderData, useLocation, useNavigation } from "@remix-run/react";
import { useEffect } from "react";
import { useToast } from "~/components/Toast";

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
      const isProduction = process.env.NODE_ENV === "production";
      const secureFlag = isProduction ? "; Secure" : "";
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
  const navigation = useNavigation();
  const actionData = useActionData<{ error?: string }>();
  const isSubmitting = navigation.state === "submitting";
  const toast = useToast();

  useEffect(() => {
    if (actionData?.error) {
      toast.error(actionData.error);
    }
  }, [actionData?.error, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary">
      <div className="w-full max-w-md bg-elevated rounded-2xl shadow-2xl p-6 sm:p-8 border animate-fade-in">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <span className="text-4xl" aria-label="Target">🎯</span>
            <span className="text-2xl font-bold text-primary">QR Hunt</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary mb-2">Admin Login</h1>
          <p className="text-tertiary text-sm">Enter your admin code to continue</p>
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
              Admin Code
            </label>
            <input
              type="password"
              id="adminCode"
              name="adminCode"
              className={`w-full px-4 py-3 bg-secondary border rounded-xl text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all ${
                actionData?.error ? 'border-[var(--color-error)]' : 'border-border'
              }`}
              placeholder="Enter admin code"
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[3rem]"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </Form>

        <div className="mt-8 text-center mt-5 sm:mt-6">
          <Link to="/" className="text-tertiary hover:text-[var(--color-primary)] text-sm transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdminLayout() {
  const location = useLocation();

  const navItems = [
    { path: "/admin", label: "Dashboard", exact: true },
    { path: "/admin/games", label: "Games", exact: false },
  ];

  return (
    <div className="min-h-screen bg-primary">
      {/* Top Navigation */}
      <header className="bg-[var(--bg-elevated)] border-b border-[var(--border-color)] sticky top-0 z-50 shadow-sm">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 flex-wrap gap-y-2">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 text-primary font-bold text-lg hover:text-[var(--color-primary)] transition-colors">
              <span className="text-2xl" aria-label="Target">🎯</span>
              <span className="hidden sm:inline">QR Hunt</span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-1 order-3 sm:order-none w-full sm:w-auto justify-center sm:justify-start border-t sm:border-0 border-border pt-2 sm:pt-0 mt-2 sm:mt-0">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 sm:px-4 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                        : 'text-tertiary hover:text-primary hover:bg-secondary'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <Form method="post">
              <input type="hidden" name="_action" value="logout" />
              <button
                type="submit"
                className="px-3 py-2 sm:px-4 text-sm text-tertiary hover:text-primary border hover:border-strong rounded-lg transition-all"
              >
                Sign Out
              </button>
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

  if (!data.isAuthenticated) {
    return <AdminLogin />;
  }

  return <AdminLayout />;
}
