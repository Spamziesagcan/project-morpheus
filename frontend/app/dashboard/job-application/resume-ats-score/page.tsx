"use client";

import { useState } from "react";
import {
  FileSearch,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Target,
  BarChart3,
} from "lucide-react";
import { API_ENDPOINTS } from "@/lib/config";

interface AnalysisResult {
  ats_score: number;
  readiness_score: number;
  match_percentage: number;
  tips: string[];
  gaps: string[];
  strengths: string[];
  recommendations: string[];
}

export default function ResumeAtsScorePage() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        setError("Please upload a PDF file");
        return;
      }
      setResumeFile(file);
      setError("");
    }
  };

  const handleAnalyze = async () => {
    if (!resumeFile) {
      setError("Please upload a resume file");
      return;
    }
    if (!jobDescription.trim() || jobDescription.trim().length < 20) {
      setError("Please enter a job description (at least 20 characters)");
      return;
    }

    setAnalyzing(true);
    setError("");
    setAnalysisResult(null);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("resume", resumeFile);
      formData.append("job_description", jobDescription);

      const response = await fetch(API_ENDPOINTS.RESUME_ANALYZER.ANALYZE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to analyze resume");
      }

      const data = await response.json();
      setAnalysisResult({
        ats_score: data.ats_score,
        readiness_score: data.readiness_score,
        match_percentage: data.match_percentage,
        tips: data.tips || [],
        gaps: data.gaps || [],
        strengths: data.strengths || [],
        recommendations: data.recommendations || [],
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to analyze resume",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-lg bg-foreground p-2">
              <FileSearch className="h-6 w-6 text-background" />
            </div>
            <h1 className="text-3xl font-bold text-foreground font-mono tracking-[0.08em] uppercase">
              Resume ATS Score
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Upload your resume and a job description to get an AI-powered ATS
            score, readiness score, and concrete improvement tips.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Input Section */}
        {!analysisResult && (
          <div className="mb-8 rounded-xl border-2 border-border bg-card p-8">
            <div className="space-y-6">
              {/* Resume Upload */}
              <div>
                <label className="mb-3 block text-xs font-bold text-foreground font-mono tracking-[0.12em] uppercase">
                  Upload Resume (PDF) <span className="text-red-500">*</span>
                </label>
                <div className="rounded-lg border-2 border-dashed border-border p-6 text-center transition hover:border-foreground/50">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="resume-upload"
                    disabled={analyzing}
                  />
                  <label
                    htmlFor="resume-upload"
                    className="flex cursor-pointer flex-col items-center gap-3"
                  >
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <span className="font-medium text-foreground">
                        Click to upload
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        or drag and drop
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      PDF only (Max 10MB)
                    </p>
                  </label>
                  {resumeFile && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>{resumeFile.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Job Description */}
              <div>
                <label className="mb-3 block text-xs font-bold text-foreground font-mono tracking-[0.12em] uppercase">
                  Job Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here..."
                  className="h-48 w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  disabled={analyzing}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {jobDescription.length} characters
                </p>
              </div>

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !resumeFile || !jobDescription.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg shiny-blue-bg px-6 py-4 text-xs font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 font-mono tracking-[0.12em] uppercase"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analyzing resume...
                  </>
                ) : (
                  <>
                    <FileSearch className="h-5 w-5" />
                    Analyze resume
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysisResult && (
    <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setAnalysisResult(null);
                  setResumeFile(null);
                  setJobDescription("");
                }}
                className="rounded-lg shiny-blue-border bg-card/80 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-card"
              >
                Analyze another resume
              </button>
            </div>

            {/* Scores Section */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* ATS Score */}
              <div className="rounded-xl border-2 border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-sky-500" />
                  <h3 className="text-lg font-bold text-foreground font-mono tracking-[0.08em] uppercase">
                    ATS score
                  </h3>
                </div>
                <div className="relative">
                  <div className="mb-2 text-5xl font-bold">
                    <span className={getScoreColor(analysisResult.ats_score)}>
                      {Math.round(analysisResult.ats_score)}
                    </span>
                    <span className="text-2xl text-muted-foreground">/100</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-background">
                    <div
                      className={`h-full ${getScoreBgColor(
                        analysisResult.ats_score,
                      )} transition-all duration-500`}
                      style={{ width: `${analysisResult.ats_score}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    How well your resume passes ATS systems.
                  </p>
                </div>
              </div>

              {/* Readiness Score */}
              <div className="rounded-xl border-2 border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <Target className="h-6 w-6 text-purple-500" />
                  <h3 className="text-lg font-bold text-foreground font-mono tracking-[0.08em] uppercase">
                    Readiness score
                  </h3>
                </div>
                <div className="relative">
                  <div className="mb-2 text-5xl font-bold">
                    <span
                      className={getScoreColor(analysisResult.readiness_score)}
                    >
                      {Math.round(analysisResult.readiness_score)}
                    </span>
                    <span className="text-2xl text-muted-foreground">/100</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-background">
                    <div
                      className={`h-full ${getScoreBgColor(
                        analysisResult.readiness_score,
                      )} transition-all duration-500`}
                      style={{ width: `${analysisResult.readiness_score}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    How well you match this role right now.
                  </p>
                </div>
              </div>

              {/* Match Percentage */}
              <div className="rounded-xl border-2 border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                  <h3 className="text-lg font-bold text-foreground font-mono tracking-[0.08em] uppercase">
                    Match percentage
                  </h3>
                </div>
                <div className="relative">
                  <div className="mb-2 text-5xl font-bold">
                    <span
                      className={getScoreColor(
                        analysisResult.match_percentage,
                      )}
                    >
                      {Math.round(analysisResult.match_percentage)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-background">
                    <div
                      className={`h-full ${getScoreBgColor(
                        analysisResult.match_percentage,
                      )} transition-all duration-500`}
                      style={{ width: `${analysisResult.match_percentage}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Overall overlap with job requirements.
                  </p>
                </div>
              </div>
            </div>

            {/* Strengths */}
            {analysisResult.strengths.length > 0 && (
              <div className="rounded-xl border-2 border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  <h3 className="text-xl font-bold text-foreground font-mono tracking-[0.08em] uppercase">
                    Strengths
                  </h3>
                </div>
                <ul className="space-y-2">
                  {analysisResult.strengths.map((strength, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Gaps */}
            {analysisResult.gaps.length > 0 && (
              <div className="rounded-xl border-2 border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <XCircle className="h-6 w-6 text-red-500" />
                  <h3 className="text-xl font-bold text-foreground font-mono tracking-[0.08em] uppercase">
                    Gaps & missing elements
                  </h3>
                </div>
                <ul className="space-y-2">
                  {analysisResult.gaps.map((gap, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-foreground"
                    >
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tips */}
            {analysisResult.tips.length > 0 && (
              <div className="rounded-xl border-2 border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <Lightbulb className="h-6 w-6 text-yellow-500" />
                  <h3 className="text-xl font-bold text-foreground font-mono tracking-[0.08em] uppercase">
                    Improvement tips
                  </h3>
                </div>
                <ul className="space-y-2">
                  {analysisResult.tips.map((tip, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-foreground"
                    >
                      <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {analysisResult.recommendations.length > 0 && (
              <div className="rounded-xl border-2 border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <Target className="h-6 w-6 text-sky-500" />
                  <h3 className="text-xl font-bold text-foreground font-mono tracking-[0.08em] uppercase">
                    Recommendations
                  </h3>
                </div>
                <ul className="space-y-2">
                  {analysisResult.recommendations.map((rec, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-foreground"
                    >
                      <Target className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

