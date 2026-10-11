import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChartNoAxesCombined,
  Layers,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import MarketGrid from "@/components/MarketGrid";

export default function Home() {
  return (
    <div className="sf-site">
      <SiteHeader />
      <main>
        <section className="sf-hero sf-container">
          <div className="sf-hero-copy">
            <p className="sf-eyebrow">
              <span />A little structure. A clearer investment plan.
            </p>
            <h1>
              Your allocation.
              <br />
              Your rules.
              <br />
              <em>Your flow.</em>
            </h1>
            <p className="sf-lead">
              Give every dollar a direction. Build your xStock allocation,
              preview how USDC splits, and manage it all from one simple
              workspace.
            </p>
            <div className="sf-hero-actions">
              <Link
                href="/dashboard"
                prefetch={false}
                className="sf-button sf-button-coral"
              >
                Build my flow <ArrowUpRight size={18} />
              </Link>
              <a href="#how" className="sf-text-link">
                Take a closer look <ArrowRight size={16} />
              </a>
            </div>
            <div className="sf-trust">
              <ShieldCheck size={15} /> Wallet stays yours <span>·</span> Devnet
              prototype
            </div>
          </div>
          <div
            className="sf-product-preview"
            aria-label="Illustrative allocation preview, not a live portfolio"
          >
            <div className="sf-preview-top">
              <div className="sf-preview-brand">
                <ChartNoAxesCombined size={18} />
                My allocation
              </div>
              <span className="sf-mini-pill">EXAMPLE FLOW</span>
            </div>
            <div className="sf-preview-amount">
              <span>When I receive</span>
              <strong>
                1,000<span> USDC</span>
              </strong>
              <p>A plan for every part of your money.</p>
            </div>
            <div className="sf-allocation-bar">
              <span />
              <span />
              <span />
            </div>
            <div className="sf-preview-rows">
              <div>
                <span className="sf-stock-icon">A</span>
                <div>
                  <strong>Apple</strong>
                  <span>AAPLx</span>
                </div>
                <div>
                  <strong>40%</strong>
                  <span>$400 allocation</span>
                </div>
              </div>
              <div>
                <span className="sf-stock-icon sf-stock-icon-green">N</span>
                <div>
                  <strong>NVIDIA</strong>
                  <span>NVDAx</span>
                </div>
                <div>
                  <strong>35%</strong>
                  <span>$350 allocation</span>
                </div>
              </div>
              <div>
                <span className="sf-stock-icon sf-stock-icon-cash">$</span>
                <div>
                  <strong>Keep as USDC</strong>
                  <span>Available cash</span>
                </div>
                <div>
                  <strong>25%</strong>
                  <span>$250 remaining</span>
                </div>
              </div>
            </div>
            <div className="sf-preview-footer">
              <span>
                <Check size={14} /> 100% accounted for
              </span>
              <span>Preview only</span>
            </div>
          </div>
        </section>
        <div className="sf-divider-strip">
          <span>BUILT ON SOLANA</span>
          <span>8 SUPPORTED xSTOCKS</span>
          <span>ONE CLEAR ALLOCATION</span>
          <span>YOU APPROVE EVERY VERIFICATION</span>
        </div>
        <section id="markets" className="sf-markets sf-container">
          <div className="sf-section-heading">
            <div>
              <p className="sf-eyebrow">
                Familiar companies. A new way to plan.
              </p>
              <h2>Start with what you know.</h2>
            </div>
            <p>
              Explore supported xStocks.
              <br />
              Market references help you preview your split.
            </p>
          </div>
          <MarketGrid />
          <p className="sf-market-disclaimer">
            Indicative prices may be delayed. Underlying stock references are
            labeled separately from xStock quotes. No stock purchases are
            executed in this prototype.
          </p>
        </section>
        <section id="how" className="sf-how sf-container">
          <div className="sf-section-heading">
            <div>
              <p className="sf-eyebrow">A simpler rhythm</p>
              <h2>
                One plan.
                <br />
                Three straightforward steps.
              </h2>
            </div>
            <Link href="/dashboard" prefetch={false} className="sf-text-link">
              Make it yours <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="sf-steps">
            {[
              {
                n: "01",
                icon: SlidersHorizontal,
                title: "Choose your split",
                copy: "Pick your xStocks, set their percentages, and decide how much stays as USDC.",
              },
              {
                n: "02",
                icon: Layers,
                title: "See the whole picture",
                copy: "Preview an incoming amount. Understand each allocation before saving your rule.",
              },
              {
                n: "03",
                icon: ShieldCheck,
                title: "Keep control",
                copy: "Manage your saved rule in the dashboard. Optionally approve a Devnet memo verification.",
              },
            ].map((step) => (
              <article key={step.n}>
                <div>
                  <span>{step.n}</span>
                  <step.icon size={23} />
                </div>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="sf-cta sf-container">
          <div>
            <p className="sf-eyebrow">Clarity starts with a plan.</p>
            <h2>
              Put your money
              <br />
              in perspective.
            </h2>
          </div>
          <div>
            <Link
              href="/dashboard"
              prefetch={false}
              className="sf-button sf-button-coral"
            >
              Open my workspace <ArrowUpRight size={18} />
            </Link>
            <p>No funds move when you save an allocation.</p>
          </div>
        </section>
      </main>
      <footer className="sf-footer sf-container">
        <Link href="/" className="sf-brand">
          StockFlow.
        </Link>
        <p>Allocation planning on Solana. Built by Faith Oluwalana.</p>
        <span>Devnet · Preview only</span>
      </footer>
    </div>
  );
}
