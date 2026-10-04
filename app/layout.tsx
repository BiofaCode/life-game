import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { Toaster } from "@/components/Toast";
import { resolveTheme, THEME_COOKIE } from "@/lib/themes";

export const metadata: Metadata = {
  title: "Life Game",
  description: "Ton dashboard RPG branché sur Notion",
  appleWebApp: { capable: true, title: "Life Game", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export async function generateViewport(): Promise<Viewport> {
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
  return {
    themeColor: theme.bg,
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="fr" data-theme={theme.id}>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
