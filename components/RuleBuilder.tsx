"use client";
import { useDialogFocus } from "@/components/useDialogFocus";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, ArrowRight, Plus, ArrowLeft, Zap } from "lucide-react";
import type { Allocation, SavedRule } from "@/lib/flow-types";
import { AVAILABLE_STOCKS } from "@/lib/markets";
type Props = {
  builderOpen: boolean;
  isActive: boolean;
  savedRule: SavedRule | null;
  setBuilderOpen: (value: boolean) => void;
  step: number;
  setStep: (value: number) => void;
  totalInvest: number;
  remaining: number;
  allocations: Allocation[];
  updateAllocation: (ticker: string, value: number) => void;
  removeStock: (ticker: string) => void;
  addStock: () => void;
  saveDraft: () => Promise<void>;
  savingRule: boolean;
  activatingRule: boolean;
  activateRule: () => Promise<void>;
};
export default function RuleBuilder({
  builderOpen,
  isActive,
  savedRule,
  setBuilderOpen,
  step,
  setStep,
  totalInvest,
  remaining,
  allocations,
  updateAllocation,
  removeStock,
  addStock,
  saveDraft,
  savingRule,
  activatingRule,
  activateRule,
}: Props) {
  const dialogRef = useDialogFocus(builderOpen, () => setBuilderOpen(false));
  return (
    <AnimatePresence>
      {builderOpen && (
        <motion.div
          className="rule-overlay"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Allocation builder"
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
              y: 30,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 20,
              scale: 0.98,
            }}
          >
            <div className="rule-builder-top">
              <div>
                <p className="rule-kicker">Your flow</p>

                <h2>
                  {isActive
                    ? "Edit my flow"
                    : savedRule
                      ? "Continue my flow"
                      : "Create my flow"}
                </h2>
              </div>

              <button
                onClick={() => setBuilderOpen(false)}
                className="rule-close"
                aria-label="Close allocation builder"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rule-progress">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className={`rule-progress-item ${
                    step >= item ? "active" : ""
                  }`}
                />
              ))}
            </div>

            {step === 1 && (
              <div className="rule-step">
                <p className="rule-step-label">Step 1</p>

                <h3>What should trigger your investment?</h3>

                <p className="rule-step-description">
                  StockFlow watches for qualifying USDC deposits.
                </p>

                <div className="trigger-card selected">
                  <div className="trigger-token">U</div>

                  <div>
                    <strong>When I receive USDC</strong>

                    <p>Run my StockFlow allocation.</p>
                  </div>

                  <div className="trigger-check">
                    <Check size={15} />
                  </div>
                </div>

                <div className="rule-footer">
                  <div />

                  <button className="rule-primary" onClick={() => setStep(2)}>
                    Continue
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="rule-step">
                <p className="rule-step-label">Set your rule</p>

                <h3>Where should your money go?</h3>

                <div className="mb-5 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                    When money arrives
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <strong className="text-sm">USDC</strong>
                    <span className="text-[10px] text-white/35">
                      Follow this allocation
                    </span>
                  </div>
                </div>

                <div className="allocation-summary">
                  <div>
                    <span>Invest</span>

                    <strong>{totalInvest}%</strong>
                  </div>

                  <div>
                    <span>Keep as USDC</span>

                    <strong>{Math.max(remaining, 0)}%</strong>
                  </div>
                </div>

                {totalInvest > 100 && (
                  <div className="allocation-error">
                    Allocations cannot exceed 100%.
                  </div>
                )}

                <div className="builder-allocations">
                  {allocations.map((allocation) => {
                    const stock = AVAILABLE_STOCKS.find(
                      (item) => item.ticker === allocation.ticker,
                    );

                    return (
                      <div
                        key={allocation.ticker}
                        className="builder-allocation-row"
                      >
                        <div className="builder-stock">
                          <div className="builder-stock-icon">
                            {allocation.ticker.charAt(0)}
                          </div>

                          <div>
                            <strong>{stock?.name}</strong>

                            <span>{allocation.ticker}</span>
                          </div>
                        </div>

                        <div className="allocation-input-wrap">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={allocation.percentage}
                            onChange={(event) =>
                              updateAllocation(
                                allocation.ticker,
                                Number(event.target.value),
                              )
                            }
                          />

                          <span>%</span>
                        </div>

                        <button
                          className="allocation-remove"
                          onClick={() => removeStock(allocation.ticker)}
                          aria-label={`Remove ${allocation.ticker}`}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {allocations.length < AVAILABLE_STOCKS.length && (
                  <button className="add-stock-button" onClick={addStock}>
                    <Plus size={16} />
                    Add investment
                  </button>
                )}

                <div className="rule-footer">
                  <button
                    className="rule-secondary"
                    onClick={() => setBuilderOpen(false)}
                  >
                    Cancel
                  </button>

                  <button
                    className="rule-primary"
                    disabled={totalInvest <= 0 || totalInvest > 100}
                    onClick={() => setStep(3)}
                  >
                    Review
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="rule-step">
                <p className="rule-step-label">Review</p>

                <h3>Make sure this looks right</h3>

                <p className="rule-step-description">
                  Whenever USDC arrives, StockFlow will use this allocation.
                </p>

                <div className="review-rule-card">
                  {allocations
                    .filter((item) => item.percentage > 0)
                    .map((item) => (
                      <div key={item.ticker} className="review-row">
                        <span>{item.ticker}</span>

                        <strong>{item.percentage}%</strong>
                      </div>
                    ))}

                  {remaining > 0 && (
                    <div className="review-row">
                      <span>Keep as USDC</span>

                      <strong>{remaining}%</strong>
                    </div>
                  )}
                </div>

                <div className="rule-footer">
                  <button className="rule-secondary" onClick={() => setStep(2)}>
                    <ArrowLeft size={16} />
                    Back
                  </button>

                  <div className="flex gap-2">
                    {!isActive && (
                      <button
                        className="rule-secondary"
                        onClick={saveDraft}
                        disabled={savingRule || activatingRule}
                      >
                        {savingRule ? "Saving..." : "Save for later"}
                      </button>
                    )}

                    <button
                      className="rule-primary"
                      onClick={activateRule}
                      disabled={activatingRule || savingRule}
                    >
                      {activatingRule
                        ? "Activating..."
                        : isActive
                          ? "Update my flow"
                          : "Activate my flow"}

                      <Zap size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
