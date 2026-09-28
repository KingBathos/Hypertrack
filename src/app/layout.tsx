import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${oswald.variable} dark`}>
      <body className="relative min-h-screen bg-black font-sans text-zinc-300 antialiased overflow-x-hidden z-0 selection:bg-red-600/30">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
