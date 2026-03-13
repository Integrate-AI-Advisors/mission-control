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
          href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500&display=swap"
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
