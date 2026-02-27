"use client";

import { useState } from "react";
import {
  Layers,
  FileText,
  Link as LinkIcon,
  Upload,
  ArrowRight,
  History,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { API_ENDPOINTS } from "@/lib/config";

type InputMode = "text" | "pdf" | "url";

interface Flashcard {
  id: number;
  front: string;
  back: string;
  difficulty: string;
}

interface PastFlashcardSet {
  flashcard_id: number;
  total_cards: number;
  words_per_card: number;
  content_source: string;
  created_at: string;
}

export default function FlashcardsPage() {
  const [step, setStep] = useState<"input" | "settings" | "study">("input");

  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [numCards, setNumCards] = useState(10);
  const [wordsPerCard, setWordsPerCard] = useState(35);

  const [isGenerating, setIsGenerating] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [showGridView, setShowGridView] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);

  const [originalContent, setOriginalContent] = useState("");
  const [contentSource, setContentSource] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [pastFlashcardSets, setPastFlashcardSets] = useState<PastFlashcardSet[]>([]);
  const [loadingPastSets, setLoadingPastSets] = useState(false);
  const [showPastSets, setShowPastSets] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const proceedToSettings = () => {
    let hasInput = false;
    if (inputMode === "text" && textInput.trim()) hasInput = true;
    if (inputMode === "url" && urlInput.trim()) hasInput = true;
    if (inputMode === "pdf" && pdfFile) hasInput = true;

    if (!hasInput) {
      setError("Please provide content (text, PDF, or URL) first.");
      return;
    }
    setError(null);
    setStep("settings");
  };

  const generateFlashcards = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to generate flashcards.");
        setIsGenerating(false);
        return;
      }

      const formData = new FormData();
      if (inputMode === "text") formData.append("text", textInput);
      else if (inputMode === "url") formData.append("url", urlInput);
      else if (inputMode === "pdf" && pdfFile) formData.append("pdf", pdfFile);

      formData.append("num_cards", String(numCards));
      formData.append("words_per_card", String(wordsPerCard));

      const res = await fetch(API_ENDPOINTS.FLASHCARDS.GENERATE, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.flashcards) {
        throw new Error(data.detail || "Failed to generate flashcards");
      }

      setFlashcards(data.flashcards);
      setOriginalContent(data.original_content || "");
      setContentSource(data.content_source || inputMode);
      setCurrentIndex(0);
      setShowBack(false);
      setShowGridView(false);
      setStep("study");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate flashcards.";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchPastSets = async () => {
    setLoadingPastSets(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to view flashcard history.");
        setLoadingPastSets(false);
        return;
      }
      const res = await fetch(API_ENDPOINTS.FLASHCARDS.HISTORY, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.detail || "Failed to load history");
      }
      setPastFlashcardSets(data.flashcard_sets || []);
      setShowPastSets(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load flashcard history.";
      setError(message);
    } finally {
      setLoadingPastSets(false);
    }
  };

  const loadPastSet = async (flashcardId: number) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        API_ENDPOINTS.FLASHCARDS.HISTORY_DETAIL(flashcardId),
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.detail || "Failed to load flashcard set");
      }
      const set = data.flashcard_set;
      setFlashcards(set.flashcards || []);
      setCurrentIndex(0);
      setShowBack(false);
      setShowGridView(false);
      setStep("study");
      setShowPastSets(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load flashcard set.";
      setError(message);
    }
  };

  const flipCard = () => {
    if (isFlipping || !flashcards.length) return;

    setIsFlipping(true);

    // Play flip sound (expects /public/sounds/flipcard-91468.mp3 to exist)
    try {
      const audio = new Audio("/sounds/flipcard-91468.mp3");
      audio.volume = 0.3;
      void audio.play();
    } catch {
      // ignore audio errors
    }

    setTimeout(() => {
      setShowBack((prev) => !prev);
      setIsFlipping(false);
    }, 250);
  };
  const nextCard = () =>
    setCurrentIndex((prev) => (prev < flashcards.length - 1 ? prev + 1 : prev));
  const prevCard = () =>
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));

  const resetAll = () => {
    setStep("input");
    setTextInput("");
    setUrlInput("");
    setPdfFile(null);
    setFlashcards([]);
    setCurrentIndex(0);
    setShowBack(false);
    setShowGridView(false);
    setOriginalContent("");
    setContentSource("");
    setSaveMessage(null);
    setError(null);
  };

  const saveFlashcardSet = async () => {
    if (!flashcards.length) return;

    setIsSaving(true);
    setSaveMessage(null);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to save flashcards.");
        setIsSaving(false);
        return;
      }

      const res = await fetch(API_ENDPOINTS.FLASHCARDS.SAVE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          flashcards,
          original_content:
            originalContent || textInput || urlInput || "",
          content_source: contentSource || inputMode,
          num_cards: numCards,
          words_per_card: wordsPerCard,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.detail || data.message || "Failed to save flashcards");
      }

      setSaveMessage("Flashcard set saved successfully!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save flashcards.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderInput = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <div>
      <h1 className="text-2xl font-semibold text-foreground">Flashcards</h1>
            <p className="text-sm text-muted-foreground">
              Upload a PDF, paste a URL, or enter text to generate flashcards.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6">
        {/* Input mode toggle */}
        <div className="mb-4 flex gap-3">
          <button
            onClick={() => setInputMode("text")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
              inputMode === "text"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            <FileText className="h-4 w-4" />
            Text
          </button>
          <button
            onClick={() => setInputMode("pdf")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
              inputMode === "pdf"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            <Upload className="h-4 w-4" />
            PDF
          </button>
          <button
            onClick={() => setInputMode("url")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
              inputMode === "url"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            <LinkIcon className="h-4 w-4" />
            URL
          </button>
        </div>

        {/* Input fields */}
        {inputMode === "text" && (
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste your study material here (minimum ~100 characters)..."
            className="mt-2 h-48 w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        )}

        {inputMode === "pdf" && (
          <div className="mt-2 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/40 px-4 py-8 text-center">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <label className="cursor-pointer text-sm font-medium text-foreground">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted">
                {pdfFile ? pdfFile.name : "Choose PDF file"}
              </span>
            </label>
            <p className="text-xs text-muted-foreground">
              PDF only, up to 10MB. We&apos;ll extract the text automatically.
            </p>
          </div>
        )}

        {inputMode === "url" && (
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/article-or-blog-post"
            className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={fetchPastSets}
            disabled={loadingPastSets}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm transition hover:bg-card/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <History className="h-4 w-4" />
            {loadingPastSets ? "Loading history..." : "View history"}
          </button>
          <button
            onClick={proceedToSettings}
            className="inline-flex items-center gap-2 rounded-lg shiny-blue-bg px-4 py-2 text-sm font-semibold text-white shadow-[0_0_18px_rgba(56,189,248,0.7)] transition hover:opacity-95"
          >
            Next: Settings
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-foreground">Flashcard settings</h2>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-6 rounded-xl border border-border bg-card p-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Number of flashcards
          </label>
          <input
            type="number"
            min={5}
            max={50}
            value={numCards}
            onChange={(e) => setNumCards(parseInt(e.target.value) || 10)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            5–50 cards works best for focused sessions.
        </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Max words per side
          </label>
          <input
            type="number"
            min={20}
            max={50}
            value={wordsPerCard}
            onChange={(e) =>
              setWordsPerCard(parseInt(e.target.value) || 35)
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Shorter answers (≤ {wordsPerCard} words) are easier to review quickly.
          </p>
        </div>

        <div className="flex justify-between gap-3">
          <button
            onClick={() => setStep("input")}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm transition hover:bg-card/80"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Back to content
          </button>
          <button
            onClick={generateFlashcards}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-lg shiny-blue-bg px-4 py-2 text-sm font-semibold text-white shadow-[0_0_18px_rgba(56,189,248,0.7)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating flashcards...
              </>
            ) : (
              <>
                <Layers className="h-4 w-4" />
                Generate flashcards
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderStudy = () => {
    if (!flashcards.length) {
      return (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No flashcards yet. Generate a set first.
    </div>
  );
}

    const current = flashcards[currentIndex];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Study mode
            </h2>
            <p className="text-xs text-muted-foreground">
              Card {currentIndex + 1} of {flashcards.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveFlashcardSet}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg shiny-blue-bg px-3 py-2 text-xs font-semibold text-white shadow-[0_0_18px_rgba(56,189,248,0.7)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Save set
                </>
              )}
            </button>
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm transition hover:bg-card/80"
            >
              Reset
            </button>
          </div>
        </div>

        {saveMessage && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400">
            {saveMessage}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setShowGridView((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Layers className="h-4 w-4" />
              {showGridView ? "Card view" : "View all"}
            </button>

            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {current.difficulty || "medium"}
            </span>
          </div>

          {showGridView ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {flashcards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-lg border border-border bg-background p-3 text-xs"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">
                      Card {card.id}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {card.difficulty}
                    </span>
                  </div>
                  <p className="mb-1 font-medium text-foreground">
                    Q: {card.front}
                  </p>
                  <p className="text-muted-foreground">A: {card.back}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
            <div
              onClick={flipCard}
              className={`flex h-64 w-full max-w-md cursor-pointer items-center justify-center rounded-2xl border border-(--glass-border) bg-(--glass-bg) px-6 py-4 text-center text-sm text-foreground shadow-[0_0_30px_rgba(56,189,248,0.45)] backdrop-blur-xl transition hover:bg-background/80 ${
                  isFlipping ? "opacity-80" : ""
                }`}
                style={{
                  transformStyle: "preserve-3d",
                  transform: showBack ? "rotateY(180deg)" : "rotateY(0deg)",
                  transition: "transform 0.35s ease",
                }}
              >
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    {showBack ? "Answer" : "Question"}
                  </p>
                  <p className="text-base font-medium">
                    {showBack ? current.back : current.front}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={prevCard}
                  disabled={currentIndex === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm transition hover:bg-card/80 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={nextCard}
                  disabled={currentIndex === flashcards.length - 1}
                  className="inline-flex items-center gap-2 rounded-lg shiny-blue-bg px-4 py-2 text-xs font-semibold text-white shadow-[0_0_18px_rgba(56,189,248,0.7)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPastSetsModal = () => {
    if (!showPastSets) return null;

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
        <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Flashcard history
            </h2>
            <button
              onClick={() => setShowPastSets(false)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
            >
              Close
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-4 py-3 text-xs">
            {!pastFlashcardSets.length ? (
              <p className="py-6 text-center text-muted-foreground">
                No saved flashcard sets yet.
              </p>
            ) : (
              <div className="space-y-2">
                {pastFlashcardSets.map((set) => (
                  <button
                    key={set.flashcard_id}
                    onClick={() => loadPastSet(set.flashcard_id)}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left text-[11px] font-medium text-foreground hover:bg-muted"
                  >
                    <div>
                      <p className="text-xs font-semibold">
                        Set #{set.flashcard_id}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {set.total_cards} cards • {set.words_per_card} words/side
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(set.created_at).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-8">
        {step === "input" && renderInput()}
        {step === "settings" && renderSettings()}
        {step === "study" && renderStudy()}
      </div>
      {renderPastSetsModal()}
    </div>
  );
}