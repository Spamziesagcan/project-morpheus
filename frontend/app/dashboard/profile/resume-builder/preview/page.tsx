"use client";

import { useState, useEffect, useRef } from "react";
import { API_ENDPOINTS } from "@/lib/config";
import { Download, Loader2, ArrowLeft, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ClassicTemplate from "@/components/templates/ClassicTemplate";
import ModernTemplate from "@/components/templates/ModernTemplate";
import CreativeTemplate from "@/components/templates/CreativeTemplate";
import MinimalTemplate from "@/components/templates/MinimalTemplate";
import ProfessionalTemplate from "@/components/templates/ProfessionalTemplate";

interface AIResumeData {
  personal_info: any;
  summary: string;
  skills: any[];
  experience: any[];
  projects: any[];
  education: any[];
  certifications?: any[];
  awards?: string[];
  languages?: string[];
}

const templates = [
  { id: "modern", name: "Modern", color: "bg-blue-600" },
  { id: "classic", name: "Classic", color: "bg-gray-700" },
  { id: "creative", name: "Creative", color: "bg-amber-700" },
  { id: "minimal", name: "Minimal", color: "bg-slate-400" },
  { id: "professional", name: "Professional", color: "bg-gray-900" },
];

export default function PreviewPage() {
  const router = useRouter();
  const resumeRef = useRef<HTMLDivElement>(null);
  const [aiResumeData, setAiResumeData] = useState<AIResumeData | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("modern");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
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
    loadResumeData();
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.AUTH.ME, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const user = await response.json();
        setUserData(user);
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
    }
  };

  const loadResumeData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.AI_RESUME.GET_DATA, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setAiResumeData(result.data);
        }
      }
    } catch (error) {
      console.error("Failed to load resume data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTransformedData = () => {
    if (!aiResumeData || !userData) return null;

    let allSkills: string[] = [];
    if (aiResumeData.skills && Array.isArray(aiResumeData.skills)) {
      if (aiResumeData.skills.length > 0 && (aiResumeData.skills as any)[0].category) {
        (aiResumeData.skills as any).forEach((group: any) => {
          if (group.skills && Array.isArray(group.skills)) {
            allSkills = [...allSkills, ...group.skills];
          }
        });
      } else {
        allSkills = (aiResumeData.skills as any).map((s: any) =>
          typeof s === "string" ? s : s.name
        );
      }
    }
    const skillCount = allSkills.length;

    return {
      personal: {
        name: userData.full_name || "Your Name",
        title: "",
        email: userData.email || "",
        phone: aiResumeData.personal_info?.phone || "",
        location: aiResumeData.personal_info?.location || "",
        linkedin: aiResumeData.personal_info?.linkedin,
        github: aiResumeData.personal_info?.github,
        website: aiResumeData.personal_info?.website,
      },
      summary: aiResumeData.summary || "",
      experience: (aiResumeData.experience || []).map((exp: any) => ({
        title: exp.title || exp.position || "",
        company: exp.company || "",
        location: exp.location || "",
        startDate: exp.startDate || exp.start_date || "",
        endDate: exp.endDate || exp.end_date || exp.duration || "Present",
        bullets: exp.description ? [exp.description] : [],
      })),
      education: (aiResumeData.education || []).map((edu: any) => ({
        degree: edu.degree || "",
        school: edu.institution || "",
        location: edu.location || "",
        graduationDate: edu.year || edu.date || "",
        gpa: edu.gpa,
      })),
      skills: {
        languages: allSkills.slice(0, Math.ceil(skillCount / 3)),
        frameworks: allSkills.slice(
          Math.ceil(skillCount / 3),
          Math.ceil((2 * skillCount) / 3)
        ),
        tools: allSkills.slice(Math.ceil((2 * skillCount) / 3)),
      },
      projects: (aiResumeData.projects || []).map((proj: any) => ({
        name: proj.name || "",
        description: proj.description || "",
        technologies: proj.technologies
          ? typeof proj.technologies === "string"
            ? proj.technologies.split(",").map((t: string) => t.trim())
            : proj.technologies
          : [],
        link: proj.link,
      })),
    };
  };

  const handleDownloadPDF = async () => {
    if (!resumeRef.current) return;

    setDownloading(true);
    try {
      const element = resumeRef.current;
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

      pdf.save(`resume_${selectedTemplate}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      showToast("Failed to generate PDF. Please try again.", "error");
    } finally {
      setDownloading(false);
    }
  };

  const renderTemplate = () => {
    const data = getTransformedData();
    if (!data) return null;

    switch (selectedTemplate) {
      case "modern":
        return <ModernTemplate data={data} />;
      case "classic":
        return <ClassicTemplate data={data} />;
      case "creative":
        return <CreativeTemplate data={data} />;
      case "minimal":
        return <MinimalTemplate data={data} />;
      case "professional":
        return <ProfessionalTemplate data={data} />;
      default:
        return <ModernTemplate data={data} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!aiResumeData) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-foreground/60 mb-4">
          No resume data found. Please generate a resume first.
        </p>
        <button
          onClick={() => router.push("/dashboard/profile/resume-builder")}
          className="px-6 py-3 bg-white dark:bg-white text-black border-2 border-black/20 rounded-lg hover:bg-white/80 transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-6 max-w-7xl mx-auto">
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push("/dashboard/profile/resume-builder")}
            className="flex items-center gap-2 px-4 py-2 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-white text-black border-2 border-black/20 rounded-lg hover:bg:white/80 transition-all disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download PDF
              </>
            )}
          </button>
        </div>

        <div className="bg-white shadow-2xl rounded-lg overflow-hidden">
          <div ref={resumeRef} className="w-full overflow-auto">
            {renderTemplate()}
          </div>
        </div>
      </div>

      <div className="w-64 space-y-4">
        <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
          Resume Styles
        </h3>
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => setSelectedTemplate(template.id)}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
              selectedTemplate === template.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg"
                : "border-black/20 dark:border-white/20 bg-white dark:bg-black hover:border-blue-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${template.color} rounded`}></div>
              <div>
                <div className="font-semibold text-black dark:text-white">
                  {template.name}
                </div>
                <div className="text-xs text-black/60 dark:text-white/60">
                  Style preview
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
      {/* Bottom toast for PDF generation */}
      {toastVisible && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in-0">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-white min-w-[260px] max-w-[90vw] ${
              toastType === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {toastType === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="flex-1 text-sm font-medium">{toastMessage}</p>
            <button
              onClick={() => setToastVisible(false)}
              className="flex-shrink-0 hover:opacity-80 transition-opacity"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

