"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import ReactFlow, {
  Background,
  Connection,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  Panel,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Calendar,
  Clock,
  History,
  Loader2,
  PlayCircle,
  Save,
  Sparkles,
  Trash2,
  X,
  Youtube,
} from "lucide-react";

import { API_ENDPOINTS } from "@/lib/config";

interface Resource {
  title: string;
  url: string;
  platform: string;
  thumbnail: string | null;
  duration: string | null;
  is_free: boolean;
  rating: number | null;
  instructor: string | null;
}

interface LearningNodeData {
  topic: string;
  resources: Resource[];
  fetched_at: string | null;
}

const NODE_COLORS = [
  { bg: "#0ea5e9", text: "#ffffff" },
  { bg: "#6366f1", text: "#ffffff" },
  { bg: "#22c55e", text: "#ffffff" },
  { bg: "#f97316", text: "#ffffff" },
  { bg: "#ec4899", text: "#ffffff" },
  { bg: "#8b5cf6", text: "#ffffff" },
];

interface RoadmapMetadata {
  id: string;
  user_id: string;
  topic: string;
  created_at: string;
  node_count: number;
  is_favorite: boolean;
  notes: string | null;
}

export default function RoadmapGeneratorPage() {
  const [step, setStep] = useState<"input" | "roadmap">("input");
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<LearningNodeData | null>(null);
  const [resourceTab, setResourceTab] = useState<
    "all" | "youtube" | "coursera" | "udemy" | "blogs" | "reddit"
  >("all");
  const [showResourcesPanel, setShowResourcesPanel] = useState(false);
  const [showPastRoadmaps, setShowPastRoadmaps] = useState(false);
  const [pastRoadmaps, setPastRoadmaps] = useState<RoadmapMetadata[]>([]);
  const [loadingPastRoadmaps, setLoadingPastRoadmaps] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentMermaidCode, setCurrentMermaidCode] = useState("");
  const [currentNodeData, setCurrentNodeData] = useState<LearningNodeData[]>([]);

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

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleNodeClick = (learningNode: LearningNodeData | undefined) => {
    if (learningNode) {
      setSelectedNode(learningNode);
      setShowResourcesPanel(true);
      setResourceTab("all");
    }
  };

  const parseMermaidToFlow = (
    mermaidCode: string,
    nodeData: LearningNodeData[],
  ) => {
    const lines = mermaidCode
      .split("\n")
      .filter((line) => line.trim() && !line.trim().startsWith("flowchart"));

    const nodeMap = new Map<
      string,
      {
        label: string;
        isDiamond: boolean;
      }
    >();
    const nodeOrder: string[] = [];
    const edgeList: { source: string; target: string; label?: string }[] = [];

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      const diamondMatches = [...trimmedLine.matchAll(/([A-Z]+)\{\{([^}]+)\}\}/g)];
      diamondMatches.forEach((match) => {
        const id = match[1];
        const label = match[2].trim();
        if (!nodeMap.has(id)) {
          nodeMap.set(id, { label, isDiamond: true });
          nodeOrder.push(id);
        }
      });

      const squareMatches = [...trimmedLine.matchAll(/([A-Z]+)\[([^\]]+)\]/g)];
      squareMatches.forEach((match) => {
        const id = match[1];
        const label = match[2].trim();
        if (!nodeMap.has(id)) {
          nodeMap.set(id, { label, isDiamond: false });
          nodeOrder.push(id);
        }
      });

      let connectionMatch = trimmedLine.match(
        /([A-Z]+)[\[{]+[^\]{}]+[\]}]+\s*-->\s*\|([^\|]+)\|\s*([A-Z]+)[\[{]+/,
      );
      if (connectionMatch) {
        edgeList.push({
          source: connectionMatch[1].trim(),
          target: connectionMatch[3].trim(),
          label: connectionMatch[2].trim(),
        });
        return;
      }

      connectionMatch = trimmedLine.match(
        /([A-Z]+)[\[{]+[^\]{}]+[\]}]+\s*-->\s*([A-Z]+)[\[{]+/,
      );
      if (connectionMatch) {
        edgeList.push({
          source: connectionMatch[1].trim(),
          target: connectionMatch[2].trim(),
        });
        return;
      }

      connectionMatch = trimmedLine.match(/([A-Z]+)\s+-->\s+([A-Z]+)[\[{]/);
      if (connectionMatch) {
        edgeList.push({
          source: connectionMatch[1].trim(),
          target: connectionMatch[2].trim(),
        });
        return;
      }

      connectionMatch = trimmedLine.match(/([A-Z]+)\s*-->\s*([A-Z]+)/);
      if (connectionMatch) {
        edgeList.push({
          source: connectionMatch[1].trim(),
          target: connectionMatch[2].trim(),
        });
      }
    });

    const flowNodes: Node[] = [];
    let colorIndex = 0;
    nodeMap.forEach((data, id) => {
      const color = NODE_COLORS[colorIndex % NODE_COLORS.length];
      colorIndex += 1;

      const learningNode = nodeData.find((n) => n.topic === data.label);

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
                padding: data.isDiamond ? "24px" : "12px 16px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={() => handleNodeClick(learningNode)}
            >
              {data.label}
            </div>
          ),
        },
        position: { x: 0, y: 0 },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        style: {
          background: color.bg,
          border: `2px solid ${color.bg}`,
          borderRadius: data.isDiamond ? "0" : "12px",
          padding: 0,
          color: color.text,
          boxShadow:
            "0 4px 20px rgba(56,189,248,0.35), 0 0 30px rgba(15,23,42,0.6)",
          clipPath: data.isDiamond
            ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
            : undefined,
          width: data.isDiamond ? 140 : 180,
          height: data.isDiamond ? 140 : undefined,
          minHeight: data.isDiamond ? undefined : 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.2s",
        },
      });
    });

    const flowEdges: Edge[] = edgeList.map((edge, idx) => ({
      id: `e${idx}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: "smoothstep",
      animated: true,
      style: {
        stroke: "#94a3b8",
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#94a3b8",
        width: 20,
        height: 20,
      },
      labelStyle: {
        fill: "#475569",
        fontWeight: 600,
        fontSize: 11,
      },
      labelBgStyle: {
        fill: "#ffffff",
        fillOpacity: 0.9,
      },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
    }));

    const layoutNodes = applyHierarchicalLayout(flowNodes, flowEdges);
    return { nodes: layoutNodes, edges: flowEdges };
  };

  const applyHierarchicalLayout = (allNodes: Node[], allEdges: Edge[]) => {
    const levels = new Map<string, number>();
    const visited = new Set<string>();
    const incomingCount = new Map<string, number>();

    allNodes.forEach((n) => incomingCount.set(n.id, 0));
    allEdges.forEach((e) => {
      incomingCount.set(e.target, (incomingCount.get(e.target) || 0) + 1);
    });

    let roots = allNodes.filter((n) => incomingCount.get(n.id) === 0);
    roots.sort((a, b) => a.id.localeCompare(b.id));

    if (roots.length === 0 && allNodes.length > 0) {
      const sortedNodes = [...allNodes].sort((a, b) => a.id.localeCompare(b.id));
      roots = [sortedNodes[0]];
    }

    const queue: { id: string; level: number }[] = [
      { id: roots[0].id, level: 0 },
    ];

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      levels.set(id, level);

      allEdges.forEach((e) => {
        if (e.source === id && !visited.has(e.target)) {
          queue.push({ id: e.target, level: level + 1 });
        }
      });
    }

    allNodes.forEach((node) => {
      if (!levels.has(node.id)) {
        levels.set(node.id, 0);
      }
    });

    const levelGroups = new Map<number, string[]>();
    levels.forEach((level, id) => {
      if (!levelGroups.has(level)) levelGroups.set(level, []);
      levelGroups.get(level)!.push(id);
    });

    levelGroups.forEach((ids) => ids.sort());

    const horizontalSpacing = 320;
    const verticalSpacing = 220;
    const centerX = 600;

    return allNodes.map((node) => {
      const level = levels.get(node.id) ?? 0;
      const ids = levelGroups.get(level) ?? [];
      const indexInLevel = ids.indexOf(node.id);
      const totalWidth = (ids.length - 1) * horizontalSpacing;
      const startX = centerX - totalWidth / 2;

      return {
        ...node,
        position: {
          x: startX + indexInLevel * horizontalSpacing,
          y: 80 + level * verticalSpacing,
        },
      };
    });
  };

  const generateRoadmap = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ENDPOINTS.LEARNING.GENERATE_ROADMAP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to generate roadmap");
      }

      const data = (await res.json()) as {
        mermaid_code: string;
        nodes: LearningNodeData[];
      };

      setCurrentMermaidCode(data.mermaid_code);
      setCurrentNodeData(data.nodes);

      const { nodes: parsedNodes, edges: parsedEdges } = parseMermaidToFlow(
        data.mermaid_code,
        data.nodes,
      );
      setNodes(parsedNodes);
      setEdges(parsedEdges);

      setStep("roadmap");
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to generate roadmap";
      showToast(message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveRoadmap = async () => {
    if (!currentMermaidCode || !currentNodeData.length) {
      showToast("No roadmap to save", "error");
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ENDPOINTS.LEARNING.SAVE_ROADMAP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          topic: topic.trim(),
          mermaid_code: currentMermaidCode,
          nodes: currentNodeData,
          notes: null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to save roadmap");
      }

      showToast("Roadmap saved successfully!", "success");
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to save roadmap";
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const loadPastRoadmaps = async () => {
    setLoadingPastRoadmaps(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ENDPOINTS.LEARNING.GET_ROADMAPS, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to load past roadmaps");
      }

      const data = (await res.json()) as { roadmaps: RoadmapMetadata[] };
      setPastRoadmaps(data.roadmaps);
      setShowPastRoadmaps(true);
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Failed to load past roadmaps";
      showToast(message, "error");
    } finally {
      setLoadingPastRoadmaps(false);
    }
  };

  const loadRoadmap = async (roadmapId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ENDPOINTS.LEARNING.GET_ROADMAP(roadmapId), {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to load roadmap");
      }

      const data = (await res.json()) as {
        roadmap: {
          topic: string;
          mermaid_code: string;
          nodes: LearningNodeData[];
        };
      };
      const roadmap = data.roadmap;

      setTopic(roadmap.topic);
      setCurrentMermaidCode(roadmap.mermaid_code);
      setCurrentNodeData(roadmap.nodes);

      const { nodes: parsedNodes, edges: parsedEdges } = parseMermaidToFlow(
        roadmap.mermaid_code,
        roadmap.nodes,
      );
      setNodes(parsedNodes);
      setEdges(parsedEdges);

      setShowPastRoadmaps(false);
      setStep("roadmap");
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Failed to load roadmap";
      showToast(message, "error");
    }
  };

  const deleteRoadmap = async (roadmapId: string) => {
    // eslint-disable-next-line no-alert
    if (!confirm("Are you sure you want to delete this roadmap?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ENDPOINTS.LEARNING.DELETE_ROADMAP(roadmapId), {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to delete roadmap");
      }

      setPastRoadmaps((prev) => prev.filter((r) => r.id !== roadmapId));
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Failed to delete roadmap";
      showToast(message, "error");
    }
  };

  const resetAll = () => {
    setStep("input");
    setTopic("");
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setShowResourcesPanel(false);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {step === "input" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-2xl">
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/10 shadow-[0_0_25px_rgba(56,189,248,0.7)]">
                <Sparkles className="h-8 w-8 text-sky-500" />
              </div>
              <h1 className="mb-3 text-4xl font-bold text-foreground">
                AI Learning Roadmap
              </h1>
              <p className="text-lg text-foreground/60">
                Generate a personalized learning path with curated courses and videos.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-[0_0_40px_rgba(15,23,42,0.35)]">
              <label className="mb-3 block text-sm font-semibold text-foreground">
                What do you want to learn?
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., React, Machine Learning, Python..."
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-foreground/40 outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
                onKeyDown={(e) => {
                  if (e.key === "Enter") generateRoadmap();
                }}
              />

              <button
                onClick={generateRoadmap}
                disabled={isGenerating || !topic.trim()}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(56,189,248,0.8)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating roadmap...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate learning path
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "roadmap" && (
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-card/80 px-6 py-4 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {topic} Learning Roadmap
              </h2>
              <p className="mt-1 text-sm text-foreground/60">
                Click on any node to view resources from YouTube, Udemy, Coursera, blogs and Reddit.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={saveRoadmap}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-card/80"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save
                  </>
                )}
              </button>
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2 text-sm font-medium text-white shadow-[0_0_24px_rgba(56,189,248,0.7)] transition hover:bg-sky-400"
              >
                New Topic
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden rounded-xl border border-border bg-card">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
              fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
              minZoom={0.2}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#1e293b" gap={18} size={1} />
              <Controls className="rounded-lg border border-border bg-card shadow-sm" />
              <MiniMap
                nodeColor={(node) => {
                  const style = node.style as { background?: string };
                  return style?.background || "#0ea5e9";
                }}
                className="rounded-lg border border-border bg-card"
                maskColor="rgba(15,23,42,0.08)"
              />
              <Panel
                position="top-center"
                className="rounded-lg border border-border bg-card/90 px-4 py-2 shadow-sm"
              >
                <p className="text-sm font-semibold text-foreground">
                  💡 Click any node to view learning resources
                </p>
              </Panel>
            </ReactFlow>
          </div>

          {showResourcesPanel && selectedNode && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-border bg-card px-6 py-5">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {selectedNode.topic}
                    </h2>
                    <p className="mt-1 text-sm text-foreground/60">
                      {selectedNode.resources.length} resource
                      {selectedNode.resources.length !== 1 ? "s" : ""} available
                    </p>
                  </div>
                  <button
                    onClick={() => setShowResourcesPanel(false)}
                    className="rounded-lg p-2 transition-colors hover:bg-foreground/5"
                  >
                    <X className="h-6 w-6 text-foreground/60" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {selectedNode.resources.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-foreground/60">No resources available</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 inline-flex flex-wrap gap-1 rounded-full border border-border bg-background p-1 text-xs font-medium">
                        <button
                          onClick={() => setResourceTab("all")}
                          className={`px-3 py-1 rounded-full transition ${
                            resourceTab === "all"
                              ? "bg-sky-500 text-white shadow-[0_0_18px_rgba(56,189,248,0.7)]"
                              : "text-foreground/60 hover:text-foreground"
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setResourceTab("youtube")}
                          className={`px-3 py-1 rounded-full transition ${
                            resourceTab === "youtube"
                              ? "bg-sky-500 text-white shadow-[0_0_18px_rgba(56,189,248,0.7)]"
                              : "text-foreground/60 hover:text-foreground"
                          }`}
                        >
                          YouTube
                        </button>
                        <button
                          onClick={() => setResourceTab("coursera")}
                          className={`px-3 py-1 rounded-full transition ${
                            resourceTab === "coursera"
                              ? "bg-sky-500 text-white shadow-[0_0_18px_rgba(56,189,248,0.7)]"
                              : "text-foreground/60 hover:text-foreground"
                          }`}
                        >
                          Coursera
                        </button>
                        <button
                          onClick={() => setResourceTab("udemy")}
                          className={`px-3 py-1 rounded-full transition ${
                            resourceTab === "udemy"
                              ? "bg-sky-500 text-white shadow-[0_0_18px_rgba(56,189,248,0.7)]"
                              : "text-foreground/60 hover:text-foreground"
                          }`}
                        >
                          Udemy
                        </button>
                        <button
                          onClick={() => setResourceTab("blogs")}
                          className={`px-3 py-1 rounded-full transition ${
                            resourceTab === "blogs"
                              ? "bg-sky-500 text-white shadow-[0_0_18px_rgba(56,189,248,0.7)]"
                              : "text-foreground/60 hover:text-foreground"
                          }`}
                        >
                          Blogs
                        </button>
                        <button
                          onClick={() => setResourceTab("reddit")}
                          className={`px-3 py-1 rounded-full transition ${
                            resourceTab === "reddit"
                              ? "bg-sky-500 text-white shadow-[0_0_18px_rgba(56,189,248,0.7)]"
                              : "text-foreground/60 hover:text-foreground"
                          }`}
                        >
                          Reddit
                        </button>
                      </div>

                      <div className="space-y-4">
                        {selectedNode.resources
                          .filter((resource) => {
                            if (resourceTab === "all") return true;
                            const platform = (resource.platform || "").toLowerCase();
                            if (resourceTab === "youtube") {
                              return platform.includes("youtube");
                            }
                            if (resourceTab === "coursera") {
                              return platform.includes("coursera");
                            }
                            if (resourceTab === "udemy") {
                              return platform.includes("udemy");
                            }
                            if (resourceTab === "reddit") {
                              return platform.includes("reddit");
                            }
                            // blogs = anything that's not one of the major platforms
                            if (resourceTab === "blogs") {
                              return !platform.includes("youtube")
                                && !platform.includes("coursera")
                                && !platform.includes("udemy")
                                && !platform.includes("reddit");
                            }
                            return true;
                          })
                          .map((resource, idx) => (
                        <div
                          key={`${resource.url}-${idx}`}
                          className="flex gap-4 rounded-xl border border-border bg-background p-4 transition-shadow hover:shadow-md"
                        >
                          {resource.thumbnail && (
                            <div className="flex-shrink-0">
                              <Image
                                src={resource.thumbnail}
                                alt={resource.title}
                                width={160}
                                height={90}
                                className="h-24 w-40 rounded-lg border border-border object-cover"
                                unoptimized
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <h3 className="line-clamp-2 font-semibold text-foreground">
                                {resource.title}
                              </h3>
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-medium text-white shadow-[0_0_18px_rgba(56,189,248,0.7)] transition hover:bg-sky-400"
                              >
                                <PlayCircle className="h-4 w-4" />
                                Open
                              </a>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-foreground/60">
                              <div className="flex items-center gap-1">
                                <Youtube className="h-4 w-4 text-foreground/60" />
                                <span className="font-medium">
                                  {resource.platform}
                                </span>
                              </div>
                              {resource.duration && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{resource.duration}</span>
                                </div>
                              )}
                              {resource.is_free ? (
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
                                  Free
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-500">
                                  Paid
                                </span>
                              )}
                            </div>
                            {resource.instructor && (
                              <p className="mt-1 text-sm text-foreground/50">
                                {resource.instructor}
                              </p>
                            )}
                          </div>
                        </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Past Roadmaps button */}
      <button
        onClick={loadPastRoadmaps}
        disabled={loadingPastRoadmaps}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border-2 border-sky-500 bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(56,189,248,0.9)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingPastRoadmaps ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <History className="h-5 w-5" />
            <span className="pr-1">Past roadmaps</span>
          </>
        )}
      </button>

      {/* Past roadmaps sidebar */}
      {showPastRoadmaps && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowPastRoadmaps(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-card px-6 py-5">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Past roadmaps</h2>
                <p className="mt-1 text-sm text-foreground/60">
                  {pastRoadmaps.length} saved roadmap
                  {pastRoadmaps.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => setShowPastRoadmaps(false)}
                className="rounded-lg p-2 transition-colors hover:bg-foreground/5"
              >
                <X className="h-6 w-6 text-foreground/60" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {pastRoadmaps.length === 0 ? (
                <div className="py-12 text-center">
                  <History className="mx-auto mb-4 h-12 w-12 text-foreground/20" />
                  <p className="text-foreground/60">No saved roadmaps yet</p>
                  <p className="mt-2 text-sm text-foreground/40">
                    Generate and save roadmaps to access them later.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastRoadmaps.map((roadmap) => (
                    <div
                      key={roadmap.id}
                      className="rounded-xl border border-border bg-background p-4 transition-all hover:border-sky-500/40 hover:shadow-md"
                    >
                      <div className="space-y-3">
                        <div>
                          <h3 className="mb-1 line-clamp-2 text-base font-bold text-foreground">
                            {roadmap.topic}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-foreground/60">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(
                                  roadmap.created_at,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              <span>{roadmap.node_count} topics</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => loadRoadmap(roadmap.id)}
                            className="flex-1 rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-400"
                          >
                            Load roadmap
                          </button>
                          <button
                            onClick={() => deleteRoadmap(roadmap.id)}
                            className="rounded-lg p-2 text-red-500 transition hover:bg-red-500/10"
                            title="Delete roadmap"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {toastVisible && (
        <div className="fixed bottom-5 left-0 right-0 z-50 flex items-center justify-center px-4">
          <div
            className={`max-w-md flex-1 rounded-xl px-4 py-3 text-sm shadow-lg ${
              toastType === "success"
                ? "bg-emerald-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}

