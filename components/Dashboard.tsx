"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, type ConfirmedSignatureInfo } from "@solana/web3.js";
import { RefreshCw, ArrowUpRight, WalletCards, Layers, History } from "lucide-react";

type Holding = { mint: string; amount: number; accounts: number };
type Snapshot = { sol: number; holdings: Holding[]; transactions: ConfirmedSignatureInfo[] };
const TOKEN_PROGRAMS = ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"];
const DEVNET_USDC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export default function Dashboard({ onCreate, onPreview, hasRule }: { onCreate: () => void; onPreview: () => void; hasRule: boolean }) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const address = publicKey?.toBase58();
  const [tab, setTab] = useState<"overview" | "holdings" | "history">("overview");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [updated, setUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    const key = new PublicKey(address);
    async function load() {
      setLoading(true); setError(null);
      try {
        const [sol, tokens, signatures] = await Promise.all([
          connection.getBalance(key, "confirmed"),
          Promise.all(TOKEN_PROGRAMS.map(program => connection.getParsedTokenAccountsByOwner(key, { programId: new PublicKey(program) }, "confirmed"))),
          connection.getSignaturesForAddress(key, { limit: 10 }, "confirmed"),
        ]);
        const merged = new Map<string, Holding>();
        for (const result of tokens) for (const { account } of result.value) {
          const info = account.data.parsed.info;
          const amount = Number(info.tokenAmount.uiAmountString);
          if (amount <= 0) continue;
          const prior = merged.get(info.mint);
          merged.set(info.mint, { mint: info.mint, amount: (prior?.amount ?? 0) + amount, accounts: (prior?.accounts ?? 0) + 1 });
        }
        if (!cancelled) { setSnapshot({ sol: sol / LAMPORTS_PER_SOL, holdings: [...merged.values()], transactions: signatures }); setUpdated(new Date().toLocaleTimeString()); }
      } catch { if (!cancelled) setError("Could not refresh wallet data. The Devnet RPC may be unavailable; try again."); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    const interval = window.setInterval(() => void load(), 30000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [address, connection, refresh]);

  if (!address) return <div className="dashboard-intro"><WalletCards size={24} /><div><strong>Everything you need to manage your flow</strong><p>Connect Phantom or Jupiter to see your Devnet balances, token holdings, and on-chain history.</p></div></div>;
  return <div className="workspace" key={address}>
    <div className="workspace-toolbar"><div className="dashboard-tabs" role="tablist" aria-label="Wallet dashboard">{(["overview", "holdings", "history"] as const).map(value => <button key={value} role="tab" aria-selected={tab === value} aria-controls="dashboard-panel" onClick={() => setTab(value)}>{value === "overview" ? <WalletCards size={16} /> : value === "holdings" ? <Layers size={16} /> : <History size={16} />}{value}</button>)}</div><button className="dashboard-refresh" disabled={loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={15} className={loading ? "animate-spin" : ""} />{loading ? "Updating…" : "Refresh"}</button></div>
    <div className="dashboard-network"><span className="launch-dot" />Solana Devnet · Test assets{updated && <span>Updated {updated}</span>}</div>
    {error && <p className="wallet-error" role="alert">{error}</p>}
    <div id="dashboard-panel" role="tabpanel" aria-label={tab} aria-busy={loading}>
    {tab === "overview" && <><div className="dashboard-stats"><div><span>SOL balance</span><strong>{snapshot ? snapshot.sol.toFixed(4) : "—"}<small> SOL</small></strong><p>Available for Devnet verification fees</p></div><div><span>Devnet USDC</span><strong>{snapshot ? (snapshot.holdings.find(h => h.mint === DEVNET_USDC)?.amount ?? 0).toLocaleString() : "—"}<small> USDC</small></strong><p>Test tokens in your connected wallet</p></div><div><span>Allocation rule</span><strong>{hasRule ? "Saved" : "Not set"}</strong><p>Create and review your USDC split</p></div></div><div className="dashboard-actions"><button className="primary-button" onClick={onCreate}>{hasRule ? "Edit allocation" : "Create allocation"}<ArrowUpRight size={16} /></button><button className="secondary-button" onClick={onPreview} disabled={!hasRule}>Preview my flow</button><a href={`https://explorer.solana.com/address/${address}?cluster=devnet`} target="_blank" rel="noreferrer">View wallet ↗</a></div><p className="dashboard-caption">Allocation previews calculate a split. Verification records a Devnet memo. Stock purchases and automated trading are not enabled.</p></>}
    {tab === "holdings" && <div className="dashboard-list"><h3>Token holdings</h3>{!snapshot ? <p>{loading ? "Loading token accounts…" : "Wallet data unavailable."}</p> : snapshot.holdings.length === 0 ? <p>No Devnet token holdings found. Your SOL balance appears in Overview.</p> : snapshot.holdings.map(holding => <div className="dashboard-row" key={holding.mint}><a href={`https://explorer.solana.com/address/${holding.mint}?cluster=devnet`} target="_blank" rel="noreferrer" title={holding.mint}>{holding.mint === DEVNET_USDC ? "Devnet USDC" : `${holding.mint.slice(0, 6)}…${holding.mint.slice(-6)}`} ↗</a><strong>{holding.amount.toLocaleString(undefined, { maximumFractionDigits: 8 })}</strong></div>)}<p>Unidentified tokens are shown by mint address. These are actual wallet holdings, separate from your allocation preview.</p></div>}
    {tab === "history" && <div className="dashboard-list"><h3>Recent on-chain transactions</h3>{!snapshot ? <p>{loading ? "Loading transactions…" : "Wallet data unavailable."}</p> : snapshot.transactions.length === 0 ? <p>No Devnet transactions found for this wallet.</p> : snapshot.transactions.map(tx => <div className="dashboard-row" key={tx.signature}><a href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`} target="_blank" rel="noreferrer">{tx.signature.slice(0, 8)}…{tx.signature.slice(-6)} ↗</a><span>{tx.err ? "Failed" : "Confirmed"}</span><time>{tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleDateString() : "Pending time"}</time></div>)}</div>}
    </div>
  </div>;
}
