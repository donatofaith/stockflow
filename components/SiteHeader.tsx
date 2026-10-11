import Link from "next/link";
import { ArrowUpRight, ChartNoAxesCombined, Menu } from "lucide-react";
export default function SiteHeader() {
  return (
    <header className="sf-header">
      <Link href="/" className="sf-brand">
        <span>
          <ChartNoAxesCombined size={22} />
        </span>
        StockFlow<span className="sf-brand-dot">.</span>
      </Link>
      <nav aria-label="Main navigation" className="sf-navigation">
        <Link href="/#markets">Markets</Link>
        <Link href="/#how">How it works</Link>
        <Link href="/dashboard" prefetch={false}>
          Dashboard
        </Link>
      </nav>
      <Link
        href="/dashboard"
        prefetch={false}
        className="sf-button sf-button-dark sf-header-action"
      >
        Launch app <ArrowUpRight size={16} />
      </Link>
      <details className="sf-mobile-menu">
        <summary aria-label="Open navigation">
          <Menu size={22} />
        </summary>
        <nav aria-label="Mobile navigation">
          <Link href="/#markets">Markets</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/dashboard" prefetch={false}>
            Launch dashboard ↗
          </Link>
        </nav>
      </details>
    </header>
  );
}
