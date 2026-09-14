import type { Metadata } from "next";
import "./globals.css";

import "@solana/wallet-adapter-react-ui/styles.css";

import Providers from "./providers";
import ActivityCollapseController from "./activity-collapse-controller";

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
        <ActivityCollapseController />
      </body>
    </html>
  );
}
