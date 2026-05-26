import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "R.H.T.I.H — AI-Powered Indian Equity Intelligence",
  description:
    "Institutional-grade AI equity research terminal for NSE and BSE. Multi-agent technical analysis, fundamental research, macro intelligence, and decisive AI verdicts.",
  keywords: "NSE, BSE, Indian stocks, equity research, technical analysis, AI trading, stock market, institutional research",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#050505" />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} min-h-full antialiased`}
        style={{ background: "#050505", color: "#F5F5F5" }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
