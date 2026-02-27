"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Activity, 
  ShieldAlert, 
  FileCheck, 
  AlertTriangle, 
  TrendingUp, 
  Clock,
  Loader2,
} from "lucide-react";
import { API_ENDPOINTS } from "@/lib/config";

interface User {
  full_name?: string | null;
  email: string;
  _id?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend: string;
  color?: string;
}

function StatCard({ title, value, icon: Icon, trend, color = "text-foreground" }: StatCardProps) {
  return (
    <div className="bg-card border border-border p-6 rounded-xl hover:border-foreground/20 transition-all relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 via-transparent to-foreground/10 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-foreground/50 uppercase tracking-wider">{title}</span>
          <div className="p-2 rounded-lg border bg-foreground/10 border-foreground/10">
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
        </div>
        <div className={`text-3xl font-semibold ${color} mb-1`}>{value}</div>
        <div className="text-xs text-foreground/40 font-medium">{trend}</div>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      try {
        const res = await fetch(API_ENDPOINTS.AUTH.ME, {
          headers: { 
            "Authorization": `Bearer ${token}` 
          },
        });
        
        if (res.ok) {
          const userData = await res.json() as User;
          setUser(userData);
        } else {
          localStorage.removeItem("token");
          router.push("/auth/login");
        }
      } catch {
        console.error("Failed to fetch user");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1.5">
          Welcome back, <span className="text-foreground/90 capitalize">{user?.full_name || user?.email}</span>
        </h1>
        <p className="text-sm text-foreground/50">Your dashboard is ready</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard 
          title="Total Items" 
          value={0} 
          icon={Activity} 
          trend="0 items"
          color="text-foreground"
        />
        <StatCard 
          title="Active" 
          value={0} 
          icon={ShieldAlert} 
          trend="0% of total"
          color="text-red-400"
        />
        <StatCard 
          title="Completed" 
          value={0} 
          icon={FileCheck} 
          trend="0% of total"
          color="text-green-400"
        />
        <StatCard 
          title="Pending" 
          value={0} 
          icon={AlertTriangle} 
          trend="0% of total"
          color="text-yellow-400"
        />
        <StatCard 
          title="Growth" 
          value="0%" 
          icon={TrendingUp} 
          trend="Average score"
          color="text-foreground"
        />
        <StatCard 
          title="Avg Time" 
          value="0s" 
          icon={Clock} 
          trend="Average duration"
          color="text-purple-400"
        />
      </div>

      {/* Content Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Start</h3>
          <p className="text-sm text-foreground/70">
            Get started by exploring the features in the sidebar. Each feature is ready to be customized for your hackathon project.
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Features</h3>
          <ul className="space-y-2 text-sm text-foreground/70">
            <li>• Feature 1 - Ready to customize</li>
            <li>• Feature 2 - Ready to customize</li>
            <li>• Feature 3 - Ready to customize</li>
            <li>• Feature 4 - Ready to customize</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
