import type { Metadata } from "next";
import "./globals.css"; // TENTO ŘÁDEK JE KLÍČOVÝ!

export const metadata: Metadata = {
  title: "Moje Mapa",
  description: "Správa adres a mapa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}