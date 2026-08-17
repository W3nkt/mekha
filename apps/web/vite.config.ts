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
            urlPattern: /^https:\/\/mekha-api\.wen-kt2020\.workers\.dev\//,
            handler: "NetworkFirst",
            options: { cacheName: "mekha-api-cache", networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
  preview: { port: 4173 },
});
