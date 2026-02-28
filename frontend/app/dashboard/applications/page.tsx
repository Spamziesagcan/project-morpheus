"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Building2,
  Trash2,
  Loader2,
  FileText,
} from "lucide-react";

import { API_ENDPOINTS } from "@/lib/config";

interface Application {
  user_id: string;
  job_id: string;
  job_title: string;
  company: string;
  job_description: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  application_source?: string;
}

function ApplicationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    // If we were redirected here with job data, immediately send the user
    // to the cover letter generator, preserving the query params.
    const jobId = searchParams.get("job_id");
    const title = searchParams.get("title");
    const company = searchParams.get("company");
    const description = searchParams.get("description");

    if (jobId && title && company && description) {
      const params = new URLSearchParams({
        job_id: jobId,
        title,
        company,
        description,
      });
      router.replace(
        `/dashboard/job-application/coverletter-generator?${params.toString()}`,
      );
      return;
    }

    void fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.JOB_APPLICATION.LIST, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setApplications(data.applications ?? []);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteApplication = async (jobId: string) => {
    if (!confirm("Delete this application? This cannot be undone.")) return;

    setDeletingId(jobId);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        API_ENDPOINTS.JOB_APPLICATION.DELETE(jobId),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        setApplications((prev) =>
          prev.filter((application) => application.job_id !== jobId),
        );
      } else {
        console.error("Failed to delete application");
      }
    } catch (error) {
      console.error("Error deleting application:", error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-card/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div>
            <h1 className="mb-1 text-3xl font-bold text-foreground">
              My applications
            </h1>
            <p className="text-sm text-muted-foreground">
              All the roles you&apos;ve generated materials for in one place.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-6xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">
              Loading your applications...
            </p>
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-8 py-16 text-center">
            <FileText className="mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold text-foreground">
              No applications saved yet
            </h2>
            <p className="mb-4 max-w-md text-sm text-muted-foreground">
              Use the Cover Letter Generator to create a tailored resume and
              cover letter, then click &quot;Save application&quot; to see it
              here.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {applications.map((app) => (
              <div
                key={app.job_id}
                className="group flex flex-col justify-between rounded-lg border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="line-clamp-2 text-base font-semibold text-foreground group-hover:text-primary">
                          {app.job_title}
                        </h3>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          <span>{app.company}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mb-3 line-clamp-3 text-xs text-muted-foreground">
                    {app.job_description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {app.updated_at
                        ? new Date(app.updated_at).toLocaleDateString()
                        : "Recently updated"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteApplication(app.job_id)}
                    disabled={deletingId === app.job_id}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === app.job_id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ApplicationsContent />
    </Suspense>
  );
}
