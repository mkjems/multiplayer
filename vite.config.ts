import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "npm:vite";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const clientRoot = resolve(projectRoot, "src/client");

export default defineConfig({
  root: clientRoot,
  publicDir: "static",
  build: {
    outDir: resolve(projectRoot, "public"),
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
    rolldownOptions: {
      input: {
        index: resolve(clientRoot, "index.html"),
        lobby: resolve(clientRoot, "lobby.html"),
        game: resolve(clientRoot, "game.html"),
        diagnostics: resolve(clientRoot, "diagnostics.html"),
      },
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
