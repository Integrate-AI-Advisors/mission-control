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
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%231a1a19'/><circle cx='8' cy='11' r='3' fill='%23d97757'/><circle cx='18' cy='11' r='3' fill='%23d97757' opacity='.4'/><circle cx='8' cy='21' r='3' fill='%23d97757' opacity='.2'/><circle cx='18' cy='21' r='3' fill='%23d97757'/></svg>"
          type="image/svg+xml"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
