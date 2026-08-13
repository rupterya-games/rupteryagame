import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RUPTERYA",
  description: "RPG browser de caça, estratégia e sobrevivência.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
