import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";

import { AuthProvider } from "@/context/AuthContext";

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
