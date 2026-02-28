"use client";

import { useState } from "react";
import {
  CheckCircle2,
  CheckSquare,
  FileText,
  Loader2,
  Mail,
  Plus,
  Search,
  Send,
  Settings,
  Square,
} from "lucide-react";

import { API_ENDPOINTS } from "@/lib/config";
import DotGrid from "@/components/DotGrid";
import { useTheme } from "next-themes";

interface Company {
  company_name: string;
  website: string;
  description?: string;
  emails: string[];
  status: string;
}

export default function ColdMailSenderPage() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [companyType, setCompanyType] = useState("");
  const [searching, setSearching] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(
    new Set(),
  );
  const [smtpEmail, setSmtpEmail] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const handleSearch = async () => {
    if (!companyType.trim()) {
      setError("Please enter a company type");
      showToast("Please enter a company type", "error");
      return;
    }

    setSearching(true);
    setError("");
    setSuccess("");
    setCompanies([]);
    setSelectedCompanies(new Set());

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.COLD_MAIL.SEARCH_COMPANIES, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ company_type: companyType }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || "Failed to search companies");
      }

      setCompanies(data.companies || []);
      const msg = `Found ${data.companies?.length || 0} companies with emails`;
      setSuccess(msg);
      showToast(msg, "success");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to search companies";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSearching(false);
    }
  };

  const handleGenerateTemplate = async () => {
    if (!smtpEmail || !selectedCompanies.size) {
      const msg =
        "Please configure SMTP email and select at least one company before generating a template";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    const firstSelected = Array.from(selectedCompanies)[0];
    const company = companies[firstSelected];
    if (!company) return;

    setGeneratingTemplate(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const profileResponse = await fetch(`${API_ENDPOINTS.PROFILE.GET}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileData = await profileResponse.json();

      const skills =
        profileData.skills?.map((s: any) => s.name || s) || [];

      const response = await fetch(
        API_ENDPOINTS.COLD_MAIL.GENERATE_TEMPLATE,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            company_name: company.company_name,
            user_name: profileData.full_name || profileData.name || "Candidate",
            user_email: smtpEmail,
            user_bio: profileData.bio || "",
            user_skills: skills,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || "Failed to generate template");
      }

      setEmailSubject(data.subject);
      setEmailBody((data.body || "").replace(/\\n/g, "\n"));
      const msg = "Email template generated successfully!";
      setSuccess(msg);
      showToast(msg, "success");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to generate template";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setGeneratingTemplate(false);
    }
  };

  const handleSendEmails = async () => {
    if (!smtpEmail || !smtpPassword) {
      const msg = "Please configure SMTP settings";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    if (!emailSubject || !emailBody) {
      const msg = "Please generate or enter email subject and body";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    if (selectedCompanies.size === 0) {
      const msg = "Please select at least one company";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");

      let resumeBase64: string | null = null;
      if (resumeFile) {
        const arrayBuffer = await resumeFile.arrayBuffer();
        const base64 = btoa(
          String.fromCharCode(...new Uint8Array(arrayBuffer)),
        );
        resumeBase64 = base64;
      }

      const companiesToSend = Array.from(selectedCompanies)
        .map((index) => {
          const company = companies[index];
          return {
            company_name: company.company_name,
            company_email: company.emails[0] || "N/A",
            company_website: company.website,
          };
        })
        .filter((c) => c.company_email !== "N/A");

      if (companiesToSend.length === 0) {
        throw new Error("No companies with valid email addresses selected");
      }

      const response = await fetch(API_ENDPOINTS.COLD_MAIL.BULK_SEND, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companies: companiesToSend,
          subject: emailSubject,
          body: emailBody,
          smtp_email: smtpEmail,
          smtp_password: smtpPassword,
          resume_file: resumeBase64,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || "Failed to send emails");
      }

      const msg = `Successfully sent ${data.sent} emails. ${data.failed} failed.`;
      setSuccess(msg);
      showToast(msg, "success");

      const updatedCompanies = [...companies];
      data.results.forEach((result: any) => {
        const originalIndex = companies.findIndex(
          (c) => c.company_name === result.company_name,
        );
        if (originalIndex !== -1) {
          updatedCompanies[originalIndex].status = result.status;
        }
      });
      setCompanies(updatedCompanies);
      setSelectedCompanies(new Set());
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to send emails";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSending(false);
    }
  };

  const toggleCompanySelection = (index: number) => {
    const next = new Set(selectedCompanies);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedCompanies(next);
  };

  const selectAll = () => {
    const allWithEmails = companies
      .map((c, i) => (c.emails.length > 0 ? i : -1))
      .filter((i) => i !== -1);
    setSelectedCompanies(new Set(allWithEmails));
  };

  const deselectAll = () => {
    setSelectedCompanies(new Set());
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "email_found":
        return (
          <span className="rounded bg-green-500/20 px-2 py-1 text-xs text-green-500">
            Email found
          </span>
        );
      case "no_email":
        return (
          <span className="rounded bg-yellow-500/20 px-2 py-1 text-xs text-yellow-500">
            No email
          </span>
        );
      case "scraping_failed":
        return (
          <span className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-500">
            Failed
          </span>
        );
      case "sent":
        return (
          <span className="rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-500">
            Sent
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen bg-background p-8">
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
      <div className="mx-auto max-w-7xl relative z-10">
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-lg bg-foreground p-2">
              <Mail className="h-6 w-6 text-background" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Cold Mail Outreach
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Find companies, extract emails, and send personalized cold emails
            with your resume.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground font-mono tracking-[0.08em] uppercase">
                <Search className="h-5 w-5" />
                Search companies
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold text-foreground font-mono tracking-[0.12em] uppercase">
                    Company type
                  </label>
                  <select
                    value={companyType}
                    onChange={(e) => setCompanyType(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/30"
                    disabled={searching}
                  >
                    <option value="">Select company type...</option>
                    <option value="AI startups">AI startups</option>
                    <option value="Fintech companies">Fintech companies</option>
                    <option value="SaaS startups">SaaS startups</option>
                    <option value="Healthcare tech">Healthcare tech</option>
                    <option value="EdTech companies">EdTech companies</option>
                    <option value="E-commerce startups">E-commerce startups</option>
                    <option value="Blockchain companies">Blockchain companies</option>
                    <option value="Cybersecurity startups">
                      Cybersecurity startups
                    </option>
                    <option value="Biotech companies">Biotech companies</option>
                    <option value="CleanTech startups">CleanTech startups</option>
                    <option value="Robotics companies">Robotics companies</option>
                    <option value="Gaming startups">Gaming startups</option>
                    <option value="Media tech companies">Media tech companies</option>
                    <option value="Real estate tech">Real estate tech</option>
                    <option value="Food tech startups">Food tech startups</option>
                    <option value="Travel tech companies">
                      Travel tech companies
                    </option>
                  </select>
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searching || !companyType.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-3 text-xs font-bold text-white shadow-[0_0_20px_rgba(56,189,248,0.7)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 font-mono tracking-[0.12em] uppercase"
                >
                  {searching ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5" />
                      Search companies
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                  <Settings className="h-5 w-5" />
                  SMTP settings
                </h2>
                <button
                  onClick={() => {
                    setSmtpEmail("kavish17shah@gmail.com");
                    setSmtpPassword("iwgd fbvl xxfj ojty");
                  }}
                  className="rounded-lg bg-sky-500 p-2 text-white hover:bg-sky-400"
                  title="Auto-fill SMTP credentials"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold text-foreground font-mono tracking-[0.12em] uppercase">
                    Your email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={smtpEmail}
                    onChange={(e) => setSmtpEmail(e.target.value)}
                    placeholder="your.email@gmail.com"
                    className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-foreground font-mono tracking-[0.12em] uppercase">
                    SMTP password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder="App password or SMTP password"
                    className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    For Gmail, use an app password.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground font-mono tracking-[0.08em] uppercase">
                <FileText className="h-5 w-5" />
                Resume (optional)
              </h2>
              <div className="space-y-4">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) =>
                    setResumeFile(e.target.files?.[0] || null)
                  }
                  className="w-full text-sm text-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-semibold file:text-background hover:file:opacity-90"
                />
                {resumeFile && (
                  <p className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {resumeFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            {companies.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">
                    Companies ({companies.length})
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="rounded bg-foreground/10 px-3 py-1 text-sm text-foreground hover:bg-foreground/20"
                    >
                      Select all
                    </button>
                    <button
                      onClick={deselectAll}
                      className="rounded bg-foreground/10 px-3 py-1 text-sm text-foreground hover:bg-foreground/20"
                    >
                      Deselect all
                    </button>
                  </div>
                </div>
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {companies.map((company, index) => (
                    <div
                      key={index}
                      className={`rounded-lg border p-4 transition ${
                        selectedCompanies.has(index)
                          ? "border-foreground bg-foreground/5"
                          : "border-border hover:border-foreground/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleCompanySelection(index)}
                          className="mt-1"
                        >
                          {selectedCompanies.has(index) ? (
                            <CheckSquare className="h-5 w-5 text-foreground" />
                          ) : (
                            <Square className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="truncate font-semibold text-foreground">
                                {company.company_name}
                              </h3>
                              <a
                                href={company.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-sky-500 hover:underline"
                              >
                                {company.website}
                              </a>
                            </div>
                            {getStatusBadge(company.status)}
                          </div>
                          <p className="mt-1 text-sm text-foreground">
                            <span className="font-medium">Emails:</span>{" "}
                            {company.emails.join(", ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {companies.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">
                    Email template
                  </h2>
                  <button
                    onClick={handleGenerateTemplate}
                    disabled={generatingTemplate || selectedCompanies.size === 0}
                    className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-[0_0_18px_rgba(56,189,248,0.7)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {generatingTemplate ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        Generate with AI
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-foreground font-mono tracking-[0.12em] uppercase">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Email subject line"
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-foreground font-mono tracking-[0.12em] uppercase">
                      Body
                    </label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Email body..."
                      rows={10}
                      className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Use {"{company_name}"} as a placeholder for company name.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {companies.length > 0 &&
              selectedCompanies.size > 0 &&
              emailSubject &&
              emailBody && (
                <button
                  onClick={handleSendEmails}
                  disabled={sending || !smtpEmail || !smtpPassword}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-6 py-4 text-lg font-semibold text-white shadow-[0_0_24px_rgba(56,189,248,0.8)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending emails...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Send to {selectedCompanies.size} selected companies
                    </>
                  )}
                </button>
              )}
          </div>
        </div>
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

