import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  // GitHub Pages serves from /phf-ppl/, while the EC2 custom domain serves
  // from /. Allow deployments to select the correct public asset prefix.
  base: process.env.VITE_PUBLIC_BASE || "/phf-ppl/",
  publicDir: "public",
  plugins: [react()],
  build: {
    outDir: "gh-pages",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        players: fileURLToPath(new URL("./players.html", import.meta.url)),
        auction: fileURLToPath(new URL("./auction.html", import.meta.url)),
        auctionAdmin: fileURLToPath(new URL("./auction-admin.html", import.meta.url)),
        teams: fileURLToPath(new URL("./teams.html", import.meta.url)),
      },
    },
  },
});
