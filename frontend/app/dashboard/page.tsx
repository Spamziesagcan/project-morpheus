"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  FileText,
  Video,
  Mail,
  BookOpen,
  Flame,
  TrendingUp,
  Clock,
  Loader2,
  AlertTriangle,
  Zap,
  Target,
  Award,
  Calendar,
  Activity,
  BarChart2,
  PieChart,
  Star,
} from "lucide-react";
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveRadar } from "@nivo/radar";
import { API_ENDPOINTS } from "@/lib/config";

// ─── Hardcoded chart data ────────────────────────────────────────────────────

const monthlyApplications = [
  { month: "Sep", applications: 3 },
  { month: "Oct", applications: 7 },
  { month: "Nov", applications: 5 },
  { month: "Dec", applications: 11 },
  { month: "Jan", applications: 9 },
  { month: "Feb", applications: 14 },
];

const weeklyActivity = [
  { day: "Mon", hours: 2.5 },
  { day: "Tue", hours: 4.2 },
  { day: "Wed", hours: 3.8 },
  { day: "Thu", hours: 5.1 },
  { day: "Fri", hours: 3.0 },
  { day: "Sat", hours: 6.5 },
  { day: "Sun", hours: 4.9 },
];

const featureUsage = [
  { id: "Resume ATS", label: "Resume ATS", value: 28 },
  { id: "Mock Interview", label: "Mock Interview", value: 22 },
  { id: "Flashcards", label: "Flashcards", value: 18 },
  { id: "Cold Mail", label: "Cold Mail", value: 15 },
  { id: "Roadmap", label: "Roadmap", value: 17 },
];

const skillRadarData = [
  { skill: "DSA", score: 72 },
  { skill: "System Design", score: 55 },
  { skill: "Behavioural", score: 80 },
  { skill: "Resume", score: 88 },
  { skill: "Networking", score: 60 },
  { skill: "Interviews", score: 68 },
];

const recentActivity = [
  {
    type: "interview",
    title: "Completed AI Mock Interview",
    description: "Software Engineer role · 8/10 score",
    timeAgo: "2h ago",
  },
  {
    type: "ats",
    title: "Ran ATS Score Check",
    description: "Resume scored 91% · Google SWE JD",
    timeAgo: "5h ago",
  },
  {
    type: "learning",
    title: "Finished Flashcard Deck",
    description: "System Design · 24 cards reviewed",
    timeAgo: "Yesterday",
  },
  {
    type: "mail",
    title: "Sent 3 Cold Emails",
    description: "Stripe, Notion, Linear",
    timeAgo: "Yesterday",
  },
  {
    type: "roadmap",
    title: "Generated Learning Roadmap",
    description: "Full-Stack Web Dev · 12-week plan",
    timeAgo: "2d ago",
  },
];

const activityColors: Record<string, string> = {
  interview: "bg-orange-500/10 text-orange-500",
  ats: "bg-emerald-500/10 text-emerald-500",
  learning: "bg-sky-500/10 text-sky-500",
  mail: "bg-violet-500/10 text-violet-500",
  roadmap: "bg-pink-500/10 text-pink-500",
};

const activityIcons: Record<string, React.ElementType> = {
  interview: Video,
  ats: FileText,
  learning: BookOpen,
  mail: Mail,
  roadmap: Target,
};

// ─── Nivo shared theme ────────────────────────────────────────────────────────

const nivoTheme = {
  axis: {
    ticks: { text: { fill: "#888", fontSize: 11 } },
    legend: { text: { fill: "#888", fontSize: 11 } },
  },
  grid: { line: { stroke: "rgba(128,128,128,0.1)", strokeWidth: 1 } },
  tooltip: {
    container: {
      background: "rgba(10,10,10,0.95)",
      color: "#fff",
      border: "none",
      borderRadius: "10px",
      fontSize: "13px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
    },
  },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend: string;
  accentClass: string;
  bgClass: string;
}

function StatCard({ title, value, icon: Icon, trend, accentClass, bgClass }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:scale-[1.02] transition-all relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-foreground/3 via-transparent to-foreground/8 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={"p-2.5 rounded-lg " + bgClass}>
            <Icon className={"w-5 h-5 " + accentClass} />
          </div>
        </div>
        <div className={"text-3xl font-bold mb-1 " + accentClass}>{value}</div>
        <div className="text-sm font-medium text-foreground/80 mb-0.5">{title}</div>
        <div className="text-xs text-foreground/40">{trend}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface User {
  full_name?: string | null;
  email: string;
}

export default function DashboardHome() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      if (typeof window === "undefined") return;
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/login");
        return;
      }
      try {
        const res = await fetch(API_ENDPOINTS.AUTH.ME, {
          headers: { Authorization: "Bearer " + token },
        });
        if (res.ok) {
          setUser(await res.json());
        } else {
          localStorage.removeItem("token");
          router.push("/auth/login");
        }
      } catch {
        setFetchError("Could not reach the server. Check that the backend is running.");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-foreground/50" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <p className="text-foreground/80 text-center max-w-md">{fetchError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 text-foreground text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const displayName = user?.full_name || user?.email?.split("@")[0] || "there";

  return (
    <div className="space-y-7">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Welcome back,{" "}
            <span className="capitalize bg-gradient-to-r from-violet-500 via-sky-500 to-emerald-500 bg-clip-text text-transparent">
              {displayName}
            </span>{" "}
            👋
          </h1>
          <p className="text-sm text-foreground/50">
            Here&apos;s your career prep snapshot — keep the momentum going!
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-foreground/40 bg-card border border-border rounded-lg px-3 py-2">
          <Calendar className="w-3.5 h-3.5" />
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Cover Letters" value={12} icon={FileText} trend="+3 this week" accentClass="text-violet-500" bgClass="bg-violet-500/10" />
        <StatCard title="ATS Checks" value={27} icon={Briefcase} trend="Avg score 88%" accentClass="text-emerald-500" bgClass="bg-emerald-500/10" />
        <StatCard title="Mock Interviews" value={9} icon={Video} trend="+2 this month" accentClass="text-orange-500" bgClass="bg-orange-500/10" />
        <StatCard title="Cold Emails" value={34} icon={Mail} trend="18% reply rate" accentClass="text-sky-500" bgClass="bg-sky-500/10" />
        <StatCard title="Flashcard Decks" value={6} icon={BookOpen} trend="142 cards total" accentClass="text-pink-500" bgClass="bg-pink-500/10" />
        <StatCard title="Day Streak 🔥" value={14} icon={Flame} trend="Personal best!" accentClass="text-amber-500" bgClass="bg-amber-500/10" />
      </div>

      {/* ── Charts Row 1 ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Trend Line Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">Application Trend</h3>
              <p className="text-xs text-foreground/50 mt-0.5">Job applications over 6 months</p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveLine
              data={[{ id: "applications", data: monthlyApplications.map((d) => ({ x: d.month, y: d.applications })) }]}
              margin={{ top: 10, right: 20, bottom: 36, left: 36 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: 0, max: 20 }}
              curve="natural"
              axisBottom={{ tickSize: 0, tickPadding: 10 }}
              axisLeft={{ tickSize: 0, tickPadding: 10, tickValues: 5 }}
              colors={["#10b981"]}
              lineWidth={3}
              pointSize={9}
              pointColor="#10b981"
              pointBorderWidth={2}
              pointBorderColor="#ffffff"
              enableArea
              areaOpacity={0.18}
              useMesh
              enableGridX={false}
              enableGridY
              gridYValues={5}
              enableSlices="x"
              sliceTooltip={({ slice }) => (
                <div style={{ background: "rgba(10,10,10,0.95)", padding: "8px 12px", borderRadius: 8, color: "#fff", fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{slice.points[0].data.xFormatted}</span>
                  <br />
                  <span style={{ color: "#10b981", fontWeight: 700 }}>{slice.points[0].data.yFormatted} applications</span>
                </div>
              )}
              defs={[{ id: "appsGrad", type: "linearGradient", colors: [{ offset: 0, color: "#10b981", opacity: 0.6 }, { offset: 100, color: "#10b981", opacity: 0 }] }]}
              fill={[{ match: "*", id: "appsGrad" }]}
              theme={nivoTheme}
            />
          </div>
        </div>

        {/* Weekly Study Activity Bar Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">Weekly Study Activity</h3>
              <p className="text-xs text-foreground/50 mt-0.5">Hours spent preparing this week</p>
            </div>
            <div className="p-2 rounded-lg bg-sky-500/10">
              <Clock className="w-4 h-4 text-sky-500" />
            </div>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveBar
              data={weeklyActivity}
              keys={["hours"]}
              indexBy="day"
              margin={{ top: 10, right: 20, bottom: 36, left: 36 }}
              padding={0.3}
              borderRadius={10}
              colors={["#38bdf8"]}
              borderWidth={0}
              axisBottom={{ tickSize: 0, tickPadding: 10 }}
              axisLeft={{ tickSize: 0, tickPadding: 10, tickValues: 5 }}
              labelSkipWidth={16}
              labelSkipHeight={16}
              labelTextColor="#fff"
              valueFormat={(v) => v + "h"}
              enableGridX={false}
              enableGridY
              gridYValues={5}
              defs={[{ id: "barGrad", type: "linearGradient", colors: [{ offset: 0, color: "#38bdf8", opacity: 1 }, { offset: 100, color: "#6366f1", opacity: 0.8 }] }]}
              fill={[{ match: "*", id: "barGrad" }]}
              theme={nivoTheme}
              motionConfig="wobbly"
            />
          </div>
        </div>
      </div>

      {/* ── Charts Row 2 ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Usage Donut */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">Feature Usage</h3>
              <p className="text-xs text-foreground/50 mt-0.5">How you spend time on Morpheus</p>
            </div>
            <div className="p-2 rounded-lg bg-violet-500/10">
              <PieChart className="w-4 h-4 text-violet-500" />
            </div>
          </div>
          <div style={{ height: 260 }}>
            <ResponsivePie
              data={featureUsage}
              margin={{ top: 20, right: 80, bottom: 60, left: 80 }}
              innerRadius={0.62}
              padAngle={2.5}
              cornerRadius={6}
              activeOuterRadiusOffset={12}
              colors={["#8b5cf6", "#38bdf8", "#10b981", "#f59e0b", "#ec4899"]}
              borderWidth={0}
              arcLinkLabelsSkipAngle={10}
              arcLinkLabelsTextColor="#888"
              arcLinkLabelsThickness={2}
              arcLinkLabelsColor={{ from: "color" }}
              arcLabelsSkipAngle={15}
              arcLabelsTextColor="#fff"
              valueFormat={(v) => v + "%"}
              animate
              motionConfig="slow"
              transitionMode="startAngle"
              theme={nivoTheme}
            />
          </div>
        </div>

        {/* Skill Readiness Radar */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">Skill Readiness</h3>
              <p className="text-xs text-foreground/50 mt-0.5">Self-assessed proficiency by area</p>
            </div>
            <div className="p-2 rounded-lg bg-orange-500/10">
              <BarChart2 className="w-4 h-4 text-orange-500" />
            </div>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveRadar
              data={skillRadarData}
              keys={["score"]}
              indexBy="skill"
              maxValue={100}
              margin={{ top: 30, right: 60, bottom: 30, left: 60 }}
              curve="linearClosed"
              gridShape="circular"
              gridLevels={5}
              colors={["#f97316"]}
              fillOpacity={0.2}
              borderWidth={2}
              borderColor={{ from: "color" }}
              dotSize={8}
              dotColor={{ from: "color" }}
              dotBorderWidth={2}
              dotBorderColor="#fff"
              enableDotLabel
              dotLabel="value"
              dotLabelYOffset={-12}
              animate
              motionConfig="slow"
              theme={nivoTheme}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">Recent Activity</h3>
              <p className="text-xs text-foreground/50 mt-0.5">Your latest actions &amp; milestones</p>
            </div>
            <div className="p-2 rounded-lg bg-foreground/5">
              <Activity className="w-4 h-4 text-foreground/40" />
            </div>
          </div>
          <div className="space-y-3">
            {recentActivity.map((item, i) => {
              const Icon = (activityIcons[item.type] as React.ElementType) ?? Zap;
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-foreground/5 transition-colors">
                  <div className={"p-2 rounded-lg flex-shrink-0 " + (activityColors[item.type] ?? "bg-foreground/10 text-foreground/60")}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-foreground/50 mt-0.5">{item.description}</p>
                  </div>
                  <span className="text-xs text-foreground/30 whitespace-nowrap flex-shrink-0 mt-0.5">{item.timeAgo}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Gradient banner */}
          <div className="bg-gradient-to-br from-violet-500/15 via-sky-500/10 to-emerald-500/15 border border-border rounded-xl p-5">
            <Award className="w-8 h-8 text-violet-400 mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">You&apos;re on a roll!</h3>
            <p className="text-xs text-foreground/60 leading-relaxed">
              14-day streak · 27 ATS checks · 9 mock interviews completed. Keep pushing — you&apos;re clearly serious about landing your next role.
            </p>
          </div>

          {/* Monthly Goals Progress Bars */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Monthly Goals</h3>
            {[
              { label: "Applications", current: 14, goal: 20, color: "bg-emerald-500" },
              { label: "Mock Interviews", current: 9, goal: 12, color: "bg-orange-500" },
              { label: "Study Hours", current: 32, goal: 40, color: "bg-sky-500" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-foreground/70">{item.label}</span>
                  <span className="text-foreground/50 font-medium">{item.current}/{item.goal}</span>
                </div>
                <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                  <div className={"h-full rounded-full transition-all " + item.color} style={{ width: Math.min((item.current / item.goal) * 100, 100) + "%" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Suggested Next Steps */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">Suggested Next Steps</h3>
            </div>
            <ul className="space-y-2 text-xs text-foreground/60">
              {[
                { color: "bg-violet-500", text: "Update your portfolio with recent projects" },
                { color: "bg-sky-500", text: "Run ATS check on latest resume version" },
                { color: "bg-emerald-500", text: "Send 5 cold emails to target companies" },
                { color: "bg-orange-500", text: "Practice a system design mock interview" },
              ].map((s) => (
                <li key={s.text} className="flex items-center gap-2">
                  <span className={"w-1.5 h-1.5 rounded-full flex-shrink-0 " + s.color} />
                  {s.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
