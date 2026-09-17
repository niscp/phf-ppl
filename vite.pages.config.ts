import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: "/phf-ppl/",
  publicDir: "public",
  plugins: [react()],
  build: {
    outDir: "gh-pages",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        players: fileURLToPath(new URL("./players.html", import.meta.url)),
      },
    },
  },
});
