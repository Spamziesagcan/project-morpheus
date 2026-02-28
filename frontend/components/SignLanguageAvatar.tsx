"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Hand, X, Play, Pause, RotateCcw, Gauge, GripHorizontal } from "lucide-react";

interface SignLanguageAvatarProps {
  text: string;
  isVisible: boolean;
  onClose: () => void;
  /** If true, automatically start playing when text or visibility changes */
  autoPlay?: boolean;
}

// Words that have a dedicated sign video
const COMMON_WORDS = [
  "hi", "hello", "bye", "goodbye", "thank-you", "thanks", "please",
  "yes", "no", "ok", "okay", "good", "bad", "welcome", "you", "my",
  "name", "is", "not", "love-you", "everyone", "good-morning", "how-are-you", "what",
];

type SignItem = { type: "word" | "letter" | "space"; value: string };

// ── Double-buffer helpers ────────────────────────────────────────────────
// We never change `src` on the *visible* video, so there's no blank frame.
// Instead we load the next clip into the hidden slot, then instantly swap.

function loadClip(
  vid: HTMLVideoElement,
  value: string,
  onReady: () => void,
  onEnded: () => void,
) {
  // Tear down any previous listeners
  vid.oncanplay = null;
  vid.onended = null;
  vid.onerror = null;

  const tryPlay = () => {
    vid.oncanplay = null;
    onReady();
    vid.onended = onEnded;
  };

  vid.onerror = () => {
    // Try mp4 fallback once
    vid.onerror = null;
    const current = vid.src;
    if (!current.endsWith(".mp4")) {
      vid.oncanplay = tryPlay;
      vid.src = `/signs/${value}.mp4`;
      vid.load();
    }
  };

  vid.oncanplay = tryPlay;
  vid.src = `/signs/${value}.webm`;
  vid.load();
}

export default function SignLanguageAvatar({
  text,
  isVisible,
  onClose,
  autoPlay = false,
}: SignLanguageAvatarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [signItems, setSignItems] = useState<SignItem[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(2);
  const [size, setSize] = useState({ width: 360, height: 500 });

  // Double-buffer: two video elements; activeSlot tells which is front
  const videoRef0 = useRef<HTMLVideoElement>(null);
  const videoRef1 = useRef<HTMLVideoElement>(null);
  const getVidRef = (slot: 0 | 1) => (slot === 0 ? videoRef0 : videoRef1);
  const activeSlotRef = useRef<0 | 1>(0);

  // Mirrors of state accessible in DOM callbacks (avoids stale closures)
  const speedRef = useRef(2);
  const signItemsRef = useRef<SignItem[]>([]);
  const isPlayingRef = useRef(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  // Keep refs in sync
  useEffect(() => { speedRef.current = playbackSpeed; }, [playbackSpeed]);
  useEffect(() => { signItemsRef.current = signItems; }, [signItems]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // ── Swap visible slot (direct DOM, no React re-render = no flash) ──────
  const swapToSlot = useCallback((slot: 0 | 1) => {
    const front = getVidRef(slot).current;
    const back  = getVidRef((1 - slot) as 0 | 1).current;
    if (front) { front.style.opacity = "1"; front.style.zIndex = "1"; }
    if (back)  { back.style.opacity  = "0"; back.style.zIndex  = "0"; }
    activeSlotRef.current = slot;
  }, []);

  // ── Parse text → sign items ────────────────────────────────────────────
  useEffect(() => {
    const clean = text.toLowerCase().trim();
    if (!clean) { setSignItems([]); return; }

    const words = clean.split(/\s+/);
    const items: SignItem[] = [];

    words.forEach((word, wordIdx) => {
      const w = word.replace(/[^a-zA-Z-]/g, "");
      const match = COMMON_WORDS.find(
        (cw) => cw === w || cw.replace(/-/g, "") === w.replace(/-/g, ""),
      );
      if (match && w.length > 0) {
        items.push({ type: "word", value: match });
      } else {
        w.split("").forEach((l) => {
          if (l.match(/[a-z]/)) items.push({ type: "letter", value: l });
        });
      }
      if (wordIdx < words.length - 1) items.push({ type: "space", value: " " });
    });

    setSignItems(items);
    setCurrentItemIndex(0);
  }, [text]);

  // ── Auto-play when text changes and autoPlay is enabled ────────────────
  useEffect(() => {
    if (autoPlay && signItems.length > 0 && isVisible) {
      setCurrentItemIndex(0);
      setIsPlaying(true);
    }
  }, [signItems, autoPlay, isVisible]);

  // ── Core playback: play item at index, seamlessly ──────────────────────
  const playItem = useCallback(
    (index: number) => {
      const items = signItemsRef.current;
      if (index >= items.length) {
        setIsPlaying(false);
        setCurrentItemIndex(0);
        return;
      }

      const item = items[index];

      // Space: pause briefly then advance
      if (item.type === "space") {
        timeoutRef.current = setTimeout(
          () => setCurrentItemIndex((i) => i + 1),
          600 / speedRef.current,
        );
        return;
      }

      // Target slot = the one currently hidden (back buffer)
      const targetSlot = (1 - activeSlotRef.current) as 0 | 1;
      const vid = getVidRef(targetSlot).current;
      if (!vid) return;

      loadClip(
        vid,
        item.value,
        // onReady: clip is buffered → bring it to front instantly
        () => {
          // Only proceed if we're still supposed to be playing
          if (!isPlayingRef.current) return;
          vid.playbackRate = speedRef.current;
          swapToSlot(targetSlot);
          vid.play().catch(() => {});

          // While this clip plays, silently pre-load the next video clip
          // into the now-hidden back slot so the next swap is instantaneous.
          const nextItems = signItemsRef.current;
          let nextVideoIdx = index + 1;
          // Skip spaces (they don't need a video)
          while (nextVideoIdx < nextItems.length && nextItems[nextVideoIdx].type === "space") {
            nextVideoIdx++;
          }
          if (nextVideoIdx < nextItems.length) {
            const nextItem = nextItems[nextVideoIdx];
            const preloadSlot = (1 - activeSlotRef.current) as 0 | 1;
            const preloadVid = getVidRef(preloadSlot).current;
            if (preloadVid) {
              // Silent preload — no callbacks needed here
              preloadVid.oncanplay = null;
              preloadVid.onended = null;
              preloadVid.onerror = null;
              preloadVid.src = `/signs/${nextItem.value}.webm`;
              preloadVid.load();
            }
          }
        },
        // onEnded: advance to next item
        () => setCurrentItemIndex((i) => i + 1),
      );
    },
    [swapToSlot],
  );

  // ── Drive playback when index or playing state changes ─────────────────
  useEffect(() => {
    if (isVisible && isPlaying && signItems.length > 0) {
      playItem(currentItemIndex);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isPlaying, currentItemIndex, isVisible, signItems, playItem]);

  // ── Controls ───────────────────────────────────────────────────────────
  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      getVidRef(activeSlotRef.current).current?.pause();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      if (currentItemIndex >= signItems.length) setCurrentItemIndex(0);
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentItemIndex(0);
    [videoRef0, videoRef1].forEach((r) => {
      if (r.current) { r.current.pause(); r.current.currentTime = 0; }
    });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleSpeedChange = () => {
    const speeds = [1, 1.5, 2, 4];
    const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(next);
    speedRef.current = next;
    const active = getVidRef(activeSlotRef.current).current;
    if (active && !active.paused) active.playbackRate = next;
  };

  // ── Resize drag (top-left handle grows up+left) ───────────────────────
  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: size.width, startH: size.height };

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dx = resizeRef.current.startX - ev.clientX;
      const dy = resizeRef.current.startY - ev.clientY;
      setSize({
        width:  Math.min(700, Math.max(300, resizeRef.current.startW + dx)),
        height: Math.min(800, Math.max(380, resizeRef.current.startH + dy)),
      });
    };
    const onMouseUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  if (!isVisible || signItems.length === 0) return null;

  const current = signItems[currentItemIndex];
  const isSpace = current?.type === "space";
  const progress = Math.min((currentItemIndex / signItems.length) * 100, 100);
  // video area = total height minus header(~49) token-scroll(~56) controls(~52) progress-bar(4)
  const videoHeight = Math.max(120, size.height - 161);

  return (
    <div
      className="fixed bottom-28 right-6 z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col select-none"
      style={{ width: size.width, height: size.height }}
    >
      {/* ── Resize handle (top-left corner) ── */}
      <div
        onMouseDown={onResizeMouseDown}
        title="Drag to resize"
        className="absolute top-0 left-0 z-10 w-5 h-5 cursor-nw-resize flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
        style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
      >
        <GripHorizontal className="w-3 h-3 text-violet-500 rotate-45" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-violet-500/10 to-sky-500/10">
        <div className="flex items-center gap-2">
          <Hand className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-foreground">Sign Language</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Video area — two layered <video> elements for zero-flash double-buffering */}
      <div
        className="relative bg-foreground/5 flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ height: videoHeight }}
      >
        {isSpace ? (
          <div className="text-center">
            <span className="text-4xl font-bold text-foreground/30">_</span>
            <p className="text-xs text-foreground/40 mt-1 font-medium tracking-wide uppercase">Space</p>
          </div>
        ) : (
          <>
            {/* Slot 0 — starts as front (opacity 1) */}
            <video
              ref={videoRef0}
              className="absolute inset-0 w-full h-full object-contain"
              style={{ opacity: 1, zIndex: 1 }}
              muted
              playsInline
            />
            {/* Slot 1 — starts as back (opacity 0) */}
            <video
              ref={videoRef1}
              className="absolute inset-0 w-full h-full object-contain"
              style={{ opacity: 0, zIndex: 0 }}
              muted
              playsInline
            />
            {current && (
              <span className="absolute top-2 right-2 bg-foreground/80 text-background text-xs font-bold px-2 py-1 rounded-lg" style={{ zIndex: 2 }}>
                {current.type === "word"
                  ? current.value.toUpperCase().replace(/-/g, " ")
                  : current.value.toUpperCase()}
              </span>
            )}
          </>
        )}
        {/* Progress bar overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-foreground/10" style={{ zIndex: 3 }}>
          <div
            className="h-full bg-violet-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Token scroll */}
      <div className="px-4 py-2 border-b border-border max-h-14 overflow-y-auto">
        <p className="text-xs leading-5 font-medium text-foreground/70 flex flex-wrap gap-0.5">
          {signItems.map((item, idx) => {
            if (item.type === "space") return <span key={idx}> </span>;
            return (
              <button
                key={idx}
                onClick={() => { setCurrentItemIndex(idx); setIsPlaying(true); }}
                className={`rounded px-0.5 transition-colors cursor-pointer ${
                  idx === currentItemIndex
                    ? "bg-violet-500 text-white"
                    : idx < currentItemIndex
                    ? "text-foreground/30"
                    : "hover:bg-foreground/10"
                }`}
              >
                {item.type === "word" ? item.value.replace(/-/g, " ") : item.value}
              </button>
            );
          })}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={handlePlayPause}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
            isPlaying
              ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
              : "bg-violet-500 text-white shadow-sm hover:bg-violet-600"
          }`}
        >
          {isPlaying
            ? <><Pause className="w-3.5 h-3.5" /> Pause</>
            : <><Play className="w-3.5 h-3.5" /> {currentItemIndex >= signItems.length ? "Replay" : "Play"}</>}
        </button>
        <button
          onClick={handleSpeedChange}
          title="Change speed"
          className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold bg-foreground/8 border border-border hover:bg-foreground/15 text-foreground/80 transition-colors"
        >
          <Gauge className="w-3.5 h-3.5" />
          {playbackSpeed}x
        </button>
        <button
          onClick={handleReset}
          title="Reset"
          className="rounded-xl p-2 border border-border hover:bg-foreground/10 text-foreground/60 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
