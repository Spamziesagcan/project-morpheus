"use client";

import { Check, ShieldCheck, Zap, Crown } from "lucide-react";
import SplashCursor from "@/components/SplashCursor";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingNavbar } from "@/components/MarketingNavbar";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <SplashCursor />
      <MarketingHeader />
      <MarketingNavbar />
      <section className="relative z-10 py-32 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4 text-foreground">
              Simple, transparent <span className="text-foreground/80">pricing</span>
            </h1>
            <p className="text-base text-foreground/50 max-w-2xl mx-auto">
              Choose the plan that fits your needs. All plans include full access to all
              features and tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto pt-4">
            {/* Free Plan */}
            <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl p-8 flex flex-col hover:border-foreground/30 transition-all relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_20px_rgba(255,255,255,0.05),inset_0_0_20px_rgba(255,255,255,0.05)]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 via-transparent to-foreground/10 pointer-events-none" />
              <div className="relative z-10 flex flex-col h-full">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-5 h-5 shiny-blue-text" />
                    <h3 className="text-xl font-semibold text-foreground">Free</h3>
                  </div>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">$0</span>
                    <span className="text-foreground/50 text-sm ml-1">/month</span>
                  </div>
                  <p className="text-sm text-foreground/50 mt-2">
                    Perfect for getting started
                  </p>
                </div>

                <ul className="flex-1 space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 shiny-blue-text shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/70">
                      Full access to all features
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 shiny-blue-text shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/70">
                      Complete authentication system
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 shiny-blue-text shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/70">
                      Dashboard with 5 features
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 shiny-blue-text shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/70">Community support</span>
                  </li>
                </ul>

                <button className="w-full bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] hover:border-foreground/30 hover:bg-foreground/5 text-foreground px-6 py-3 rounded-lg font-medium transition-all cursor-pointer relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_15px_rgba(255,255,255,0.05),inset_0_0_15px_rgba(255,255,255,0.05)]">
                  <span className="relative z-10">Get Started</span>
                </button>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="bg-[var(--glass-bg)] backdrop-blur-xl shiny-blue-border rounded-2xl p-8 flex flex-col relative hover:shadow-lg transition-all -mt-4">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-60 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--shiny-blue-glow)]/10 via-transparent to-[var(--shiny-blue-glow)]/5 pointer-events-none rounded-2xl" />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                <span className="shiny-blue-bg text-white px-4 py-1.5 rounded-full text-xs font-medium shadow-lg">
                  Most Popular
                </span>
              </div>

              <div className="relative z-10 flex flex-col h-full">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 shiny-blue-text" />
                    <h3 className="text-xl font-semibold text-foreground">Pro</h3>
                  </div>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">$20</span>
                    <span className="text-foreground/50 text-sm ml-1">/month</span>
                  </div>
                  <p className="text-sm text-foreground/50 mt-2">For growing projects</p>
                </div>

                <ul className="flex-1 space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 shiny-blue-text shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/70">Everything in Free</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 shiny-blue-text shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/70">Priority support</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 shiny-blue-text shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/70">Advanced analytics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 shiny-blue-text shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/70">Custom integrations</span>
                  </li>
                </ul>

                <button className="w-full shiny-blue-bg text-white px-6 py-3 rounded-lg font-medium transition-all cursor-pointer relative overflow-hidden">
                  <span className="relative z-10 drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]">
                    Start Free Trial
                  </span>
                </button>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl p-8 flex flex-col hover:border-foreground/30 transition-all relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_20px_rgba(255,255,255,0.05),inset_0_0_20px_rgba(255,255,255,0.05)]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 via-transparent to-foreground/10 pointer-events-none" />
              <div className="relative z-10 flex flex-col h-full">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 shiny-blue-text" />
                    <h3 className="text-xl font-semibold text-foreground">Enterprise</h3>
                  </div>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">$100</span>
                    <span className="text-foreground/50 text-sm ml-1">/month</span>
                  </div>
                  <p className="text-sm text-foreground/50 mt-2">For large organizations</p>
                </div>

                <ul className="flex-1 space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 shiny-blue-text shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/70">Everything in Pro</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 shiny-blue-text shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/70">
                      24/7 dedicated support
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 shiny-blue-text shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/70">Custom deployment</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 shiny-blue-text shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/70">SLA guarantee</span>
                  </li>
                </ul>

                <button className="w-full bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] hover:border-foreground/30 hover:bg-foreground/5 text-foreground px-6 py-3 rounded-lg font-medium transition-all cursor-pointer relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_15px_rgba(255,255,255,0.05),inset_0_0_15px_rgba(255,255,255,0.05)]">
                  <span className="relative z-10">Contact Sales</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

