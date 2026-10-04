import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Life Game",
  description: "Ton dashboard RPG branché sur Notion",
  appleWebApp: { capable: true, title: "Life Game", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0d17",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
