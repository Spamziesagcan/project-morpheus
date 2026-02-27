"use client";

export default function ActiveJobsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Active Jobs</h1>
      <div className="bg-card border border-border rounded-xl p-6">
        <p className="text-foreground/70">
          This will become your active jobs board. Track saved roles, in-progress
          applications, and their current status.
        </p>
      </div>
    </div>
  );
}

