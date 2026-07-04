import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolve git SHA at build time. Falls back gracefully if not in a git repo.
 */
function getGitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

/**
 * Vite plugin: writes /version.json into the output directory after build.
 * Served by nginx at /version.json — no auth, no secrets, just commit + time.
 */
function versionJsonPlugin(): Plugin {
  return {
    name: "version-json",
    apply: "build",
    closeBundle() {
      const outDir = path.resolve(__dirname, "dist/spa");
      const info = {
        version: process.env.VITE_APP_VERSION || "0.0.0",
        gitSha: process.env.VITE_GIT_SHA || getGitSha(),
        buildTime: process.env.VITE_BUILD_TIME || new Date().toISOString(),
      };
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(
        path.join(outDir, "version.json"),
        JSON.stringify(info, null, 2) + "\n",
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Auto-populate version env vars so they are always available to the app
  // even when CI doesn't set them explicitly.
  if (!process.env.VITE_GIT_SHA) {
    process.env.VITE_GIT_SHA = getGitSha();
  }
  if (!process.env.VITE_BUILD_TIME) {
    process.env.VITE_BUILD_TIME = new Date().toISOString();
  }

  return ({
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
          env.VITE_DEV_API_PROXY ||
          "https://skillbridge-be-973344038436.asia-southeast1.run.app",
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/") || id.includes("node_modules/react-router")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/framer-motion") || id.includes("node_modules/gsap")) {
            return "vendor-animation";
          }
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "vendor-charts";
          }
          if (id.includes("node_modules/@radix-ui")) {
            return "vendor-ui";
          }
          if (id.includes("node_modules/@tanstack")) {
            return "vendor-query";
          }
          if (id.includes("node_modules/i18next") || id.includes("node_modules/react-i18next")) {
            return "vendor-i18n";
          }
          if (id.includes("node_modules/axios") || id.includes("node_modules/zustand")) {
            return "vendor-utils";
          }
        },
      },
    },
  },
  plugins: [react(), versionJsonPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@resume-engine": path.resolve(__dirname, "./src/lib/resume-engine"),
    },
  },
  });
});
