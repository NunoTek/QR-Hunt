import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import basicSsl from "@vitejs/plugin-basic-ssl";
import packageJson from "./package.json";

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
    basicSsl(),
  ],
  server: {
    port: 3000,
    host: "0.0.0.0",
    https: {},
    proxy: {
      "/api": {
        target: "http://localhost:3002",
        changeOrigin: true,
        secure: false,
        // Required for SSE (Server-Sent Events)
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            // Remove the accept-encoding header to prevent compression issues with SSE
            proxyReq.removeHeader("accept-encoding");
          });
        },
      },
    },
  },
  build: {
    target: "ES2022",
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
});
