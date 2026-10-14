import type { Metadata } from "next";
import "./globals.css"; // TENTO ŘÁDEK JE KLÍČOVÝ!

export const metadata: Metadata = {
  title: "Kolotoč",
  description: "Votoč-kolotoč",
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