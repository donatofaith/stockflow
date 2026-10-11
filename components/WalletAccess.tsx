"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { Wallet, X } from "lucide-react";

const WalletAccess = createContext<{ setVisible: (visible: boolean) => void } | null>(null);
export const useWalletModal = () => {
  const context = useContext(WalletAccess);
  if (!context) throw new Error("WalletAccessProvider is missing");
  return context;
};

export function WalletAccessProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<WalletName | null>(null);
  const { wallets, wallet, select, connect, connected, connecting } = useWallet();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (visible) { element?.showModal(); }
    else element?.close();
  }, [visible]);

  useEffect(() => {
    if (!pending || wallet?.adapter.name !== pending) return;
    let cancelled = false;
    connect().then(() => { if (!cancelled) setVisible(false); }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Connection failed. Unlock your wallet and try again.");
    }).finally(() => { if (!cancelled) setPending(null); });
    return () => { cancelled = true; };
  }, [pending, wallet, connect]);

  const available = wallets.filter(({ readyState }) => readyState === WalletReadyState.Installed || readyState === WalletReadyState.Loadable);
  return <WalletAccess.Provider value={{ setVisible }}>
    {children}
    <dialog ref={dialog} className="wallet-access-dialog" onCancel={() => setVisible(false)} onClick={(event) => { if (event.target === event.currentTarget) setVisible(false); }}>
      <div className="wallet-access-heading"><Wallet size={24} /><h2>Connect your wallet</h2><button aria-label="Close wallet picker" onClick={() => setVisible(false)}><X size={20} /></button></div>
      <p>Choose a detected Solana wallet. Connection shares your public address; transactions require a separate approval.</p>
      {available.map(({ adapter }) => <button className="wallet-choice" key={adapter.name} disabled={connecting || !!pending} onClick={() => { if (connected && wallet?.adapter.name === adapter.name) { setVisible(false); return; } setError(null); select(adapter.name); setPending(adapter.name); }}><span>{adapter.name}</span><span>{pending === adapter.name ? "Connecting…" : "Connect →"}</span></button>)}
      {available.length === 0 && <p className="wallet-notice">No wallet detected. On desktop, install Phantom or Jupiter, then reload. On mobile, open StockFlow inside your wallet’s app browser.</p>}
      {error && <p role="alert" className="wallet-error">{error}</p>}
      <div className="wallet-help"><a href="https://phantom.app/" target="_blank" rel="noreferrer">Get Phantom ↗</a><a href="https://jup.ag/wallet" target="_blank" rel="noreferrer">Get Jupiter ↗</a><button onClick={() => { window.location.href = `https://phantom.app/ul/browse/${encodeURIComponent(window.location.href)}?ref=${encodeURIComponent(window.location.origin)}`; }}>Open in Phantom</button></div>
      <p className="wallet-note">Jupiter and other compatible wallets appear automatically when detected. StockFlow verification uses Solana Devnet.</p>
    </dialog>
  </WalletAccess.Provider>;
}

export function WalletMultiButton() {
  const { setVisible } = useWalletModal();
  const { connected, publicKey, disconnect, connecting } = useWallet();
  return <div className="wallet-controls"><button className="wallet-adapter-button" onClick={() => setVisible(true)} disabled={connecting}><Wallet size={16} />{connecting ? "Connecting…" : connected && publicKey ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}` : "Connect wallet"}</button>{connected && <button className="wallet-disconnect" onClick={() => void disconnect()}>Disconnect</button>}</div>;
}
