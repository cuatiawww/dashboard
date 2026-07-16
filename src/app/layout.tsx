import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

import { buildApiUrl } from "@/lib/utils/api";

const roboto = Roboto({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const res = await fetch(buildApiUrl('/api/settings'), {
      next: { revalidate: 3600 }
    });
    const payload = await res.json();
    if (payload?.success && payload?.settings) {
      return {
        title: payload.settings.frontend_app_title || "Dashboard EOC - Kemenkes RI",
        description: payload.settings.frontend_app_subtitle || "Sistem pemantauan terpadu untuk melihat capaian, sebaran, dan perkembangan fasilitas kesehatan di seluruh wilayah Indonesia.",
      };
    }
  } catch (error) {
    console.error("Failed to generate dynamic metadata:", error);
  }

  return {
    title: "Dashboard EOC - Kemenkes RI",
    description: "Sistem pemantauan terpadu untuk melihat capaian, sebaran, dan perkembangan fasilitas kesehatan di seluruh wilayah Indonesia.",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${roboto.variable} font-roboto antialiased`}>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
