"use client";

export default function FlashcardsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Flashcards</h1>
      <div className="bg-card border border-border rounded-xl p-6">
        <p className="text-foreground/70">
          This will become your flashcard generator and reviewer. Turn topics into
          Q&A cards and practice them with spaced repetition.
        </p>
      </div>
    </div>
  );
}

