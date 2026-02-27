"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type Section = "Profile" | "Learning" | "Job Application";

type IconKey =
  | "dashboard"
  | "profile"
  | "resume"
  | "portfolio"
  | "roadmap"
  | "ppt"
  | "flashcards"
  | "explainer"
  | "career"
  | "careerFit"
  | "ats"
  | "cover"
  | "interview"
  | "cold"
  | "jobs";

const dashboardItem: {
  name: string;
  href: string;
  icon: IconKey;
  shortText: string;
} = {
  name: "Dashboard",
  href: "/dashboard",
  icon: "dashboard",
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
  icon: IconKey;
  shortText: string;
}[] = [
  // Profile
  {
    section: "Profile",
    name: "User Profile",
    href: "/dashboard/profile",
    icon: "profile",
    shortText: "Your details",
  },
  {
    section: "Profile",
    name: "Resume Builder",
    href: "/dashboard/profile/resume-builder",
    icon: "resume",
    shortText: "Build your CV",
  },
  {
    section: "Profile",
    name: "Portfolio Builder",
    href: "/dashboard/profile/portfolio-builder",
    icon: "portfolio",
    shortText: "Projects & links",
  },

  // Learning
  {
    section: "Learning",
    name: "Roadmap Generator",
    href: "/dashboard/learning/roadmap-generator",
    icon: "roadmap",
    shortText: "Plan your path",
  },
  {
    section: "Learning",
    name: "PPT Maker",
    href: "/dashboard/learning/ppt-maker",
    icon: "ppt",
    shortText: "Turn notes into slides",
  },
  {
    section: "Learning",
    name: "Flashcards",
    href: "/dashboard/learning/flashcards",
    icon: "flashcards",
    shortText: "Spaced repetition",
  },
  {
    section: "Learning",
    name: "Explainer Agent",
    href: "/dashboard/learning/explainer-agent",
    icon: "explainer",
    shortText: "Concept breakdowns",
  },
  {
    section: "Learning",
    name: "Career Counsellor",
    href: "/dashboard/learning/career-counsellor",
    icon: "career",
    shortText: "Guidance & advice",
  },

  // Job Application
  {
    section: "Job Application",
    name: "Career Fit Score",
    href: "/dashboard/job-application/career-fit-score",
    icon: "careerFit",
    shortText: "Best-fit roles",
  },
  {
    section: "Job Application",
    name: "Resume ATS Score",
    href: "/dashboard/job-application/resume-ats-score",
    icon: "ats",
    shortText: "Beat the bots",
  },
  {
    section: "Job Application",
    name: "Cover Letter Generator",
    href: "/dashboard/job-application/coverletter-generator",
    icon: "cover",
    shortText: "Personalized letters",
  },
  {
    section: "Job Application",
    name: "AI Mock Interview",
    href: "/dashboard/job-application/mock-interview",
    icon: "interview",
    shortText: "Practice questions",
  },
  {
    section: "Job Application",
    name: "Cold Mail Sender",
    href: "/dashboard/job-application/cold-mail-sender",
    icon: "cold",
    shortText: "Outreach drafts",
  },
  {
    section: "Job Application",
    name: "Active Jobs",
    href: "/dashboard/job-application/active-jobs",
    icon: "jobs",
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

const sectionBackground: Record<Section, string> = {
  Profile: "bg-violet-500/10",
  Learning: "bg-sky-500/10",
  "Job Application": "bg-emerald-500/10",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Determine the "best" active menu item based on the current path:
  // pick the longest href that matches the pathname or is its prefix.
  const activeHref =
    menuItems
      .map((item) => item.href)
      .filter(
        (href) => pathname === href || pathname.startsWith(`${href}/`)
      )
      .sort((a, b) => b.length - a.length)[0] || pathname;

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/auth/login");
  };

  return (
    <>
      <aside className="w-72 h-screen bg-card border-r border-border flex flex-col fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out pt-4 font-mono">
        
        {/* LOGO */}
        <Link href="/" className="h-16 flex items-center px-6 border-b border-border">
          <span className="text-xl font-semibold tracking-[0.35em] uppercase text-foreground/90 font-mono">
            SkillSphere
          </span>
        </Link>

        {/* NAV */}
        <nav className="flex-1 py-6 flex flex-col gap-6 px-4 relative overflow-y-auto no-scrollbar">
          {/* Dashboard (first, standalone) */}
          <div className="relative mb-4">
            <p className="px-2 mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/40">
              Dashboard
            </p>
            {(() => {
              const isActive = pathname === dashboardItem.href;
              const style = dashboardStyles;
              return (
                <Link
                  href={dashboardItem.href}
                  className={cn(
                    "group flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-medium relative z-10 transition-all duration-200 ease-out",
                    isActive
                      ? cn(style.activeBg, style.activeText, "shadow-sm")
                      : "text-foreground hover:bg-foreground/5"
                  )}
                >
                  {!isActive && (
                    <div className="absolute inset-0 rounded-lg bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out pointer-events-none" />
                  )}
                  <span className="relative z-10 transition-all duration-300 ease-in-out text-[13px] font-bold">
                    {dashboardItem.name}
                  </span>
                </Link>
              );
            })()}
          </div>
          {sections.map((section) => (
            <div
              key={section}
              className={cn(
                "relative mb-6 rounded-xl px-1 py-2",
                sectionBackground[section]
              )}
            >
              <p className="px-2 mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
                {section}
              </p>

              <div className="relative mt-1">
                {/* Vertical timeline line */}
                <div className="absolute left-3 top-2 bottom-2 w-px bg-foreground/15" />

                <div className="flex flex-col gap-2">
                  {menuItems
                    .filter((item) => item.section === section)
                    .map((item) => {
                      const isActive = item.href === activeHref;
                      const style = sectionStyles[item.section];

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "group flex items-center gap-2.5 pl-8 pr-4 py-2.5 rounded-lg text-xs font-medium relative z-10 transition-all duration-200 ease-out",
                            isActive
                              ? cn(style.activeBg, style.activeText, "shadow-sm")
                              : "text-foreground hover:bg-foreground/5"
                          )}
                        >
                          {!isActive && (
                            <div className="absolute inset-0 rounded-lg bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out pointer-events-none" />
                          )}

                          {/* Timeline bullet */}
                          <div
                            className={cn(
                              "absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border bg-card transition-colors duration-200",
                              isActive
                                ? "bg-foreground border-foreground"
                                : "border-foreground/40 group-hover:bg-foreground/70"
                            )}
                          />

                          <span className="relative z-10 transition-all duration-300 ease-in-out text-[13px] font-bold">
                            {item.name}
                          </span>
                        </Link>
                      );
                    })}
                </div>
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
