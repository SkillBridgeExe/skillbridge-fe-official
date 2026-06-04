import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Allow Google Cloud Run (and any *.run.app) hosts to reach the server.
    // Vite blocks unknown Host headers by default (DNS-rebinding protection).
    // Add custom domains here too if you map one later.
    allowedHosts: true, // allow any host — Cloud Run URL đổi theo region; server nằm sau proxy Cloud Run
    // Same-origin /api in dev — mirrors the nginx proxy used in production
    // (nginx/default.conf.template), so FE code never deals with CORS.
    // Point VITE_DEV_API_PROXY at a local NestJS to develop against it.
    proxy: {
      "/api": {
        target:
          loadEnv(mode, process.cwd(), "").VITE_DEV_API_PROXY ||
          "https://skillbridge-ai-2rrb.onrender.com",
        changeOrigin: true,
      },
    },
    fs: {
      allow: [".", "./src", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**"],
    },
  },
  // Same allowance for `vite preview` (used if you switch to serving the build).
  preview: {
    host: "::",
    port: 8080,
    allowedHosts: true, // allow any host — Cloud Run URL đổi theo region; server nằm sau proxy Cloud Run
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));
