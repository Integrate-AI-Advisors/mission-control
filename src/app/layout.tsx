import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mission Control — IntegrateAI",
  description: "AI Agent Squad Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%231a1a19'/><circle cx='8' cy='11' r='3' fill='%23d97757'/><circle cx='18' cy='11' r='3' fill='%23d97757' opacity='.4'/><circle cx='8' cy='21' r='3' fill='%23d97757' opacity='.2'/><circle cx='18' cy='21' r='3' fill='%23d97757'/></svg>"
          type="image/svg+xml"
        />
      </head>
      <body className="bg-dark-bg text-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
