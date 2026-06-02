import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/context/ThemeContext";
import { AuthSessionProvider } from "@/components/auth/SessionProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const SITE_URL = "https://market-ka-baadshah.vercel.app";
const SITE_NAME = "Market Ka Baadshah";
const SITE_TITLE = "MARKET KA BAADSHAH — AI-Powered Indian Equity Intelligence";
const SITE_DESC =
  "Institutional-grade AI equity research terminal for NSE and BSE. Multi-agent technical analysis, fundamental research, macro intelligence, and decisive AI verdicts. India ka sabse powerful stock analysis platform.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESC,
  keywords: [
    "NSE", "BSE", "Indian stocks", "equity research", "technical analysis",
    "AI trading", "stock market", "institutional research", "market ka baadshah",
    "Indian equity intelligence", "stock analysis India", "Nifty 50", "Sensex",
    "AI stock analysis", "multi-agent AI", "market intelligence",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESC,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    creator: "@marketkabaadshah",
  },
  alternates: {
    canonical: SITE_URL,
  },
};

/* No-FOUC script: reads localStorage before first paint and sets data-theme
   so the correct theme is applied before React hydrates. */
const swScript = `
(function(){
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').catch(function(){});
    });
  }
})();
`;

const noFOUCScript = `
(function(){
  try {
    var t = localStorage.getItem('mkb-theme');
    if (!t) t = localStorage.getItem('rhtih-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('mkb-theme', t);
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* No-FOUC: must run before any CSS/render */}
        <script dangerouslySetInnerHTML={{ __html: noFOUCScript }} />
        {/* Service worker registration for push notifications */}
        <script dangerouslySetInnerHTML={{ __html: swScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#050505" />
        <link rel="canonical" href={SITE_URL} />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} min-h-full antialiased`}
        suppressHydrationWarning
      >
        <AuthSessionProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
