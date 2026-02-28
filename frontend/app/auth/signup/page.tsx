"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";
import { Toast } from "@/components/Toast";
import { API_ENDPOINTS } from "@/lib/config";
import { cn } from "@/lib/utils";
import Spline from "@splinetool/react-spline";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName || !email || !password || !confirmPass) {
      showToast("Please fill in all fields", "error");
      return;
    }

    if (fullName.trim().length < 2) {
      showToast("Full name must be at least 2 characters long", "error");
      return;
    }

    if (password !== confirmPass) {
      showToast("Passwords do not match", "error");
      return;
    }

    if (password.length < 6) {
      showToast("Password must be at least 6 characters long", "error");
      return;
    }

    if (!acceptedTerms) {
      showToast("Please accept the Terms of Use and Privacy Policy", "warning");
      return;
    }

    setLoading(true);
    showToast("Creating your account...", "loading");
    
    try {
      const res = await fetch(API_ENDPOINTS.AUTH.SIGNUP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        hideToast();
        showToast("Account created successfully! Redirecting to login...", "success");
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      } else {
        hideToast();
        const errorMessage = data.detail || "Signup failed";
        
        if (errorMessage.toLowerCase().includes("already registered") || errorMessage.toLowerCase().includes("email already")) {
          showToast("Email already registered. Please login instead.", "warning");
        } else {
          showToast(errorMessage, "error");
        }
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
        {/* gradient fade into right panel */}
        <div className="absolute inset-y-0 right-0 w-24 bg-linear-to-r from-transparent to-background pointer-events-none" />
      </div>

      {/* ── Right: signup form ── */}
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
          <h1 className="text-3xl font-bold text-foreground">Create account</h1>
          <p className="text-foreground/60 text-sm mt-2">Start building today</p>
        </div>

        <div className="auth-card relative overflow-hidden w-full">
          <div className="absolute inset-0 bg-linear-to-br from-foreground/5 via-transparent to-foreground/10 pointer-events-none rounded-2xl" />
          <div className="relative z-10">
          <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground/70 mb-1.5">FULL NAME</label>
            <input 
              type="text" 
              name="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field"
              placeholder="John Doe"
              required
            />
          </div>

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
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground/70 mb-1.5">CONFIRM PASSWORD</label>
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className="input-field pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 mt-4">
            <input 
              type="checkbox" 
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 rounded border-card-border accent-foreground" 
              required 
            />
            <p className="text-xs text-foreground/60 leading-tight">
               I accept the <a href="#" className="text-foreground hover:underline">Terms of Use</a> and <a href="#" className="text-foreground hover:underline">Privacy Policy</a>
            </p>
          </div>

          <button 
            disabled={loading || !acceptedTerms} 
            className={cn(
              "w-full bg-foreground hover:bg-foreground/90 text-background font-semibold py-3 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2",
              (!acceptedTerms || loading) && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5"/> : "Create Account"}
          </button>
        </form>

          <div className="mt-6 text-center text-sm text-foreground/60">
            Already have an account? <Link href="/auth/login" className="text-foreground font-semibold hover:underline ml-1">Login</Link>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
