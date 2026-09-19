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
  "lastSalePrice",
  "close",
  "last",
  "value",
]);

function toPrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[$,\s]/g, "");
    const parsed = Number(cleaned);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function extractPrice(value: unknown, depth = 0): number | null {
  if (depth > 8) return null;

  const direct = toPrice(value);
  if (direct !== null) return direct;

  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const price = extractPrice(item, depth + 1);
      if (price !== null) return price;
    }
    return null;
  }

  const record = value as Record<string, unknown>;

  for (const [key, candidate] of Object.entries(record)) {
    if (PRICE_KEYS.has(key)) {
      const price = toPrice(candidate);
      if (price !== null) return price;
    }
  }

  for (const nestedValue of Object.values(record)) {
    if (nestedValue && typeof nestedValue === "object") {
      const price = extractPrice(nestedValue, depth + 1);
      if (price !== null) return price;
    }
  }

  return null;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 6000
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchXStocksPrice(ticker: string) {
  for (const base of XSTOCKS_API_BASES) {
    try {
      const response = await fetchWithTimeout(
        `${base}/public/assets/${encodeURIComponent(ticker)}/price-data`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "StockFlow/1.0",
          },
        }
      );

      if (!response.ok) continue;

      const json = await response.json();
      const price = extractPrice(json);

      if (price !== null) {
        return {
          price,
          source: "xStocks",
        };
      }
    } catch (error) {
      console.error(`xStocks lookup failed for ${ticker}:`, error);
    }
  }

  return null;
}

async function fetchNasdaqPrice(symbol: string) {
  try {
    const response = await fetchWithTimeout(
      `https://api.nasdaq.com/api/quote/${encodeURIComponent(
        symbol
      )}/info?assetclass=stocks`,
      {
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153 Safari/537.36",
          Referer: "https://www.nasdaq.com/",
          Origin: "https://www.nasdaq.com",
        },
      }
    );

    if (!response.ok) return null;

    const json = await response.json();

    const candidates = [
      json?.data?.primaryData?.lastSalePrice,
      json?.data?.secondaryData?.lastSalePrice,
      json?.data?.summaryData?.PreviousClose?.value,
    ];

    for (const candidate of candidates) {
      const price = toPrice(candidate);

      if (price !== null) {
        return {
          price,
          source: "Nasdaq",
        };
      }
    }
  } catch (error) {
    console.error(`Nasdaq lookup failed for ${symbol}:`, error);
  }

  return null;
}

async function fetchStooqPrice(symbol: string) {
  try {
    const response = await fetchWithTimeout(
      `https://stooq.com/q/l/?s=${encodeURIComponent(
        symbol.toLowerCase()
      )}.us&f=sd2t2ohlcv&h&e=csv`,
      {
        headers: {
          Accept: "text/csv,text/plain,*/*",
          "User-Agent": "StockFlow/1.0",
        },
      }
    );

    if (!response.ok) return null;

    const csv = await response.text();
    const lines = csv.trim().split(/\r?\n/);

    if (lines.length < 2) return null;

    const headers = lines[0].split(",");
    const values = lines[1].split(",");
    const closeIndex = headers.findIndex(
      (header) => header.trim().toLowerCase() === "close"
    );

    if (closeIndex < 0) return null;

    const price = toPrice(values[closeIndex]);

    if (price !== null) {
      return {
        price,
        source: "Stooq",
      };
    }
  } catch (error) {
    console.error(`Stooq lookup failed for ${symbol}:`, error);
  }

  return null;
}

async function fetchAssetPrice(ticker: string, underlying: string) {
  const xStocks = await fetchXStocksPrice(ticker);
  if (xStocks) return xStocks;

  const nasdaq = await fetchNasdaqPrice(underlying);
  if (nasdaq) return nasdaq;

  const stooq = await fetchStooqPrice(underlying);
  if (stooq) return stooq;

  return null;
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
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    }
  );
}
