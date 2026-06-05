import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corporis CRM",
  description: "Captação e conversão de novas alunas da Corporis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
