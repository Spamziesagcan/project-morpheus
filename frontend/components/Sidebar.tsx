"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  FileText,
  Layers,
  ListChecks,
  Sparkles,
  Route,
  Briefcase,
  IdCard,
  LayoutTemplate,
  Mail,
  ScanSearch,
  Mic2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type Section = "Profile" | "Learning" | "Job Application";

const dashboardItem: {
  name: string;
  href: string;
  icon: React.ElementType;
  shortText: string;
} = {
  name: "Dashboard",
  href: "/dashboard",
  icon: LayoutDashboard,
  shortText: "Overview",
};

const dashboardStyles = {
  activeBg: "bg-foreground",
  activeText: "text-background",
  iconActive: "text-background",
};

const menuItems: {
  section: Section;
  name: string;
  href: string;
  icon: React.ElementType;
  shortText: string;
}[] = [
  // Profile
  {
    section: "Profile",
    name: "User Profile",
    href: "/dashboard/profile",
    icon: IdCard,
    shortText: "Your details",
  },
  {
    section: "Profile",
    name: "Resume Builder",
    href: "/dashboard/profile/resume-builder",
    icon: IdCard,
    shortText: "Build your CV",
  },
  {
    section: "Profile",
    name: "Portfolio Builder",
    href: "/dashboard/profile/portfolio-builder",
    icon: LayoutTemplate,
    shortText: "Projects & links",
  },

  // Learning
  {
    section: "Learning",
    name: "Roadmap Generator",
    href: "/dashboard/learning/roadmap-generator",
    icon: Route,
    shortText: "Plan your path",
  },
  {
    section: "Learning",
    name: "PPT Maker",
    href: "/dashboard/learning/ppt-maker",
    icon: FileText,
    shortText: "Turn notes into slides",
  },
  {
    section: "Learning",
    name: "Flashcards",
    href: "/dashboard/learning/flashcards",
    icon: Layers,
    shortText: "Spaced repetition",
  },
  {
    section: "Learning",
    name: "Explainer Agent",
    href: "/dashboard/learning/explainer-agent",
    icon: Sparkles,
    shortText: "Concept breakdowns",
  },
  {
    section: "Learning",
    name: "Career Counsellor",
    href: "/dashboard/learning/career-counsellor",
    icon: Briefcase,
    shortText: "Guidance & advice",
  },

  // Job Application
  {
    section: "Job Application",
    name: "Career Fit Score",
    href: "/dashboard/job-application/career-fit-score",
    icon: Briefcase,
    shortText: "Best-fit roles",
  },
  {
    section: "Job Application",
    name: "Resume ATS Score",
    href: "/dashboard/job-application/resume-ats-score",
    icon: ScanSearch,
    shortText: "Beat the bots",
  },
  {
    section: "Job Application",
    name: "Cover Letter Generator",
    href: "/dashboard/job-application/coverletter-generator",
    icon: Mail,
    shortText: "Personalized letters",
  },
  {
    section: "Job Application",
    name: "AI Mock Interview",
    href: "/dashboard/job-application/mock-interview",
    icon: Mic2,
    shortText: "Practice questions",
  },
  {
    section: "Job Application",
    name: "Cold Mail Sender",
    href: "/dashboard/job-application/cold-mail-sender",
    icon: Mail,
    shortText: "Outreach drafts",
  },
  {
    section: "Job Application",
    name: "Active Jobs",
    href: "/dashboard/job-application/active-jobs",
    icon: ListChecks,
    shortText: "Open roles",
  },
];

const sections: Section[] = ["Profile", "Learning", "Job Application"];

const sectionStyles: Record<
  Section,
  { activeBg: string; activeText: string; iconActive: string }
> = {
  Profile: {
    activeBg: "bg-violet-500",
    activeText: "text-white",
    iconActive: "text-white",
  },
  Learning: {
    activeBg: "bg-sky-500",
    activeText: "text-white",
    iconActive: "text-white",
  },
  "Job Application": {
    activeBg: "bg-emerald-500",
    activeText: "text-white",
    iconActive: "text-white",
  },
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/auth/login");
  };

  return (
    <>
      <aside className="w-72 h-screen bg-card border-r border-border flex flex-col fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out pt-4">
        
        {/* LOGO */}
        <Link href="/" className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-foreground rounded-lg">
              <ShieldCheck className="w-4 h-4 text-background" />
            </div>
            <span className="font-semibold text-base tracking-tight text-foreground">
              MORPHEUS
            </span>
          </div>
        </Link>

        {/* NAV */}
        <nav className="flex-1 py-6 flex flex-col gap-4 px-4 relative">
          {/* Dashboard (first, standalone) */}
          <div className="relative mb-2">
            <p className="px-2 mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/40">
              Dashboard
            </p>
            {(() => {
              const isActive = pathname === dashboardItem.href;
              const style = dashboardStyles;
              const Icon = dashboardItem.icon;
              return (
                <Link
                  href={dashboardItem.href}
                  className={cn(
                    "group flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-medium relative z-10 transition-all duration-200 ease-out",
                    isActive
                      ? cn(style.activeBg, style.activeText, "shadow-sm")
                      : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                  )}
                >
                  {!isActive && (
                    <div className="absolute inset-0 rounded-lg bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out pointer-events-none" />
                  )}
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0 relative z-10 transition-all duration-300 ease-in-out",
                      isActive
                        ? style.iconActive
                        : "text-foreground/50 group-hover:text-foreground"
                    )}
                  />
                  <div className="flex flex-col relative z-10">
                    <span className="transition-all duration-300 ease-in-out">
                      {dashboardItem.name}
                    </span>
                    <span className="text-xs opacity-70 mt-0.5">
                      {dashboardItem.shortText}
                    </span>
                  </div>
                </Link>
              );
            })()}
          </div>
          {sections.map((section) => (
            <div key={section} className="relative">
              <p className="px-2 mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/40">
                {section === "Overview" ? "Dashboard" : section}
              </p>

              <div className="flex flex-col gap-1.5">
                {menuItems
                  .filter((item) => item.section === section)
                  .map((item) => {
                    const isActive = pathname === item.href;
                    const style = sectionStyles[item.section];

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-medium relative z-10 transition-all duration-200 ease-out",
                          isActive
                            ? cn(style.activeBg, style.activeText, "shadow-sm")
                            : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                        )}
                      >
                        {!isActive && (
                          <div className="absolute inset-0 rounded-lg bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out pointer-events-none" />
                        )}

                        <item.icon
                          className={cn(
                            "w-4 h-4 shrink-0 relative z-10 transition-all duration-300 ease-in-out",
                            isActive
                              ? style.iconActive
                              : "text-foreground/50 group-hover:text-foreground"
                          )}
                        />
                        <div className="flex flex-col relative z-10">
                          <span className="transition-all duration-300 ease-in-out">
                            {item.name}
                          </span>
                          <span className="text-xs opacity-70 mt-0.5">
                            {item.shortText}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        {/* LOGOUT */}
        <div className="p-4 border-t border-border">
          <button 
            onClick={() => setShowLogoutDialog(true)}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onConfirm={handleLogout}
        title="Sign Out"
        description="Are you sure you want to sign out? You will need to log in again to access your account."
        confirmText="Sign Out"
        cancelText="Cancel"
      />
    </>
  );
}
