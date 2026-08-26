import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";

import { AuthProvider } from "@/context/AuthContext";

// Application entièrement derrière authentification : aucun intérêt à
// pré-rendre statiquement les pages au build (et plusieurs écrans lisent
// useSearchParams sans Suspense, ce qui fait échouer le prérendu).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cartographie des parcelles",
  description:
    "Application de cartographie — identification et visualisation de parcelles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
