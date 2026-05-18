import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "npm:vite";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const clientRoot = resolve(projectRoot, "src/client");
const appEntryHtml = resolve(clientRoot, "index.html");

function createSpaFallbackPlugin(): Plugin {
  const spaRoutePatterns = [
    /^\/$/,
    /^\/lobby\/?$/,
    /^\/diagnostics\/?$/,
    /^\/game\/[^/]+\/?$/,
  ];

  function isSpaRoute(pathname: string): boolean {
    return spaRoutePatterns.some((pattern) => pattern.test(pathname));
  }

  return {
    name: "multiplayer-spa-fallback",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = req.url;
        if (!requestUrl) {
          next();
          return;
        }

        const url = new URL(requestUrl, "http://localhost");
        if (!isSpaRoute(url.pathname)) {
          next();
          return;
        }

        const html = await Deno.readTextFile(appEntryHtml);
        const transformedHtml = await server.transformIndexHtml(
          url.pathname,
          html,
        );

        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html");
        res.end(transformedHtml);
      });
    },
  };
}

export default defineConfig({
  root: clientRoot,
  publicDir: "static",
  plugins: [createSpaFallbackPlugin(), react()],
  build: {
    outDir: resolve(projectRoot, "public"),
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
    rolldownOptions: {
      input: resolve(clientRoot, "index.html"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
      },
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
      },
    },
  },
});
