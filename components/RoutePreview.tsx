"use client";

import {
  CheckCircle2,
  Loader2,
  Route,
  XCircle,
} from "lucide-react";

export type PreviewAllocation = {
  ticker: string;
  amount: number;
};

type RouteQuote = {
  ticker: string;

  status:
    | "available"
    | "unavailable"
    | "error";

  inputUsdc?: number;

  outputAmount?: number | null;

  router?: string;

  mode?: string | null;

  priceImpactPct?:
    | string
    | number
    | null;

  message?: string;
};

type Props = {
  allocations: PreviewAllocation[];
};

export default function RoutePreview({
  allocations,
}: Props) {
  const [quotes, setQuotes] =
    React.useState<
      RouteQuote[]
    >([]);

  const [loading, setLoading] =
    React.useState(false);

  const [error, setError] =
    React.useState<
      string | null
    >(null);

  async function previewRoutes() {
    if (
      allocations.length === 0
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setQuotes([]);

    try {
      const response =
        await fetch(
          "/api/jupiter-preview",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              allocations:
                allocations.map(
                  (allocation) => ({
                    ticker:
                      allocation.ticker,

                    amountUsdc:
                      allocation.amount,
                  })
                ),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ??
            "Quote preview failed."
        );
      }

      setQuotes(
        Array.isArray(data.quotes)
          ? data.quotes
          : []
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Route preview failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="quote-preview">
      <div className="quote-preview-heading">
        <div>
          <p>
            Jupiter liquidity
          </p>

          <h3>
            Route preview
          </h3>
        </div>

        <span>
          PREVIEW ONLY
        </span>
      </div>

      <p className="quote-preview-description">
        Check whether each StockFlow
        allocation currently has a
        tradable USDC → xStock route.
        No transaction is created or
        signed.
      </p>

      <button
        className="quote-preview-button"
        onClick={previewRoutes}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2
              size={15}
              className="animate-spin"
            />

            Checking routes...
          </>
        ) : (
          <>
            <Route size={15} />

            Preview Jupiter Routes
          </>
        )}
      </button>

      {error && (
        <div className="quote-preview-error">
          <XCircle size={15} />

          {error}
        </div>
      )}

      {quotes.length > 0 && (
        <div className="quote-results">
          {quotes.map(
            (quote) => {
              const available =
                quote.status ===
                "available";

              return (
                <div
                  key={
                    quote.ticker
                  }
                  className={`quote-result ${
                    available
                      ? "available"
                      : "unavailable"
                  }`}
                >
                  <div className="quote-result-top">
                    <div>
                      <strong>
                        {
                          quote.ticker
                        }
                      </strong>

                      <span>
                        {quote.inputUsdc?.toFixed(
                          2
                        ) ??
                          "—"}{" "}
                        USDC
                      </span>
                    </div>

                    <div className="quote-status">
                      {available ? (
                        <>
                          <CheckCircle2
                            size={
                              14
                            }
                          />

                          Route
                          available
                        </>
                      ) : (
                        <>
                          <XCircle
                            size={
                              14
                            }
                          />

                          No route
                        </>
                      )}
                    </div>
                  </div>

                  {available && (
                    <div className="quote-details">
                      <div>
                        <span>
                          Estimated
                          output
                        </span>

                        <strong>
                          {quote.outputAmount !==
                          null &&
                          quote.outputAmount !==
                            undefined
                            ? quote.outputAmount.toFixed(
                                6
                              )
                            : "Raw quote available"}{" "}
                          {
                            quote.ticker
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Router
                        </span>

                        <strong>
                          {quote.router ??
                            "Jupiter"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Price
                          impact
                        </span>

                        <strong>
                          {quote.priceImpactPct !==
                            null &&
                          quote.priceImpactPct !==
                            undefined
                            ? `${quote.priceImpactPct}%`
                            : "—"}
                        </strong>
                      </div>
                    </div>
                  )}

                  {!available &&
                    quote.message && (
                      <p className="quote-message">
                        {
                          quote.message
                        }
                      </p>
                    )}
                </div>
              );
            }
          )}
        </div>
      )}

      <div className="quote-network-note">
        Solana Mainnet liquidity
        preview · No funds move · No
        wallet signature requested
      </div>
    </div>
  );
}

import React from "react";