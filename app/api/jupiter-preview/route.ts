import { NextRequest, NextResponse } from "next/server";

const USDC_MINT =
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const SUPPORTED_TICKERS = new Set([
  "AAPLx",
  "NVDAx",
  "TSLAx",
  "AMZNx",
  "MSFTx",
  "METAx",
  "NFLXx",
  "COINx",
]);

type AllocationRequest = {
  ticker: string;
  amountUsdc: number;
};

type TokenMetadata = {
  mint: string;
  decimals: number | null;
};

const metadataCache = new Map<string, TokenMetadata>();

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeNetwork(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function findSolanaDeployment(asset: any) {
  const deployments =
    asset?.tokenDeployments ??
    asset?.deployments ??
    asset?.tokens ??
    [];

  if (!Array.isArray(deployments)) {
    return null;
  }

  return (
    deployments.find((deployment: any) => {
      const network = normalizeNetwork(
        deployment?.network ??
          deployment?.chain ??
          deployment?.blockchain ??
          deployment?.networkName
      );

      return network.includes("solana");
    }) ?? null
  );
}

function deploymentMint(deployment: any) {
  return (
    deployment?.address ??
    deployment?.mint ??
    deployment?.mintAddress ??
    deployment?.tokenAddress ??
    deployment?.contractAddress ??
    null
  );
}

function deploymentDecimals(deployment: any) {
  const value =
    deployment?.decimals ??
    deployment?.tokenDecimals;

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    Number.isFinite(Number(value))
  ) {
    return Number(value);
  }

  return null;
}

async function getXStockMetadata(
  ticker: string
): Promise<TokenMetadata | null> {
  const cached = metadataCache.get(ticker);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(
      `https://api.xstocks.fi/api/v2/public/assets/${encodeURIComponent(
        ticker
      )}`,
      {
        headers: {
          Accept: "application/json",
        },
        next: {
          revalidate: 3600,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const json = await response.json();

    const asset =
      json?.data?.asset ??
      json?.data ??
      json?.asset ??
      json;

    const deployment = findSolanaDeployment(asset);

    const mint = deploymentMint(deployment);

    if (!mint) {
      return null;
    }

    const metadata: TokenMetadata = {
      mint,
      decimals: deploymentDecimals(deployment),
    };

    metadataCache.set(ticker, metadata);

    return metadata;
  } catch (error) {
    console.error(
      `xStocks metadata lookup failed for ${ticker}:`,
      error
    );

    return null;
  }
}

async function getJupiterTokenMetadata(
  ticker: string
): Promise<TokenMetadata | null> {
  const apiKey = process.env.JUPITER_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.jup.ag/tokens/v2/search?query=${encodeURIComponent(
        ticker
      )}`,
      {
        headers: {
          Accept: "application/json",
          "x-api-key": apiKey,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return null;
    }

    const tokens = await response.json();

    if (!Array.isArray(tokens)) {
      return null;
    }

    const exact = tokens.find(
      (token: any) =>
        String(token?.symbol ?? "").toLowerCase() ===
        ticker.toLowerCase()
    );

    if (!exact) {
      return null;
    }

    const mint =
      exact?.id ??
      exact?.mint ??
      exact?.address;

    if (!mint) {
      return null;
    }

    const metadata: TokenMetadata = {
      mint,
      decimals:
        typeof exact?.decimals === "number"
          ? exact.decimals
          : null,
    };

    metadataCache.set(ticker, metadata);

    return metadata;
  } catch (error) {
    console.error(
      `Jupiter token lookup failed for ${ticker}:`,
      error
    );

    return null;
  }
}

async function resolveToken(ticker: string) {
  const xStocks = await getXStockMetadata(ticker);

  if (
    xStocks?.mint &&
    xStocks.decimals !== null
  ) {
    return xStocks;
  }

  const jupiter =
    await getJupiterTokenMetadata(ticker);

  if (!jupiter) {
    return xStocks;
  }

  return {
    mint: xStocks?.mint ?? jupiter.mint,
    decimals:
      xStocks?.decimals ??
      jupiter.decimals,
  };
}

async function buildPreview(
  allocation: AllocationRequest,
  walletAddress: string
) {
  const token = await resolveToken(allocation.ticker);

  if (!token?.mint) {
    return {
      ticker: allocation.ticker,
      status: "unavailable",
      message:
        "Could not resolve the Solana mint for this xStock.",
    };
  }

  if (token.decimals === null) {
    return {
      ticker: allocation.ticker,
      status: "unavailable",
      message:
        "Token decimals could not be resolved.",
    };
  }

  const amountRaw = Math.round(
    allocation.amountUsdc * 1_000_000
  );

  if (amountRaw <= 0) {
    return {
      ticker: allocation.ticker,
      status: "unavailable",
      message:
        "Allocation amount must be greater than zero.",
    };
  }

  const apiKey = process.env.JUPITER_API_KEY;

  if (!apiKey) {
    return {
      ticker: allocation.ticker,
      status: "error",
      message:
        "JUPITER_API_KEY is missing on the server.",
    };
  }

  const params = new URLSearchParams({
    inputMint: USDC_MINT,
    outputMint: token.mint,
    amount: amountRaw.toString(),

    /*
      Passing taker allows Jupiter to
      prepare the transaction for this
      wallet.

      We DO NOT sign or submit it.
    */
    taker: walletAddress,
  });

  try {
    const response = await fetch(
      `https://api.jup.ag/swap/v2/order?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "x-api-key": apiKey,
        },
        cache: "no-store",
      }
    );

    const json = await response.json();

    if (!response.ok) {
      return {
        ticker: allocation.ticker,
        status: "unavailable",
        mint: token.mint,

        message:
          json?.error ??
          json?.message ??
          `Jupiter returned HTTP ${response.status}.`,
      };
    }

    const rawOutput =
      json?.outAmount ??
      json?.outputAmount ??
      null;

    const outputAmount =
      rawOutput !== null
        ? Number(rawOutput) /
          10 ** token.decimals
        : null;

    const transaction =
      typeof json?.transaction === "string"
        ? json.transaction
        : null;

    return {
      ticker: allocation.ticker,

      status: "available",

      mint: token.mint,

      inputUsdc: allocation.amountUsdc,

      outputAmount,

      router:
        json?.router ??
        json?.routePlan?.[0]?.swapInfo?.label ??
        "Jupiter",

      priceImpactPct:
        json?.priceImpactPct ??
        null,

      requestId:
        json?.requestId ??
        null,

      transactionPrepared:
        Boolean(transaction),

      /*
        We intentionally do NOT return
        the entire base64 transaction
        to the page yet.

        At this stage we only confirm
        that Jupiter successfully built it.
      */

      readyForWalletApproval:
        Boolean(
          transaction &&
            json?.requestId
        ),

      network:
        "Solana Mainnet",

      message: transaction
        ? "Transaction successfully prepared."
        : "Route found, but no transaction was returned.",
    };
  } catch (error) {
    console.error(
      `Jupiter order failed for ${allocation.ticker}:`,
      error
    );

    return {
      ticker: allocation.ticker,

      status: "error",

      mint: token.mint,

      message:
        "Could not reach Jupiter.",
    };
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const walletAddress =
      typeof body?.walletAddress === "string"
        ? body.walletAddress.trim()
        : "";

    if (!walletAddress) {
      return NextResponse.json(
        {
          error:
            "Wallet address is required for transaction preview.",
        },
        {
          status: 400,
        }
      );
    }

    const allocations: AllocationRequest[] =
      Array.isArray(body?.allocations)
        ? body.allocations
        : [];

    const validAllocations =
      allocations.filter(
        (allocation) =>
          SUPPORTED_TICKERS.has(
            allocation.ticker
          ) &&
          Number.isFinite(
            allocation.amountUsdc
          ) &&
          allocation.amountUsdc > 0
      );

    if (validAllocations.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid allocations supplied.",
        },
        {
          status: 400,
        }
      );
    }

    const previews = [];

    /*
      Your Jupiter Free plan is 1 RPS,
      so we deliberately keep these
      requests sequential.
    */

    for (
      let index = 0;
      index < validAllocations.length;
      index++
    ) {
      const preview =
        await buildPreview(
          validAllocations[index],
          walletAddress
        );

      previews.push(preview);

      if (
        index <
        validAllocations.length - 1
      ) {
        await delay(1100);
      }
    }

    return NextResponse.json({
      quotes: previews,

      previewOnly: true,

      signingEnabled: false,

      executionEnabled: false,

      network:
        "Solana Mainnet",

      generatedAt:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Transaction preview API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to prepare transaction preview.",
      },
      {
        status: 500,
      }
    );
  }
}