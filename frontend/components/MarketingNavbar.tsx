"use client";

import Link from "next/link";

export function MarketingNavbar() {
  return (
    <div className="fixed top-8 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <nav className="pointer-events-auto flex items-center justify-center gap-10 rounded-full border border-white/8 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent backdrop-blur-2xl px-10 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.08)] w-[min(100%-2rem,420px)] mx-auto relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-40 pointer-events-none rounded-full" style={{ maskImage: 'linear-gradient(135deg, white 0%, transparent 60%)', WebkitMaskImage: 'linear-gradient(135deg, white 0%, transparent 60%)' }} />
        <Link
          href="/"
          className="relative z-10 text-sm font-medium text-foreground/70 hover:text-foreground/90 transition-colors"
        >
          Home
        </Link>
        <Link
          href="/pricing"
          className="relative z-10 text-sm font-medium text-foreground/70 hover:text-foreground/90 transition-colors"
        >
          Pricing
        </Link>
        <Link
          href="/contact"
          className="relative z-10 text-sm font-medium text-foreground/70 hover:text-foreground/90 transition-colors"
        >
          Contact
        </Link>
      </nav>
    </div>
  );
}

