"use client";

import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { API_ENDPOINTS } from "@/lib/config";
import { Loader2 } from "lucide-react";

type ViewState = "create" | "in-progress" | "report";

interface InterviewMeta {
  interviewId: string;
  candidateName: string;
  candidateEmail: string;
  vapiAssistantId: string;
  [key: string]: unknown;
}

interface ReportData {
  candidateInfo?: { name?: string; email?: string };
  interviewStatus?: string;
  overallScore?: number;
  recommendation?: string;
  detailedReport?: string;
  summary?: {
    strengths?: string[];
    painPoints?: string[];
    areasToImprove?: string[];
  };
  evaluations?: Array<{
    questionNumber: number;
    question: string;
    answer: string;
    difficulty: string;
    category: string;
    score: number;
    maxScore: number;
    feedback: string;
  }>;
}

export default function MockInterviewPage() {
  const [view, setView] = useState<ViewState>("create");
  const [interviewData, setInterviewData] = useState<InterviewMeta | ReportData | null>(
    null,
  );
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportStep, setReportStep] = useState("");

  const handleInterviewCreated = (data: InterviewMeta) => {
    setInterviewData(data);
    setView("in-progress");
  };

  const handleCallEnded = async () => {
    if (!interviewData || !("interviewId" in interviewData)) return;
    const interviewId = (interviewData as InterviewMeta).interviewId;

    setIsGeneratingReport(true);
    setReportError("");
    setReportStep("Waiting for Vapi to process the call...");

    try {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      setReportStep("Fetching interview transcript from Vapi...");

      const res = await fetch(API_ENDPOINTS.INTERVIEW.GENERATE_REPORT(interviewId), {
        method: "POST",
      });
      const data = await res.json();

      setReportStep("Evaluating answers with AI...");

      if (res.ok && data?.success && data?.data) {
        setInterviewData(data.data as ReportData);
        setView("report");
      } else {
        setReportError(
          data?.detail || data?.message || "Report generation failed. Please try again.",
        );
      }
    } catch (err) {
      console.error(err);
      setReportError("Failed to generate report. Please retry.");
    } finally {
      setIsGeneratingReport(false);
      setReportStep("");
    }
  };

  useEffect(() => {
    if (view !== "in-progress" || !interviewData || !("interviewId" in interviewData)) {
      return;
    }
    const interviewId = (interviewData as InterviewMeta).interviewId;
    let isActive = true;

    const loadReportIfReady = async () => {
      try {
        const statusRes = await fetch(API_ENDPOINTS.INTERVIEW.STATUS(interviewId));
        const statusJson = await statusRes.json();
        const status = statusJson?.data?.status;
        if (status !== "completed") return;

        const reportRes = await fetch(API_ENDPOINTS.INTERVIEW.REPORT(interviewId));
        const reportJson = await reportRes.json();
        if (!isActive) return;

        if (reportRes.ok && reportJson?.success && reportJson?.data) {
          setInterviewData(reportJson.data as ReportData);
          setView("report");
        }
      } catch {
        // ignore polling errors
      }
    };

    loadReportIfReady();
    const timer = setInterval(loadReportIfReady, 5000);
    return () => {
      isActive = false;
      clearInterval(timer);
    };
  }, [view, interviewData]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-8">
        {view === "create" && <InterviewCreator onComplete={handleInterviewCreated} />}

        {view === "in-progress" &&
          interviewData &&
          "vapiAssistantId" in interviewData && (
            <div className="space-y-6">
              {isGeneratingReport ? (
                <div className="mx-auto max-w-2xl text-center">
                  <div className="rounded-2xl border-2 border-border bg-card p-10 shadow-[0_0_45px_rgba(56,189,248,0.4)]">
                    <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
                    <h2 className="mb-3 text-2xl font-bold text-foreground font-mono tracking-[0.08em] uppercase">
                      Generating report...
                    </h2>
                    <p className="font-mono text-xs text-cyan-300">{reportStep}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      This may take up to 30 seconds. Please wait.
                    </p>
                  </div>
                </div>
              ) : (
                <VapiCallPanel
                  assistantId={(interviewData as InterviewMeta).vapiAssistantId}
                  candidateName={(interviewData as InterviewMeta).candidateName}
                  onCallEnded={handleCallEnded}
                />
              )}

              {reportError && (
                <div className="mx-auto max-w-2xl rounded-lg border-2 border-red-500/40 bg-red-500/10 p-4 text-center text-sm text-red-300">
                  {reportError}
                  <button
                    onClick={handleCallEnded}
                    className="ml-3 text-xs font-medium underline underline-offset-2 hover:text-red-100"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={() => setView("create")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ← Back to start
                </button>
              </div>
            </div>
          )}

        {view === "report" && (
          <ReportView
            reportData={interviewData as ReportData}
            onReset={() => setView("create")}
          />
        )}
      </div>
    </div>
  );
}

interface InterviewCreatorProps {
  onComplete: (data: InterviewMeta) => void;
}

function InterviewCreator({ onComplete }: InterviewCreatorProps) {
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setResumeFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!resumeFile) {
      setError("Please upload a resume PDF.");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("candidate_name", candidateName);
      formData.append("candidate_email", candidateEmail);
      formData.append("job_description", jobDescription);
      formData.append("resume", resumeFile);

      const res = await fetch(API_ENDPOINTS.INTERVIEW.START, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data?.success && data?.data) {
        onComplete(data.data as InterviewMeta);
      } else {
        setError(
          data?.detail || data?.message || "Failed to create interview session.",
        );
      }
    } catch (err: unknown) {
      console.error(err);
      setError(
        err && typeof err === "object" && "message" in err
          ? (typeof (err as Record<string, unknown>).message === "string"
              ? ((err as Record<string, unknown>).message as string)
              : "An unexpected error occurred while connecting to the interview service.")
          : "An unexpected error occurred while connecting to the interview service.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
      <h1 className="text-2xl font-semibold text-foreground">AI Mock Interview</h1>
          <p className="text-sm text-muted-foreground">
            Spin up a voice-based interviewer from your job description and resume.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-[0_0_35px_rgba(56,189,248,0.28)]">
        <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600" />

        <form onSubmit={handleSubmit} className="space-y-6 p-6 md:p-8">
          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Candidate name
              </label>
              <input
                required
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Candidate email
              </label>
              <input
                required
                type="email"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Job description
              </label>
              <button
                type="button"
                onClick={() => {
                  setJobDescription(
                    `Software Engineer - Full Stack Developer

We are looking for a talented Full Stack Developer to join our dynamic team. You will be responsible for designing, developing, and maintaining web applications using modern technologies.

Requirements:
- 2+ years of experience in software development
- Proficiency in JavaScript/TypeScript, React, Node.js
- Experience with databases (PostgreSQL, MongoDB)
- Knowledge of cloud platforms (AWS, Azure, or GCP)
- Strong problem-solving skills and ability to work in a team
- Experience with RESTful APIs and microservices architecture
- Familiarity with version control systems (Git)
- Understanding of software development best practices

Nice to have:
- Experience with Docker and Kubernetes
- Knowledge of CI/CD pipelines
- Experience with testing frameworks (Jest, Cypress)
- Understanding of Agile/Scrum methodologies

Responsibilities:
- Develop and maintain scalable web applications
- Collaborate with cross-functional teams to define and implement new features
- Write clean, maintainable, and efficient code
- Participate in code reviews and contribute to technical discussions
- Troubleshoot and debug applications
- Stay up-to-date with emerging technologies and industry trends`,
                  );
                }}
                className="rounded-lg border border-border bg-card px-2 py-1 text-[10px] font-medium text-muted-foreground transition hover:bg-card/80 hover:text-foreground"
              >
                + Sample JD
              </button>
            </div>
            <textarea
              required
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the target job description here. The AI will extract requirements to build targeted questions..."
              rows={6}
              className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Upload resume (PDF)
            </label>
            <div className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center transition hover:border-cyan-400 hover:bg-muted/40">
              <input
                required
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="mx-auto block text-xs text-muted-foreground file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-cyan-400"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                We only read text from the PDF to generate your interview questions.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl shiny-blue-bg px-4 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(56,189,248,0.8)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating interview session...
              </>
            ) : (
              "Create interview session"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

interface VapiCallPanelProps {
  assistantId: string;
  candidateName: string;
  onCallEnded: () => void;
}

function extractAssistantCaption(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;
  const m = message as Record<string, unknown>;

  const getString = (obj: Record<string, unknown>, key: string): string | null => {
    const v = obj[key];
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  };

  // Common payload shapes we might see from Vapi "message" events
  // 1) { role: "assistant", content: "..." }
  // 2) { message: { role: "assistant", content: "..." } }
  // 3) { type: "transcript", role: "assistant", transcript: "..." }
  // 4) { type: "transcript", speaker: "assistant", text: "..." }

  const directRole = m.role;
  const directSpeaker = m.speaker;
  const directType = m.type;

  if (directRole === "assistant") {
    return getString(m, "content") || getString(m, "transcript") || getString(m, "text");
  }

  if (
    directSpeaker === "assistant" &&
    (directType === "transcript" || directType === "transcription")
  ) {
    return getString(m, "text") || getString(m, "transcript");
  }

  const nested = m.message;
  if (nested && typeof nested === "object") {
    const nm = nested as Record<string, unknown>;
    if (nm.role === "assistant") {
      return getString(nm, "content");
    }
  }

  return null;
}

function VapiCallPanel({ assistantId, candidateName, onCallEnded }: VapiCallPanelProps) {
  const [isCalling, setIsCalling] = useState(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "in-call" | "ended" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [aiCaption, setAiCaption] = useState("");
  const [aiCaptionVisible, setAiCaptionVisible] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);
  const hideCaptionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const publicKey =
    process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ||
    (process.env.NEXT_PUBLIC_VITE_VAPI_PUBLIC_KEY as string | undefined);
  const envError = !publicKey ? "Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY in environment." : "";

  useEffect(() => {
    if (!publicKey) return;

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    const showCaption = (text: string) => {
      setAiCaption(text);
      setAiCaptionVisible(true);
      if (hideCaptionTimeoutRef.current) clearTimeout(hideCaptionTimeoutRef.current);
      // Keep it visible for a bit; updated messages will extend the timer.
      hideCaptionTimeoutRef.current = setTimeout(() => {
        setAiCaptionVisible(false);
      }, 12000);
    };

    const onCallStart = () => {
      setIsCalling(true);
      setStatus("in-call");
      setError("");
    };

    const onCallEnd = () => {
      setIsCalling(false);
      setStatus("ended");
      setAiCaption("");
      setAiCaptionVisible(false);
      onCallEnded?.();
    };

    const onMessage = (message: unknown) => {
      const text = extractAssistantCaption(message);
      if (text) showCaption(text);
    };

    const onError = (e: unknown) => {
      setIsCalling(false);
      setStatus("error");
      if (e && typeof e === "object" && "errorMsg" in e) {
        const errMsg = (e as Record<string, unknown>).errorMsg;
        setError(typeof errMsg === "string" ? errMsg : "Vapi call failed. Please retry.");
      } else {
        setError("Vapi call failed. Please retry.");
      }
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("error", onError);
      if (hideCaptionTimeoutRef.current) clearTimeout(hideCaptionTimeoutRef.current);
      vapi.stop();
    };
  }, [publicKey, onCallEnded]);

  const startCall = async () => {
    if (!publicKey) {
      setError(envError);
      return;
    }
    if (!assistantId) {
      setError("Missing assistant id. Please create the interview again.");
      return;
    }
    if (!vapiRef.current) {
      setError("Vapi client not initialized.");
      return;
    }

    setError("");
    setStatus("connecting");
    try {
      await vapiRef.current.start(assistantId);
    } catch (e: unknown) {
      setStatus("error");
      if (e && typeof e === "object" && "message" in e) {
        const msg = (e as Record<string, unknown>).message;
        setError(typeof msg === "string" ? msg : "Failed to start call.");
      } else {
        setError("Failed to start call.");
      }
    }
  };

  const endCall = async () => {
    if (!vapiRef.current) return;
    await vapiRef.current.stop();
    setIsCalling(false);
  };

  return (
    <div className="mx-auto mt-10 max-w-2xl text-center">
      <div className="rounded-2xl border border-border bg-card p-10 shadow-[0_0_45px_rgba(56,189,248,0.4)]">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-cyan-500/15">
          <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-[0_0_35px_rgba(56,189,248,0.9)]" />
        </div>

        <h2 className="mb-2 text-2xl font-semibold text-foreground">
          Your AI interviewer is ready
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Candidate:{" "}
          <span className="font-medium text-foreground">
            {candidateName || "Unknown"}
          </span>
        </p>

        {status === "in-call" && (
          <div className="mx-auto mb-6 max-w-xl rounded-2xl border border-cyan-400/25 bg-foreground/[0.03] px-5 py-4 text-left backdrop-blur-md shadow-[0_0_30px_rgba(56,189,248,0.22)]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300/90">
              Now asking
            </p>
            <p className="mt-1 text-sm text-foreground/90">
              {aiCaptionVisible && aiCaption.trim()
                ? aiCaption
                : "Listen for the next question…"}
            </p>
          </div>
        )}

        {!isCalling ? (
          <button
            onClick={startCall}
            className="inline-flex items-center justify-center rounded-xl shiny-blue-bg px-8 py-3 text-sm font-semibold text-white shadow-[0_0_28px_rgba(56,189,248,0.9)] transition hover:opacity-95"
          >
            Start call
          </button>
        ) : (
          <button
            onClick={endCall}
            className="inline-flex items-center justify-center rounded-xl border border-red-500/70 bg-red-500/90 px-8 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(248,113,113,0.8)] transition hover:bg-red-400"
          >
            End call
          </button>
        )}

        <p className="mt-5 text-xs text-muted-foreground">
          Status: <span className="font-medium text-foreground">{status}</span>
        </p>

        {(error || envError) && (
          <p className="mt-3 text-xs text-red-300">{error || envError}</p>
        )}

        <p className="mt-4 text-[11px] text-muted-foreground">
          After the call ends, SkillSphere will fetch the transcript from Vapi and
          generate a detailed evaluation report automatically.
        </p>
      </div>
    </div>
  );
}

interface ReportViewProps {
  reportData: ReportData | null;
  onReset: () => void;
}

function ReportView({ reportData, onReset }: ReportViewProps) {
  if (!reportData) return null;

  const data =
    typeof reportData === "string"
      ? (JSON.parse(reportData) as ReportData)
      : reportData;

  const info = data.candidateInfo || {};
  const summary = data.summary || {};
  const evals = data.evaluations || [];

  const getScoreColor = (score?: number) => {
    if ((score ?? 0) >= 80) return "text-emerald-400";
    if ((score ?? 0) >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="bg-gradient-to-r from-cyan-300 to-sky-500 bg-clip-text text-3xl font-semibold text-transparent">
            Interview evaluation
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Candidate{" "}
            <span className="font-medium text-foreground">
              {info.name || "Unknown"}
            </span>{" "}
            •{" "}
            <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-foreground">
              {data.interviewStatus}
            </span>
          </p>
        </div>
        <button
          onClick={onReset}
          className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-card/80"
        >
          New interview
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center shadow-[0_0_30px_rgba(56,189,248,0.32)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Overall score
          </p>
          <div className="relative mt-4 inline-flex items-center justify-center">
            <svg className="h-28 w-28 -rotate-90">
              <circle
                className="text-border"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
                r="46"
                cx="56"
                cy="56"
              />
              <circle
                className={getScoreColor(data.overallScore)}
                strokeWidth="8"
                strokeDasharray={290}
                strokeDashoffset={
                  290 - (290 * (data.overallScore || 0)) / 100
                }
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="46"
                cx="56"
                cy="56"
              />
            </svg>
            <span
              className={`absolute text-3xl font-black ${getScoreColor(
                data.overallScore,
              )}`}
            >
              {data.overallScore || 0}
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">
            {data.recommendation}
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-6 md:col-span-2">
          <div>
            <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold text-emerald-400">
              Strengths
            </h3>
            <ul className="space-y-1 text-sm text-foreground">
              {(summary.strengths || []).map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-red-400">
                Pain points
              </h3>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {(summary.painPoints || []).map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-cyan-300">
                Areas to improve
              </h3>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {(summary.areasToImprove || []).map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Executive summary
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {data.detailedReport || "No detailed report provided."}
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Question-by-question breakdown
        </h3>
        <div className="space-y-4">
          {evals.map((e, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="flex items-center justify-between border-b border-border bg-foreground/5 px-4 py-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
                    Q{e.questionNumber} • {e.difficulty}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {e.category}
                  </span>
                </div>
                <div className="text-sm font-semibold">
                  <span
                    className={getScoreColor(
                      (e.score / e.maxScore) * 100,
                    )}
                  >
                    {e.score}
                  </span>
                  <span className="text-muted-foreground"> / {e.maxScore}</span>
                </div>
              </div>
              <div className="space-y-4 p-4 text-sm">
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Question
                  </p>
                  <p className="text-foreground">{e.question}</p>
                </div>
                <div className="rounded-lg border border-border bg-background/60 p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Candidate answer
                  </p>
                  <p className="text-sm italic text-muted-foreground">
                    {e.answer || "No answer recorded."}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Feedback
                  </p>
                  <p className="text-sm text-muted-foreground">{e.feedback}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}