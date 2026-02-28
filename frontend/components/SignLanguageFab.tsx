"use client";
import { useState } from "react";
import { Hand, X } from "lucide-react";
import SignLanguageAvatar from "./SignLanguageAvatar";
import { useSignLanguage } from "@/lib/sign-language-context";

/**
 * Global Sign Language FAB. Reads the current page's content from SignLanguageContext.
 * Pages push their content via useSignLanguage().setSignText(…).
 */
export function SignLanguageFab() {
  const [isOpen, setIsOpen] = useState(false);
  const { signText } = useSignLanguage();

  const hasContent = signText.trim().length > 0;

  return (
    <>
      {/* Avatar panel */}
      <SignLanguageAvatar
        text={signText}
        isVisible={isOpen && hasContent}
        onClose={() => setIsOpen(false)}
      />

      {/* FAB button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        disabled={!hasContent}
        title={hasContent ? "Sign current content" : "No signable content on this page"}
        className={`fixed bottom-20 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all
          ${isOpen
            ? "bg-violet-600 text-white hover:bg-violet-700 shadow-violet-500/40"
            : hasContent
              ? "bg-card border border-border text-violet-500 hover:bg-violet-500/10 hover:border-violet-400"
              : "bg-card border border-border text-foreground/20 cursor-not-allowed"
          }`}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Hand className="w-5 h-5" />}
        {/* Live pulse dot when content is available */}
        {hasContent && !isOpen && (
          <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-violet-500 border-2 border-background" />
        )}
      </button>
    </>
  );
}
