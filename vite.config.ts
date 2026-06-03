import { defineConfig, Plugin } from "vite";
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
