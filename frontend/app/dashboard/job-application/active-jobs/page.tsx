"use client";

import { useEffect, useState } from "react";
import {
  Award,
  Bookmark,
  Briefcase,
  Building2,
  ExternalLink,
  FileText,
  Filter,
  History,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { API_ENDPOINTS } from "@/lib/config";

interface Job {
  job_id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  required_skills: string[];
  url: string;
  salary?: string;
  job_type?: string;
  experience_level?: string;
  source: string;
  posted_date?: string;
}

interface JobMatch {
  job: Job;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
}

export default function ActiveJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [filterSource, setFilterSource] = useState<string>("all");
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterJobType, setFilterJobType] = useState<string>("all");
  const [filterMinSalary, setFilterMinSalary] = useState<string>("0");
  const [showFilters, setShowFilters] = useState(true);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  useEffect(() => {
    fetchRelevantJobs();
    fetchSavedJobs();
  }, []);

  const fetchRelevantJobs = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.JOBS.RELEVANT(50), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setJobs(data.jobs);
        setUserSkills(data.user_skills);
        
        // Debug: Log source distribution
        const sourceCounts: Record<string, number> = {};
        data.jobs.forEach((j: any) => {
          const src = (j.job?.source || "unknown").toLowerCase();
          sourceCounts[src] = (sourceCounts[src] || 0) + 1;
        });
        console.log("📊 Jobs by source:", sourceCounts);
        console.log("🔍 LinkedIn jobs in response:", sourceCounts["linkedin"] || 0);
      } else if (data.detail) {
        showToast(data.detail, "error");
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
      showToast("Failed to load jobs", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedJobs = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.JOBS.SAVED, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        const saved = new Set(data.jobs.map((j: any) => j.job_id));
        setSavedJobs(saved);
      }
    } catch {
      // optional feature
    }
  };

  const saveJob = async (jobId: string, status: string = "saved") => {
    try {
      const token = localStorage.getItem("token");
      await fetch(API_ENDPOINTS.JOBS.SAVE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ job_id: jobId, status }),
      });

      setSavedJobs((prev) => new Set(prev).add(jobId));
      if (status === "saved") {
        showToast("Job saved to your list", "success");
      } else if (status === "applied") {
        showToast("Marked as applied", "success");
      }
    } catch (error) {
      console.error("Error saving job:", error);
      showToast("Failed to update job", "error");
    }
  };

  const refreshJobs = async () => {
    setIsRefreshing(true);
    setRefreshMessage(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.JOBS.TRIGGER_SCRAPE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setRefreshMessage(
          `Successfully scraped ${data.stats?.total_scraped || 0} jobs (${data.stats?.saved_new || 0} new, ${data.stats?.updated_existing || 0} updated)`,
        );
        showToast("Job scrape completed", "success");
        setTimeout(() => {
          fetchRelevantJobs();
          setRefreshMessage(null);
        }, 2000);
      } else {
        const msg = data.message || "Failed to refresh jobs";
        setRefreshMessage(msg);
        showToast(msg, "error");
      }
    } catch (error) {
      console.error("Error refreshing jobs:", error);
      setRefreshMessage("Failed to refresh jobs. Please try again.");
      showToast("Failed to refresh jobs", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 80)
      return "text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700";
    if (score >= 60)
      return "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700";
    if (score >= 40)
      return "text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700";
    return "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700";
  };

  const getSourceBadge = (source: string) => {
    const sourceLower = (source || "").toLowerCase();
    const colors: Record<string, string> = {
      linkedin:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700",
      indeed:
        "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700",
      internshala:
        "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700",
      zip_recruiter:
        "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700",
      glassdoor:
        "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700",
    };
    return (
      colors[sourceLower] ||
      "bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-700"
    );
  };

  const handleApplyClick = (job: Job) => {
    const params = new URLSearchParams({
      job_id: job.job_id,
      title: job.title,
      company: job.company,
      description: job.description,
    });
    router.push(`/dashboard/applications?${params.toString()}`);
  };

  const uniqueLocations = Array.from(
    new Set(jobs.map((j) => j.job.location)),
  ).filter(Boolean);
  const uniqueJobTypes = Array.from(
    new Set(jobs.map((j) => j.job.job_type)),
  ).filter(Boolean);

  const parseSalary = (salaryStr?: string): number => {
    if (!salaryStr) return 0;
    const matches = salaryStr.match(/\$?([\d,]+)/g);
    if (!matches || matches.length === 0) return 0;
    const firstNum = matches[0].replace(/[^\d]/g, "");
    return parseInt(firstNum) || 0;
  };

  const filteredJobs = jobs.filter((jobMatch) => {
    const job = jobMatch.job;
    const searchLower = searchQuery.toLowerCase();

    if (
      searchQuery &&
      !job.title.toLowerCase().includes(searchLower) &&
      !job.company.toLowerCase().includes(searchLower)
    ) {
      return false;
    }

    if (filterSource !== "all" && job.source?.toLowerCase() !== filterSource.toLowerCase()) {
      return false;
    }

    if (filterLocation !== "all" && job.location !== filterLocation) {
      return false;
    }

    if (
      filterJobType !== "all" &&
      job.job_type?.toLowerCase() !== filterJobType.toLowerCase()
    ) {
      return false;
    }

    const minSalaryNum = parseInt(filterMinSalary);
    if (minSalaryNum > 0) {
      const jobSalary = parseSalary(job.salary);
      if (jobSalary === 0 || jobSalary < minSalaryNum) {
        return false;
      }
    }

    return true;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setFilterSource("all");
    setFilterLocation("all");
    setFilterJobType("all");
    setFilterMinSalary("0");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-foreground">
              Job Opportunities
            </h1>
            <p className="text-muted-foreground">
              {jobs.length} jobs matched to your {userSkills.length} skills
            </p>
          </div>
          <button
            onClick={refreshJobs}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-[0_0_20px_rgba(56,189,248,0.6)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Scraping..." : "Refresh jobs"}
          </button>
        </div>

        {refreshMessage && (
          <div className="mb-4 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
            {refreshMessage}
          </div>
        )}

        <div className="mb-6 rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Filters</h3>
              <span className="text-sm text-muted-foreground">
                ({filteredJobs.length} jobs)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
              >
                <X className="h-4 w-4" />
                Clear all
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {showFilters ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="space-y-4 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by company or job title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-10 py-2 text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Source
                  </label>
                  <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="all">All sources</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="indeed">Indeed</option>
                    <option value="zip_recruiter">ZipRecruiter</option>
                    <option value="glassdoor">Glassdoor</option>
                    <option value="internshala">Internshala</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Location
                  </label>
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="all">All locations</option>
                    {uniqueLocations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Job type
                  </label>
                  <select
                    value={filterJobType}
                    onChange={(e) => setFilterJobType(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="all">All types</option>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="internship">Internship</option>
                    <option value="contract">Contract</option>
                    {uniqueJobTypes.map((type) => {
                      if (
                        ["full-time", "part-time", "internship", "contract"].includes(
                          (type || "").toLowerCase(),
                        )
                      )
                        return null;
                      return (
                        <option key={type} value={(type || "").toLowerCase()}>
                          {type}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Min salary
                  </label>
                  <select
                    value={filterMinSalary}
                    onChange={(e) => setFilterMinSalary(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="0">Any salary</option>
                    <option value="90000">$90,000+</option>
                    <option value="120000">$120,000+</option>
                    <option value="150000">$150,000+</option>
                    <option value="180000">$180,000+</option>
                    <option value="210000">$210,000+</option>
                    <option value="240000">$240,000+</option>
                    <option value="270000">$270,000+</option>
                    <option value="300000">$300,000+</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {filteredJobs.map((jobMatch) => {
            const { job, match_score, matched_skills, missing_skills } = jobMatch;
            const isSaved = savedJobs.has(job.job_id);

            return (
              <div
                key={job.job_id}
                className="rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-foreground">
                          {job.title}
                        </h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getSourceBadge(job.source)}`}
                        >
                          {job.source}
                        </span>
                        {job.salary &&
                          job.company &&
                          job.company.toLowerCase() !== "nan" &&
                          job.company.toLowerCase() !== "unknown company" &&
                          job.location &&
                          job.location.toLowerCase() !== "nan" &&
                          job.location.toLowerCase() !== "not specified" &&
                          job.job_type &&
                          job.job_type.toLowerCase() !== "nan" && (
                            <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                              <Award className="h-3 w-3" />
                              Verified
                            </span>
                          )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          <span>{job.company}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{job.location}</span>
                        </div>
                        {job.job_type && (
                          <span className="rounded-full border border-purple-300 bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            {job.job_type}
                          </span>
                        )}
                        {job.salary && (
                          <span className="rounded-full border border-green-300 bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300">
                            {job.salary}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className={`flex flex-col items-center rounded-lg border px-4 py-3 ${getMatchColor(
                        match_score,
                      )}`}
                    >
                      <TrendingUp className="mb-1 h-5 w-5" />
                      <span className="text-2xl font-bold">
                        {Math.round(match_score)}
                      </span>
                      <span className="text-xs">Match</span>
                    </div>
                  </div>

                  <p className="mb-4 line-clamp-2 text-muted-foreground">
                    {job.description}
                  </p>

                  <div className="mb-4">
                    <div className="mb-2 flex flex-wrap gap-2">
                      {matched_skills.slice(0, 5).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-blue-300 bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          ✓ {skill}
                        </span>
                      ))}
                      {missing_skills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    {matched_skills.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {matched_skills.length} of {job.required_skills.length} skills
                        matched
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleApplyClick(job)}
                      className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-white shadow-sm transition hover:from-blue-700 hover:to-blue-800"
                    >
                      <FileText className="h-4 w-4" />
                      Apply
                    </button>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary/90"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View job
                    </a>
                    <button
                      onClick={() => saveJob(job.job_id, "saved")}
                      disabled={isSaved}
                      className={`flex items-center gap-2 rounded-lg px-4 py-2 transition ${
                        isSaved
                          ? "border border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-muted text-foreground hover:bg-muted/80"
                      }`}
                    >
                      {isSaved ? (
                        <History className="h-4 w-4" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                      {isSaved ? "Saved" : "Save"}
                    </button>
                    <button
                      onClick={() => saveJob(job.job_id, "applied")}
                      className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-purple-600 transition hover:bg-purple-500/20 dark:text-purple-400"
                    >
                      Mark applied
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredJobs.length === 0 && (
          <div className="py-12 text-center">
            <Briefcase className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold text-foreground">
              No jobs found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or add more skills to your profile.
            </p>
          </div>
        )}
      </div>

      {toastVisible && (
        <div className="fixed bottom-5 left-0 right-0 z-50 flex items-center justify-center px-4">
          <div
            className={`max-w-md flex-1 rounded-xl px-4 py-3 text-sm shadow-lg ${
              toastType === "success"
                ? "bg-emerald-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}

