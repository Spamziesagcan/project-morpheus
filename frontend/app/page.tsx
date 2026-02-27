"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ChevronRight, Check, Zap, Crown } from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";
import { API_ENDPOINTS } from "@/lib/config";

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setChecking(false);
        return;
      }

      try {
        const res = await fetch(API_ENDPOINTS.AUTH.ME, {
          headers: { 
            "Authorization": `Bearer ${token}` 
          },
        });
        
        if (res.ok) {
          setIsLoggedIn(true);
          if (window.location.pathname !== "/dashboard") {
            router.push("/dashboard");
          }
        } else {
          localStorage.removeItem("token");
          setIsLoggedIn(false);
        }
      } catch {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden bg-background transition-colors">
      
      {/* Navbar */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center z-20">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center relative overflow-hidden shiny-blue-bg">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-70 pointer-events-none" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)' }} />
            <ShieldCheck className="text-white w-5 h-5 relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">MORPHEUS</span>
        </Link>

        {/* Right Side Nav */}
        <div className="flex items-center gap-4">
          <ModeToggle />
          
          {!checking && (
            <>
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] hover:bg-foreground/10 text-foreground px-5 py-2 rounded-lg text-sm font-medium transition-all relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_15px_rgba(255,255,255,0.05),inset_0_0_15px_rgba(255,255,255,0.05)]"
                >
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50 pointer-events-none rounded-lg"
                    style={{
                      maskImage:
                        "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
                      WebkitMaskImage:
                        "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
                    }}
                  />
                  <span className="relative z-10">Dashboard</span>
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-[var(--glass-bg)] hover:backdrop-blur-xl hover:border hover:border-[var(--glass-border)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_10px_rgba(255,255,255,0.05)]"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] hover:bg-foreground/10 text-foreground px-5 py-2 rounded-lg text-sm font-medium transition-all relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_15px_rgba(255,255,255,0.05),inset_0_0_15px_rgba(255,255,255,0.05)]"
                  >
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50 pointer-events-none rounded-lg"
                      style={{
                        maskImage:
                          "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
                        WebkitMaskImage:
                          "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
                      }}
                    />
                    <span className="relative z-10">Get Started</span>
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10 mt-[-50px]">
        
        {/* Badge with Shiny Blue */}
        <div className="mb-8 mt-24 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl text-foreground/70 text-xs font-medium relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_0_15px_rgba(255,255,255,0.08),inset_0_0_15px_rgba(255,255,255,0.08)]">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--shiny-blue-glow)]/10 via-transparent to-[var(--shiny-blue-glow)]/10 pointer-events-none rounded-full" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent opacity-60 pointer-events-none rounded-full" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)' }} />
          <span className="relative z-10 w-1.5 h-1.5 rounded-full shiny-blue-bg" style={{ boxShadow: '0 0 8px var(--shiny-blue-glow), 0 0 12px var(--shiny-blue-glow-strong)' }}></span>
          <span className="relative z-10">Complete Hackathon Template Platform</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-6 max-w-5xl leading-[1.1] text-foreground">
          Build <span className="shiny-blue-text">Amazing,</span> <br />
          Create <span className="shiny-blue-text">Innovative,</span> and <br />
          Deploy <span className="shiny-blue-text">Fast</span>
        </h1>

        {/* Subtext */}
        <p className="text-base text-foreground/50 max-w-2xl mx-auto mb-10 leading-relaxed">
          Morpheus is a complete hackathon template platform where you can build your next 
          innovative project. Get started with authentication, dashboard, and all the tools 
          you need to create something amazing.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] hover:bg-foreground/10 text-foreground px-8 py-3.5 rounded-lg font-medium flex items-center gap-2 transition-all cursor-pointer relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_0_20px_rgba(255,255,255,0.1),inset_0_0_20px_rgba(255,255,255,0.08)]">
            <div
              className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent opacity-60 pointer-events-none rounded-lg"
              style={{
                maskImage:
                  "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
              }}
            />
            <ShieldCheck className="w-5 h-5 relative z-10" />
            <span className="relative z-10">Explore Features</span>
          </button>

          <Link
            href="/auth/signup"
            className="shiny-blue-bg text-white px-8 py-3.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all cursor-pointer relative overflow-hidden"
          >
            <div
              className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50 pointer-events-none rounded-lg"
              style={{
                maskImage:
                  "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
              }}
            />
            <ChevronRight className="w-4 h-4 relative z-10 drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
            <span className="relative z-10 drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]">
              Get Started Free
            </span>
          </Link>
        </div>

        {/* Background Glow - Shiny Blue */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] -z-10 opacity-30 dark:opacity-20" style={{ background: 'radial-gradient(circle, var(--shiny-blue-glow-strong) 0%, transparent 70%)' }} />
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 relative z-10">
        <div className="container mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4 text-foreground">
              Simple, transparent <span className="text-foreground/80">pricing</span>
            </h2>
            <p className="text-base text-foreground/50 max-w-2xl mx-auto">
              Choose the plan that fits your needs. All plans include full access to 
              all features and tools.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto pt-4">
            
            {/* Free Plan */}
            <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl p-8 flex flex-col hover:border-foreground/30 transition-all relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_20px_rgba(255,255,255,0.05),inset_0_0_20px_rgba(255,255,255,0.05)]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50 pointer-events-none" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)' }} />
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
                <p className="text-sm text-foreground/50 mt-2">Perfect for getting started</p>
              </div>

              <ul className="flex-1 space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 shiny-blue-text shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground/70">Full access to all features</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 shiny-blue-text shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground/70">Complete authentication system</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 shiny-blue-text shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground/70">Dashboard with 5 features</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 shiny-blue-text shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground/70">Community support</span>
                </li>
              </ul>

              <button className="w-full bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] hover:border-foreground/30 hover:bg-foreground/5 text-foreground px-6 py-3 rounded-lg font-medium transition-all cursor-pointer relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_15px_rgba(255,255,255,0.05),inset_0_0_15px_rgba(255,255,255,0.05)]">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50 pointer-events-none rounded-lg" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)' }} />
                <span className="relative z-10">Get Started</span>
              </button>
              </div>
            </div>

            {/* Pro Plan - Popular */}
            <div className="bg-[var(--glass-bg)] backdrop-blur-xl shiny-blue-border rounded-2xl p-8 flex flex-col relative hover:shadow-lg transition-all -mt-4">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-60 pointer-events-none" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)' }} />
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
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50 pointer-events-none rounded-lg" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)' }} />
                <span className="relative z-10 drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]">Start Free Trial</span>
              </button>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl p-8 flex flex-col hover:border-foreground/30 transition-all relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_20px_rgba(255,255,255,0.05),inset_0_0_20px_rgba(255,255,255,0.05)]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50 pointer-events-none" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)' }} />
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
                  <span className="text-sm text-foreground/70">24/7 dedicated support</span>
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
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50 pointer-events-none rounded-lg" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)' }} />
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
