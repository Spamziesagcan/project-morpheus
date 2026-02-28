"use client";
import { useState, Suspense, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/config";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Lightbulb,
  FileText,
  Link as LinkIcon,
  Upload,
  Loader2,
  CheckCircle,
  Brain,
  Workflow as WorkflowIcon,
  MessageCircle,
  X,
  Send,
  ArrowRight,
  ClipboardList,
  Layers,
  Image as ImageIcon,
  BookOpen,
  ChevronDown,
  ChevronUp,
  History,
  Save,
  CheckCircle2,
} from "lucide-react";

interface Section {
  heading: string;
  content: string;
  key_points: string[];
  examples: string[];
}

interface Concept {
  term: string;
  definition: string;
  analogy: string;
}

interface Workflow {
  title: string;
  steps: string[];
}

interface Diagram {
  type: string;
  description: string;
  mermaid_code: string;
}

interface ImageSuggestion {
  query: string;
  context: string;
}

interface Reference {
  title: string;
  description: string;
  suggested_search: string;
}

interface ExplanationData {
  title: string;
  summary: string;
  sections: Section[];
  concepts: Concept[];
  workflows: Workflow[];
  diagrams: Diagram[];
  image_suggestions: ImageSuggestion[];
  references: Reference[];
  quiz_topics: string[];
  flashcard_concepts: string[];
  original_content: string;
  content_source: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type InputMode = "text" | "pdf" | "url";

// Node color palette
const NODE_COLORS = [
  { bg: "#fef08a", border: "#facc15", text: "#713f12" }, // yellow
  { bg: "#86efac", border: "#4ade80", text: "#14532d" }, // green
  { bg: "#93c5fd", border: "#3b82f6", text: "#1e3a8a" }, // blue
  { bg: "#fda4af", border: "#f43f5e", text: "#881337" }, // rose
  { bg: "#c4b5fd", border: "#8b5cf6", text: "#4c1d95" }, // purple
  { bg: "#fed7aa", border: "#fb923c", text: "#7c2d12" }, // orange
  { bg: "#a5f3fc", border: "#06b6d4", text: "#164e63" }, // cyan
  { bg: "#fbbf24", border: "#f59e0b", text: "#78350f" }, // amber
];

// Parse Mermaid code to React Flow format
const parseMermaidToFlow = (
  mermaidCode: string,
): { nodes: Node[]; edges: Edge[] } => {
  if (!mermaidCode || typeof mermaidCode !== "string") {
    return { nodes: [], edges: [] };
  }

  // Clean and normalize the mermaid code
  let cleanedCode = mermaidCode.trim();
  // Remove flowchart declaration
  cleanedCode = cleanedCode.replace(/^flowchart\s+[A-Z]+\s+/i, "");
  // Split by semicolons first (for single-line formats), then by newlines
  const statements = cleanedCode
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const nodeMap = new Map<string, { label: string; isDiamond: boolean }>();
  const nodeOrder: string[] = [];
  const edgeList: { source: string; target: string; label?: string }[] = [];

  // Parse nodes and edges from each statement
  statements.forEach((statement) => {
    const trimmedLine = statement.trim();
    if (!trimmedLine) return;

    // Match diamond nodes: A{{text}} or A{text}
    const diamondMatches = [
      ...trimmedLine.matchAll(/([A-Z]+)\{\{([^}]+)\}\}/g),
      ...trimmedLine.matchAll(/([A-Z]+)\{([^}]+)\}/g),
    ];
    diamondMatches.forEach((match) => {
      const id = match[1];
      const label = match[2].trim();
      if (!nodeMap.has(id)) {
        nodeMap.set(id, { label, isDiamond: true });
        nodeOrder.push(id);
      }
    });

    // Match square bracket nodes: A[text]
    const squareMatches = [...trimmedLine.matchAll(/([A-Z]+)\[([^\]]+)\]/g)];
    squareMatches.forEach((match) => {
      const id = match[1];
      const label = match[2].trim();
      if (!nodeMap.has(id)) {
        nodeMap.set(id, { label, isDiamond: false });
        nodeOrder.push(id);
      }
    });

    // Parse connections with labels: A -->|label| B or A -- label --> B
    let connectionMatch = trimmedLine.match(
      /([A-Z]+)[\[{]+\s*[^\]{}]+\s*[\]}]+\s*-->\s*\|([^\|]+)\|\s*([A-Z]+)[\[{]+/,
    );
    if (connectionMatch) {
      edgeList.push({
        source: connectionMatch[1].trim(),
        target: connectionMatch[3].trim(),
        label: connectionMatch[2].trim(),
      });
      return;
    }

    // Parse connections with labels: A -- label --> B
    connectionMatch = trimmedLine.match(
      /([A-Z]+)[\[{]+\s*[^\]{}]+\s*[\]}]+\s*--\s+([^-]+)\s+-->\s*([A-Z]+)[\[{]+/,
    );
    if (connectionMatch) {
      edgeList.push({
        source: connectionMatch[1].trim(),
        target: connectionMatch[3].trim(),
        label: connectionMatch[2].trim(),
      });
      return;
    }

    // Parse simple connections: A[text] --> B[text]
    connectionMatch = trimmedLine.match(
      /([A-Z]+)[\[{]+\s*[^\]{}]+\s*[\]}]+\s*-->\s*([A-Z]+)[\[{]+/,
    );
    if (connectionMatch) {
      edgeList.push({
        source: connectionMatch[1].trim(),
        target: connectionMatch[2].trim(),
      });
      return;
    }

    // Parse connections without brackets: A --> B
    connectionMatch = trimmedLine.match(/([A-Z]+)\s*-->\s*([A-Z]+)/);
    if (connectionMatch) {
      edgeList.push({
        source: connectionMatch[1].trim(),
        target: connectionMatch[2].trim(),
      });
    }
  });

  // Fallback: create sequential connections
  if (edgeList.length === 0 && nodeOrder.length > 1) {
    for (let i = 0; i < nodeOrder.length - 1; i++) {
      edgeList.push({
        source: nodeOrder[i],
        target: nodeOrder[i + 1],
      });
    }
  }

  // Convert to React Flow nodes
  const flowNodes: Node[] = [];
  let colorIndex = 0;
  let yPosition = 0;

  nodeMap.forEach((data, id) => {
    const color = NODE_COLORS[colorIndex % NODE_COLORS.length];
    colorIndex++;

    if (data.isDiamond) {
      flowNodes.push({
        id,
        type: "default",
        data: {
          label: (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "20px",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {data.label}
            </div>
          ),
        },
        position: { x: 250, y: yPosition },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        style: {
          background: color.bg,
          border: `4px solid ${color.border}`,
          borderRadius: "0",
          padding: "0",
          fontWeight: "bold",
          color: color.text,
          fontSize: "13px",
          boxShadow: "6px 6px 0px 0px rgba(0,0,0,0.9)",
          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
          width: 150,
          height: 150,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      });
      yPosition += 200;
    } else {
      flowNodes.push({
        id,
        type: "default",
        data: { label: data.label },
        position: { x: 200, y: yPosition },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        style: {
          background: color.bg,
          border: `4px solid ${color.border}`,
          borderRadius: "8px",
          padding: "16px 20px",
          fontWeight: "bold",
          color: color.text,
          fontSize: "14px",
          boxShadow: "6px 6px 0px 0px rgba(0,0,0,0.9)",
          minWidth: 200,
          textAlign: "center",
          whiteSpace: "normal",
          wordWrap: "break-word",
        },
      });
      yPosition += 150;
    }
  });

  // Convert to React Flow edges
  const flowEdges: Edge[] = edgeList.map((edge, idx) => ({
    id: `e${idx}`,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: "smoothstep",
    animated: true,
    style: {
      stroke: "#000",
      strokeWidth: 3,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#000",
      width: 20,
      height: 20,
    },
    labelStyle: {
      fill: "#000",
      fontWeight: "bold",
      fontSize: 12,
    },
    labelBgStyle: {
      fill: "#fff",
      stroke: "#000",
      strokeWidth: 2,
      fillOpacity: 1,
    },
    labelBgPadding: [6, 3] as [number, number],
    labelBgBorderRadius: 3,
  }));

  return { nodes: flowNodes, edges: flowEdges };
};

// Component to render a single diagram with ReactFlow
function DiagramRenderer({ 
  diagram, 
  nodes, 
  edges 
}: { 
  diagram: Diagram; 
  nodes: Node[]; 
  edges: Edge[] 
}) {
  const [flowNodes, setNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  // Update nodes and edges when props change
  useEffect(() => {
    setNodes(nodes);
    setEdges(edges);
  }, [nodes, edges, setNodes, setEdges]);

  if (nodes.length === 0) {
    return (
      <div className="rounded-lg border-2 border-border bg-accent/50 p-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="rounded bg-primary px-3 py-1 text-xs font-semibold uppercase text-primary-foreground">
            {diagram.type}
          </span>
          <h3 className="font-semibold">{diagram.description}</h3>
        </div>
        <div className="rounded-lg border-2 border-border bg-card p-4">
          <pre className="whitespace-pre-wrap font-mono text-sm">
            {diagram.mermaid_code}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border-2 border-border bg-accent/50">
      <div className="flex items-center gap-3 border-b border-border bg-card p-4">
        <span className="rounded bg-primary px-3 py-1 text-xs font-semibold uppercase text-primary-foreground">
          {diagram.type}
        </span>
        <h3 className="font-semibold">{diagram.description}</h3>
      </div>
      <div style={{ height: "500px", width: "100%" }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          attributionPosition="bottom-left"
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background color="#888" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const style = node.style as any;
              return style?.background || "#fff";
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

function ExplainerPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const videoTranscript = searchParams?.get("transcript");

  const [step, setStep] = useState<"input" | "settings" | "loading" | "result" | "history">(
    videoTranscript ? "settings" : "input",
  );

  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [textInput, setTextInput] = useState(videoTranscript || "");
  const [urlInput, setUrlInput] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [isInputReady, setIsInputReady] = useState(false);

  // Initialize word count and input ready state on mount
  useEffect(() => {
    if (textInput) {
      const words = textInput.trim().split(/\s+/).filter((w) => w.length > 0);
      setWordCount(words.length);
      setIsInputReady(words.length > 0);
    } else if (urlInput) {
      setIsInputReady(urlInput.trim().length > 0 && urlInput.includes("http"));
    } else if (pdfFile) {
      setIsInputReady(true);
    }
  }, []); // Run once on mount

  const [complexity, setComplexity] = useState("medium");

  const [explanation, setExplanation] = useState<ExplanationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set([0]),
  );

  // History and save states
  const [pastExplanations, setPastExplanations] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setIsInputReady(true);
    } else {
      alert("Please select a valid PDF file");
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setTextInput(value);
    const words = value.trim().split(/\s+/).filter((w) => w.length > 0);
    setWordCount(words.length);
    setIsInputReady(words.length > 0);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrlInput(value);
    setIsInputReady(value.trim().length > 0 && value.includes("http"));
  };

  const handleExampleClick = (example: string) => {
    setTextInput(example);
    const words = example.trim().split(/\s+/).filter((w) => w.length > 0);
    setWordCount(words.length);
    setIsInputReady(true);
    setInputMode("text");
  };

  const getNextButtonLabel = () => {
    if (inputMode === "text") return "Explain this text →";
    if (inputMode === "url") return "Fetch & Explain →";
    if (inputMode === "pdf") return "Analyse PDF →";
    return "Next →";
  };

  const handleNextToSettings = () => {
    if (inputMode === "text" && !textInput.trim()) {
      alert("Please enter some text");
      return;
    }
    if (inputMode === "url" && !urlInput.trim()) {
      alert("Please enter a URL");
      return;
    }
    if (inputMode === "pdf" && !pdfFile) {
      alert("Please select a PDF file");
      return;
    }
    setStep("settings");
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setStep("loading");

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      if (inputMode === "text") {
        formData.append("text", textInput);
      } else if (inputMode === "url") {
        formData.append("url", urlInput);
      } else if (inputMode === "pdf" && pdfFile) {
        formData.append("pdf", pdfFile);
      }

      formData.append("complexity", complexity);

      const response = await fetch(API_ENDPOINTS.EXPLAINER.GENERATE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to generate explanation");
      }

      const data = await response.json();
      setExplanation(data);
      setStep("result");
    } catch (error: any) {
      console.error("Error generating explanation:", error);
      alert(error.message || "Failed to generate explanation");
      setStep("settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !explanation) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.EXPLAINER.CHAT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          explainer_content: JSON.stringify(explanation),
          chat_history: chatMessages,
          question: chatInput,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.answer,
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      alert("Failed to get response");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleFlashcardsRedirect = () => {
    if (explanation) {
      localStorage.setItem("explainer_content", explanation.original_content);
      router.push("/dashboard/learning/flashcards");
    }
  };

  const saveExplanation = async () => {
    if (!explanation) return;

    setIsSaving(true);
    setSaveMessage(null);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to save explanations.");
        setIsSaving(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.EXPLAINER.SAVE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          explanation: explanation,
          original_content: explanation.original_content || "",
          content_source: explanation.content_source || inputMode,
          complexity: complexity,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || "Failed to save explanation");
      }

      setSaveMessage("Explanation saved successfully!");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save explanation.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to view explanation history.");
        setLoadingHistory(false);
        return;
      }
      const response = await fetch(API_ENDPOINTS.EXPLAINER.HISTORY, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || "Failed to load history");
      }
      setPastExplanations(data.explanations || []);
      setStep("history");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load explanation history.";
      setError(message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadExplanation = async (explainerId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to load explanations.");
        setIsLoading(false);
        return;
      }
      const response = await fetch(API_ENDPOINTS.EXPLAINER.HISTORY_DETAIL(explainerId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || "Failed to load explanation");
      }
      const loadedExplanation = data.explanation;
      setExplanation(loadedExplanation.explanation);
      setComplexity(loadedExplanation.complexity || "medium");
      setStep("result");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load explanation.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
              <Lightbulb className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground font-mono tracking-[0.08em] uppercase">AI Explainer</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Get comprehensive explanations with diagrams, workflows, and references
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border-2 border-primary/20">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-primary font-mono">Diagrams</span>
              </div>
            </div>
          </div>
          {step !== "history" && (
            <button
              onClick={fetchHistory}
              className="flex items-center gap-2 rounded-lg border-2 border-border bg-card px-4 py-2 font-bold transition-all hover:bg-accent font-mono tracking-[0.12em] uppercase"
            >
              <History className="h-5 w-5" />
              History
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {saveMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-600 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            {saveMessage}
          </div>
        )}

        {/* Input Step */}
        {step === "input" && (
          <div className="rounded-xl border-2 border-border bg-card p-8 shadow-sm">
            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold font-mono">1</div>
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold font-mono">2</div>
              </div>
              <span className="text-xs text-muted-foreground font-mono tracking-[0.1em] uppercase ml-2">Step 1 of 2</span>
            </div>

            {/* Pill-style Tab Selector */}
            <div className="relative mb-6 inline-flex rounded-full border-2 border-border bg-background p-1">
              {[
                { mode: "text" as InputMode, icon: FileText, label: "Text" },
                { mode: "url" as InputMode, icon: LinkIcon, label: "URL" },
                { mode: "pdf" as InputMode, icon: Upload, label: "PDF" },
              ].map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => {
                    setInputMode(mode);
                    setIsInputReady(false);
                    if (mode === "text") {
                      setWordCount(textInput.trim().split(/\s+/).filter((w) => w.length > 0).length);
                      setIsInputReady(textInput.trim().length > 0);
                    } else if (mode === "url") {
                      setIsInputReady(urlInput.trim().length > 0 && urlInput.includes("http"));
                    } else {
                      setIsInputReady(!!pdfFile);
                    }
                  }}
                  className={`relative z-10 flex items-center justify-center gap-2 rounded-full px-6 py-2.5 font-bold transition-all duration-300 font-mono tracking-[0.1em] uppercase ${
                    inputMode === mode
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
              {/* Sliding Active Indicator */}
              <div
                className={`absolute top-1 bottom-1 rounded-full bg-primary transition-all duration-300 ease-in-out ${
                  inputMode === "text" ? "left-1 w-[calc(33.333%-0.25rem)]" :
                  inputMode === "url" ? "left-[calc(33.333%+0.125rem)] w-[calc(33.333%-0.25rem)]" :
                  "left-[calc(66.666%+0.25rem)] w-[calc(33.333%-0.5rem)]"
                }`}
              />
            </div>

            {/* Input Fields with Animations */}
            <div className="relative mb-4 min-h-[120px] transition-all duration-300">
              {inputMode === "text" && (
                <div className="animate-in slide-in-from-right-4 duration-300">
                  <div className="relative">
                    <textarea
                      value={textInput}
                      onChange={handleTextChange}
                      placeholder="Paste your content here...&#10;&#10;Example: Newton's Laws of Motion describe the relationship between force, mass, and acceleration..."
                      className="h-32 w-full resize-none rounded-lg border-2 border-border bg-background px-4 py-3 pr-24 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      {isInputReady && (
                        <CheckCircle className="h-4 w-4 text-green-500 animate-in fade-in duration-200" />
                      )}
                      <span className="text-xs text-muted-foreground font-mono">
                        {wordCount} {wordCount === 1 ? "word" : "words"}
                      </span>
                    </div>
                  </div>
                  {textInput.trim().length === 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["Newton's Laws", "How DNS works", "Explain blockchain"].map((example) => (
                        <button
                          key={example}
                          onClick={() => handleExampleClick(example === "Newton's Laws" 
                            ? "Newton's Laws of Motion describe the relationship between force, mass, and acceleration. The first law states that an object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force."
                            : example === "How DNS works"
                            ? "DNS (Domain Name System) is like a phone book for the internet. When you type a website address, DNS translates the human-readable domain name into an IP address that computers can understand."
                            : "Blockchain is a distributed ledger technology that maintains a continuously growing list of records, called blocks, which are linked and secured using cryptography. Each block contains a cryptographic hash of the previous block, a timestamp, and transaction data.")}
                          className="px-3 py-1.5 text-xs rounded-full border-2 border-border bg-card hover:bg-accent hover:border-primary transition-all font-mono tracking-[0.05em]"
                        >
                          Try: {example}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {inputMode === "url" && (
                <div className="animate-in slide-in-from-right-4 duration-300">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={handleUrlChange}
                    placeholder="https://example.com/article"
                    className="w-full rounded-lg border-2 border-border bg-background px-4 py-3 font-mono tracking-[0.05em] focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  {isInputReady && (
                    <div className="mt-2 flex items-center gap-2 text-green-500">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs font-mono">Ready to fetch</span>
                    </div>
                  )}
                </div>
              )}

              {inputMode === "pdf" && (
                <div className="animate-in slide-in-from-right-4 duration-300">
                  <div className="rounded-lg border-2 border-dashed border-border p-8 text-center transition-all hover:border-primary">
                    <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="inline-block cursor-pointer rounded-lg border-2 border-border bg-card px-6 py-3 font-bold transition-all hover:bg-accent font-mono tracking-[0.12em] uppercase"
                    >
                      Choose PDF File
                    </label>
                    {pdfFile && (
                      <div className="mt-4 flex items-center justify-center gap-2 text-green-500">
                        <CheckCircle className="h-4 w-4" />
                        <p className="font-bold font-mono tracking-[0.05em]">
                          {pdfFile.name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right-aligned NEXT Button */}
            <div className="flex justify-end mt-4">
              <button
                onClick={handleNextToSettings}
                disabled={!isInputReady}
                className={`flex items-center gap-2 rounded-lg px-6 py-3 font-bold text-primary-foreground transition-all font-mono tracking-[0.12em] uppercase ${
                  isInputReady
                    ? "bg-primary hover:bg-primary/90 shadow-lg"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {getNextButtonLabel()}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Settings Step */}
        {step === "settings" && (
          <div className="rounded-xl border-2 border-border bg-card p-8 shadow-sm">
            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold font-mono">1</div>
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold font-mono">2</div>
              </div>
              <span className="text-xs text-muted-foreground font-mono tracking-[0.1em] uppercase ml-2">Step 2 of 2</span>
            </div>
            <h2 className="mb-6 text-2xl font-bold font-mono tracking-[0.08em] uppercase">Explanation Settings</h2>

            <div className="mb-8">
              <label className="mb-3 block text-xs font-bold font-mono tracking-[0.12em] uppercase">
                Complexity Level
              </label>
              <div className="grid grid-cols-3 gap-4">
                {["simple", "medium", "advanced"].map((level) => (
                  <button
                    key={level}
                    onClick={() => setComplexity(level)}
                    className={`rounded-lg border-2 px-6 py-4 font-bold transition-all font-mono tracking-[0.1em] uppercase ${
                      complexity === level
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-accent"
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep("input")}
                className="flex-1 rounded-lg border-2 border-border bg-card px-8 py-4 font-bold transition-all hover:bg-accent font-mono tracking-[0.12em] uppercase"
              >
                Back
              </button>
              <button
                onClick={handleGenerate}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-8 py-4 font-bold text-primary-foreground transition-all hover:bg-primary/90 font-mono tracking-[0.12em] uppercase"
              >
                <Brain className="h-5 w-5" />
                Generate Explanation
              </button>
            </div>
          </div>
        )}

        {/* Loading Step */}
        {step === "loading" && (
          <div className="rounded-xl border-2 border-border bg-card p-12 text-center shadow-sm">
            <Loader2 className="mx-auto mb-6 h-16 w-16 animate-spin text-primary" />
            <h2 className="mb-2 text-2xl font-bold font-mono tracking-[0.08em] uppercase">
              Generating Explanation...
            </h2>
            <p className="text-muted-foreground">
              Creating diagrams, workflows, and comprehensive content
            </p>
          </div>
        )}

        {/* Result Step */}
        {step === "result" && explanation && (
          <div className="space-y-6">
            {/* Title and Summary */}
              <div className="rounded-xl border-2 border-border bg-card p-8 shadow-sm">
              <h1 className="mb-4 text-4xl font-bold font-mono tracking-[0.08em] uppercase">{explanation.title}</h1>
              <p className="text-sm leading-relaxed text-muted-foreground font-mono tracking-[0.05em]">
                {explanation.summary}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={saveExplanation}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-border bg-card px-6 py-4 font-bold transition-all hover:bg-accent disabled:opacity-50 font-mono tracking-[0.12em] uppercase"
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleFlashcardsRedirect}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-border bg-card px-6 py-4 font-bold transition-all hover:bg-accent font-mono tracking-[0.12em] uppercase"
              >
                <Layers className="h-5 w-5" />
                Create Flashcards
              </button>
              <button
                onClick={() => setShowChat(true)}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-4 font-bold text-primary-foreground transition-all hover:bg-primary/90 font-mono tracking-[0.12em] uppercase"
              >
                <MessageCircle className="h-5 w-5" />
                Ask Questions
              </button>
            </div>

            {/* Main Sections */}
            {explanation.sections.map((section, idx) => (
              <div
                key={idx}
                className="rounded-xl border-2 border-border bg-card shadow-sm"
              >
                <button
                  onClick={() => toggleSection(idx)}
                  className="flex w-full items-center justify-between px-8 py-4 transition-colors hover:bg-accent"
                >
                  <h2 className="text-2xl font-bold font-mono tracking-[0.08em] uppercase">{section.heading}</h2>
                  {expandedSections.has(idx) ? (
                    <ChevronUp className="h-6 w-6" />
                  ) : (
                    <ChevronDown className="h-6 w-6" />
                  )}
                </button>

                {expandedSections.has(idx) && (
                  <div className="border-t border-border px-8 pb-8 pt-6">
                    <div className="prose max-w-none">
                      <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                        {section.content}
                      </p>
                    </div>

                    {section.key_points.length > 0 && (
                      <div className="mt-6">
                        <h3 className="mb-3 text-xl font-bold font-mono tracking-[0.08em] uppercase">
                          Key Points
                        </h3>
                        <ul className="space-y-2">
                          {section.key_points.map((point, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <CheckCircle className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
                              <span className="font-bold font-mono tracking-[0.05em]">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {section.examples.length > 0 && (
                      <div className="mt-6">
                        <h3 className="mb-3 text-xl font-bold font-mono tracking-[0.08em] uppercase">Examples</h3>
                        <div className="space-y-3">
                          {section.examples.map((example, i) => (
                            <div
                              key={i}
                              className="rounded-lg border-2 border-border bg-accent/50 p-4"
                            >
                              <p className="font-bold font-mono tracking-[0.05em]">{example}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Concepts */}
            {explanation.concepts.length > 0 && (
              <div className="rounded-xl border-2 border-border bg-card p-8 shadow-sm">
                <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold font-mono tracking-[0.08em] uppercase">
                  <Brain className="h-7 w-7" />
                  Key Concepts
                </h2>
                <div className="grid gap-6">
                  {explanation.concepts.map((concept, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border-2 border-border bg-accent/50 p-6"
                    >
                      <h3 className="mb-2 text-xl font-bold font-mono tracking-[0.08em] uppercase">
                        {concept.term}
                      </h3>
                      <p className="mb-3 font-bold text-muted-foreground font-mono tracking-[0.05em]">
                        {concept.definition}
                      </p>
                      <div className="rounded-lg border-2 border-border bg-card p-4">
                        <p className="text-sm font-medium">
                          <span className="text-primary">💡 Analogy:</span>{" "}
                          {concept.analogy}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Workflows */}
            {explanation.workflows.length > 0 && (
              <div className="rounded-xl border-2 border-border bg-card p-8 shadow-sm">
                <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold font-mono tracking-[0.08em] uppercase">
                  <WorkflowIcon className="h-7 w-7" />
                  Workflows & Processes
                </h2>
                <div className="space-y-8">
                  {explanation.workflows.map((workflow, idx) => (
                    <div key={idx}>
                      <h3 className="mb-4 text-xl font-bold font-mono tracking-[0.08em] uppercase">
                        {workflow.title}
                      </h3>
                      <div className="space-y-4">
                        {workflow.steps.map((step, i) => (
                          <div key={i} className="flex gap-4">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">
                              {i + 1}
                            </div>
                            <div className="flex-1 rounded-lg border-2 border-border bg-accent/50 p-4">
                              <p className="font-bold font-mono tracking-[0.05em]">{step}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diagrams */}
            {explanation.diagrams.length > 0 && (
              <div className="rounded-xl border-2 border-border bg-card p-8 shadow-sm">
                <h2 className="mb-6 text-2xl font-bold font-mono tracking-[0.08em] uppercase">Visual Diagrams</h2>
                <div className="space-y-6">
                  {explanation.diagrams.map((diagram, idx) => {
                    if (!diagram.mermaid_code) {
                      return (
                        <div
                          key={idx}
                          className="rounded-lg border-2 border-border bg-accent/50 p-6"
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <span className="rounded bg-primary px-3 py-1 text-xs font-semibold uppercase text-primary-foreground">
                              {diagram.type}
                            </span>
                            <h3 className="font-semibold">{diagram.description}</h3>
                          </div>
                          <p className="font-medium italic text-muted-foreground">
                            Diagram visualization not available
                          </p>
                        </div>
                      );
                    }

                    const { nodes, edges } = parseMermaidToFlow(
                      diagram.mermaid_code,
                    );

                    return (
                      <DiagramRenderer
                        key={idx}
                        diagram={diagram}
                        nodes={nodes}
                        edges={edges}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Image Suggestions */}
            {explanation.image_suggestions.length > 0 && (
              <div className="rounded-xl border-2 border-border bg-card p-8 shadow-sm">
                <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold font-mono tracking-[0.08em] uppercase">
                  <ImageIcon className="h-7 w-7" />
                  Recommended Visuals
                </h2>
                <div className="grid gap-4">
                  {explanation.image_suggestions.map((img, idx) => (
                    <a
                      key={idx}
                      href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(img.query)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 rounded-lg border-2 border-border bg-accent/50 p-4 transition-colors hover:bg-accent"
                    >
                      <ImageIcon className="h-6 w-6 flex-shrink-0" />
                      <div>
                        <p className="font-bold font-mono tracking-[0.05em]">{img.query}</p>
                        <p className="text-xs text-muted-foreground font-mono tracking-[0.05em]">
                          {img.context}
                        </p>
                      </div>
                      <ArrowRight className="ml-auto h-5 w-5" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* References */}
            {explanation.references.length > 0 && (
              <div className="rounded-xl border-2 border-border bg-card p-8 shadow-sm">
                <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold font-mono tracking-[0.08em] uppercase">
                  <BookOpen className="h-7 w-7" />
                  Further Reading
                </h2>
                <div className="grid gap-4">
                  {explanation.references.map((ref, idx) => (
                    <a
                      key={idx}
                      href={`https://www.google.com/search?q=${encodeURIComponent(ref.suggested_search)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border-2 border-border bg-accent/50 p-6 transition-colors hover:bg-accent"
                    >
                      <h3 className="mb-2 text-lg font-bold font-mono tracking-[0.08em] uppercase">{ref.title}</h3>
                      <p className="mb-3 font-bold text-muted-foreground font-mono tracking-[0.05em]">
                        {ref.description}
                      </p>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                        Search: {ref.suggested_search}{" "}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat Modal */}
        {showChat && explanation && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setShowChat(false)}
            />

            <div
                className="fixed bottom-6 left-1/2 z-50 flex max-h-[70vh] w-[600px] max-w-[90vw] -translate-x-1/2 flex-col overflow-hidden rounded-xl border-2 border-border bg-card shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-border bg-primary p-4">
                <h3 className="flex items-center gap-2 font-bold text-primary-foreground font-mono tracking-[0.1em] uppercase">
                  <MessageCircle className="h-5 w-5" />
                  Ask Questions
                </h3>
                <button
                  onClick={() => setShowChat(false)}
                  className="rounded p-2 transition-colors hover:bg-primary/20"
                >
                  <X className="h-5 w-5 text-primary-foreground" />
                </button>
              </div>

              <div
                className="flex-1 space-y-4 overflow-y-auto p-4"
                style={{ minHeight: "300px", maxHeight: "calc(70vh - 150px)" }}
              >
                {chatMessages.length === 0 && (
                  <div className="py-12 text-center">
                    <MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="font-medium text-muted-foreground">
                      Ask any questions about the explained content
                    </p>
                  </div>
                )}

                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg border-2 border-border p-4 ${
                      msg.role === "user"
                        ? "ml-12 bg-primary/10"
                        : "mr-12 bg-accent/50"
                    }`}
                  >
                    <p className="mb-1 text-xs font-bold font-mono tracking-[0.1em] uppercase">
                      {msg.role === "user" ? "You" : "AI Tutor"}
                    </p>
                    <p className="whitespace-pre-wrap text-foreground font-mono tracking-[0.05em]">
                      {msg.content}
                    </p>
                  </div>
                ))}

                {isChatLoading && (
                  <div className="flex items-center gap-2 rounded-lg border-2 border-border bg-accent/50 p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-bold text-muted-foreground font-mono tracking-[0.1em] uppercase">
                      Thinking...
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-border bg-card p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && !isChatLoading && handleSendChat()
                    }
                    placeholder="Ask a question..."
                    className="flex-1 rounded-lg border-2 border-border bg-background px-4 py-3 font-mono tracking-[0.05em] focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={isChatLoading}
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="rounded-lg bg-primary px-6 py-3 font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-mono tracking-[0.12em] uppercase"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* History Step */}
        {step === "history" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold font-mono tracking-[0.08em] uppercase">Explanation History</h2>
              <button
                onClick={() => setStep("input")}
                className="flex items-center gap-2 rounded-lg border-2 border-border bg-card px-4 py-2 font-bold transition-all hover:bg-accent font-mono tracking-[0.12em] uppercase"
              >
                <ArrowRight className="h-5 w-5 rotate-180" />
                Back
              </button>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pastExplanations.length === 0 ? (
              <div className="rounded-xl border-2 border-border bg-card p-12 text-center">
                <History className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium text-muted-foreground">
                  No saved explanations yet
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Generate and save an explanation to see it here
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {pastExplanations.map((past) => (
                  <div
                    key={past.explainer_id}
                    className="rounded-xl border-2 border-border bg-card p-6 transition-all hover:bg-accent/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold font-mono tracking-[0.08em] uppercase">{past.title || "Untitled"}</h3>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {past.content_source || "text"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Brain className="h-4 w-4" />
                            {past.complexity || "medium"}
                          </span>
                          <span>
                            {new Date(past.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => loadExplanation(past.explainer_id)}
                        className="ml-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground transition-all hover:bg-primary/90 font-mono tracking-[0.12em] uppercase"
                      >
                        View
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExplainerAgentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin" />
            <p className="text-lg font-semibold">Loading...</p>
          </div>
        </div>
      }
    >
      <ExplainerPageContent />
    </Suspense>
  );
}