import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockFlow — Your allocation. Your rules.",
  description:
    "Build a wallet-linked xStock allocation, preview your USDC split, and verify your flow on Solana Devnet.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
