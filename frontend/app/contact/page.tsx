"use client";

import SplashCursor from "@/components/SplashCursor";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingNavbar } from "@/components/MarketingNavbar";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <SplashCursor />
      <MarketingHeader />
      <MarketingNavbar />
      <section className="relative z-10 py-28 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl p-10 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_0_25px_rgba(15,23,42,0.45)]">
            <h1 className="text-3xl font-semibold tracking-tight mb-3 text-foreground">
              Contact
            </h1>
            <p className="text-sm text-foreground/60 mb-6 max-w-xl">
              Have questions or want to collaborate on a hackathon project? Reach out and
              we&apos;ll get back to you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 text-sm text-foreground/80">
              <div className="flex-1 rounded-xl bg-foreground/5 border border-[var(--glass-border)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-foreground/40 mb-1">
                  Email
                </p>
                <p>hello@skillsphere.dev</p>
              </div>
              <div className="flex-1 rounded-xl bg-foreground/5 border border-[var(--glass-border)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-foreground/40 mb-1">
                  LinkedIn
                </p>
                <p>Let&apos;s connect and build something cool.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

