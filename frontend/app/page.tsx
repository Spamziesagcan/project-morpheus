"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import SplashCursor from "@/components/SplashCursor";
import Squares from "@/components/Squares";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { MarketingHeader } from "@/components/MarketingHeader";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden bg-background transition-colors">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Squares
          speed={0.5}
          squareSize={60}
          direction="diagonal"
          borderColor="rgba(255,255,255,0.18)"
          hoverFillColor="#222222"
        />
      </div>
      
      <SplashCursor />
      <MarketingHeader />
      <MarketingNavbar />

      {/* Hero Section */}
      <section
        id="hero"
        className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10 pt-16"
      >
        

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-serif italic tracking-tight mb-6 max-w-5xl leading-[1.1] text-foreground">
          Your{" "}
          <span className="shiny-blue-text font-semibold not-italic">AI Career Copilot</span>
          <br />
          for Learning & Job Search
        </h1>

        {/* Subtext */}
        <p className="text-base text-foreground/50 max-w-2xl mx-auto mb-10 leading-relaxed">
          SkillSphere brings together AI resume building, ATS scoring, mock interviews,
          flashcards, and more in a single dashboard — so you can ship polished projects
          and grow your career faster.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">


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
    </main>
  );
}
