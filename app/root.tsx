import type { LinksFunction, MetaFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigation,
} from "@remix-run/react";
import { InstallPrompt } from "~/components/InstallPrompt";
import { ThemeToggle } from "~/components/ThemeToggle";
import { ToastProvider } from "~/components/Toast";
import "./styles/global.css";

// Spinner import removed - was unused

export const meta: MetaFunction = () => {
  return [
    { title: "QR Hunt - Scavenger Hunt Platform" },
    { name: "description", content: "Self-hostable QR code scavenger hunt platform" },
    { name: "theme-color", content: "#6366f1" },
    // PWA iOS meta tags
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    { name: "apple-mobile-web-app-title", content: "QR Hunt" },
    // PWA Android meta tags
    { name: "mobile-web-app-capable", content: "yes" },
    { name: "application-name", content: "QR Hunt" },
    // MS Tile
    { name: "msapplication-TileColor", content: "#6366f1" },
  ];
};

export const links: LinksFunction = () => {
  return [
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { rel: "manifest", href: "/manifest.json" },
    // iOS icons
    { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
    { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon.png" },
    // Splash screens for iOS (will use SVG as fallback)
    { rel: "apple-touch-startup-image", href: "/favicon.svg" },
    // Fonts
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
  ];
};

function GlobalLoadingIndicator() {
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  if (!isLoading) return null;

  return (
    <div className="global-loading">
      <div className="global-loading-bar" />
    </div>
  );
}

// Script to prevent flash of wrong theme
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme');
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch (e) {}
  })();
`;

export default function App() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <style>{`
          .global-loading {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            z-index: 10000;
            overflow: hidden;
          }
          .global-loading-bar {
            height: 100%;
            background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-light) 50%, var(--color-primary) 100%);
            animation: loading-slide 1s ease-in-out infinite;
          }
          @keyframes loading-slide {
            0% { transform: translateX(-100%); width: 30%; }
            50% { transform: translateX(100%); width: 60%; }
            100% { transform: translateX(300%); width: 30%; }
          }
        `}</style>
      </head>
      <body>
        <ToastProvider>
          <GlobalLoadingIndicator />
          <Outlet />
          <ThemeToggle />
          <InstallPrompt />
        </ToastProvider>
        <ScrollRestoration />
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('ServiceWorker registration successful');
                    })
                    .catch(function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="error-container">
          <div className="card" style={{ maxWidth: "400px", textAlign: "center" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>😕</div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Something went wrong
            </h1>
            <p className="text-muted mb-4">
              We encountered an unexpected error. Please try again.
            </p>
            <a href="/" className="btn btn-primary">
              Go Home
            </a>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
