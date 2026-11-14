import type { Metadata, Viewport } from "next";
import { RegistrarSW } from "@/components/RegistrarSW";
import { Nunito, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-outfit" });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-nunito" });

export const metadata: Metadata = {
  title: "Tereza",
  description: "El día de tu bebé, registrado en un toque.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0b1c" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${outfit.variable} ${nunito.variable}`}>
      <body>{children}<RegistrarSW /></body>
    </html>
  );
}
