import type { Metadata } from "next";
import "./globals.css";

import "@solana/wallet-adapter-react-ui/styles.css";

import Providers from "./providers";

export const metadata: Metadata = {
  title: "StockFlow",
  description:
    "Automated tokenized stock investing on Solana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}