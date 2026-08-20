import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      includeAssets: ["fonts/**", "icons/**"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) => request.method === "GET" && url.pathname.startsWith("/v1/sellers/search"),
            handler: "NetworkFirst",
            options: { cacheName: "mekha-seller-search", networkTimeoutSeconds: 3, expiration: { maxAgeSeconds: 86400, maxEntries: 50 } },
          },
          {
            urlPattern: ({ url, request }) => request.method === "GET" && /^\/v1\/sellers\/[0-9a-f-]+$/.test(url.pathname),
            handler: "NetworkFirst",
            options: { cacheName: "mekha-seller-profiles", networkTimeoutSeconds: 3, expiration: { maxAgeSeconds: 3600, maxEntries: 100 } },
          },
          {
            urlPattern: ({ url, request }) => request.method === "GET" && url.pathname.startsWith("/v1/orders"),
            handler: "NetworkFirst",
            options: { cacheName: "mekha-orders", networkTimeoutSeconds: 3, expiration: { maxAgeSeconds: 300, maxEntries: 50 } },
          },
          {
            urlPattern: ({ url }) => /supabase\.co\/storage/.test(url.href),
            handler: "CacheFirst",
            options: { cacheName: "mekha-product-photos", expiration: { maxAgeSeconds: 604800, maxEntries: 200 } },
          },
          {
            urlPattern: ({ request }) => request.method === "POST",
            handler: "NetworkOnly",
            options: { backgroundSync: { name: "mekha-post-sync", options: { maxRetentionTime: 24 * 60 } } },
          },
        ],
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  // @mekha/ui ships raw TSX (no build step) and pins its own devDependency
  // react version, which pnpm's strict linking can resolve to a separate
  // physical copy from apps/web's react. Any hook called from that package
  // (e.g. Input's useId()) then runs against a dispatcher-less React
  // instance and throws "Cannot read properties of null". Force a single
  // instance rather than editing package.json, which would need a
  // pnpm-lock.yaml regeneration this environment can't produce.
  resolve: { dedupe: ["react", "react-dom"] },
  server: { port: 5173 },
  preview: { port: 4173 },
});
