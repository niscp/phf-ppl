import type { Metadata } from "next";
import { Teko, Hind, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Teko({ variable: "--font-display", weight: ["500", "600"], subsets: ["latin"] });
const body = Hind({ variable: "--font-body", weight: ["400", "500", "600", "700"], subsets: ["latin", "devanagari"] });
const mono = IBM_Plex_Mono({ variable: "--font-mono", weight: ["400", "600"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PHF Premier League | Cricket Season 5",
  description: "PHF Premier League returns for Cricket Season 5 on 21, 22, 28 and 29 November 2026. Register for the auction-based league.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "PHF Premier League | Cricket Season 5",
    description: "Play bold. Make history. PHF Premier League returns in November 2026 for Season 5.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "PHF Premier League Cricket Season 5" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${display.variable} ${body.variable} ${mono.variable}`}>{children}</body></html>;
}
