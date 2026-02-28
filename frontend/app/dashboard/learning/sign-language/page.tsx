"use client";
import { useState } from "react";
import { Hand, Lightbulb } from "lucide-react";
import SignLanguageAvatar from "@/components/SignLanguageAvatar";
import { useSignLanguage } from "@/lib/sign-language-context";

const SAMPLE_PHRASES = [
  "hello how are you",
  "my name is",
  "thank you so much",
  "good morning everyone",
  "yes i am okay",
  "love you",
];

export default function SignLanguagePage() {
  const [inputText, setInputText] = useState("");
  const [activeText, setActiveText] = useState("");
  const [isAvatarVisible, setIsAvatarVisible] = useState(false);
  const { setSignText } = useSignLanguage();

  const handleSign = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setActiveText(trimmed);
    setSignText(trimmed);
    setIsAvatarVisible(true);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Sign Language</h1>
        <p className="text-sm text-foreground/50">
          Type any phrase and watch it translated into sign language via video.
        </p>
      </div>

      {/* Input */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Hand className="w-5 h-5 text-violet-500" />
          <h2 className="text-base font-semibold text-foreground">Text to Sign</h2>
        </div>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a phrase to sign, e.g. 'hello how are you'"
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-foreground/40 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
        />

        <button
          onClick={handleSign}
          disabled={!inputText.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-40 px-4 py-2.5 text-sm font-semibold text-white transition-all shadow-sm"
        >
          <Hand className="w-4 h-4" />
          Sign this phrase
        </button>

        {/* Sample phrases */}
        <div>
          <div className="flex items-center gap-1 mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-foreground/50">Try these:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PHRASES.map((phrase) => (
              <button
                key={phrase}
                onClick={() => { setInputText(phrase); }}
                className="text-xs rounded-lg border border-border px-3 py-1.5 text-foreground/70 hover:bg-foreground/5 hover:border-violet-500/40 hover:text-foreground transition-all"
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">How it works</h3>
        <ul className="space-y-2 text-sm text-foreground/60">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2 flex-shrink-0" />
            Common words (hello, yes, no, thank you…) are shown as full sign videos
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-2 flex-shrink-0" />
            Unknown words are spelled out letter-by-letter using finger spelling
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
            Click any word/letter in the avatar to jump to that position
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
            Adjust playback speed (1x, 1.25x, 1.5x, 2x) to match your learning pace
          </li>
        </ul>
      </div>

      {/* Avatar panel */}
      <SignLanguageAvatar
        text={activeText}
        isVisible={isAvatarVisible}
        onClose={() => setIsAvatarVisible(false)}
      />
    </div>
  );
}
