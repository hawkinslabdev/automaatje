import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Automaatje",
  description: "Jouw privacy vriendelijke kilometerregistratie",
  applicationName: "Automaatje",
  manifest: "/pwa/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Automaatje",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/pwa/icons/icon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/pwa/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/pwa/icons/icon-192x192.png",
    apple: [
      { url: "/pwa/icons/icon-120x120.png", sizes: "120x120", type: "image/png" },
      { url: "/pwa/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/pwa/icons/icon-167x167.png", sizes: "167x167", type: "image/png" },
      { url: "/pwa/icons/icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="192x192" href="/pwa/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/pwa/icons/icon-512x512.png" />
        <meta name="theme-color" content="#6a93a0" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/pwa/icons/icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/pwa/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/pwa/icons/icon-167x167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/pwa/icons/icon-180x180.png" />
        <link
          rel="apple-touch-startup-image"
          href="/pwa/splash/splash-750x1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/pwa/splash/splash-1125x2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/pwa/splash/splash-1242x2208.png"
          media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/pwa/splash/splash-1536x2048.png"
          media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/pwa/splash/splash-1668x2224.png"
          media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/pwa/splash/splash-2048x2732.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)"
        />
      </head>
      <body className={`${inter.className} overflow-x-hidden`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
