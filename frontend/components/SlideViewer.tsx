"use client";

import { ChevronLeft, ChevronRight, Edit2, Check, X } from "lucide-react";
import { useState, useEffect } from "react";

interface SlideItem {
  layout: string;
  section_layout: string;
  content: {
    heading?: string;
    items?: Array<{ text: string; subtext?: string }>;
  };
  image_query?: string;
}

interface SlideViewerProps {
  slides: SlideItem[];
  theme: string;
  currentSlide: number;
  onSlideChange: (index: number) => void;
  onSlideUpdate?: (slideIndex: number, updatedSlide: SlideItem) => void;
  isEditing?: boolean;
  onEditToggle?: (editing: boolean) => void;
  userName?: string;
  font?: string;
}

export default function SlideViewer({
  slides,
  theme,
  currentSlide,
  onSlideChange,
  onSlideUpdate,
  isEditing = false,
  onEditToggle,
  userName = "User",
  font = "Inter",
}: SlideViewerProps) {
  const slide = slides[currentSlide] as SlideItem | undefined;
  const [editedHeading, setEditedHeading] = useState("");
  const [editedItems, setEditedItems] = useState<
    Array<{ text: string; subtext?: string }>
  >([]);

  // Update edited state when slide changes
  useEffect(() => {
    if (!slide) return;
    setEditedHeading(slide.content.heading || "");
    setEditedItems(slide.content.items || []);
    // reset edit mode when slide changes
    if (isEditing) {
      onEditToggle?.(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide, slide]);

  if (!slide) return null;

  const startEditing = () => {
    setEditedHeading(slide.content.heading || "");
    setEditedItems(slide.content.items || []);
    onEditToggle?.(true);
  };

  const saveEdits = () => {
    if (onSlideUpdate) {
      const updatedSlide = {
        ...slide,
        content: {
          ...slide.content,
          heading: editedHeading,
          items: editedItems,
        },
      };
      onSlideUpdate(currentSlide, updatedSlide);
    }
    onEditToggle?.(false);
  };

  const cancelEdits = () => {
    onEditToggle?.(false);
  };

  // Helper to choose text color based on background hex
  const getTextColorForBg = (bgColor: string) => {
    if (
      bgColor === "#E5E5E5" ||
      bgColor === "#FFFFFF" ||
      bgColor === "#F9FAFB" ||
      bgColor.includes("gray") ||
      bgColor.includes("white") ||
      bgColor.startsWith("#F") ||
      bgColor.startsWith("#E") ||
      bgColor.startsWith("#D")
    ) {
      return "#000000";
    }
    return "#FFFFFF";
  };

  const themeStyles = {
    default: {
      bg: "bg-slate-900",
      primary: "#FF6B6B",
      secondary: "#4ECDC4",
      accent: "#FFE66D",
      text: "#E5E7EB",
    },
    modern: {
      bg: "bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900",
      primary: "#6366F1",
      secondary: "#8B5CF6",
      accent: "#EC4899",
      text: "#E5E7EB",
    },
    minimal: {
      bg: "bg-slate-900",
      primary: "#0EA5E9",
      secondary: "#38BDF8",
      accent: "#22D3EE",
      text: "#E5E7EB",
    },
    vibrant: {
      bg: "bg-gradient-to-br from-violet-700 via-fuchsia-700 to-sky-500",
      primary: "#FFFFFF",
      secondary: "#FDE047",
      accent: "#34D399",
      text: "#F9FAFB",
    },
    dark: {
      bg: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
      primary: "#38BDF8",
      secondary: "#22C55E",
      accent: "#FACC15",
      text: "#E5E7EB",
    },
  } as const;

  const currentTheme =
    themeStyles[theme as keyof typeof themeStyles] ?? themeStyles.dark;

  const renderLayout = () => {
    const { layout, content } = slide;

    switch (layout) {
      case "bullets":
      default:
        return (
          <div className="relative flex flex-col justify-center h-full px-12 py-10">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-semibold mb-8 bg-transparent border border-sky-500/60 rounded-lg px-4 py-2 outline-none ring-1 ring-sky-500/40"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2
                className="text-5xl font-semibold mb-8 drop-shadow-lg"
                style={{ color: currentTheme.primary, fontFamily: font }}
              >
                {content.heading}
              </h2>
            )}

            <ul className="space-y-4">
              {(isEditing ? editedItems : content.items)?.map(
                (item, idx: number) => (
                  <li key={idx} className="flex items-start gap-4">
                    <span
                      className="text-3xl mt-1"
                      style={{ color: currentTheme.secondary, fontFamily: font }}
                    >
                      •
                    </span>
                    <div className="flex-1">
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = {
                                ...newItems[idx],
                                text: e.target.value,
                              };
                              setEditedItems(newItems);
                            }}
                            className="w-full text-2xl font-semibold border border-sky-500/50 px-3 py-1.5 rounded-md bg-slate-900/40 outline-none"
                            style={{
                              color: currentTheme.text,
                              fontFamily: font,
                            }}
                          />
                          {item.subtext !== undefined && (
                            <input
                              type="text"
                              value={item.subtext || ""}
                              onChange={(e) => {
                                const newItems = [...editedItems];
                                newItems[idx] = {
                                  ...newItems[idx],
                                  subtext: e.target.value,
                                };
                                setEditedItems(newItems);
                              }}
                              className="w-full text-sm mt-1 border border-slate-600/70 px-3 py-1 rounded-md bg-slate-900/40 outline-none"
                              style={{
                                color: currentTheme.text,
                                fontFamily: font,
                              }}
                            />
                          )}
                        </>
                      ) : (
                        <>
                          <p
                            className="text-2xl font-semibold leading-relaxed"
                            style={{ color: currentTheme.text, fontFamily: font }}
                          >
                            {item.text}
                          </p>
                          {item.subtext && (
                            <p
                              className="text-sm mt-1 opacity-80"
                              style={{ color: currentTheme.accent, fontFamily: font }}
                            >
                              {item.subtext}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                ),
              )}
            </ul>

            {currentSlide === 0 && (
              <div
                className="absolute bottom-8 right-12 text-sm font-medium opacity-80"
                style={{ color: currentTheme.text, fontFamily: font }}
              >
                Created for {userName}
              </div>
            )}
          </div>
        );

      case "columns": {
        const items = (isEditing ? editedItems : content.items) as
          | Array<{ text: string; subtext?: string }>
          | undefined;
        const isDark = theme === "dark";
        return (
          <div className="flex flex-col h-full px-12 py-10">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-semibold mb-8 bg-transparent border border-sky-500/60 rounded-lg px-4 py-2 outline-none"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2
                className="text-5xl font-semibold mb-8"
                style={{ color: currentTheme.primary, fontFamily: font }}
              >
                {content.heading}
              </h2>
            )}
            <div className="grid grid-cols-2 gap-8 flex-1">
              {items?.map((item, idx: number) => {
                const bgColor = isDark ? "#020617" : "#020617";
                const textColor = "#E5E7EB";
                const headingColor = currentTheme.primary;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-xl border"
                    style={{
                      backgroundColor: bgColor,
                      borderColor: currentTheme.primary,
                    }}
                  >
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[idx] = {
                              ...newItems[idx],
                              text: e.target.value,
                            };
                            setEditedItems(newItems);
                          }}
                          className="w-full text-2xl font-semibold mb-3 border border-sky-500/60 px-3 py-1.5 rounded-md bg-slate-900/40 outline-none"
                          style={{ color: headingColor, fontFamily: font }}
                        />
                        {item.subtext !== undefined && (
                          <textarea
                            value={item.subtext || ""}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = {
                                ...newItems[idx],
                                subtext: e.target.value,
                              };
                              setEditedItems(newItems);
                            }}
                            className="w-full text-sm border border-slate-600/70 px-3 py-2 rounded-md bg-slate-900/40 outline-none resize-none"
                            style={{ color: textColor, fontFamily: font }}
                            rows={4}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <h3
                          className="text-2xl font-semibold mb-3"
                          style={{ color: headingColor, fontFamily: font }}
                        >
                          {item.text}
                        </h3>
                        {item.subtext && (
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: textColor, fontFamily: font }}
                          >
                            {item.subtext}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case "timeline": {
        const items = (isEditing ? editedItems : content.items) as
          | Array<{ text: string; subtext?: string }>
          | undefined;
        return (
          <div className="flex flex-col h-full px-12 py-10">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-semibold mb-12 bg-transparent border border-sky-500/60 rounded-lg px-4 py-2 outline-none"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2
                className="text-5xl font-semibold mb-12"
                style={{ color: currentTheme.primary, fontFamily: font }}
              >
                {content.heading}
              </h2>
            )}

            <div className="relative flex items-center justify-between flex-1">
              <div
                className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full"
                style={{ backgroundColor: currentTheme.secondary }}
              />
              {items?.map((item, idx: number) => (
                <div
                  key={idx}
                  className="relative z-10 flex flex-col items-center flex-1"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-semibold mb-4 shadow-lg"
                    style={{
                      backgroundColor: currentTheme.primary,
                      color: "#FFFFFF",
                      fontFamily: font,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div className="text-center">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[idx] = {
                              ...newItems[idx],
                              text: e.target.value,
                            };
                            setEditedItems(newItems);
                          }}
                          className="text-lg font-semibold mb-1 border border-sky-500/60 px-3 py-1 rounded-md bg-slate-900/40 outline-none"
                          style={{ color: currentTheme.text, fontFamily: font }}
                        />
                        {item.subtext !== undefined && (
                          <input
                            type="text"
                            value={item.subtext || ""}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = {
                                ...newItems[idx],
                                subtext: e.target.value,
                              };
                              setEditedItems(newItems);
                            }}
                            className="text-xs opacity-80 border border-slate-600/70 px-3 py-1 rounded-md bg-slate-900/40 outline-none"
                            style={{ color: currentTheme.text, fontFamily: font }}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <p
                          className="text-lg font-semibold mb-1"
                          style={{ color: currentTheme.text, fontFamily: font }}
                        >
                          {item.text}
                        </p>
                        {item.subtext && (
                          <p
                            className="text-xs opacity-80"
                            style={{ color: currentTheme.text, fontFamily: font }}
                          >
                            {item.subtext}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "boxes": {
        const items = (isEditing ? editedItems : content.items) as
          | Array<{ text: string; subtext?: string }>
          | undefined;
        return (
          <div className="flex flex-col h-full px-12 py-10">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-semibold mb-10 text-center bg-transparent border border-sky-500/60 rounded-lg px-4 py-2 outline-none"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2
                className="text-5xl font-semibold mb-10 text-center"
                style={{ color: currentTheme.primary, fontFamily: font }}
              >
                {content.heading}
              </h2>
            )}
            <div className="grid grid-cols-3 gap-6 flex-1">
              {items?.map((item, idx: number) => {
                const bgColor = "#020617";
                const textColor = "#E5E7EB";
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-center p-6 rounded-xl border shadow-lg"
                    style={{
                      backgroundColor: bgColor,
                      borderColor: currentTheme.primary,
                      color: textColor,
                    }}
                  >
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[idx] = {
                              ...newItems[idx],
                              text: e.target.value,
                            };
                            setEditedItems(newItems);
                          }}
                          className="text-2xl font-semibold mb-2 text-center border border-sky-500/60 px-3 py-1 rounded-md bg-slate-900/40 outline-none"
                        />
                        {item.subtext !== undefined && (
                          <input
                            type="text"
                            value={item.subtext || ""}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = {
                                ...newItems[idx],
                                subtext: e.target.value,
                              };
                              setEditedItems(newItems);
                            }}
                            className="text-sm text-center border border-slate-600/70 px-3 py-1 rounded-md bg-slate-900/40 outline-none"
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <h3 className="text-2xl font-semibold mb-2">
                          {item.text}
                        </h3>
                        {item.subtext && (
                          <p className="text-sm text-center">{item.subtext}</p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case "arrows": {
        const items = (isEditing ? editedItems : content.items) as
          | Array<{ text: string; subtext?: string }>
          | undefined;
        return (
          <div className="flex flex-col h-full px-12 py-10">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-semibold mb-8 bg-transparent border border-sky-500/60 rounded-lg px-4 py-2 outline-none"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2
                className="text-5xl font-semibold mb-8"
                style={{ color: currentTheme.primary, fontFamily: font }}
              >
                {content.heading}
              </h2>
            )}

            <div className="flex items-center justify-between flex-1 gap-4">
              {items?.map((item, idx: number) => (
                <div key={idx} className="flex items-center flex-1">
                  <div
                    className="flex-1 p-6 rounded-lg shadow-md"
                    style={{
                      backgroundColor: currentTheme.secondary,
                      color: getTextColorForBg(currentTheme.secondary),
                      fontFamily: font,
                    }}
                  >
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[idx] = {
                              ...newItems[idx],
                              text: e.target.value,
                            };
                            setEditedItems(newItems);
                          }}
                          className="w-full text-lg font-semibold mb-2 border border-sky-500/60 px-3 py-1 rounded-md bg-slate-900/30 outline-none"
                        />
                        {item.subtext !== undefined && (
                          <input
                            type="text"
                            value={item.subtext || ""}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = {
                                ...newItems[idx],
                                subtext: e.target.value,
                              };
                              setEditedItems(newItems);
                            }}
                            className="w-full text-sm border border-slate-700 px-3 py-1 rounded-md bg-slate-900/30 outline-none"
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold mb-1">
                          {item.text}
                        </h3>
                        {item.subtext && (
                          <p className="text-sm opacity-90">{item.subtext}</p>
                        )}
                      </>
                    )}
                  </div>
                  {idx < items.length - 1 && (
                    <div
                      className="text-4xl mx-3"
                      style={{ color: currentTheme.primary, fontFamily: font }}
                    >
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "compare": {
        const items = (isEditing ? editedItems : content.items) as
          | Array<{ text: string; subtext?: string }>
          | undefined;
        return (
          <div className="flex flex-col h-full px-12 py-10">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-semibold mb-10 text-center bg-transparent border border-sky-500/60 rounded-lg px-4 py-2 outline-none"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2
                className="text-5xl font-semibold mb-10 text-center"
                style={{ color: currentTheme.primary, fontFamily: font }}
              >
                {content.heading}
              </h2>
            )}

            <div className="grid grid-cols-2 gap-10 flex-1">
              {items?.map((item, idx: number) => {
                const bgColor =
                  theme === "dark"
                    ? idx === 0
                      ? "#020617"
                      : "#111827"
                    : idx === 0
                    ? `${currentTheme.primary}30`
                    : `${currentTheme.secondary}30`;
                const headingColor =
                  theme === "dark"
                    ? "#E5E7EB"
                    : idx === 0
                    ? currentTheme.primary
                    : currentTheme.secondary;
                const textColor =
                  theme === "dark" ? "#E5E7EB" : currentTheme.text;
                return (
                  <div
                    key={idx}
                    className="p-8 rounded-xl border shadow-lg"
                    style={{
                      backgroundColor: bgColor,
                      borderColor:
                        idx === 0 ? currentTheme.primary : currentTheme.secondary,
                    }}
                  >
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[idx] = {
                              ...newItems[idx],
                              text: e.target.value,
                            };
                            setEditedItems(newItems);
                          }}
                          className="w-full text-2xl font-semibold mb-4 border border-sky-500/60 px-3 py-1.5 rounded-md bg-slate-900/40 outline-none"
                          style={{ color: headingColor, fontFamily: font }}
                        />
                        {item.subtext !== undefined && (
                          <textarea
                            value={item.subtext || ""}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = {
                                ...newItems[idx],
                                subtext: e.target.value,
                              };
                              setEditedItems(newItems);
                            }}
                            className="w-full text-sm border border-slate-700 px-3 py-2 rounded-md bg-slate-900/40 outline-none resize-none"
                            style={{ color: textColor, fontFamily: font }}
                            rows={4}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <h3
                          className="text-2xl font-semibold mb-4"
                          style={{ color: headingColor, fontFamily: font }}
                        >
                          {item.text}
                        </h3>
                        {item.subtext && (
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: textColor, fontFamily: font }}
                          >
                            {item.subtext}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case "pyramid": {
        const items = (isEditing ? editedItems : content.items) as
          | Array<{ text: string; subtext?: string }>
          | undefined;
        return (
          <div className="flex flex-col h-full px-12 py-10">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-semibold mb-8 bg-transparent border border-sky-500/60 rounded-lg px-4 py-2 outline-none"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2
                className="text-5xl font-semibold mb-8"
                style={{ color: currentTheme.primary, fontFamily: font }}
              >
                {content.heading}
              </h2>
            )}

            <div className="flex flex-col items-center justify-center flex-1 gap-4">
              {items?.map((item, idx: number) => {
                const width = 100 - idx * 22;
                return (
                  <div
                    key={idx}
                    className="py-4 px-6 rounded-lg shadow-lg"
                    style={{
                      width: `${width}%`,
                      backgroundColor: currentTheme.primary,
                      color: "#FFFFFF",
                      opacity: 1 - idx * 0.1,
                    }}
                  >
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[idx] = {
                              ...newItems[idx],
                              text: e.target.value,
                            };
                            setEditedItems(newItems);
                          }}
                          className="w-full text-lg font-semibold mb-1 text-center border border-sky-500/60 px-3 py-1 rounded-md bg-white/10 outline-none"
                        />
                        {item.subtext !== undefined && (
                          <input
                            type="text"
                            value={item.subtext || ""}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = {
                                ...newItems[idx],
                                subtext: e.target.value,
                              };
                              setEditedItems(newItems);
                            }}
                            className="w-full text-xs text-center border border-sky-500/40 px-3 py-1 rounded-md bg-white/10 outline-none"
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-center">
                          {item.text}
                        </h3>
                        {item.subtext && (
                          <p className="text-xs text-center mt-1">
                            {item.subtext}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case "icons": {
        const items = (isEditing ? editedItems : content.items) as
          | Array<{ text: string; subtext?: string }>
          | undefined;
        return (
          <div className="flex flex-col h-full px-12 py-10">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-semibold mb-10 text-center bg-transparent border border-sky-500/60 rounded-lg px-4 py-2 outline-none"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2
                className="text-5xl font-semibold mb-10 text-center"
                style={{ color: currentTheme.primary, fontFamily: font }}
              >
                {content.heading}
              </h2>
            )}
            <div className="grid grid-cols-3 gap-8 flex-1">
              {items?.map((item, idx: number) => (
                <div
                  key={idx}
                  className="flex flex-col items-center text-center gap-2"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-3 shadow-lg"
                    style={{
                      backgroundColor: currentTheme.secondary,
                      color: getTextColorForBg(currentTheme.secondary),
                      fontFamily: font,
                    }}
                  >
                    {idx + 1}
                  </div>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => {
                          const newItems = [...editedItems];
                          newItems[idx] = {
                            ...newItems[idx],
                            text: e.target.value,
                          };
                          setEditedItems(newItems);
                        }}
                        className="text-lg font-semibold border border-sky-500/60 px-3 py-1 rounded-md bg-slate-900/40 outline-none"
                        style={{ color: currentTheme.primary, fontFamily: font }}
                      />
                      {item.subtext !== undefined && (
                        <input
                          type="text"
                          value={item.subtext || ""}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[idx] = {
                              ...newItems[idx],
                              subtext: e.target.value,
                            };
                            setEditedItems(newItems);
                          }}
                          className="w-full text-xs border border-slate-700 px-3 py-1 rounded-md bg-slate-900/40 outline-none"
                          style={{ color: currentTheme.text, fontFamily: font }}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <h3
                        className="text-lg font-semibold"
                        style={{ color: currentTheme.primary, fontFamily: font }}
                      >
                        {item.text}
                      </h3>
                      {item.subtext && (
                        <p
                          className="text-xs"
                          style={{ color: currentTheme.text, fontFamily: font }}
                        >
                          {item.subtext}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "cycle": {
        const items = (isEditing ? editedItems : content.items) as
          | Array<{ text: string; subtext?: string }>
          | undefined;
        return (
          <div className="flex flex-col h-full px-12 py-10">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-semibold mb-8 text-center bg-transparent border border-sky-500/60 rounded-lg px-4 py-2 outline-none"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2
                className="text-5xl font-semibold mb-8 text-center"
                style={{ color: currentTheme.primary, fontFamily: font }}
              >
                {content.heading}
              </h2>
            )}

            <div className="flex items-center justify-center flex-1 gap-6">
              {items?.map((item, idx: number) => {
                const textColor = getTextColorForBg(currentTheme.secondary);
                return (
                  <div key={idx} className="flex-1 max-w-xs">
                    <div
                      className="p-6 rounded-xl text-center shadow-lg"
                      style={{
                        backgroundColor: currentTheme.secondary,
                        color: textColor,
                        border: `2px solid ${currentTheme.primary}`,
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center text-sm font-semibold"
                        style={{
                          backgroundColor: currentTheme.primary,
                          color: getTextColorForBg(currentTheme.primary),
                          fontFamily: font,
                        }}
                      >
                        {idx + 1}
                      </div>
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = {
                                ...newItems[idx],
                                text: e.target.value,
                              };
                              setEditedItems(newItems);
                            }}
                            className="w-full text-sm font-semibold mb-2 border border-sky-500/60 px-3 py-1 rounded-md bg-slate-900/30 outline-none"
                            style={{ color: textColor, fontFamily: font }}
                          />
                          {item.subtext !== undefined && (
                            <textarea
                              value={item.subtext || ""}
                              onChange={(e) => {
                                const newItems = [...editedItems];
                                newItems[idx] = {
                                  ...newItems[idx],
                                  subtext: e.target.value,
                                };
                                setEditedItems(newItems);
                              }}
                              className="w-full text-xs border border-slate-700 px-3 py-1 rounded-md bg-slate-900/30 outline-none resize-none"
                              style={{ color: textColor, fontFamily: font }}
                              rows={3}
                            />
                          )}
                        </>
                      ) : (
                        <>
                          <h3
                            className="text-sm font-semibold mb-1"
                            style={{ color: textColor, fontFamily: font }}
                          >
                            {item.text}
                          </h3>
                          {item.subtext && (
                            <p
                              className="text-xs leading-relaxed"
                              style={{ color: textColor, fontFamily: font }}
                            >
                              {item.subtext}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case "staircase": {
        const items = (isEditing ? editedItems : content.items) as
          | Array<{ text: string; subtext?: string }>
          | undefined;
        return (
          <div className="flex flex-col h-full px-12 py-10">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-semibold mb-8 bg-transparent border border-sky-500/60 rounded-lg px-4 py-2 outline-none"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2
                className="text-5xl font-semibold mb-8"
                style={{ color: currentTheme.primary, fontFamily: font }}
              >
                {content.heading}
              </h2>
            )}
            <div className="flex items-end justify-between flex-1 gap-4">
              {items?.map((item, idx: number) => {
                const height = ((idx + 1) / items.length) * 100;
                return (
                  <div
                    key={idx}
                    className="flex-1 p-4 rounded-t-lg flex flex-col justify-end shadow-lg"
                    style={{
                      height: `${height}%`,
                      backgroundColor: currentTheme.primary,
                      color: "#FFFFFF",
                      opacity: 0.7 + (idx * 0.3) / items.length,
                    }}
                  >
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[idx] = {
                              ...newItems[idx],
                              text: e.target.value,
                            };
                            setEditedItems(newItems);
                          }}
                          className="text-sm font-semibold mb-1 border border-sky-500/60 px-3 py-1 rounded-md bg-white/10 outline-none"
                        />
                        {item.subtext !== undefined && (
                          <input
                            type="text"
                            value={item.subtext || ""}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = {
                                ...newItems[idx],
                                subtext: e.target.value,
                              };
                              setEditedItems(newItems);
                            }}
                            className="text-xs border border-sky-500/40 px-3 py-1 rounded-md bg-white/10 outline-none"
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <h3 className="text-sm font-semibold mb-1">
                          {item.text}
                        </h3>
                        {item.subtext && (
                          <p className="text-xs">{item.subtext}</p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div
        className={`relative flex-1 rounded-2xl border border-slate-700/60 shadow-[0_0_40px_rgba(56,189,248,0.35)] overflow-hidden ${currentTheme.bg}`}
        style={{ aspectRatio: "16/9", fontFamily: font }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/10 via-transparent to-indigo-500/10 pointer-events-none" />
        <div className="relative z-10 h-full w-full">{renderLayout()}</div>

        {isEditing && (
          <div className="absolute top-4 right-4 flex gap-2 z-20">
            <button
              onClick={saveEdits}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500/90 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-400 transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={cancelEdits}
              className="inline-flex items-center justify-center rounded-lg bg-rose-500/90 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-rose-500/40 hover:bg-rose-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {!isEditing && onEditToggle && (
          <button
            onClick={startEditing}
            className="absolute top-4 right-4 inline-flex items-center justify-center rounded-lg bg-sky-500/90 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-sky-500/40 hover:bg-sky-400 transition-colors z-20"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}

        <div className="absolute bottom-4 right-4 z-20">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-slate-100 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
            Slide {currentSlide + 1} / {slides.length}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => onSlideChange(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-medium text-slate-100 shadow-md shadow-black/40 backdrop-blur disabled:opacity-40 disabled:cursor-not-allowed hover:border-sky-500 hover:text-sky-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex gap-2 overflow-x-auto max-w-md py-1 px-1">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => onSlideChange(idx)}
              className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold transition-colors ${
                idx === currentSlide
                  ? "bg-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.9)]"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() =>
            onSlideChange(Math.min(slides.length - 1, currentSlide + 1))
          }
          disabled={currentSlide === slides.length - 1}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-medium text-slate-100 shadow-md shadow-black/40 backdrop-blur disabled:opacity-40 disabled:cursor-not-allowed hover:border-sky-500 hover:text-sky-200 transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

