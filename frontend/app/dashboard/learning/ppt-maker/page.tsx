"use client";

import { useState, useEffect } from "react";
import {
  Presentation,
  Loader2,
  CheckCircle2,
  AlertCircle,
  History,
  RefreshCcw,
  Download,
  Palette,
  Edit3,
  Clock,
  FileText,
  X,
} from "lucide-react";
import { API_ENDPOINTS } from "@/lib/config";
import SlideViewer from "@/components/SlideViewer";
import DotGrid from "@/components/DotGrid";
import { useTheme } from "next-themes";

interface Slide {
  layout: string;
  section_layout: string;
  content: {
    heading?: string;
    items?: Array<{ text: string; subtext?: string }>;
  };
  image_query?: string;
}

export default function PptMakerPage() {
  const [step, setStep] = useState<"input" | "outline" | "preview">("input");
  const [topic, setTopic] = useState("");
  const [numSlides, setNumSlides] = useState(5);
  const [language, setLanguage] = useState("en-US");
  const [tone, setTone] = useState("professional");
  const [theme, setTheme] = useState("dark");
  const [selectedFont, setSelectedFont] = useState("Inter");

  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isGeneratingPresentation, setIsGeneratingPresentation] =
    useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [title, setTitle] = useState("");
  const [outline, setOutline] = useState<string[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [presentations, setPresentations] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [userName, setUserName] = useState<string>("User");

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const languages = [
    { code: "en-US", name: "English (US)" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "hi", name: "Hindi" },
    { code: "zh", name: "Chinese" },
  ];

  const tones = ["professional", "casual", "educational", "inspirational"];
  const themes = ["dark", "modern", "default", "minimal", "vibrant"];
  const fonts = ["Inter", "Poppins", "Roboto", "Montserrat", "Lora"];

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(API_ENDPOINTS.AUTH.ME, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setUserName(
          data.full_name || (data.email ? data.email.split("@")[0] : "User"),
        );
      } catch {
        // non‑blocking
      }
    };
    fetchUser();
  }, []);

  const handleGenerateOutline = async () => {
    if (!topic.trim()) {
      setError("Please enter a presentation topic");
      return;
    }
    setError(null);
    setIsGeneratingOutline(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ENDPOINTS.PRESENTATION.OUTLINE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: topic,
          num_slides: numSlides,
          language,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to generate outline");
      }

      const data = await res.json();
      setTitle(data.title);
      setOutline(data.outline || []);
      setStep("outline");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to generate outline";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleGeneratePresentation = async () => {
    setError(null);
    setIsGeneratingPresentation(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ENDPOINTS.PRESENTATION.GENERATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          prompt: topic,
          outline,
          language,
          tone,
          theme,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to generate presentation");
      }

      const data = await res.json();
      setSlides(data.slides || []);
      setStep("preview");
      showToast("Presentation generated successfully.", "success");
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to generate presentation";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setIsGeneratingPresentation(false);
    }
  };

  const handleReset = () => {
    setStep("input");
    setTopic("");
    setTitle("");
    setOutline([]);
    setSlides([]);
    setError(null);
    setCurrentSlide(0);
    setIsEditingInline(false);
  };

  const handleDownloadPPTX = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ENDPOINTS.PRESENTATION.DOWNLOAD, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          slides,
          theme,
          font: selectedFont,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to download presentation");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${title || "presentation"}.pptx`.replace(/[^a-z0-9_.-]/gi, "_"),
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast("PPTX downloaded.", "success");
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to download presentation";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSlideUpdate = (index: number, updated: Slide) => {
    const next = [...slides];
    next[index] = updated;
    setSlides(next);
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ENDPOINTS.PRESENTATION.HISTORY, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to load history");
      }
      const data = await res.json();
      setPresentations(data.presentations || []);
      setShowHistory(true);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to load presentation history";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadPresentation = async (pptId: number) => {
    setIsLoadingHistory(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        API_ENDPOINTS.PRESENTATION.HISTORY_BY_ID(pptId),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to load presentation");
      }
      const data = await res.json();
      const ppt = data.presentation;
      setTitle(ppt.title);
      setSlides(ppt.slides || []);
      setTheme(ppt.theme || "dark");
      setLanguage(ppt.language || "en-US");
      setTone(ppt.tone || "professional");
      setOutline(ppt.outline || []);
      setTopic(ppt.topic || "");
      setCurrentSlide(0);
      setStep("preview");
      setShowHistory(false);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to load presentation";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  return (
    <div className="relative min-h-screen bg-white dark:bg-background p-8">
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
      <div className="mx-auto flex max-w-6xl flex-col gap-6 relative z-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 shadow-[0_0_30px_rgba(56,189,248,0.6)]">
              <Presentation className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-mono tracking-[0.08em] uppercase">
                PPT Maker
              </h1>
              <p className="text-sm text-muted-foreground">
                Turn a topic into polished, downloadable slides powered by AI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchHistory}
              disabled={isLoadingHistory}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-bold text-slate-100 shadow-md shadow-black/40 hover:border-sky-500 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-40 font-mono tracking-[0.12em] uppercase"
            >
              {isLoadingHistory ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading history
                </>
              ) : (
                <>
                  <History className="h-4 w-4" />
                  History
                </>
              )}
            </button>
            {step !== "input" && (
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-700 bg-transparent px-4 py-2 text-xs font-bold text-slate-200 hover:border-sky-500 hover:text-sky-300 font-mono tracking-[0.12em] uppercase"
              >
                <RefreshCcw className="h-4 w-4" />
                Start over
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100 shadow-lg shadow-red-900/40">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {step === "input" && (
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 shadow-[0_0_40px_rgba(56,189,248,0.25)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground font-mono tracking-[0.08em] uppercase">
                  What&apos;s your presentation about?
                </h2>
                <p className="text-xs text-muted-foreground">
                  Describe the topic and what you want the audience to learn.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300 font-mono">
                  Presentation topic
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="E.g. The future of artificial intelligence in healthcare"
                  className="min-h-[120px] w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 shadow-inner shadow-black/10 dark:shadow-black/40 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/60"
                  disabled={isGeneratingOutline}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300 font-mono">
                    Number of slides
                  </label>
                  <select
                    value={numSlides}
                    onChange={(e) => setNumSlides(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/70 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/60"
                    disabled={isGeneratingOutline}
                  >
                    {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} slides
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300 font-mono">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/70 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/60"
                    disabled={isGeneratingOutline}
                  >
                    {languages.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300 font-mono">
                    Tone
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/70 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/60"
                    disabled={isGeneratingOutline}
                  >
                    {tones.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateOutline}
                disabled={isGeneratingOutline || !topic.trim()}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-xs font-bold text-white shadow-[0_0_30px_rgba(56,189,248,0.7)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 font-mono tracking-[0.12em] uppercase"
              >
                {isGeneratingOutline ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating outline...
                  </>
                ) : (
                  <>
                    Generate outline
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {step === "outline" && (
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-5 shadow-[0_0_30px_rgba(15,23,42,0.7)]">
              <div className="mb-3 flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-sky-400" />
                <h2 className="text-sm font-bold text-foreground font-mono tracking-[0.1em] uppercase">
                  Presentation title
                </h2>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-base font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/60"
              />
            </section>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-5 shadow-[0_0_30px_rgba(15,23,42,0.7)]">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-foreground font-mono tracking-[0.1em] uppercase">
                  Outline
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {outline.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 px-4 py-3 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/80 text-xs font-semibold text-white shadow-[0_0_16px_rgba(56,189,248,0.9)]">
                      {idx + 1}
                    </span>
                    <pre className="whitespace-pre-wrap text-xs md:text-sm text-slate-100/90">
                      {item}
                    </pre>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-5 shadow-[0_0_30px_rgba(15,23,42,0.7)]">
              <div className="mb-3 flex items-center gap-2">
                <Palette className="h-4 w-4 text-sky-400" />
                <h2 className="text-sm font-bold text-foreground font-mono tracking-[0.1em] uppercase">
                  Theme
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {themes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${
                      theme === t
                        ? "bg-sky-500 text-white shadow-[0_0_14px_rgba(56,189,248,0.9)]"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>

            <button
              onClick={handleGeneratePresentation}
              disabled={isGeneratingPresentation}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-xs font-bold text-white shadow-[0_0_30px_rgba(129,140,248,0.7)] transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 font-mono tracking-[0.12em] uppercase"
            >
              {isGeneratingPresentation ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating slides...
                </>
              ) : (
                <>
                  <Presentation className="h-4 w-4" />
                  Generate presentation
                </>
              )}
            </button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-5">
            <section className="flex flex-col gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100 p-4 text-sm shadow-lg shadow-emerald-900/40">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/80 text-emerald-950 shadow-[0_0_16px_rgba(16,185,129,0.8)]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    Presentation generated successfully
                  </p>
                  <p className="text-xs text-emerald-100/80">
                    {slides.length} slides • Theme: {theme} •{" "}
                    {languages.find((l) => l.code === language)?.name || language}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-4 shadow-[0_0_30px_rgba(15,23,42,0.7)]">
                <div className="mb-3 flex items-center gap-2">
                  <Palette className="h-4 w-4 text-sky-400" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Theme
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {themes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                      theme === t
                        ? "bg-sky-500 text-white shadow-[0_0_14px_rgba(56,189,248,0.9)]"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-4 shadow-[0_0_30px_rgba(15,23,42,0.7)]">
                <div className="mb-3 flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-sky-400" />
                  <h3 className="text-sm font-semibold text-foreground">
                    PPT font
                  </h3>
                </div>
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/70 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/60"
                >
                  {fonts.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/90 p-5 shadow-[0_0_40px_rgba(56,189,248,0.35)]">
              <SlideViewer
                slides={slides}
                theme={theme}
                currentSlide={currentSlide}
                onSlideChange={setCurrentSlide}
                onSlideUpdate={handleSlideUpdate}
                isEditing={isEditingInline}
                onEditToggle={setIsEditingInline}
                userName={userName}
                font={selectedFont}
              />
            </section>

            <div className="flex justify-end">
              <button
                onClick={handleDownloadPPTX}
                disabled={isDownloading || isEditingInline}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(56,189,248,0.7)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating PPTX...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download PPTX
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {showHistory && (
        <div className="fixed bottom-4 right-4 z-40 w-96 max-h-[480px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/95 shadow-[0_0_40px_rgba(15,23,42,0.9)] backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-sky-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                Past presentations
              </p>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="rounded-full bg-slate-100 dark:bg-slate-900/80 p-1 text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto px-3 py-2 text-xs">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-6 text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : presentations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-slate-400">
                <FileText className="h-7 w-7" />
                <p>No saved presentations yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {presentations.map((ppt) => (
                  <button
                    key={ppt.ppt_id}
                    onClick={() => loadPresentation(ppt.ppt_id)}
                    className="flex w-full flex-col items-start gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 px-3 py-2 text-left text-slate-800 dark:text-slate-100 hover:border-sky-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-[11px] font-semibold text-sky-300">
                        PPT #{ppt.ppt_id}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {ppt.num_slides} slides
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[11px] text-slate-200">
                      {ppt.title}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{ppt.theme} theme</span>
                      {ppt.created_at && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(ppt.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {toastVisible && (
        <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4">
          <div
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-lg ${
              toastType === "success" ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {toastType === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <p className="flex-1 text-xs font-medium">{toastMessage}</p>
            <button
              onClick={() => setToastVisible(false)}
              className="rounded-full p-1 hover:bg-black/20"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

