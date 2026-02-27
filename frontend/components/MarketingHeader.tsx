"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ModeToggle } from "@/components/ModeToggle";
import { API_ENDPOINTS } from "@/lib/config";

export function MarketingHeader() {
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
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          setIsLoggedIn(true);
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
  }, []);

  return (
    <header className="relative z-30">
      <div className="container mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-2xl font-semibold tracking-[0.35em] uppercase text-foreground/90 font-mono">
            SkillSphere
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <ModeToggle />
          {!checking && (
            <>
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] hover:bg-foreground/10 text-foreground px-5 py-2 rounded-lg text-sm font-medium transition-all relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_15px_rgba(255,255,255,0.05),inset_0_0_15px_rgba(255,255,255,0.05)]"
                >
                  <span className="relative z-10">Dashboard</span>
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-[var(--glass-bg)] hover:backdrop-blur-xl hover:border hover:border-[var(--glass-border)]"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] hover:bg-foreground/10 text-foreground px-5 py-2 rounded-lg text-sm font-medium transition-all relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_15px_rgba(255,255,255,0.05),inset_0_0_15px_rgba(255,255,255,0.05)]"
                  >
                    <span className="relative z-10">Get Started</span>
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

