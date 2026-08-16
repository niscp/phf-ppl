import type { Metadata } from "next";
import { Bebas_Neue, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Bebas_Neue({ variable: "--font-display", weight: "400", subsets: ["latin"] });
const body = Manrope({ variable: "--font-body", subsets: ["latin"] });
const mono = IBM_Plex_Mono({ variable: "--font-mono", weight: ["400", "600"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PHF Premier League | Cricket Season 5",
  description: "PHF Premier League returns for Cricket Season 5. Register your team and get ready for the next innings.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "PHF Premier League | Cricket Season 5",
    description: "Play bold. Make history. PHF Premier League returns for Season 5.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "PHF Premier League Cricket Season 5" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${display.variable} ${body.variable} ${mono.variable}`}>{children}</body></html>;
}
