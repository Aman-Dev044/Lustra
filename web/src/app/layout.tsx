import type { Metadata, Viewport } from "next";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { site } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
// Display face for headlines — the width axis gives the expanded, motorsport look.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Detailing, PPF & Tint Shop Software`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [...site.keywords],
  authors: [{ name: site.legalName, url: site.url }],
  creator: site.legalName,
  publisher: site.legalName,
  category: "Business Software",
  formatDetection: { telephone: false, email: false, address: false },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_US",
    url: site.url,
    title: `${site.name} — The operating system for auto appearance shops`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    site: "@lustraapp",
    creator: "@lustraapp",
  },
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} antialiased`}>
      <body className="min-h-dvh">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            className: "!rounded-2xl !border !border-white/10 !bg-[#141417] !text-ink !shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)]",
          }}
        />
      </body>
    </html>
  );
}
