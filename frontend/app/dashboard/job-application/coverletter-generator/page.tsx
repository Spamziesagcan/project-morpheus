"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Briefcase, Download, Loader2, Save, Plus } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

import { API_ENDPOINTS } from "@/lib/config";
import ClassicTemplate from "@/components/templates/ClassicTemplate";
import CoverLetterTemplate from "@/components/templates/CoverLetterTemplate";

interface PersonalInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

interface SkillGroup {
  category: string;
  skills: string[];
}

interface Experience {
  title: string;
  company: string;
  location?: string;
  start_date: string;
  end_date: string;
  description: string[];
}

interface Project {
  name: string;
  description: string;
  technologies: string[];
  link?: string;
  highlights: string[];
}

interface Education {
  degree: string;
  institution: string;
  location?: string;
  graduation_date: string;
  gpa?: string;
  achievements?: string[];
}

interface Certification {
  name: string;
  issuer: string;
  date: string;
  credential_id?: string;
}

interface TailoredResume {
  personal_info: PersonalInfo;
  summary: string;
  skills: SkillGroup[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
  certifications?: Certification[];
  awards?: string[];
  languages?: string[];
}

interface CoverLetter {
  greeting: string;
  opening_paragraph: string;
  body_paragraphs: string[];
  closing_paragraph: string;
  signature: string;
}

function CoverLetterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [jobData, setJobData] = useState({
    job_id: searchParams.get("job_id") || "",
    title: searchParams.get("title") || "",
    company: searchParams.get("company") || "",
    description: searchParams.get("description") || "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadingCoverLetter, setDownloadingCoverLetter] = useState(false);
  const [tailoredResume, setTailoredResume] = useState<TailoredResume | null>(
    null,
  );
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);

  const coverLetterRef = useRef<HTMLDivElement>(null);

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

  const getEffectiveJobId = () => {
    // When the page is opened directly from the sidebar, there is no job_id.
    // Use a stable manual id so the backend schema is satisfied.
    return jobData.job_id || "manual-job";
  };

  const fillWithSampleJob = () => {
    setJobData((prev) => ({
      ...prev,
      title: prev.title || "Senior Software Engineer",
      company: prev.company || "Acme Corp",
      description:
        prev.description ||
        `We are looking for a Senior Software Engineer to design, build, and scale high-performance backend services for our core B2B product. 

Responsibilities include owning end-to-end features, collaborating with product and design, and improving reliability, observability, and developer experience.

Requirements:
- 4+ years of experience building production systems with Node.js, Python, or Go
- Strong experience with REST/GraphQL APIs and relational databases
- Solid understanding of system design, testing, and CI/CD
- Experience with cloud platforms (AWS, GCP, or Azure)

Nice to have:
- Experience with TypeScript and modern frontend frameworks
- Background in B2B SaaS or developer tools.`,
    }));
  };

  useEffect(() => {
    if (jobData.job_id && jobData.description) {
      generateApplication();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateApplication = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.JOB_APPLICATION.GENERATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_id: getEffectiveJobId(),
          job_title: jobData.title,
          company: jobData.company,
          job_description: jobData.description,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setTailoredResume(data.tailored_resume);
        setCoverLetter(data.cover_letter);
      } else {
        const errorMsg =
          data.detail ||
          data.message ||
          "Failed to generate application materials";
        showToast(errorMsg, "error");
      }
    } catch (error) {
      console.error("Error generating application:", error);
      showToast(
        "Unable to connect to the server. Please check your connection and try again.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const saveApplication = async () => {
    if (!tailoredResume || !coverLetter) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.JOB_APPLICATION.SAVE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_id: getEffectiveJobId(),
          job_title: jobData.title,
          company: jobData.company,
          job_description: jobData.description,
          tailored_resume: tailoredResume,
          cover_letter: coverLetter,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        showToast("Application saved successfully!", "success");
        router.push("/dashboard/applications");
      } else {
        showToast(
          data.message || data.detail || "Failed to save application",
          "error",
        );
      }
    } catch (error) {
      console.error("Error saving application:", error);
      showToast("Failed to save application", "error");
    } finally {
      setSaving(false);
    }
  };

  const updateCoverLetterField = (field: keyof CoverLetter, value: string) => {
    if (!coverLetter) return;
    setCoverLetter({ ...coverLetter, [field]: value });
  };

  const updateBodyParagraph = (index: number, value: string) => {
    if (!coverLetter) return;
    const newParagraphs = [...coverLetter.body_paragraphs];
    newParagraphs[index] = value;
    setCoverLetter({ ...coverLetter, body_paragraphs: newParagraphs });
  };

  const transformResumeData = (resume: TailoredResume) => {
    return {
      personal: {
        name: resume.personal_info.name || "",
        title: resume.summary.split(".")[0] || "",
        email: resume.personal_info.email || "",
        phone: resume.personal_info.phone || "",
        location: resume.personal_info.location || "",
        linkedin: resume.personal_info.linkedin,
        github: resume.personal_info.github,
        website: resume.personal_info.portfolio,
      },
      summary: resume.summary,
      experience: resume.experience.map((exp) => ({
        title: exp.title,
        company: exp.company,
        location: exp.location || "",
        startDate: exp.start_date,
        endDate: exp.end_date,
        bullets: exp.description,
      })),
      education: resume.education.map((edu) => ({
        degree: edu.degree,
        school: edu.institution,
        location: edu.location || "",
        graduationDate: edu.graduation_date,
        gpa: edu.gpa,
      })),
      skills: {
        languages:
          resume.skills.find((s) =>
            s.category.toLowerCase().includes("language"),
          )?.skills || [],
        frameworks:
          resume.skills.find((s) =>
            s.category.toLowerCase().includes("framework"),
          )?.skills || [],
        tools:
          resume.skills.find((s) =>
            s.category.toLowerCase().includes("tool"),
          )?.skills || [],
      },
      projects: resume.projects.map((proj) => ({
        name: proj.name,
        description: proj.description,
        technologies: proj.technologies,
        link: proj.link,
      })),
    };
  };

  const transformCoverLetterData = (
    coverLetter: CoverLetter,
    resume: TailoredResume,
  ) => {
    const currentDate = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    return {
      personal: {
        name: resume.personal_info.name || "",
        email: resume.personal_info.email || "",
        phone: resume.personal_info.phone || "",
        location: resume.personal_info.location || "",
        linkedin: resume.personal_info.linkedin,
      },
      company: jobData.company || "",
      jobTitle: jobData.title || "",
      greeting: coverLetter.greeting,
      opening_paragraph: coverLetter.opening_paragraph,
      body_paragraphs: coverLetter.body_paragraphs,
      closing_paragraph: coverLetter.closing_paragraph,
      signature: coverLetter.signature,
      date: currentDate,
    };
  };

  const handleDownloadCoverLetterPDF = async () => {
    if (!coverLetterRef.current || !coverLetter || !tailoredResume) return;

    setDownloadingCoverLetter(true);
    try {
      const element = coverLetterRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;
      const x = (pdfWidth - scaledWidth) / 2;
      const y = 0;

      const pageHeight = pdfHeight;
      const contentHeight = (imgHeight * pdfWidth) / imgWidth;

      if (contentHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", x, y, scaledWidth, scaledHeight);
      } else {
        let heightLeft = contentHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, contentHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - contentHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, pdfWidth, contentHeight);
          heightLeft -= pageHeight;
        }
      }

      pdf.save(`cover_letter_${jobData.company || "application"}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      showToast("Failed to generate PDF. Please try again.", "error");
    } finally {
      setDownloadingCoverLetter(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-foreground font-mono tracking-[0.08em] uppercase">
          Job application
        </h1>
          <button
            type="button"
            onClick={() => router.push("/dashboard/applications")}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-sm transition hover:bg-card/80 font-mono tracking-[0.12em] uppercase"
          >
            My applications
          </button>
        </div>

        <div className="mb-8 rounded-lg bg-card p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-foreground font-mono tracking-[0.12em] uppercase">
                    Job title
                  </label>
                  <input
                    type="text"
                    value={jobData.title}
                    onChange={(e) =>
                      setJobData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Senior Software Engineer"
                    className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-foreground font-mono tracking-[0.05em] outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-foreground font-mono tracking-[0.12em] uppercase">
                    Company
                  </label>
                  <input
                    type="text"
                    value={jobData.company}
                    onChange={(e) =>
                      setJobData((prev) => ({ ...prev, company: e.target.value }))
                    }
                    placeholder="Acme Corp"
                    className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-foreground font-mono tracking-[0.05em] outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-foreground">
                    Job description
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fillWithSampleJob}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-foreground shadow-sm hover:bg-background/80"
                    >
                      <Plus className="h-3 w-3" />
                      Sample
                    </button>
                  <button
                    onClick={generateApplication}
                    disabled={loading || !jobData.description.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white shadow-[0_0_16px_rgba(56,189,248,0.7)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <span>Generate with AI</span>
                      </>
                    )}
                  </button>
                  </div>
                </div>
                <textarea
                  value={jobData.description}
                  onChange={(e) =>
                    setJobData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Paste the full job description here..."
                  rows={6}
                  className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
                {!jobData.job_id && !searchParams.get("job_id") && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Tip: You can open this page directly from the sidebar and paste any job
                    description, or jump here from the Active Jobs page and it will auto-fill.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">
              Generating tailored resume and cover letter...
            </p>
          </div>
        ) : (
          <>
            {tailoredResume && coverLetter && (
              <div className="grid gap-8 lg:grid-cols-2">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-foreground font-mono tracking-[0.08em] uppercase">
                      Tailored resume
                    </h2>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-lg bg-white shadow-lg">
                    <div className="w-[133%] origin-top-left scale-75">
                      <ClassicTemplate
                        data={transformResumeData(tailoredResume)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-foreground font-mono tracking-[0.08em] uppercase">
                      Cover letter
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDownloadCoverLetterPDF}
                        disabled={downloadingCoverLetter}
                        className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {downloadingCoverLetter ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Download PDF
                      </button>
                    <button
                      onClick={saveApplication}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-[0_0_18px_rgba(56,189,248,0.7)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save application
                    </button>
                    </div>
                  </div>
                  <div className="mb-6 overflow-hidden rounded-lg bg-white shadow-lg">
                    <div className="w-[133%] origin-top-left scale-75">
                      <div ref={coverLetterRef}>
                        <CoverLetterTemplate
                          data={transformCoverLetterData(
                            coverLetter,
                            tailoredResume,
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg bg-card p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-foreground font-mono tracking-[0.08em] uppercase">
                      Edit cover letter
                    </h3>
                    <div>
                      <label className="mb-2 block text-xs font-bold text-foreground font-mono tracking-[0.12em] uppercase">
                        Greeting
                      </label>
                      <input
                        type="text"
                        value={coverLetter.greeting}
                        onChange={(e) =>
                          updateCoverLetterField("greeting", e.target.value)
                        }
                        className="w-full rounded-lg border border-border px-4 py-2 text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold text-foreground font-mono tracking-[0.12em] uppercase">
                        Opening paragraph
                      </label>
                      <textarea
                        value={coverLetter.opening_paragraph}
                        onChange={(e) =>
                          updateCoverLetterField(
                            "opening_paragraph",
                            e.target.value,
                          )
                        }
                        rows={4}
                        className="w-full rounded-lg border border-border px-4 py-2 text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    {coverLetter.body_paragraphs.map((para, index) => (
                      <div key={index}>
                        <label className="mb-2 block text-xs font-bold text-foreground font-mono tracking-[0.12em] uppercase">
                          Body paragraph {index + 1}
                        </label>
                        <textarea
                          value={para}
                          onChange={(e) =>
                            updateBodyParagraph(index, e.target.value)
                          }
                          rows={5}
                          className="w-full rounded-lg border border-border px-4 py-2 text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    ))}

                    <div>
                      <label className="mb-2 block text-xs font-bold text-foreground font-mono tracking-[0.12em] uppercase">
                        Closing paragraph
                      </label>
                      <textarea
                        value={coverLetter.closing_paragraph}
                        onChange={(e) =>
                          updateCoverLetterField(
                            "closing_paragraph",
                            e.target.value,
                          )
                        }
                        rows={3}
                        className="w-full rounded-lg border border-border px-4 py-2 text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold text-foreground font-mono tracking-[0.12em] uppercase">
                        Signature
                      </label>
                      <input
                        type="text"
                        value={coverLetter.signature}
                        onChange={(e) =>
                          updateCoverLetterField("signature", e.target.value)
                        }
                        className="w-full rounded-lg border border-border px-4 py-2 text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
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

export default function CoverLetterGeneratorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CoverLetterContent />
    </Suspense>
  );
}

