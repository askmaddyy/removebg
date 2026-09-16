import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk, Instrument_Serif, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const grotesk = Schibsted_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://removebg.fyi"),
  title: "removebg.fyi: free background remover, runs in your browser",
  description:
    "Free background remover that runs entirely in your browser. Portraits, products, cars, pets, logos. Full resolution, no account, no watermark, nothing uploaded.",
  applicationName: "removebg.fyi",
  keywords: [
    "background remover",
    "remove background from image",
    "free background remover",
    "transparent PNG",
    "remove.bg alternative",
    "offline background removal",
    "open source background remover",
  ],
  alternates: { canonical: "/" },
  // Bing Webmaster Tools ownership. Must stay put: removing it un-verifies us.
  verification: { other: { "msvalidate.01": "746C53CE706A308280E43F6F4D86D7F4" } },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  authors: [{ name: "AskMaddyy", url: "https://askmaddyy.com" }],
  creator: "AskMaddyy",
  // Icons come from app/icon.png and app/apple-icon.png via Next's file
  // convention — no metadata entry needed, and it beats a public/ path.
  openGraph: {
    title: "removebg.fyi",
    description:
      "Remove the background from anything, on your own machine. Free at full resolution.",
    url: "https://removebg.fyi",
    siteName: "removebg.fyi",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "removebg.fyi" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "removebg.fyi",
    description:
      "Remove the background from anything, in your browser. Free, full resolution, nothing uploaded.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0f" },
  ],
};

/** Marks the site as a free web application rather than an article. */
const schema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "removebg.fyi",
  url: "https://removebg.fyi",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Any browser with WebGPU or WebAssembly",
  description:
    "Free, open-source background remover. The matting model runs in the browser, so images are never uploaded.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  isAccessibleForFree: true,
  author: { "@type": "Person", name: "AskMaddyy", url: "https://askmaddyy.com" },
  softwareHelp: "https://github.com/askmaddyy/removebg",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${grotesk.variable} ${serif.variable} ${mono.variable} h-full`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      </head>
      <body className="min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
