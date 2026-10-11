"use client";

import { useMemo, useSyncExternalStore } from "react";
import { clusterApiUrl } from "@solana/web3.js";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { WalletAccessProvider } from "@/components/WalletAccess";

const subscribe = () => () => {};

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  const endpoint = useMemo(() => {
    return clusterApiUrl("devnet");
  }, []);


  if (!mounted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#060606",
        }}
      />
    );
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletAccessProvider>
          {children}
        </WalletAccessProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}