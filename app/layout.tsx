import type { Metadata, Viewport } from "next";
import "./globals.css";

// Uzamčení zoomování a přizpůsobení pro mobily
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090b",
};

export const metadata: Metadata = {
  title: "Kolotoč",
  description: "Kde sny ožívají",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kolotoč"
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className="fixed inset-0 overflow-hidden touch-none overscroll-none">
      <body className="fixed inset-0 bg-zinc-950 text-zinc-100 antialiased overflow-hidden overscroll-none">
        {children}
      </body>
    </html>
  );
}