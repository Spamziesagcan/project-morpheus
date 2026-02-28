"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";
import { Toast } from "@/components/Toast";
import { API_ENDPOINTS } from "@/lib/config";
import Spline from "@splinetool/react-spline";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "loading" | "warning"; isVisible: boolean }>({
    message: "",
    type: "info",
    isVisible: false,
  });
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(API_ENDPOINTS.AUTH.ME, {
          headers: { 
            "Authorization": `Bearer ${token}` 
          },
        });
        
        if (res.ok) {
          router.push("/dashboard");
        } else {
          localStorage.removeItem("token");
        }
      } catch {
        localStorage.removeItem("token");
      }
    };

    checkAuth();
  }, [router]);

  const showToast = (message: string, type: "success" | "error" | "info" | "loading" | "warning" = "info") => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      showToast("Please fill in all fields", "error");
      return;
    }

    setLoading(true);
    showToast("Logging in...", "loading");
    
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    try {
      const res = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.access_token);
        hideToast();
        showToast("Login successful! Redirecting...", "success");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.detail || "Invalid credentials";
        hideToast();
        showToast(errorMessage, "error");
      }
    } catch {
      hideToast();
      showToast("Server error. Please try again later.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background transition-colors relative">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
        duration={toast.type === "loading" ? 0 : 3000}
      />

      {/* ── Left: Spline 3-D scene ── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-black">
        <Spline
          scene="https://prod.spline.design/xgluJ-qSWaicQqNb/scene.splinecode"
          className="w-full h-full"
        />
        {/* cover the "Built with Spline" watermark */}
        <div className="absolute bottom-0 left-0 right-0 h-14 bg-black" />
        {/* subtle gradient fade into the right panel */}
        <div className="absolute inset-y-0 right-0 w-24 bg-linear-to-r from-transparent to-background pointer-events-none" />
      </div>

      {/* ── Right: login form ── */}
      <div className="flex flex-col items-center justify-center w-full lg:w-120 shrink-0 p-8 relative">
        <Link
          href="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Home
        </Link>

        <div className="absolute top-8 right-8">
          <ModeToggle />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
          <p className="text-foreground/60 text-sm mt-2">Please enter your details</p>
        </div>

        <div className="auth-card relative overflow-hidden w-full">
          <div className="absolute inset-0 bg-linear-to-br from-foreground/5 via-transparent to-foreground/10 pointer-events-none rounded-2xl" />
          <div className="relative z-10">
          <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground/70 mb-1.5">EMAIL</label>
            <input 
              type="email" 
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground/70 mb-1.5">PASSWORD</label>
            <input 
              type="password" 
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex justify-end text-xs">
            <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">Forgot password?</a>
          </div>

          <button disabled={loading} className="w-full bg-foreground hover:bg-foreground/90 text-background font-semibold py-3 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin w-5 h-5"/> : "Log in"}
          </button>
        </form>

          <div className="mt-6 text-center text-sm text-foreground/60">
            Don't have an account? <Link href="/auth/signup" className="text-foreground font-semibold hover:underline ml-1">Sign up</Link>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
