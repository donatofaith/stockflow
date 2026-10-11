"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useMarketData } from "@/components/useMarketData";
import { formatPrice } from "@/lib/markets";
export default function MarketGrid() {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const { markets, status, updatedAt } = useMarketData(visible);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150px" },
    );
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={container}>
      <div className="sf-market-status">
        <span>
          <span className="sf-status-dot" />
          {status}
        </span>
        {updatedAt && (
          <span>
            Last update{" "}
            {new Date(updatedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
      <div className="sf-market-grid">
        {markets.map((market, index) => (
          <Link
            href="/dashboard"
            prefetch={false}
            key={market.ticker}
            className="sf-market-card"
          >
            <div>
              <span className={`sf-company-mark sf-company-${index}`}>
                {market.name.slice(0, 1)}
              </span>
              <ArrowUpRight size={16} />
            </div>
            <h3>{market.name}</h3>
            <span className="sf-market-symbol">{market.ticker}</span>
            <strong>{formatPrice(market.price)}</strong>
            <span className="sf-market-source">
              {market.price === null
                ? "Price unavailable"
                : market.source === "xStocks"
                  ? "xStock quote"
                  : `${market.source ?? "Cached"} · stock reference`}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
