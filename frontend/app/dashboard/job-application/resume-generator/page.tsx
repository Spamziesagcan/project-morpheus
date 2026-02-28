"use client";

import { useTheme } from "next-themes";
import DotGrid from "@/components/DotGrid";

export default function ResumeGeneratorPage() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  return (
    <div className="relative min-h-screen bg-background p-6">
      <div className="absolute inset-0 pointer-events-none z-0">
        <DotGrid
          dotSize={5}
          gap={15}
          baseColor={isLight ? "#e8e8e8" : "#271E37"}
          activeColor="#5227FF"
          proximity={220}
          shockRadius={250}
          shockStrength={5}
          resistance={750}
          returnDuration={1.5}
        />
      </div>
      <div className="space-y-6 relative z-10">
      <h1 className="text-2xl font-semibold text-foreground">Resume Generator</h1>
      <div className="bg-card border border-border rounded-xl p-6">
        <p className="text-foreground/70">
          This will become your AI resume builder. Generate tailored resumes for
          different roles and optimize them for impact.
        </p>
      </div>
      </div>
    </div>
  );
}

