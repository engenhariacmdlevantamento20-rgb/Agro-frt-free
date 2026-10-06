import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import AuthCallback from "@/components/AuthCallback";

export const metadata: Metadata = {
  title: "Agro Frete",
  description: "Logística rural: conecte produtores e transportadores de gado e outras cargas do campo.",
  manifest: "/manifest.webmanifest",
  icons: { apple: "/icons/apple-touch-icon.png", icon: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "Agro Frete", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#1E3B2A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <PwaRegister />
        <AuthCallback />
      </body>
    </html>
  );
}
