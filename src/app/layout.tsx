import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { PwaRegister } from "@/components/layout/PwaRegister";
import { getSession } from "@/lib/auth/session";
import "./globals.css";

// ──────────────────────────────────────────────────
// Root Layout — HyperTrack (Brutalist Edition)
// ──────────────────────────────────────────────────

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "700"],
});

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "HyperTrack — Seguimiento de Hipertrofia y Nutrición",
    template: "%s | HyperTrack",
  },
  description:
    "Plataforma premium de seguimiento de hipertrofia, entrenamiento y nutrición. Trackea tu progreso, optimiza tus macros y alcanza tus objetivos.",
  keywords: [
    "hipertrofia",
    "entrenamiento",
    "nutrición",
    "gym",
    "tracking",
    "fitness",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HyperTrack",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="es" className={`${inter.variable} ${oswald.variable} dark`}>
      <body className={`relative min-h-dvh bg-black font-sans text-zinc-300 antialiased overflow-x-hidden ${session ? "pb-20 md:pb-0" : ""} z-0 selection:bg-red-600/30`}>
        <PwaRegister />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
