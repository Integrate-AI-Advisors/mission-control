import type { Metadata } from "next";
import { DM_Serif_Display, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mission Control — IntegrateAI",
  description: "Client Intelligence Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${dmSerif.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%231a1a19'/><circle cx='4' cy='10' r='2.5' fill='%23d97757'/><circle cx='12' cy='10' r='2.5' fill='%234A2E24'/><circle cx='20' cy='10' r='2.5' fill='%23d97757'/><circle cx='28' cy='10' r='2.5' fill='%236B3D2E'/><circle cx='4' cy='20' r='2.5' fill='%236B3D2E'/><circle cx='12' cy='20' r='2.5' fill='%23d97757'/><circle cx='20' cy='20' r='2.5' fill='%234A2E24'/><circle cx='28' cy='20' r='2.5' fill='%23d97757'/></svg>"
          type="image/svg+xml"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
