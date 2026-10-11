"use client";
import { useDialogFocus } from "@/components/useDialogFocus";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ArrowRight,
  FlaskConical,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { Allocation, SavedRule } from "@/lib/flow-types";
import { formatPrice, formatUnits } from "@/lib/markets";
type Props = {
  simulatorOpen: boolean;
  savedRule: SavedRule | null;
  closeSimulator: () => void;
  simulationAmount: number;
  setSimulationAmount: (value: number) => void;
  simulatedAllocations: (Allocation & {
    amount: number;
    price: number | null;
    estimatedUnits: number | null;
  })[];
  simulationRemaining: number;
  devnetBalance: number | null;
  devnetStatus: string | null;
  devnetTesting: boolean;
  devnetError: string | null;
  runDevnetTest: () => Promise<void>;
};
export default function FlowSimulator({
  simulatorOpen,
  savedRule,
  closeSimulator,
  simulationAmount,
  setSimulationAmount,
  simulatedAllocations,
  simulationRemaining,
  devnetBalance,
  devnetStatus,
  devnetTesting,
  devnetError,
  runDevnetTest,
}: Props) {
  const dialogRef = useDialogFocus(simulatorOpen, closeSimulator);
  return (
    <AnimatePresence>
      {simulatorOpen && savedRule && (
        <motion.div
          className="rule-overlay"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Allocation preview"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
        >
          <motion.div
            className="rule-builder"
            initial={{
              opacity: 0,
              y: 25,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: 15,
            }}
          >
            <div className="rule-builder-top">
              <div>
                <p className="rule-kicker">Preview flow</p>

                <h2>See where your money goes</h2>
              </div>

              <button
                className="rule-close"
                aria-label="Close allocation preview"
                onClick={closeSimulator}
              >
                <X size={18} />
              </button>
            </div>

            <p className="rule-step-description">
              Enter an incoming USDC amount and StockFlow will show exactly how
              your rule divides it.
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
                  value={simulationAmount}
                  onChange={(event) =>
                    setSimulationAmount(Math.max(Number(event.target.value), 0))
                  }
                />

                <span>USDC</span>
              </div>
            </div>

            {/* ALLOCATION */}

            <div className="mt-7 flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/25">
                  Your preview
                </p>
                <h3 className="mt-1 text-sm font-semibold">
                  Here is how your flow divides it
                </h3>
              </div>
              <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 text-[9px] text-white/35">
                No funds moved
              </span>
            </div>

            <div className="simulation-flow">
              <div className="simulation-source">
                <span>Incoming</span>

                <strong>{simulationAmount.toFixed(2)} USDC</strong>
              </div>

              <ArrowRight className="rotate-90 text-white/20" size={20} />

              <div className="simulation-results">
                {simulatedAllocations.map((item) => (
                  <div
                    key={item.ticker}
                    className="simulation-row simulation-row-expanded"
                  >
                    <div>
                      <strong>{item.ticker}</strong>

                      <span>{item.percentage}% of incoming USDC</span>

                      <span>Estimated price: {formatPrice(item.price)}</span>
                    </div>

                    <div className="simulation-output">
                      <strong>{item.amount.toFixed(2)} USDC</strong>

                      <span>
                        ≈ {formatUnits(item.estimatedUnits)} {item.ticker}
                      </span>
                    </div>
                  </div>
                ))}

                {simulationRemaining > 0 && (
                  <div className="simulation-row">
                    <div>
                      <strong>Keep as USDC</strong>

                      <span>Stays available</span>
                    </div>

                    <strong>{simulationRemaining.toFixed(2)} USDC</strong>
                  </div>
                )}
              </div>
            </div>

            {/* DEVNET STATUS */}

            <div className="mt-7 rounded-[20px] border border-cyan-400/10 bg-cyan-400/[0.025] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-300">
                    <FlaskConical size={14} />
                    Demo verification
                  </div>

                  <h3 className="mt-2 text-[15px] font-semibold">
                    Verify this preview on Devnet
                  </h3>

                  <p className="mt-1 max-w-md text-[10px] leading-5 text-white/35">
                    Optional: confirm a Solana Devnet verification in your
                    wallet. This demo records the preview; it does not purchase
                    stocks or move investment funds.
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
                    {devnetBalance !== null
                      ? `${devnetBalance.toFixed(4)} DEV SOL`
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
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={13} />
                  )}

                  {devnetStatus}
                </div>
              )}

              {devnetError && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-400/10 bg-red-400/[0.03] px-3 py-2 text-[9px] text-red-300">
                  <XCircle size={13} />

                  {devnetError}
                </div>
              )}
            </div>

            {/* FOOTER */}

            <div className="rule-footer">
              <button
                className="rule-secondary"
                onClick={closeSimulator}
                disabled={devnetTesting}
              >
                Close
              </button>

              <button
                className="rule-primary"
                onClick={runDevnetTest}
                disabled={devnetTesting || simulationAmount <= 0}
              >
                {devnetTesting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify preview
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
