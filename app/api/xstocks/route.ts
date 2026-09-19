import { NextResponse } from "next/server";

const ASSETS = [
  { name: "Apple", ticker: "AAPLx", underlying: "AAPL" },
  { name: "NVIDIA", ticker: "NVDAx", underlying: "NVDA" },
  { name: "Tesla", ticker: "TSLAx", underlying: "TSLA" },
  { name: "Amazon", ticker: "AMZNx", underlying: "AMZN" },
  { name: "Microsoft", ticker: "MSFTx", underlying: "MSFT" },
  { name: "Meta", ticker: "METAx", underlying: "META" },
  { name: "Netflix", ticker: "NFLXx", underlying: "NFLX" },
  { name: "Coinbase", ticker: "COINx", underlying: "COIN" },
];

const XSTOCKS_API_BASES = [
  "https://api.xstocks.fi/api/v2",
  "https://api.backed.fi/api/v2",
];

const PRICE_KEYS = new Set([
  "quote",
  "price",
  "lastPrice",
  "currentPrice",
  "marketPrice",
  "nasdaqPrice",
  "regularMarketPrice",
  "close",
  "last",
  "value",
]);

function toPrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function extractPrice(value: unknown): number | null {
  if (!value || typeof value !== "object") {
    return toPrice(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const price = extractPrice(item);

      if (price !== null) {
        return price;
      }
    }

    return null;
  }

  const record = value as Record<string, unknown>;

  // Prefer fields that are explicitly price-like before walking nested objects.
  for (const [key, candidate] of Object.entries(record)) {
    if (PRICE_KEYS.has(key)) {
      const price = toPrice(candidate);

      if (price !== null) {
        return price;
      }
    }
  }

  for (const nestedValue of Object.values(record)) {
    if (nestedValue && typeof nestedValue === "object") {
      const price = extractPrice(nestedValue);

      if (price !== null) {
        return price;
      }
    }
  }

  return null;
}

async function fetchXStocksPrice(ticker: string) {
  for (const base of XSTOCKS_API_BASES) {
    try {
      const response = await fetch(
        `${base}/public/assets/${encodeURIComponent(ticker)}/price-data`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "StockFlow/1.0",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        continue;
      }

      const json = await response.json();
      const price = extractPrice(json);

      if (price !== null) {
        return {
          price,
          source: "xStocks",
        };
      }
    } catch (error) {
      console.error(`xStocks price lookup failed for ${ticker}:`, error);
    }
  }

  return null;
}

async function fetchYahooPrice(symbol: string) {
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?range=1d&interval=5m`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?range=1d&interval=5m`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (compatible; StockFlow/1.0; +https://github.com/donatofaith/stockflow)",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        continue;
      }

      const json = await response.json();
      const result = json?.chart?.result?.[0];

      const candidates = [
        result?.meta?.regularMarketPrice,
        result?.meta?.previousClose,
        result?.indicators?.quote?.[0]?.close
          ?.filter((value: unknown) => typeof value === "number")
          ?.at(-1),
      ];

      for (const candidate of candidates) {
        const price = toPrice(candidate);

        if (price !== null) {
          return {
            price,
            source: "Underlying market",
          };
        }
      }
    } catch (error) {
      console.error(`Fallback price lookup failed for ${symbol}:`, error);
    }
  }

  return null;
}

async function fetchAssetPrice(ticker: string, underlying: string) {
  const xStocksPrice = await fetchXStocksPrice(ticker);

  if (xStocksPrice) {
    return xStocksPrice;
  }

  // If the xStocks feed is temporarily unavailable, use the underlying
  // stock market price so the product can still show a useful estimate.
  return fetchYahooPrice(underlying);
}

export async function GET() {
  const results = await Promise.all(
    ASSETS.map(async (asset) => {
      const result = await fetchAssetPrice(
        asset.ticker,
        asset.underlying
      );

      return {
        name: asset.name,
        ticker: asset.ticker,
        price: result?.price ?? null,
        source: result?.source ?? null,
      };
    })
  );

  return NextResponse.json(
    {
      assets: results,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
