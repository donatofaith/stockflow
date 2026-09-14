import { NextResponse } from "next/server";

const ASSETS = [
  { name: "Apple", ticker: "AAPLx" },
  { name: "NVIDIA", ticker: "NVDAx" },
  { name: "Tesla", ticker: "TSLAx" },
  { name: "Amazon", ticker: "AMZNx" },
  { name: "Microsoft", ticker: "MSFTx" },
  { name: "Meta", ticker: "METAx" },
  { name: "Netflix", ticker: "NFLXx" },
  { name: "Coinbase", ticker: "COINx" },
];

const API_BASES = [
  "https://api.xstocks.fi/api/v2",
  "https://api.backed.fi/api/v2",
];

function findPrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function extractPrice(response: any): number | null {
  const payload = response?.data ?? response;

  const candidates = [
    payload?.quote,
    payload?.price,
    payload?.lastPrice,
    payload?.currentPrice,
    payload?.marketPrice,
    payload?.nasdaqPrice,
    payload?.close,
  ];

  for (const candidate of candidates) {
    const price = findPrice(candidate);

    if (price !== null && price > 0) {
      return price;
    }
  }

  return null;
}

async function fetchAssetPrice(ticker: string) {
  for (const base of API_BASES) {
    try {
      const response = await fetch(
        `${base}/public/assets/${ticker}/price-data`,
        {
          headers: {
            Accept: "application/json",
          },
          next: {
            revalidate: 30,
          },
        }
      );

      if (!response.ok) {
        continue;
      }

      const json = await response.json();
      const price = extractPrice(json);

      if (price !== null) {
        return price;
      }
    } catch {
      // Try backup endpoint.
    }
  }

  return null;
}

export async function GET() {
  const results = await Promise.all(
    ASSETS.map(async (asset) => {
      const price = await fetchAssetPrice(asset.ticker);

      return {
        ...asset,
        price,
      };
    })
  );

  return NextResponse.json({
    assets: results,
    updatedAt: new Date().toISOString(),
  });
}