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
        highlights: fileURLToPath(new URL("./highlights.html", import.meta.url)),
        bidHistory: fileURLToPath(new URL("./bid-history.html", import.meta.url)),
        match: fileURLToPath(new URL("./match.html", import.meta.url)),
        fixtures: fileURLToPath(new URL("./fixtures.html", import.meta.url)),
        matchCentre: fileURLToPath(new URL("./match-centre.html", import.meta.url)),
        stats: fileURLToPath(new URL("./stats.html", import.meta.url)),
        fan: fileURLToPath(new URL("./fan.html", import.meta.url)),
        fanGuide: fileURLToPath(new URL("./fan-guide.html", import.meta.url)),
        fanLeaderboard: fileURLToPath(new URL("./fan-leaderboard.html", import.meta.url)),
        fanAccount: fileURLToPath(new URL("./fan-account.html", import.meta.url)),
      },
    },
  },
});
