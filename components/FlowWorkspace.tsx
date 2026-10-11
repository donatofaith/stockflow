"use client";

import { Buffer } from "buffer";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import dynamic from "next/dynamic";
const RuleBuilder = dynamic(() => import("@/components/RuleBuilder"));
const FlowSimulator = dynamic(() => import("@/components/FlowSimulator"));

import {
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import { useWalletModal } from "@/components/WalletAccess";

import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  History,
  Zap,
} from "lucide-react";

import { useMarketData } from "@/components/useMarketData";
import type { Allocation, SavedRule } from "@/lib/flow-types";
import { AVAILABLE_STOCKS } from "@/lib/markets";
import Dashboard from "@/components/Dashboard";

import { supabase } from "@/lib/supabase";

/* ======================================================
   TYPES
====================================================== */

type ActivityItem = {
  id: string;

  type: "rule" | "devnet";

  title: string;
  description: string;

  status: "success" | "active";

  createdAt: string;
};

/* ======================================================
   CONSTANTS
====================================================== */

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
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

function formatActivityTime(timestamp: string) {
  const date = new Date(timestamp);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;

    if (typeof record.message === "string") {
      return record.message;
    }

    if (typeof record.error === "string") {
      return record.error;
    }

    if (typeof record.cause === "object" && record.cause !== null) {
      const cause = record.cause as Record<string, unknown>;

      if (typeof cause.message === "string") {
        return cause.message;
      }
    }
  }

  return "Unexpected wallet error.";
}

/* ======================================================
   PAGE
====================================================== */

export default function FlowWorkspace() {
  const { publicKey } = useWallet();
  return <HomeContent key={publicKey?.toBase58() ?? "disconnected"} />;
}

function HomeContent() {
  const [activityExpanded, setActivityExpanded] = useState(false);
  const { connection } = useConnection();

  const { connected, publicKey, sendTransaction } = useWallet();

  const { setVisible } = useWalletModal();

  /* ====================================================
     MARKET
  ==================================================== */

  const { markets } = useMarketData();

  /* ====================================================
     RULE
  ==================================================== */

  const [builderOpen, setBuilderOpen] = useState(false);

  const [simulatorOpen, setSimulatorOpen] = useState(false);

  const [step, setStep] = useState(1);

  const [allocations, setAllocations] =
    useState<Allocation[]>(DEFAULT_ALLOCATIONS);

  const [savedRule, setSavedRule] = useState<SavedRule | null>(null);

  const [loadingRule, setLoadingRule] = useState(false);

  const [savingRule, setSavingRule] = useState(false);

  const [activatingRule, setActivatingRule] = useState(false);

  /* ====================================================
     SIMULATOR
  ==================================================== */

  const [simulationAmount, setSimulationAmount] = useState(100);

  /* ====================================================
     DEVNET
  ==================================================== */

  const [devnetTesting, setDevnetTesting] = useState(false);

  const [devnetError, setDevnetError] = useState<string | null>(null);

  const [devnetStatus, setDevnetStatus] = useState<string | null>(null);

  const [devnetBalance, setDevnetBalance] = useState<number | null>(null);

  /* ====================================================
     ACTIVITY
  ==================================================== */

  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);

  /* ====================================================
     UI
  ==================================================== */

  const [toast, setToast] = useState<string | null>(null);

  /* ====================================================
     COMPUTED
  ==================================================== */

  const walletAddress = publicKey?.toBase58() ?? null;

  const shortWallet = useMemo(() => {
    if (!walletAddress) {
      return null;
    }

    return `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
  }, [walletAddress]);

  const totalInvest = useMemo(() => {
    return allocations.reduce((total, item) => total + item.percentage, 0);
  }, [allocations]);

  const remaining = 100 - totalInvest;

  const isActive = savedRule?.status === "active";

  const localStorageKey = useMemo(() => {
    if (!walletAddress) {
      return null;
    }

    return `stockflow-draft-${walletAddress}`;
  }, [walletAddress]);

  const activityStorageKey = useMemo(() => {
    if (!walletAddress) {
      return null;
    }

    return `stockflow-activity-${walletAddress}`;
  }, [walletAddress]);

  const simulatedAllocations = useMemo(() => {
    if (!savedRule) {
      return [];
    }

    return savedRule.allocations
      .filter((item) => item.percentage > 0)
      .map((item) => {
        const market = markets.find(
          (marketItem) => marketItem.ticker === item.ticker,
        );

        const amount = (simulationAmount * item.percentage) / 100;

        const price = market?.price ?? null;

        const estimatedUnits = price && price > 0 ? amount / price : null;

        return {
          ...item,
          amount,
          price,
          estimatedUnits,
        };
      });
  }, [savedRule, simulationAmount, markets]);

  const simulationRemaining = useMemo(() => {
    if (!savedRule) {
      return simulationAmount;
    }

    const percentage = savedRule.allocations.reduce(
      (total, item) => total + item.percentage,
      0,
    );

    return (simulationAmount * Math.max(100 - percentage, 0)) / 100;
  }, [savedRule, simulationAmount]);

  /* ====================================================
     EFFECTS
  ==================================================== */

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [toast]);

  /* ====================================================
     ACTIVITY
  ==================================================== */

  function loadActivity(address: string) {
    const key = `stockflow-activity-${address}`;

    const stored = window.localStorage.getItem(key);

    if (!stored) {
      setActivityItems([]);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as ActivityItem[];

      setActivityItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      window.localStorage.removeItem(key);

      setActivityItems([]);
    }
  }

  function addActivity(item: Omit<ActivityItem, "id" | "createdAt">) {
    if (!activityStorageKey) {
      return;
    }

    const nextItem: ActivityItem = {
      ...item,

      id: crypto.randomUUID(),

      createdAt: new Date().toISOString(),
    };

    setActivityItems((current) => {
      const next = [nextItem, ...current].slice(0, 6);

      window.localStorage.setItem(activityStorageKey, JSON.stringify(next));

      return next;
    });
  }

  /* ====================================================
     MARKET
  ==================================================== */

  async function loadDevnetBalance() {
    if (!publicKey) {
      return;
    }

    try {
      const lamports = await connection.getBalance(publicKey);

      setDevnetBalance(lamports / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error("Unable to read Devnet balance:", error);
    }
  }

  /* ====================================================
     DEVNET TEST
  ==================================================== */

  async function runDevnetTest() {
    if (!publicKey || !connected) {
      setDevnetError("Connect your wallet first.");

      return;
    }

    setDevnetTesting(true);

    setDevnetError(null);

    setDevnetStatus("Preparing Devnet verification...");

    try {
      const latestBlockhash = await connection.getLatestBlockhash("confirmed");

      const transaction = new Transaction();

      transaction.feePayer = publicKey;

      transaction.recentBlockhash = latestBlockhash.blockhash;

      const memoText = `StockFlow Devnet verification | ${simulationAmount.toFixed(
        2,
      )} USDC | ${new Date().toISOString()}`;

      transaction.add(
        new TransactionInstruction({
          keys: [
            {
              pubkey: publicKey,
              isSigner: true,
              isWritable: false,
            },
          ],
          programId: MEMO_PROGRAM_ID,
          data: Buffer.from(memoText, "utf8"),
        }),
      );

      setDevnetStatus("Approve the Devnet verification in your wallet.");

      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 3,
      });

      setDevnetStatus("Verification submitted. Waiting for confirmation...");

      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed",
      );

      if (confirmation.value.err) {
        throw new Error(
          "The Devnet verification was submitted but could not be confirmed.",
        );
      }

      addActivity({
        type: "devnet",

        title: "Investment flow verified",

        description: `${simulationAmount.toFixed(
          2,
        )} USDC allocation flow verified successfully on Solana Devnet.`,

        status: "success",
      });

      setDevnetStatus("Verification confirmed.");

      setToast("Investment flow confirmed successfully.");

      await loadDevnetBalance();

      window.setTimeout(() => {
        setSimulatorOpen(false);

        setDevnetStatus(null);

        setDevnetError(null);
      }, 900);
    } catch (error) {
      console.error("Devnet verification failed:", error);

      let message = getErrorMessage(error);

      const lowerMessage = message.toLowerCase();

      if (
        lowerMessage.includes("user rejected") ||
        lowerMessage.includes("rejected") ||
        lowerMessage.includes("cancelled") ||
        lowerMessage.includes("canceled")
      ) {
        message = "Transaction cancelled in wallet.";
      } else if (lowerMessage.includes("blockhash")) {
        message = "The Devnet request expired. Please run it again.";
      } else if (lowerMessage.includes("insufficient")) {
        message = "Not enough Devnet SOL to pay the network fee.";
      } else if (
        lowerMessage === "unexpected error" ||
        lowerMessage === "unexpected wallet error."
      ) {
        message =
          "The wallet could not complete the Devnet verification. Please make sure Phantom is still on Solana Devnet, then try again.";
      }

      setDevnetError(message);

      setDevnetStatus(null);
    } finally {
      setDevnetTesting(false);
    }
  }

  /* ====================================================
     LOAD RULE
  ==================================================== */

  async function loadSavedRule(address: string) {
    setLoadingRule(true);

    try {
      const cached = window.localStorage.getItem(`stockflow-draft-${address}`);
      if (cached) {
        const local = JSON.parse(cached) as SavedRule;
        if (
          local.storage === "local" &&
          local.wallet_address === address &&
          Array.isArray(local.allocations)
        ) {
          setSavedRule(local);
          setAllocations(local.allocations);
          return;
        }
      }
      if (!supabase) throw new Error("Cloud storage is not configured.");
      const { data, error } = await supabase
        .from("stockflow_rules")
        .select("*")
        .eq("wallet_address", address)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        const rule = data as SavedRule;

        setSavedRule(rule);

        setAllocations(rule.allocations);

        window.localStorage.setItem(
          `stockflow-draft-${address}`,
          JSON.stringify(rule),
        );

        return;
      }

      setSavedRule(null);

      setAllocations(DEFAULT_ALLOCATIONS);
    } catch (error) {
      console.error("Failed to load StockFlow rule:", error);

      const fallbackKey = `stockflow-draft-${address}`;

      const localRule = window.localStorage.getItem(fallbackKey);

      if (localRule) {
        try {
          const parsed = JSON.parse(localRule) as SavedRule;

          setSavedRule(parsed);

          setAllocations(parsed.allocations);

          setToast("Loaded local backup.");
        } catch {
          window.localStorage.removeItem(fallbackKey);
        }
      }
    } finally {
      setLoadingRule(false);
    }
  }

  const hydrateWallet = useEffectEvent((address: string) => {
    void loadSavedRule(address);
    loadActivity(address);
  });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate wallet-scoped browser storage after connection.
    if (walletAddress) hydrateWallet(walletAddress);
  }, [walletAddress]);

  /* ====================================================
     BUILDER
  ==================================================== */

  function openBuilder() {
    if (!connected) {
      setVisible(true);
      return;
    }

    if (savedRule) {
      setAllocations(savedRule.allocations);
    }

    setStep(2);

    setBuilderOpen(true);
  }

  function openSimulator() {
    void loadDevnetBalance();
    setDevnetError(null);

    setDevnetStatus(null);

    setSimulatorOpen(true);
  }

  function closeSimulator() {
    setSimulatorOpen(false);

    setDevnetError(null);

    setDevnetStatus(null);
  }

  function addStock() {
    const selected = allocations.map((item) => item.ticker);

    const nextStock = AVAILABLE_STOCKS.find(
      (stock) => !selected.includes(stock.ticker),
    );

    if (!nextStock) {
      return;
    }

    setAllocations((current) => [
      ...current,

      {
        ticker: nextStock.ticker,

        percentage: 0,
      },
    ]);
  }

  function removeStock(ticker: string) {
    setAllocations((current) =>
      current.filter((item) => item.ticker !== ticker),
    );
  }

  function updateAllocation(ticker: string, value: number) {
    const safeValue = Math.min(100, Math.max(0, value));

    setAllocations((current) =>
      current.map((item) =>
        item.ticker === ticker
          ? {
              ...item,

              percentage: safeValue,
            }
          : item,
      ),
    );
  }

  /* ====================================================
     SAVE DRAFT
  ==================================================== */

  function saveLocalRule(status: "draft" | "active") {
    if (!walletAddress) return;
    const now = new Date().toISOString();
    const rule: SavedRule = {
      wallet_address: walletAddress,
      trigger_type: "USDC_DEPOSIT",
      allocations,
      status,
      updated_at: now,
      activated_at: status === "active" ? now : null,
      storage: "local",
    };
    try {
      window.localStorage.setItem(
        `stockflow-draft-${walletAddress}`,
        JSON.stringify(rule),
      );
      setSavedRule(rule);
      setBuilderOpen(false);
      setToast("Saved in this browser. Cloud storage is unavailable.");
      addActivity({
        type: "rule",
        title:
          status === "active"
            ? "Allocation saved locally"
            : "Draft saved locally",
        description:
          "Browser-local rule; this does not start automated trades.",
        status: status === "active" ? "active" : "success",
      });
    } catch {
      setToast("Could not save your rule. Browser storage is unavailable.");
    }
  }

  async function saveDraft() {
    if (!walletAddress) {
      return;
    }

    if (totalInvest <= 0 || totalInvest > 100) {
      setToast("Please fix your allocation.");

      return;
    }

    setSavingRule(true);

    try {
      if (!supabase) throw new Error("Cloud storage is not configured.");
      const { data, error } = await supabase
        .from("stockflow_rules")
        .upsert(
          {
            wallet_address: walletAddress,

            trigger_type: "USDC_DEPOSIT",

            allocations,

            status: "draft",

            updated_at: new Date().toISOString(),

            activated_at: null,
          },

          {
            onConflict: "wallet_address",
          },
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      const rule = data as SavedRule;

      setSavedRule(rule);

      if (localStorageKey) {
        window.localStorage.setItem(localStorageKey, JSON.stringify(rule));
      }

      setToast("Rule saved as draft.");

      setBuilderOpen(false);
    } catch (error) {
      console.error("Save failed:", error);

      saveLocalRule("draft");
    } finally {
      setSavingRule(false);
    }
  }

  /* ====================================================
     ACTIVATE RULE
  ==================================================== */

  async function activateRule() {
    if (!walletAddress) {
      return;
    }

    if (totalInvest <= 0 || totalInvest > 100) {
      setToast("Please fix your allocation.");

      return;
    }

    setActivatingRule(true);

    const now = new Date().toISOString();

    try {
      if (!supabase) throw new Error("Cloud storage is not configured.");
      const { data, error } = await supabase
        .from("stockflow_rules")
        .upsert(
          {
            wallet_address: walletAddress,

            trigger_type: "USDC_DEPOSIT",

            allocations,

            status: "active",

            updated_at: now,

            activated_at: now,
          },

          {
            onConflict: "wallet_address",
          },
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      const rule = data as SavedRule;

      setSavedRule(rule);

      if (localStorageKey) {
        window.localStorage.setItem(localStorageKey, JSON.stringify(rule));
      }

      const allocationText = allocations
        .filter((item) => item.percentage > 0)
        .map((item) => `${item.ticker} ${item.percentage}%`)
        .join(" · ");

      addActivity({
        type: "rule",

        title: "Investment rule activated",

        description: `${allocationText}${
          remaining > 0 ? ` · Keep ${remaining}% USDC` : ""
        }`,

        status: "active",
      });

      setToast("Investment rule activated.");

      setBuilderOpen(false);
    } catch (error) {
      console.error("Activation failed:", error);

      saveLocalRule("active");
    } finally {
      setActivatingRule(false);
    }
  }

  /* ====================================================
     RENDER
  ==================================================== */

  return (
    <main className="flow-workspace text-white">
      <section
        id="activity"
        aria-busy={loadingRule}
        className="my-flow-section px-5 py-28 md:px-10 lg:py-36"
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="section-tag">My Flow</div>

              <h2 className="mt-5 text-4xl font-medium tracking-[-0.05em] sm:text-5xl">
                Your investment workspace.
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-white/40">
                Manage your allocation, inspect your wallet, and verify your
                flow on Devnet.
              </p>
            </div>

            {connected && (
              <div className="rounded-full border border-white/[0.07] bg-white/[0.025] px-4 py-2 text-[10px] text-white/35">
                Wallet {shortWallet}
              </div>
            )}
          </div>

          <Dashboard
            key={walletAddress ?? "disconnected"}
            onCreate={openBuilder}
            onPreview={openSimulator}
            hasRule={!!savedRule}
          />
          {!connected ? (
            <div className="mt-10 rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-8 text-center">
              <History className="mx-auto text-white/20" size={25} />

              <h3 className="mt-4 text-sm font-semibold">
                Connect your wallet
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-white/30">
                Your saved flow appears here after you connect.
              </p>
              <button
                className="primary-button mt-5"
                onClick={() => setVisible(true)}
              >
                Connect wallet
              </button>
            </div>
          ) : (
            <div className="mt-10 space-y-4">
              {/* CURRENT RULE */}

              <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-white/30">
                    <Activity size={14} />
                    My allocation rule
                  </div>

                  <span
                    className={
                      isActive
                        ? "rounded-full border border-emerald-400/10 bg-emerald-400/[0.05] px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-emerald-300"
                        : "rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-white/35"
                    }
                  >
                    {isActive ? "Active" : savedRule ? "Draft" : "None"}
                  </span>
                </div>

                {savedRule ? (
                  <>
                    <p className="dashboard-caption mt-4">
                      {savedRule.storage === "local"
                        ? "Saved in this browser only · Not synced across devices"
                        : "Cloud-backed allocation rule"}
                    </p>
                    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-xs font-semibold">
                        U
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-[0.12em] text-white/25">
                          When I receive
                        </span>
                        <strong className="mt-1 block text-xs">USDC</strong>
                      </div>
                      <ArrowRight className="ml-auto text-white/20" size={16} />
                      <span className="text-[10px] text-white/35">
                        Follow my rule
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {savedRule.allocations
                        .filter((item) => item.percentage > 0)
                        .map((item) => (
                          <div
                            key={item.ticker}
                            className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/20 px-4 py-3"
                          >
                            <span className="text-xs font-medium">
                              {item.ticker}
                            </span>

                            <span className="text-xs text-white/40">
                              {item.percentage}%
                            </span>
                          </div>
                        ))}

                      <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/20 px-4 py-3">
                        <span className="text-xs font-medium">
                          Keep as USDC
                        </span>

                        <span className="text-xs text-white/40">
                          {Math.max(
                            100 -
                              savedRule.allocations.reduce(
                                (total, item) => total + item.percentage,
                                0,
                              ),
                            0,
                          )}
                          %
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={isActive ? openSimulator : openBuilder}
                      className="primary-button mt-5"
                    >
                      {isActive ? "Preview my flow" : "Finish my flow"}

                      <ArrowRight size={13} />
                    </button>
                    <button
                      className="secondary-button mt-5"
                      onClick={openBuilder}
                    >
                      Edit allocation
                    </button>
                  </>
                ) : (
                  <div className="mt-8">
                    <p className="text-xs leading-6 text-white/30">
                      You do not have a flow yet. Create one rule for how
                      incoming USDC should be divided.
                    </p>

                    <button
                      onClick={openBuilder}
                      className="primary-button mt-5"
                    >
                      Create my flow
                      <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* RECENT ACTIVITY */}

              <div className="rounded-[24px] border border-white/[0.05] bg-white/[0.012] p-5">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-white/30">
                  <History size={14} />
                  Recent activity
                </div>

                {activityItems.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-xs text-white/30">No activity yet.</p>

                    <p className="mt-2 text-[10px] text-white/20">
                      Your confirmed StockFlow actions will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {(activityExpanded
                      ? activityItems
                      : activityItems.slice(0, 3)
                    ).map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 rounded-2xl border border-white/[0.05] bg-black/20 p-4"
                      >
                        <div
                          className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${
                            item.status === "success"
                              ? "bg-emerald-400/[0.07] text-emerald-300"
                              : "bg-red-400/[0.07] text-red-300"
                          }`}
                        >
                          {item.type === "devnet" ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <Zap size={14} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <strong className="text-[11px] font-semibold text-white/80">
                              {item.title}
                            </strong>

                            <span className="text-[8px] uppercase tracking-[0.08em] text-white/20">
                              {formatActivityTime(item.createdAt)}
                            </span>
                          </div>

                          <p className="mt-2 text-[10px] leading-5 text-white/30">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activityItems.length > 3 && (
                  <button
                    className="secondary-button mt-5"
                    onClick={() => setActivityExpanded(!activityExpanded)}
                  >
                    {activityExpanded
                      ? "Show less"
                      : `Show all ${activityItems.length} actions`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =================================================
          RULE BUILDER
      ================================================= */}

      {builderOpen && (
        <RuleBuilder
          builderOpen={builderOpen}
          isActive={isActive}
          savedRule={savedRule}
          setBuilderOpen={setBuilderOpen}
          step={step}
          setStep={setStep}
          totalInvest={totalInvest}
          remaining={remaining}
          allocations={allocations}
          updateAllocation={updateAllocation}
          removeStock={removeStock}
          addStock={addStock}
          saveDraft={saveDraft}
          savingRule={savingRule}
          activatingRule={activatingRule}
          activateRule={activateRule}
        />
      )}

      {/* =================================================
          EXECUTION INTERFACE
      ================================================= */}

      {simulatorOpen && savedRule && (
        <FlowSimulator
          simulatorOpen={simulatorOpen}
          savedRule={savedRule}
          closeSimulator={closeSimulator}
          simulationAmount={simulationAmount}
          setSimulationAmount={setSimulationAmount}
          simulatedAllocations={simulatedAllocations}
          simulationRemaining={simulationRemaining}
          devnetBalance={devnetBalance}
          devnetStatus={devnetStatus}
          devnetTesting={devnetTesting}
          devnetError={devnetError}
          runDevnetTest={runDevnetTest}
        />
      )}

      {/* =================================================
          TOAST
      ================================================= */}

      <>
        {toast && (
          <div className="stockflow-toast" role="status">
            <span>
              <Check size={15} />
            </span>

            {toast}
          </div>
        )}
      </>
    </main>
  );
}
