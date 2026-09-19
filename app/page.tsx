"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

import {
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";

import {
  useWalletModal,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Calculator,
  ChartNoAxesCombined,
  Check,
  CheckCircle2,
  FlaskConical,
  History,
  Loader2,
  Menu,
  Plus,
  ShieldCheck,
  Sparkles,
  Wallet,
  WalletCards,
  X,
  XCircle,
  Zap,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

/* ======================================================
   TYPES
====================================================== */

type Market = {
  name: string;
  ticker: string;
  price: number | null;
};

type Allocation = {
  ticker: string;
  percentage: number;
};

type SavedRule = {
  id?: string;
  wallet_address: string;
  trigger_type: string;
  allocations: Allocation[];
  status: "draft" | "active";
  created_at?: string;
  updated_at?: string;
  activated_at?: string | null;
};

type ActivityItem = {
  id: string;

  type:
    | "rule"
    | "devnet";

  title: string;
  description: string;

  status:
    | "success"
    | "active";

  createdAt: string;
};

/* ======================================================
   CONSTANTS
====================================================== */

const DEFAULT_MARKETS: Market[] = [
  {
    name: "Apple",
    ticker: "AAPLx",
    price: null,
  },
  {
    name: "NVIDIA",
    ticker: "NVDAx",
    price: null,
  },
  {
    name: "Tesla",
    ticker: "TSLAx",
    price: null,
  },
  {
    name: "Amazon",
    ticker: "AMZNx",
    price: null,
  },
  {
    name: "Microsoft",
    ticker: "MSFTx",
    price: null,
  },
  {
    name: "Meta",
    ticker: "METAx",
    price: null,
  },
  {
    name: "Netflix",
    ticker: "NFLXx",
    price: null,
  },
  {
    name: "Coinbase",
    ticker: "COINx",
    price: null,
  },
];

const AVAILABLE_STOCKS =
  DEFAULT_MARKETS.map(
    ({ name, ticker }) => ({
      name,
      ticker,
    })
  );

const DEFAULT_ALLOCATIONS: Allocation[] = [
  {
    ticker: "AAPLx",
    percentage: 20,
  },
  {
    ticker: "NVDAx",
    percentage: 20,
  },
];

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

const MARKET_CACHE_KEY =
  "stockflow-market-prices-v1";

/* ======================================================
   HELPERS
====================================================== */

function formatPrice(
  price: number | null
) {
  if (price === null) {
    return "Unavailable";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(price);
}

function formatUnits(
  value: number | null
) {
  if (value === null) {
    return "—";
  }

  if (value >= 1) {
    return value.toFixed(4);
  }

  return value.toFixed(6);
}

function formatActivityTime(
  timestamp: string
) {
  const date =
    new Date(timestamp);

  return new Intl.DateTimeFormat(
    "en",
    {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function getErrorMessage(error: unknown) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null
  ) {
    const record = error as Record<
      string,
      unknown
    >;

    if (
      typeof record.message ===
      "string"
    ) {
      return record.message;
    }

    if (
      typeof record.error ===
      "string"
    ) {
      return record.error;
    }

    if (
      typeof record.cause ===
      "object" &&
      record.cause !== null
    ) {
      const cause =
        record.cause as Record<
          string,
          unknown
        >;

      if (
        typeof cause.message ===
        "string"
      ) {
        return cause.message;
      }
    }
  }

  return "Unexpected wallet error.";
}

/* ======================================================
   PAGE
====================================================== */

export default function Home() {
  const { connection } =
    useConnection();

  const {
    connected,
    publicKey,
    sendTransaction,
  } = useWallet();

  const { setVisible } =
    useWalletModal();

  /* ====================================================
     MARKET
  ==================================================== */

  const [
    markets,
    setMarkets,
  ] = useState<Market[]>(
    DEFAULT_MARKETS
  );

  const [
    marketUpdatedAt,
    setMarketUpdatedAt,
  ] = useState<
    string | null
  >(null);

  /* ====================================================
     RULE
  ==================================================== */

  const [
    builderOpen,
    setBuilderOpen,
  ] = useState(false);

  const [
    simulatorOpen,
    setSimulatorOpen,
  ] = useState(false);

  const [
    step,
    setStep,
  ] = useState(1);

  const [
    allocations,
    setAllocations,
  ] = useState<
    Allocation[]
  >(
    DEFAULT_ALLOCATIONS
  );

  const [
    savedRule,
    setSavedRule,
  ] = useState<
    SavedRule | null
  >(null);

  const [
    loadingRule,
    setLoadingRule,
  ] = useState(false);

  const [
    savingRule,
    setSavingRule,
  ] = useState(false);

  const [
    activatingRule,
    setActivatingRule,
  ] = useState(false);

  /* ====================================================
     SIMULATOR
  ==================================================== */

  const [
    simulationAmount,
    setSimulationAmount,
  ] = useState(100);

  /* ====================================================
     DEVNET
  ==================================================== */

  const [
    devnetTesting,
    setDevnetTesting,
  ] = useState(false);

  const [
    devnetError,
    setDevnetError,
  ] = useState<
    string | null
  >(null);

  const [
    devnetStatus,
    setDevnetStatus,
  ] = useState<
    string | null
  >(null);

  const [
    devnetBalance,
    setDevnetBalance,
  ] = useState<
    number | null
  >(null);

  /* ====================================================
     ACTIVITY
  ==================================================== */

  const [
    activityItems,
    setActivityItems,
  ] = useState<
    ActivityItem[]
  >([]);

  /* ====================================================
     UI
  ==================================================== */

  const [
    toast,
    setToast,
  ] = useState<
    string | null
  >(null);

  /* ====================================================
     COMPUTED
  ==================================================== */

  const walletAddress =
    publicKey?.toBase58() ??
    null;

  const shortWallet =
    useMemo(() => {
      if (!walletAddress) {
        return null;
      }

      return `${walletAddress.slice(
        0,
        4
      )}...${walletAddress.slice(
        -4
      )}`;
    }, [
      walletAddress,
    ]);

  const totalInvested =
    useMemo(() => {
      return allocations.reduce(
        (
          total,
          item
        ) =>
          total +
          item.percentage,
        0
      );
    }, [
      allocations,
    ]);

  const remaining =
    100 -
    totalInvested;

  const isActive =
    savedRule?.status ===
    "active";

  const scrollingMarkets =
    useMemo(
      () => [
        ...markets,
        ...markets,
      ],
      [
        markets,
      ]
    );

  const localStorageKey =
    useMemo(() => {
      if (!walletAddress) {
        return null;
      }

      return `stockflow-draft-${walletAddress}`;
    }, [
      walletAddress,
    ]);

  const activityStorageKey =
    useMemo(() => {
      if (!walletAddress) {
        return null;
      }

      return `stockflow-activity-${walletAddress}`;
    }, [
      walletAddress,
    ]);

  const simulatedAllocations =
    useMemo(() => {
      if (!savedRule) {
        return [];
      }

      return savedRule.allocations
        .filter(
          (item) =>
            item.percentage >
            0
        )
        .map((item) => {
          const market =
            markets.find(
              (
                marketItem
              ) =>
                marketItem.ticker ===
                item.ticker
            );

          const amount =
            (simulationAmount *
              item.percentage) /
            100;

          const price =
            market?.price ??
            null;

          const estimatedUnits =
            price &&
            price > 0
              ? amount / price
              : null;

          return {
            ...item,
            amount,
            price,
            estimatedUnits,
          };
        });
    }, [
      savedRule,
      simulationAmount,
      markets,
    ]);

  const simulationRemaining =
    useMemo(() => {
      if (!savedRule) {
        return simulationAmount;
      }

      const percentage =
        savedRule.allocations.reduce(
          (
            total,
            item
          ) =>
            total +
            item.percentage,
          0
        );

      return (
        (simulationAmount *
          Math.max(
            100 -
              percentage,
            0
          )) /
        100
      );
    }, [
      savedRule,
      simulationAmount,
    ]);

  /* ====================================================
     EFFECTS
  ==================================================== */

  useEffect(() => {
    /*
      Hydrate the ticker immediately from the
      last successful market response. This
      prevents returning users from seeing
      "Unavailable" while the fresh request is
      still loading.
    */
    try {
      const cached =
        window.localStorage.getItem(
          MARKET_CACHE_KEY
        );

      if (cached) {
        const parsed =
          JSON.parse(cached) as {
            assets?: Market[];
            updatedAt?: string | null;
          };

        if (
          Array.isArray(
            parsed.assets
          )
        ) {
          setMarkets(
            parsed.assets
          );

          setMarketUpdatedAt(
            parsed.updatedAt ??
              null
          );
        }
      }
    } catch {
      window.localStorage.removeItem(
        MARKET_CACHE_KEY
      );
    }

    loadMarkets();

    const interval =
      window.setInterval(
        () => {
          loadMarkets();
        },
        60000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, []);

  useEffect(() => {
    if (!walletAddress) {
      setSavedRule(null);

      setAllocations(
        DEFAULT_ALLOCATIONS
      );

      setDevnetBalance(
        null
      );

      setActivityItems([]);

      return;
    }

    loadSavedRule(
      walletAddress
    );

    loadDevnetBalance();

    loadActivity(
      walletAddress
    );
  }, [
    walletAddress,
  ]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => {
          setToast(null);
        },
        3000
      );

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [
    toast,
  ]);

  /* ====================================================
     ACTIVITY
  ==================================================== */

  function loadActivity(
    address: string
  ) {
    const key =
      `stockflow-activity-${address}`;

    const stored =
      window.localStorage.getItem(
        key
      );

    if (!stored) {
      setActivityItems([]);
      return;
    }

    try {
      const parsed =
        JSON.parse(
          stored
        ) as ActivityItem[];

      setActivityItems(
        Array.isArray(parsed)
          ? parsed
          : []
      );
    } catch {
      window.localStorage.removeItem(
        key
      );

      setActivityItems([]);
    }
  }

  function addActivity(
    item: Omit<
      ActivityItem,
      "id" | "createdAt"
    >
  ) {
    if (
      !activityStorageKey
    ) {
      return;
    }

    const nextItem: ActivityItem =
      {
        ...item,

        id:
          crypto.randomUUID(),

        createdAt:
          new Date().toISOString(),
      };

    setActivityItems(
      (
        current
      ) => {
        const next = [
          nextItem,
          ...current,
        ].slice(
          0,
          6
        );

        window.localStorage.setItem(
          activityStorageKey,
          JSON.stringify(
            next
          )
        );

        return next;
      }
    );
  }

  /* ====================================================
     MARKET
  ==================================================== */

  async function loadMarkets() {
    try {
      const response =
        await fetch(
          "/api/xstocks",
          {
            cache:
              "no-store",
          }
        );

      if (!response.ok) {
        throw new Error(
          "Market API request failed."
        );
      }

      const data =
        await response.json();

      if (
        Array.isArray(
          data.assets
        )
      ) {
        setMarkets(
          (currentMarkets) => {
            const merged =
              data.assets.map(
                (
                  incoming: Market
                ) => {
                  const previous =
                    currentMarkets.find(
                      (
                        market
                      ) =>
                        market.ticker ===
                        incoming.ticker
                    );

                  return {
                    ...incoming,

                    /*
                      Keep the last successful
                      price if a provider refresh
                      temporarily returns null.
                    */
                    price:
                      incoming.price ??
                      previous?.price ??
                      null,
                  };
                }
              );

            if (
              merged.some(
                (
                  asset: Market
                ) =>
                  asset.price !==
                  null
              )
            ) {
              try {
                window.localStorage.setItem(
                  MARKET_CACHE_KEY,
                  JSON.stringify({
                    assets:
                      merged,
                    updatedAt:
                      data.updatedAt ??
                      new Date().toISOString(),
                  })
                );
              } catch {
                // Market caching is optional.
              }
            }

            return merged;
          }
        );

        if (
          data.assets.some(
            (
              asset: Market
            ) =>
              asset.price !==
              null
          )
        ) {
          setMarketUpdatedAt(
            data.updatedAt ??
              new Date().toISOString()
          );
        }
      }
    } catch (
      error
    ) {
      /*
        Keep the last successful prices
        visible if a refresh fails.
      */
      console.error(
        "Failed to refresh market data:",
        error
      );
    }
  }

  /* ====================================================
     DEVNET BALANCE
  ==================================================== */

  async function loadDevnetBalance() {
    if (!publicKey) {
      return;
    }

    try {
      const lamports =
        await connection.getBalance(
          publicKey
        );

      setDevnetBalance(
        lamports /
          LAMPORTS_PER_SOL
      );
    } catch (
      error
    ) {
      console.error(
        "Unable to read Devnet balance:",
        error
      );
    }
  }

  /* ====================================================
     DEVNET TEST
  ==================================================== */

  async function runDevnetTest() {
    if (
      !publicKey ||
      !connected
    ) {
      setDevnetError(
        "Connect your wallet first."
      );

      return;
    }

    setDevnetTesting(
      true
    );

    setDevnetError(
      null
    );

    setDevnetStatus(
      "Preparing Devnet verification..."
    );

    try {
      const latestBlockhash =
        await connection.getLatestBlockhash(
          "confirmed"
        );

      const transaction =
        new Transaction();

      transaction.feePayer =
        publicKey;

      transaction.recentBlockhash =
        latestBlockhash.blockhash;

      const memoText =
        `StockFlow Devnet verification | ${simulationAmount.toFixed(
          2
        )} USDC | ${new Date().toISOString()}`;

      transaction.add(
        new TransactionInstruction({
          keys: [
            {
              pubkey:
                publicKey,
              isSigner:
                true,
              isWritable:
                false,
            },
          ],
          programId:
            MEMO_PROGRAM_ID,
          data:
            new TextEncoder().encode(
              memoText
            ) as any,
        })
      );

      setDevnetStatus(
        "Approve the Devnet verification in your wallet."
      );

      const signature =
        await sendTransaction(
          transaction,
          connection,
          {
            skipPreflight:
              false,
            preflightCommitment:
              "confirmed",
            maxRetries:
              3,
          }
        );

      setDevnetStatus(
        "Verification submitted. Waiting for confirmation..."
      );

      const confirmation =
        await connection.confirmTransaction(
          {
            signature,
            blockhash:
              latestBlockhash.blockhash,
            lastValidBlockHeight:
              latestBlockhash.lastValidBlockHeight,
          },
          "confirmed"
        );

      if (
        confirmation.value.err
      ) {
        throw new Error(
          "The Devnet verification was submitted but could not be confirmed."
        );
      }

      addActivity({
        type:
          "devnet",

        title:
          "Investment flow verified",

        description:
          `${simulationAmount.toFixed(
            2
          )} USDC allocation flow verified successfully on Solana Devnet.`,

        status:
          "success",
      });

      setDevnetStatus(
        "Verification confirmed."
      );

      setToast(
        "Investment flow confirmed successfully."
      );

      await loadDevnetBalance();

      window.setTimeout(
        () => {
          setSimulatorOpen(
            false
          );

          setDevnetStatus(
            null
          );

          setDevnetError(
            null
          );
        },
        900
      );
    } catch (
      error
    ) {
      console.error(
        "Devnet verification failed:",
        error
      );

      let message =
        getErrorMessage(
          error
        );

      const lowerMessage =
        message.toLowerCase();

      if (
        lowerMessage.includes(
          "user rejected"
        ) ||
        lowerMessage.includes(
          "rejected"
        ) ||
        lowerMessage.includes(
          "cancelled"
        ) ||
        lowerMessage.includes(
          "canceled"
        )
      ) {
        message =
          "Transaction cancelled in wallet.";
      } else if (
        lowerMessage.includes(
          "blockhash"
        )
      ) {
        message =
          "The Devnet request expired. Please run it again.";
      } else if (
        lowerMessage.includes(
          "insufficient"
        )
      ) {
        message =
          "Not enough Devnet SOL to pay the network fee.";
      } else if (
        lowerMessage ===
          "unexpected error" ||
        lowerMessage ===
          "unexpected wallet error."
      ) {
        message =
          "The wallet could not complete the Devnet verification. Please make sure Phantom is still on Solana Devnet, then try again.";
      }

      setDevnetError(
        message
      );

      setDevnetStatus(
        null
      );
    } finally {
      setDevnetTesting(
        false
      );
    }
  }

  /* ====================================================
     LOAD RULE
  ==================================================== */

  async function loadSavedRule(
    address: string
  ) {
    setLoadingRule(
      true
    );

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "stockflow_rules"
          )
          .select("*")
          .eq(
            "wallet_address",
            address
          )
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        const rule =
          data as SavedRule;

        setSavedRule(
          rule
        );

        setAllocations(
          rule.allocations
        );

        window.localStorage.setItem(
          `stockflow-draft-${address}`,
          JSON.stringify(
            rule
          )
        );

        return;
      }

      setSavedRule(
        null
      );

      setAllocations(
        DEFAULT_ALLOCATIONS
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to load StockFlow rule:",
        error
      );

      const fallbackKey =
        `stockflow-draft-${address}`;

      const localRule =
        window.localStorage.getItem(
          fallbackKey
        );

      if (localRule) {
        try {
          const parsed =
            JSON.parse(
              localRule
            ) as SavedRule;

          setSavedRule(
            parsed
          );

          setAllocations(
            parsed.allocations
          );

          setToast(
            "Loaded local backup."
          );
        } catch {
          window.localStorage.removeItem(
            fallbackKey
          );
        }
      }
    } finally {
      setLoadingRule(
        false
      );
    }
  }

  /* ====================================================
     BUILDER
  ==================================================== */

  function openBuilder() {
    if (!connected) {
      setVisible(true);
      return;
    }

    if (savedRule) {
      setAllocations(
        savedRule.allocations
      );
    }

    setStep(1);

    setBuilderOpen(
      true
    );
  }

  function openSimulator() {
    setDevnetError(
      null
    );

    setDevnetStatus(
      null
    );

    setSimulatorOpen(
      true
    );
  }

  function closeSimulator() {
    setSimulatorOpen(
      false
    );

    setDevnetError(
      null
    );

    setDevnetStatus(
      null
    );
  }

  function addStock() {
    const selected =
      allocations.map(
        (
          item
        ) =>
          item.ticker
      );

    const nextStock =
      AVAILABLE_STOCKS.find(
        (
          stock
        ) =>
          !selected.includes(
            stock.ticker
          )
      );

    if (!nextStock) {
      return;
    }

    setAllocations(
      (
        current
      ) => [
        ...current,

        {
          ticker:
            nextStock.ticker,

          percentage:
            0,
        },
      ]
    );
  }

  function removeStock(
    ticker: string
  ) {
    setAllocations(
      (
        current
      ) =>
        current.filter(
          (
            item
          ) =>
            item.ticker !==
            ticker
        )
    );
  }

  function updateAllocation(
    ticker: string,
    value: number
  ) {
    const safeValue =
      Math.min(
        100,
        Math.max(
          0,
          value
        )
      );

    setAllocations(
      (
        current
      ) =>
        current.map(
          (
            item
          ) =>
            item.ticker ===
            ticker
              ? {
                  ...item,

                  percentage:
                    safeValue,
                }
              : item
        )
    );
  }

  /* ====================================================
     SAVE DRAFT
  ==================================================== */

  async function saveDraft() {
    if (!walletAddress) {
      return;
    }

    if (
      totalInvested <=
        0 ||
      totalInvested >
        100
    ) {
      setToast(
        "Please fix your allocation."
      );

      return;
    }

    setSavingRule(
      true
    );

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "stockflow_rules"
          )
          .upsert(
            {
              wallet_address:
                walletAddress,

              trigger_type:
                "USDC_DEPOSIT",

              allocations,

              status:
                "draft",

              updated_at:
                new Date().toISOString(),

              activated_at:
                null,
            },

            {
              onConflict:
                "wallet_address",
            }
          )
          .select()
          .single();

      if (error) {
        throw error;
      }

      const rule =
        data as SavedRule;

      setSavedRule(
        rule
      );

      if (
        localStorageKey
      ) {
        window.localStorage.setItem(
          localStorageKey,
          JSON.stringify(
            rule
          )
        );
      }

      setToast(
        "Rule saved as draft."
      );

      setBuilderOpen(
        false
      );
    } catch (
      error
    ) {
      console.error(
        "Save failed:",
        error
      );

      setToast(
        "Could not save rule."
      );
    } finally {
      setSavingRule(
        false
      );
    }
  }

  /* ====================================================
     ACTIVATE RULE
  ==================================================== */

  async function activateRule() {
    if (!walletAddress) {
      return;
    }

    if (
      totalInvested <=
        0 ||
      totalInvested >
        100
    ) {
      setToast(
        "Please fix your allocation."
      );

      return;
    }

    setActivatingRule(
      true
    );

    const now =
      new Date().toISOString();

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "stockflow_rules"
          )
          .upsert(
            {
              wallet_address:
                walletAddress,

              trigger_type:
                "USDC_DEPOSIT",

              allocations,

              status:
                "active",

              updated_at:
                now,

              activated_at:
                now,
            },

            {
              onConflict:
                "wallet_address",
            }
          )
          .select()
          .single();

      if (error) {
        throw error;
      }

      const rule =
        data as SavedRule;

      setSavedRule(
        rule
      );

      if (
        localStorageKey
      ) {
        window.localStorage.setItem(
          localStorageKey,
          JSON.stringify(
            rule
          )
        );
      }

      const allocationText =
        allocations
          .filter(
            (item) =>
              item.percentage >
              0
          )
          .map(
            (item) =>
              `${item.ticker} ${item.percentage}%`
          )
          .join(" · ");

      addActivity({
        type:
          "rule",

        title:
          "Investment rule activated",

        description:
          `${allocationText}${
            remaining > 0
              ? ` · Keep ${remaining}% USDC`
              : ""
          }`,

        status:
          "active",
      });

      setToast(
        "Investment rule activated."
      );

      setBuilderOpen(
        false
      );
    } catch (
      error
    ) {
      console.error(
        "Activation failed:",
        error
      );

      setToast(
        "Could not activate rule."
      );
    } finally {
      setActivatingRule(
        false
      );
    }
  }

  /* ====================================================
     RENDER
  ==================================================== */

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#060606] text-white">
      {/* =================================================
          HERO
      ================================================= */}

      <section className="hero-section relative overflow-hidden">
        <div className="hero-noise" />

        <div className="hero-grid animated-grid" />

        <motion.div
          className="motion-orb motion-orb-one"
          animate={{
            x: [
              0,
              120,
              -40,
              0,
            ],

            y: [
              0,
              40,
              120,
              0,
            ],

            scale: [
              1,
              1.15,
              0.95,
              1,
            ],

            opacity: [
              0.35,
              0.7,
              0.4,
              0.35,
            ],
          }}
          transition={{
            duration:
              16,

            repeat:
              Infinity,

            ease:
              "easeInOut",
          }}
        />

        <motion.div
          className="motion-orb motion-orb-two"
          animate={{
            x: [
              0,
              -80,
              50,
              0,
            ],

            y: [
              0,
              90,
              30,
              0,
            ],

            scale: [
              1.1,
              0.95,
              1.2,
              1.1,
            ],

            opacity: [
              0.28,
              0.55,
              0.32,
              0.28,
            ],
          }}
          transition={{
            duration:
              18,

            repeat:
              Infinity,

            ease:
              "easeInOut",
          }}
        />

        <nav className="relative z-30 mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-6 md:px-10 lg:px-16">
          <a
            href="#"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-xl">
              <ChartNoAxesCombined
                size={
                  20
                }
              />
            </div>

            <span className="text-lg font-semibold tracking-[-0.03em]">
              StockFlow
            </span>
          </a>

          <div className="hidden items-center gap-9 rounded-full border border-white/[0.08] bg-white/[0.025] px-7 py-3 text-sm text-white/60 backdrop-blur-xl lg:flex">
            <a
              href="#markets"
              className="nav-link"
            >
              Markets
            </a>

            <a
              href="#how"
              className="nav-link"
            >
              How it works
            </a>

            <a
              href="#activity"
              className="nav-link"
            >
              Activity
            </a>
          </div>

          <div className="hidden md:block">
            <WalletMultiButton />
          </div>

          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] md:hidden"
            aria-label="Menu"
          >
            <Menu
              size={
                20
              }
            />
          </button>
        </nav>

        <div className="relative z-20 mx-auto flex w-full max-w-[1440px] flex-col items-center px-5 pb-14 pt-20 text-center md:px-10 md:pt-24 lg:px-16 lg:pt-28">
          <div className="launch-pill">
            <span className="launch-dot" />

            Built for Stocklana on Solana
          </div>

          <h1 className="mt-8 max-w-[950px] text-[3.2rem] font-medium leading-[0.98] tracking-[-0.065em] sm:text-[4.4rem] md:text-[5.6rem] lg:text-[6.8rem]">
            Investing that moves

            <span className="hero-title-gradient block">
              with your money.
            </span>
          </h1>

          <p className="mt-7 max-w-[620px] text-[15px] leading-7 text-white/45 sm:text-base">
            Create automatic investment
            rules for tokenized stocks on
            Solana. Receive USDC, choose
            your allocations, and verify
            your flow safely on Devnet.
          </p>

          {connected && (
            <div className="mt-5 flex items-center gap-2 rounded-full border border-emerald-500/10 bg-emerald-500/[0.05] px-3 py-2 text-[11px] text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />

              Wallet connected

              <span className="text-white/35">
                {
                  shortWallet
                }
              </span>
            </div>
          )}

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <button
              onClick={
                openBuilder
              }
              className="primary-button"
              disabled={
                loadingRule
              }
            >
              {!connected ? (
                <>
                  Connect Wallet

                  <Wallet
                    size={
                      17
                    }
                  />
                </>
              ) : loadingRule ? (
                <>
                  Loading...
                </>
              ) : isActive ? (
                <>
                  Manage Rule

                  <ArrowRight
                    size={
                      17
                    }
                  />
                </>
              ) : savedRule ? (
                <>
                  Continue Draft

                  <ArrowRight
                    size={
                      17
                    }
                  />
                </>
              ) : (
                <>
                  Start Investing

                  <ArrowRight
                    size={
                      17
                    }
                  />
                </>
              )}
            </button>

            {isActive ? (
              <button
                onClick={
                  openSimulator
                }
                className="secondary-button"
              >
                Test Rule

                <Calculator
                  size={
                    16
                  }
                />
              </button>
            ) : (
              <a
                href="#how"
                className="secondary-button"
              >
                Explore StockFlow

                <Sparkles
                  size={
                    16
                  }
                />
              </a>
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs text-white/35">
            <span className="flex items-center gap-2">
              <ShieldCheck
                size={
                  15
                }
              />

              Non-custodial
            </span>

            <span className="flex items-center gap-2">
              <WalletCards
                size={
                  15
                }
              />

              Wallet-native
            </span>

            <span className="flex items-center gap-2">
              <ChartNoAxesCombined
                size={
                  15
                }
              />

              Automated allocations
            </span>
          </div>
        </div>

        {/* MARKET TICKER */}

        <div
          id="markets"
          className="relative z-20 w-full border-t border-white/[0.05] py-5"
        >
          <div className="market-marquee-wrapper">
            <div className="market-marquee">
              {scrollingMarkets.map(
                (
                  market,
                  index
                ) => (
                  <div
                    key={`${market.ticker}-${index}`}
                    className="market-card market-card-scroll"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="coin-icon">
                            {market.ticker.slice(
                              0,
                              1
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-medium">
                              {
                                market.name
                              }
                            </p>

                            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/30">
                              {
                                market.ticker
                              }
                            </p>
                          </div>
                        </div>

                        <p className="mt-6 text-xl font-medium tracking-[-0.03em]">
                          {formatPrice(
                            market.price
                          )}
                        </p>
                      </div>

                      <div className="market-change">
                        {market.price ===
                        null
                          ? "..."
                          : "LIVE"}
                      </div>
                    </div>

                    <div className="mt-6 h-px w-full bg-white/[0.06]" />

                    <div className="mt-3 flex justify-between text-[10px] text-white/25">
                      <span>
                        xSTOCKS PRICE
                      </span>

                      <span>
                        {marketUpdatedAt
                          ? "UPDATED"
                          : "LOADING"}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =================================================
          HOW IT WORKS
      ================================================= */}

      <section
        id="how"
        className="relative overflow-hidden border-t border-white/[0.04] px-5 py-24 md:px-10 lg:py-32"
      >
        <div className="section-glow" />

        <div className="relative z-10 mx-auto grid max-w-[1200px] items-center gap-16 lg:grid-cols-2">
          <div>
            <div className="section-tag">
              How it works
            </div>

            <h2 className="mt-6 max-w-xl text-4xl font-medium leading-[1.05] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
              Your money arrives.

              <span className="block text-white/35">
                StockFlow puts it to work.
              </span>
            </h2>

            <p className="mt-6 max-w-lg text-sm leading-7 text-white/40 sm:text-base">
              Build an allocation rule,
              simulate an incoming USDC
              deposit, and verify wallet
              execution safely on Solana
              Devnet.
            </p>
          </div>

          <div className="flow-card">
            <div className="flow-top">
              <span>
                Investment Rule
              </span>

              <span className="flow-status">
                {isActive
                  ? "Active"
                  : savedRule
                    ? "Draft"
                    : "Preview"}
              </span>
            </div>

            <div className="mt-8 rounded-2xl border border-white/[0.07] bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/30">
                WHEN I RECEIVE
              </p>

              <p className="mt-2 font-medium">
                USDC
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {(savedRule?.allocations ??
                DEFAULT_ALLOCATIONS
              ).map(
                (
                  allocation
                ) => (
                  <div
                    key={
                      allocation.ticker
                    }
                    className="allocation-row"
                  >
                    <span>
                      {
                        allocation.ticker
                      }
                    </span>

                    <span className="text-white/45">
                      {
                        allocation.percentage
                      }
                      %
                    </span>
                  </div>
                )
              )}

              <div className="allocation-row">
                <span>
                  Keep as USDC
                </span>

                <span className="text-white/45">
                  {savedRule
                    ? Math.max(
                        100 -
                          savedRule.allocations.reduce(
                            (
                              total,
                              item
                            ) =>
                              total +
                              item.percentage,
                            0
                          ),
                        0
                      )
                    : 60}
                  %
                </span>
              </div>
            </div>

            <button
              onClick={
                isActive
                  ? openSimulator
                  : openBuilder
              }
              className="mt-7 w-full rounded-2xl bg-white py-4 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              {isActive
                ? "Run Active Rule"
                : savedRule
                  ? "Continue Draft"
                  : "Create My Rule"}
            </button>
          </div>
        </div>
      </section>

      {/* =================================================
          ACTIVITY
      ================================================= */}

      <section
        id="activity"
        className="border-t border-white/[0.05] bg-[#080808] px-5 py-24 md:px-10"
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="section-tag">
                Activity
              </div>

              <h2 className="mt-5 text-4xl font-medium tracking-[-0.05em] sm:text-5xl">
                Your StockFlow activity
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-white/40">
                Your current allocation
                and recent activity for
                this connected wallet.
              </p>
            </div>

            {connected && (
              <div className="rounded-full border border-white/[0.07] bg-white/[0.025] px-4 py-2 text-[10px] text-white/35">
                Wallet {shortWallet}
              </div>
            )}
          </div>

          {!connected ? (
            <div className="mt-10 rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-8 text-center">
              <History
                className="mx-auto text-white/20"
                size={
                  25
                }
              />

              <h3 className="mt-4 text-sm font-semibold">
                Connect your wallet
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-white/30">
                Your current allocation
                and activity will appear
                here.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid gap-4 lg:grid-cols-[0.95fr_1.4fr]">
              {/* CURRENT RULE */}

              <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-white/30">
                    <Activity
                      size={
                        14
                      }
                    />

                    Current allocation
                  </div>

                  <span
                    className={
                      isActive
                        ? "rounded-full border border-emerald-400/10 bg-emerald-400/[0.05] px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-emerald-300"
                        : "rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-white/35"
                    }
                  >
                    {isActive
                      ? "Active"
                      : savedRule
                        ? "Draft"
                        : "None"}
                  </span>
                </div>

                {savedRule ? (
                  <>
                    <div className="mt-6 space-y-2">
                      {savedRule.allocations
                        .filter(
                          (
                            item
                          ) =>
                            item.percentage >
                            0
                        )
                        .map(
                          (
                            item
                          ) => (
                            <div
                              key={
                                item.ticker
                              }
                              className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/20 px-4 py-3"
                            >
                              <span className="text-xs font-medium">
                                {
                                  item.ticker
                                }
                              </span>

                              <span className="text-xs text-white/40">
                                {
                                  item.percentage
                                }
                                %
                              </span>
                            </div>
                          )
                        )}

                      <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/20 px-4 py-3">
                        <span className="text-xs font-medium">
                          Keep as USDC
                        </span>

                        <span className="text-xs text-white/40">
                          {Math.max(
                            100 -
                              savedRule.allocations.reduce(
                                (
                                  total,
                                  item
                                ) =>
                                  total +
                                  item.percentage,
                                0
                              ),
                            0
                          )}
                          %
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={
                        isActive
                          ? openSimulator
                          : openBuilder
                      }
                      className="mt-5 inline-flex items-center gap-2 text-[10px] font-semibold text-white/60 transition hover:text-white"
                    >
                      {isActive
                        ? "Run allocation"
                        : "Continue rule"}

                      <ArrowRight
                        size={
                          13
                        }
                      />
                    </button>
                  </>
                ) : (
                  <div className="mt-8">
                    <p className="text-xs leading-6 text-white/30">
                      You have not created
                      an allocation rule
                      with this wallet yet.
                    </p>

                    <button
                      onClick={
                        openBuilder
                      }
                      className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold text-white/60"
                    >
                      Create rule

                      <ArrowRight
                        size={
                          13
                        }
                      />
                    </button>
                  </div>
                )}
              </div>

              {/* RECENT ACTIVITY */}

              <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-white/30">
                  <History
                    size={
                      14
                    }
                  />

                  Recent activity
                </div>

                {activityItems.length ===
                0 ? (
                  <div className="py-12 text-center">
                    <p className="text-xs text-white/30">
                      No activity yet.
                    </p>

                    <p className="mt-2 text-[10px] text-white/20">
                      Your confirmed
                      StockFlow actions
                      will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {activityItems.map(
                      (
                        item
                      ) => (
                        <div
                          key={
                            item.id
                          }
                          className="flex gap-4 rounded-2xl border border-white/[0.05] bg-black/20 p-4"
                        >
                          <div
                            className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${
                              item.status ===
                              "success"
                                ? "bg-emerald-400/[0.07] text-emerald-300"
                                : "bg-red-400/[0.07] text-red-300"
                            }`}
                          >
                            {item.type ===
                            "devnet" ? (
                              <CheckCircle2
                                size={
                                  14
                                }
                              />
                            ) : (
                              <Zap
                                size={
                                  14
                                }
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <strong className="text-[11px] font-semibold text-white/80">
                                {
                                  item.title
                                }
                              </strong>

                              <span className="text-[8px] uppercase tracking-[0.08em] text-white/20">
                                {formatActivityTime(
                                  item.createdAt
                                )}
                              </span>
                            </div>

                            <p className="mt-2 text-[10px] leading-5 text-white/30">
                              {
                                item.description
                              }
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =================================================
          RULE BUILDER
      ================================================= */}

      <AnimatePresence>
        {builderOpen && (
          <motion.div
            className="rule-overlay"
            initial={{
              opacity:
                0,
            }}
            animate={{
              opacity:
                1,
            }}
            exit={{
              opacity:
                0,
            }}
          >
            <motion.div
              className="rule-builder"
              initial={{
                opacity:
                  0,
                y:
                  30,
                scale:
                  0.98,
              }}
              animate={{
                opacity:
                  1,
                y:
                  0,
                scale:
                  1,
              }}
              exit={{
                opacity:
                  0,
                y:
                  20,
                scale:
                  0.98,
              }}
            >
              <div className="rule-builder-top">
                <div>
                  <p className="rule-kicker">
                    StockFlow automation
                  </p>

                  <h2>
                    {isActive
                      ? "Manage active rule"
                      : savedRule
                        ? "Continue investment rule"
                        : "Create investment rule"}
                  </h2>
                </div>

                <button
                  onClick={() =>
                    setBuilderOpen(
                      false
                    )
                  }
                  className="rule-close"
                  aria-label="Close"
                >
                  <X
                    size={
                      18
                    }
                  />
                </button>
              </div>

              <div className="rule-progress">
                {[1, 2, 3].map(
                  (
                    item
                  ) => (
                    <div
                      key={
                        item
                      }
                      className={`rule-progress-item ${
                        step >=
                        item
                          ? "active"
                          : ""
                      }`}
                    />
                  )
                )}
              </div>

              {step ===
                1 && (
                <div className="rule-step">
                  <p className="rule-step-label">
                    Step 1
                  </p>

                  <h3>
                    What should trigger
                    your investment?
                  </h3>

                  <p className="rule-step-description">
                    StockFlow watches for
                    qualifying USDC
                    deposits.
                  </p>

                  <div className="trigger-card selected">
                    <div className="trigger-token">
                      U
                    </div>

                    <div>
                      <strong>
                        When I receive USDC
                      </strong>

                      <p>
                        Run my StockFlow
                        allocation.
                      </p>
                    </div>

                    <div className="trigger-check">
                      <Check
                        size={
                          15
                        }
                      />
                    </div>
                  </div>

                  <div className="rule-footer">
                    <div />

                    <button
                      className="rule-primary"
                      onClick={() =>
                        setStep(
                          2
                        )
                      }
                    >
                      Continue

                      <ArrowRight
                        size={
                          16
                        }
                      />
                    </button>
                  </div>
                </div>
              )}

              {step ===
                2 && (
                <div className="rule-step">
                  <p className="rule-step-label">
                    Step 2
                  </p>

                  <h3>
                    Build your allocation
                  </h3>

                  <div className="allocation-summary">
                    <div>
                      <span>
                        Invested
                      </span>

                      <strong>
                        {
                          totalInvested
                        }
                        %
                      </strong>
                    </div>

                    <div>
                      <span>
                        Keep as USDC
                      </span>

                      <strong>
                        {Math.max(
                          remaining,
                          0
                        )}
                        %
                      </strong>
                    </div>
                  </div>

                  {totalInvested >
                    100 && (
                    <div className="allocation-error">
                      Allocations cannot
                      exceed 100%.
                    </div>
                  )}

                  <div className="builder-allocations">
                    {allocations.map(
                      (
                        allocation
                      ) => {
                        const stock =
                          AVAILABLE_STOCKS.find(
                            (
                              item
                            ) =>
                              item.ticker ===
                              allocation.ticker
                          );

                        return (
                          <div
                            key={
                              allocation.ticker
                            }
                            className="builder-allocation-row"
                          >
                            <div className="builder-stock">
                              <div className="builder-stock-icon">
                                {allocation.ticker.charAt(
                                  0
                                )}
                              </div>

                              <div>
                                <strong>
                                  {
                                    stock?.name
                                  }
                                </strong>

                                <span>
                                  {
                                    allocation.ticker
                                  }
                                </span>
                              </div>
                            </div>

                            <div className="allocation-input-wrap">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={
                                  allocation.percentage
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateAllocation(
                                    allocation.ticker,
                                    Number(
                                      event
                                        .target
                                        .value
                                    )
                                  )
                                }
                              />

                              <span>
                                %
                              </span>
                            </div>

                            <button
                              className="allocation-remove"
                              onClick={() =>
                                removeStock(
                                  allocation.ticker
                                )
                              }
                              aria-label={`Remove ${allocation.ticker}`}
                            >
                              <X
                                size={
                                  15
                                }
                              />
                            </button>
                          </div>
                        );
                      }
                    )}
                  </div>

                  {allocations.length <
                    AVAILABLE_STOCKS.length && (
                    <button
                      className="add-stock-button"
                      onClick={
                        addStock
                      }
                    >
                      <Plus
                        size={
                          16
                        }
                      />

                      Add another stock
                    </button>
                  )}

                  <div className="rule-footer">
                    <button
                      className="rule-secondary"
                      onClick={() =>
                        setStep(
                          1
                        )
                      }
                    >
                      <ArrowLeft
                        size={
                          16
                        }
                      />

                      Back
                    </button>

                    <button
                      className="rule-primary"
                      disabled={
                        totalInvested <=
                          0 ||
                        totalInvested >
                          100
                      }
                      onClick={() =>
                        setStep(
                          3
                        )
                      }
                    >
                      Review

                      <ArrowRight
                        size={
                          16
                        }
                      />
                    </button>
                  </div>
                </div>
              )}

              {step ===
                3 && (
                <div className="rule-step">
                  <p className="rule-step-label">
                    Step 3
                  </p>

                  <h3>
                    Review your rule
                  </h3>

                  <div className="review-rule-card">
                    {allocations
                      .filter(
                        (
                          item
                        ) =>
                          item.percentage >
                          0
                      )
                      .map(
                        (
                          item
                        ) => (
                          <div
                            key={
                              item.ticker
                            }
                            className="review-row"
                          >
                            <span>
                              {
                                item.ticker
                              }
                            </span>

                            <strong>
                              {
                                item.percentage
                              }
                              %
                            </strong>
                          </div>
                        )
                      )}

                    {remaining >
                      0 && (
                      <div className="review-row">
                        <span>
                          Keep as USDC
                        </span>

                        <strong>
                          {
                            remaining
                          }
                          %
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="rule-footer">
                    <button
                      className="rule-secondary"
                      onClick={() =>
                        setStep(
                          2
                        )
                      }
                    >
                      <ArrowLeft
                        size={
                          16
                        }
                      />

                      Back
                    </button>

                    <div className="flex gap-2">
                      {!isActive && (
                        <button
                          className="rule-secondary"
                          onClick={
                            saveDraft
                          }
                          disabled={
                            savingRule ||
                            activatingRule
                          }
                        >
                          {savingRule
                            ? "Saving..."
                            : "Save Draft"}
                        </button>
                      )}

                      <button
                        className="rule-primary"
                        onClick={
                          activateRule
                        }
                        disabled={
                          activatingRule ||
                          savingRule
                        }
                      >
                        {activatingRule
                          ? "Activating..."
                          : isActive
                            ? "Update Active Rule"
                            : "Activate Rule"}

                        <Zap
                          size={
                            16
                          }
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================
          EXECUTION INTERFACE
      ================================================= */}

      <AnimatePresence>
        {simulatorOpen &&
          savedRule && (
            <motion.div
              className="rule-overlay"
              initial={{
                opacity:
                  0,
              }}
              animate={{
                opacity:
                  1,
              }}
              exit={{
                opacity:
                  0,
              }}
            >
              <motion.div
                className="rule-builder"
                initial={{
                  opacity:
                    0,
                  y:
                    25,
                }}
                animate={{
                  opacity:
                    1,
                  y:
                    0,
                }}
                exit={{
                  opacity:
                    0,
                  y:
                    15,
                }}
              >
                <div className="rule-builder-top">
                  <div>
                    <p className="rule-kicker">
                      StockFlow execution
                    </p>

                    <h2>
                      Run your allocation
                    </h2>

                    <div className="simulation-demo-badge">
                      <span />

                      Solana Devnet
                    </div>
                  </div>

                  <button
                    className="rule-close"
                    onClick={
                      closeSimulator
                    }
                    aria-label="Close"
                  >
                    <X
                      size={
                        18
                      }
                    />
                  </button>
                </div>

                <p className="rule-step-description">
                  Enter the incoming USDC
                  amount to see how your
                  active allocation will
                  be distributed.
                </p>

                {/* AMOUNT */}

                <div className="mt-7">
                  <label className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                    Incoming amount
                  </label>

                  <div className="simulation-input">
                    <input
                      type="number"
                      min="1"
                      value={
                        simulationAmount
                      }
                      onChange={(
                        event
                      ) =>
                        setSimulationAmount(
                          Math.max(
                            Number(
                              event
                                .target
                                .value
                            ),
                            0
                          )
                        )
                      }
                    />

                    <span>
                      USDC
                    </span>
                  </div>
                </div>

                {/* ALLOCATION */}

                <div className="simulation-flow">
                  <div className="simulation-source">
                    <span>
                      Incoming
                    </span>

                    <strong>
                      {simulationAmount.toFixed(
                        2
                      )}{" "}
                      USDC
                    </strong>
                  </div>

                  <ArrowRight
                    className="rotate-90 text-white/20"
                    size={
                      20
                    }
                  />

                  <div className="simulation-results">
                    {simulatedAllocations.map(
                      (
                        item
                      ) => (
                        <div
                          key={
                            item.ticker
                          }
                          className="simulation-row simulation-row-expanded"
                        >
                          <div>
                            <strong>
                              {
                                item.ticker
                              }
                            </strong>

                            <span>
                              {
                                item.percentage
                              }
                              % allocation
                            </span>

                            <span>
                              Price:{" "}
                              {formatPrice(
                                item.price
                              )}
                            </span>
                          </div>

                          <div className="simulation-output">
                            <strong>
                              {item.amount.toFixed(
                                2
                              )}{" "}
                              USDC
                            </strong>

                            <span>
                              ≈{" "}
                              {formatUnits(
                                item.estimatedUnits
                              )}{" "}
                              {
                                item.ticker
                              }
                            </span>
                          </div>
                        </div>
                      )
                    )}

                    {simulationRemaining >
                      0 && (
                      <div className="simulation-row">
                        <div>
                          <strong>
                            Keep as USDC
                          </strong>

                          <span>
                            Remaining balance
                          </span>
                        </div>

                        <strong>
                          {simulationRemaining.toFixed(
                            2
                          )}{" "}
                          USDC
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* DEVNET STATUS */}

                <div className="mt-7 rounded-[20px] border border-cyan-400/10 bg-cyan-400/[0.025] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-300">
                        <FlaskConical
                          size={
                            14
                          }
                        />

                        Solana Devnet
                      </div>

                      <h3 className="mt-2 text-[15px] font-semibold">
                        Wallet execution
                      </h3>

                      <p className="mt-1 max-w-md text-[10px] leading-5 text-white/35">
                        Confirm the
                        verification in your
                        connected wallet to
                        validate the
                        allocation flow.
                      </p>
                    </div>

                    <span className="rounded-full border border-cyan-300/10 bg-cyan-300/[0.05] px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-cyan-300">
                      DEVNET
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/[0.05] bg-black/20 p-3">
                      <span className="block text-[8px] uppercase tracking-[0.09em] text-white/25">
                        Wallet balance
                      </span>

                      <strong className="mt-1 block text-[11px] text-white/70">
                        {devnetBalance !==
                        null
                          ? `${devnetBalance.toFixed(
                              4
                            )} DEV SOL`
                          : "Loading..."}
                      </strong>
                    </div>

                    <div className="rounded-xl border border-white/[0.05] bg-black/20 p-3">
                      <span className="block text-[8px] uppercase tracking-[0.09em] text-white/25">
                        Network
                      </span>

                      <strong className="mt-1 block text-[11px] text-white/70">
                        Solana Devnet
                      </strong>
                    </div>
                  </div>

                  {devnetStatus && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.03] px-3 py-2 text-[9px] text-cyan-200">
                      {devnetTesting ? (
                        <Loader2
                          size={
                            13
                          }
                          className="animate-spin"
                        />
                      ) : (
                        <CheckCircle2
                          size={
                            13
                          }
                        />
                      )}

                      {
                        devnetStatus
                      }
                    </div>
                  )}

                  {devnetError && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-400/10 bg-red-400/[0.03] px-3 py-2 text-[9px] text-red-300">
                      <XCircle
                        size={
                          13
                        }
                      />

                      {
                        devnetError
                      }
                    </div>
                  )}
                </div>

                {/* FOOTER */}

                <div className="rule-footer">
                  <button
                    className="rule-secondary"
                    onClick={
                      closeSimulator
                    }
                    disabled={
                      devnetTesting
                    }
                  >
                    Close
                  </button>

                  <button
                    className="rule-primary"
                    onClick={
                      runDevnetTest
                    }
                    disabled={
                      devnetTesting ||
                      simulationAmount <=
                        0
                    }
                  >
                    {devnetTesting ? (
                      <>
                        <Loader2
                          size={
                            16
                          }
                          className="animate-spin"
                        />

                        Confirming...
                      </>
                    ) : (
                      <>
                        Run Devnet Test

                        <ArrowRight
                          size={
                            16
                          }
                        />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* =================================================
          TOAST
      ================================================= */}

      <AnimatePresence>
        {toast && (
          <motion.div
            className="stockflow-toast"
            initial={{
              opacity:
                0,
              y:
                20,
              scale:
                0.96,
            }}
            animate={{
              opacity:
                1,
              y:
                0,
              scale:
                1,
            }}
            exit={{
              opacity:
                0,
              y:
                15,
              scale:
                0.96,
            }}
          >
            <span>
              <Check
                size={
                  15
                }
              />
            </span>

            {
              toast
            }
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
