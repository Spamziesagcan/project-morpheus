"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Info,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  Send,
  Volume2,
} from "lucide-react";

import ChatMessageComponent from "@/components/ChatMessage";
import ConversationsSidebar from "@/components/ConversationsSidebar";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { API_ENDPOINTS } from "@/lib/config";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  references?: Array<{
    id: number;
    title: string;
    url: string;
    snippet: string;
    score: number;
  }>;
}

export default function CareerCounsellorPage() {
  const [userId, setUserId] = useState<string>("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(API_ENDPOINTS.AUTH.ME, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setUserId(data._id || data.id || data.user_id);
        }
      } catch (error) {
        console.error("Failed to fetch user ID:", error);
      }
    };

    fetchUserId();
  }, []);

  useEffect(() => {
    // Scroll to bottom only when new messages are added during streaming
    if (isStreaming) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  // Scroll to top when conversation changes
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0;
    }
  }, [currentConversationId]);

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(
        API_ENDPOINTS.CAREER.CONVERSATION_DETAIL(userId, conversationId),
      );
      if (response.ok) {
        const data = await response.json();
        setCurrentConversationId(conversationId);
        setMessages(data.messages || []);
        // Scroll to top when loading conversation
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = 0;
          }
        }, 100);
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setAttachments([]);
    // Scroll to top when starting new chat
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = 0;
      }
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !userId) return;

    const userMessage = inputMessage;
    setInputMessage("");
    setIsLoading(true);
    setIsStreaming(true);

    const newUserMessage: Message = {
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      const response = await fetch(API_ENDPOINTS.CAREER.CHAT_STREAM, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: currentConversationId,
          user_id: userId,
          message: userMessage,
          attachments: [],
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to send message");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedContent = "";
      let streamedReferences: Array<{
        id: number;
        title: string;
        url: string;
        snippet: string;
        score: number;
      }> = [];
      let newConversationId = currentConversationId;

      const aiMessageIndex = messages.length + 1;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
          references: [],
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "conversation_id") {
              newConversationId = data.conversation_id;
              setCurrentConversationId(newConversationId);
            } else if (data.type === "text") {
              streamedContent += data.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[aiMessageIndex] = {
                  ...updated[aiMessageIndex],
                  content: streamedContent,
                };
                return updated;
              });
            } else if (data.type === "references") {
              streamedReferences = data.references;
              setMessages((prev) => {
                const updated = [...prev];
                updated[aiMessageIndex] = {
                  ...updated[aiMessageIndex],
                  references: streamedReferences,
                };
                return updated;
              });
            } else if (data.type === "done") {
              setIsStreaming(false);
            } else if (data.type === "error") {
              console.error("Stream error:", data.message);
            }
          } catch {
            // Ignore partial JSON chunks
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // STT: record audio and send to backend for transcription
  const startRecording = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia || isLoading || isTranscribing) return;
    chunksRef.current = [];
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size) chunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          if (chunksRef.current.length === 0) {
            setIsRecording(false);
            return;
          }
          setIsTranscribing(true);
          try {
            const blob = new Blob(chunksRef.current, { type: "audio/webm" });
            const formData = new FormData();
            formData.append("audio", blob, "recording.webm");
            const res = await fetch(API_ENDPOINTS.CAREER.SPEECH_TO_TEXT, {
              method: "POST",
              body: formData,
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              const detail = (err as { detail?: string }).detail || "Transcription failed";
              throw new Error(detail);
            }
            const data = (await res.json()) as { text?: string };
            const text = (data.text || "").trim();
            if (text) setInputMessage((prev) => (prev ? `${prev} ${text}` : text));
          } catch (err) {
            const message = err instanceof Error ? err.message : "Could not transcribe.";
            console.error("STT error:", message);
            setInputMessage((prev) => (prev ? prev : message));
          } finally {
            setIsTranscribing(false);
          }
        };
        recorder.start();
        setIsRecording(true);
      })
      .catch(() => {
        setIsRecording(false);
      });
  }, [isLoading, isTranscribing]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // TTS: speak the last assistant message using browser SpeechSynthesis
  const speakLastResponse = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    const text = lastAssistant?.content?.trim();
    if (!text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    speechSynthRef.current = u;
    u.onstart = () => setTtsSpeaking(true);
    u.onend = u.onerror = () => setTtsSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [messages]);

  const stopTts = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    setTtsSpeaking(false);
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border-2 border-border bg-card/80 shadow-[0_0_40px_rgba(15,23,42,0.35)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/80 bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 font-mono tracking-[0.08em] uppercase">
                AI Career Counsellor
                <span className="text-xs bg-sky-500/10 text-sky-500 px-2 py-1 rounded-full font-normal">
                  Beta
                </span>
              </h1>
              <p className="text-sm text-foreground/60 mt-1">
                Get personalised career guidance powered by AI and real-time market
                intelligence.
              </p>
            </div>
            <button className="p-2 hover:bg-background rounded-lg transition-colors">
              <Info className="w-5 h-5 text-foreground/60" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-full bg-sky-500/10 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(56,189,248,0.8)]">
                <Send className="w-8 h-8 text-sky-500" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2 font-mono tracking-[0.08em] uppercase">
                How can I help you today?
              </h2>
              <p className="text-foreground/60 max-w-md mb-6">
                I can help you explore career paths, understand market trends, assess
                your skills, and plan your professional journey.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
                {[
                  "Suggest a career path for me",
                  "What skills are in demand right now?",
                  "How do I transition to tech?",
                  "Analyze my career prospects",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInputMessage(prompt)}
                    className="px-4 py-3 bg-background border-2 border-border rounded-lg text-sm text-left hover:border-sky-500/60 hover:bg-background/80 transition-all shadow-sm hover:shadow-[0_0_18px_rgba(56,189,248,0.45)] font-mono tracking-[0.05em]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <ChatMessageComponent
                key={idx}
                {...msg}
                isStreaming={
                  idx === messages.length - 1 &&
                  msg.role === "assistant" &&
                  isStreaming
                }
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-4 py-3 border-t border-border/80 bg-card/70 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            {attachments.length > 0 && (
              <div className="mb-2 flex gap-2">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 bg-sky-500/10 rounded-lg text-xs"
                  >
                    <span>{file.name}</span>
                    <button
                      onClick={() => setAttachments([])}
                      className="text-foreground/60"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your career..."
                  disabled={isLoading}
                  rows={1}
                  className="w-full px-4 py-3 pr-24 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/60 resize-none disabled:opacity-50"
                  style={{ minHeight: "48px", maxHeight: "120px" }}
                />
                <div className="absolute right-2 bottom-2 flex gap-1">
                  <button
                    type="button"
                    onClick={ttsSpeaking ? stopTts : speakLastResponse}
                    disabled={isLoading || !messages.some((m) => m.role === "assistant")}
                    title={ttsSpeaking ? "Stop speaking" : "Read last response aloud (TTS)"}
                    className="p-2 rounded-lg transition-colors disabled:opacity-50 hover:bg-background"
                  >
                    <Volume2
                      className={`w-4 h-4 ${ttsSpeaking ? "text-sky-500" : "text-foreground/60"}`}
                    />
                  </button>
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={isLoading || isTranscribing}
                      title="Voice input (Speech-to-Text)"
                      className="p-2 rounded-lg transition-colors disabled:opacity-50 hover:bg-background"
                    >
                      {isTranscribing ? (
                        <Loader2 className="w-4 h-4 text-foreground/60 animate-spin" />
                      ) : (
                        <Mic className="w-4 h-4 text-foreground/60" />
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      title="Stop recording"
                      className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30"
                    >
                      <MicOff className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    disabled={isLoading}
                    className="p-2 rounded-lg transition-colors disabled:opacity-50 hover:bg-background"
                  >
                    <Paperclip className="w-4 h-4 text-foreground/60" />
                  </button>
                  <button
                    disabled={isLoading}
                    className="p-2 rounded-lg transition-colors disabled:opacity-50 hover:bg-background"
                  >
                    <ImageIcon className="w-4 h-4 text-foreground/60" />
                  </button>
                </div>
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-xs font-bold text-white shadow-[0_0_28px_rgba(56,189,248,0.8)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 font-mono tracking-[0.12em] uppercase"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Ask
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-foreground/40 mt-2 text-center">
              AI responses may contain inaccuracies. Always verify important career
              decisions.
            </p>
          </div>
        </div>
      </div>

      {/* Conversations Sidebar */}
      <ConversationsSidebar
        userId={userId}
        currentConversationId={currentConversationId || undefined}
        onNewChat={handleNewChat}
        onSelectConversation={loadConversation}
        onDeleteConversation={(id) => {
          if (id === currentConversationId) {
            handleNewChat();
          }
        }}
      />

      {/* WhatsApp FAB - only on career counselling page */}
      <WhatsAppFab />
    </div>
  );
}

