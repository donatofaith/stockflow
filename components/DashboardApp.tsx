"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ChartNoAxesCombined,
  ArrowUpRight,
  LayoutDashboard,
  ArrowLeft,
} from "lucide-react";
import Providers from "@/app/providers";
import { WalletMultiButton } from "@/components/WalletAccess";
const FlowWorkspace = dynamic(() => import("@/components/FlowWorkspace"), {
  loading: () => (
    <div className="sf-workspace-loading" role="status">
      Loading your workspace…
    </div>
  ),
});
export default function DashboardApp() {
  return (
    <Providers>
      <div className="sf-app">
        <header className="sf-app-header">
          <Link href="/" className="sf-brand">
            <span>
              <ChartNoAxesCombined size={22} />
            </span>
            StockFlow.
          </Link>
          <span className="sf-app-network">SOLANA DEVNET</span>
          <WalletMultiButton />
        </header>
        <div className="sf-app-shell">
          <aside className="sf-app-sidebar">
            <p>WORKSPACE</p>
            <a href="#activity" className="sf-app-active">
              <LayoutDashboard size={18} />
              Overview
            </a>
            <Link href="/#markets">
              <ArrowUpRight size={18} />
              Explore markets
            </Link>
            <Link href="/#how">
              <ArrowUpRight size={18} />
              How it works
            </Link>
            <div>
              <ShieldNote />
              <Link href="/">
                <ArrowLeft size={16} />
                Back to website
              </Link>
            </div>
          </aside>
          <FlowWorkspace />
        </div>
      </div>
    </Providers>
  );
}
function ShieldNote() {
  return (
    <p className="sf-sidebar-note">
      Your wallet. Your approval.
      <br />
      This workspace uses test assets and does not execute stock purchases.
    </p>
  );
}
