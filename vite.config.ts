import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "icon.svg"],
      manifest: {
        name: "DiagMed Call — Chamados Técnicos",
        short_name: "DiagMed Call",
        description: "Gestão de chamados técnicos e relatórios",
        theme_color: "#6366f1",
        background_color: "#0c0a09",
        display: "standalone",
        icons: [
          {
            src: "icon.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
