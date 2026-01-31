import { useQuery } from "@tanstack/react-query";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = lazy(() => import("react-force-graph-2d"));

// Hook to get container dimensions - calculates height to fit viewport
function useContainerDimensions(ref: React.RefObject<HTMLDivElement | null>) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    const updateDimensions = () => {
      if (ref.current) {
        // Calculate available height: viewport - header(70) - layout padding(32) - page header(50) - gaps(32)
        const availableHeight = window.innerHeight - 184;
        setDimensions({
          width: ref.current.offsetWidth,
          height: Math.max(400, availableHeight),
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [ref]);

  return dimensions;
}

interface GraphNode {
  id: string;
  title: string;
  type: string;
  tags: string[];
  createdAt: string;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

async function fetchGraph(): Promise<GraphData> {
  const res = await fetch("/api/sessions/graph");
  if (!res.ok) throw new Error("Failed to fetch graph");
  return res.json();
}

const typeColors: Record<string, string> = {
  decision: "#f59e0b",
  implementation: "#3b82f6",
  research: "#8b5cf6",
  exploration: "#10b981",
  discussion: "#6366f1",
  debug: "#ef4444",
  review: "#ec4899",
  unknown: "#6b7280",
};

export function GraphPage() {
  const { t } = useTranslation("graph");
  const navigate = useNavigate();
  const graphRef = useRef<unknown>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const dimensions = useContainerDimensions(containerRef);

  const { data, isLoading, error } = useQuery({
    queryKey: ["sessions", "graph"],
    queryFn: fetchGraph,
  });

  // Transform data for force graph
  const graphData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };

    return {
      nodes: data.nodes.map((node) => ({
        ...node,
        color: typeColors[node.type] || typeColors.unknown,
      })),
      links: data.edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        value: edge.weight,
      })),
    };
  }, [data]);

  const handleNodeClick = useCallback(
    (node: { id?: string }) => {
      if (node.id) {
        navigate(`/sessions/${node.id}`);
      }
    },
    [navigate],
  );

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node);
  }, []);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setMousePos({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    },
    [],
  );

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        {t("errors:failedToLoad.graph")}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px] flex-1 min-h-0">
        <Card className="overflow-hidden">
          <CardContent
            className="p-0 relative"
            ref={containerRef}
            onMouseMove={handleMouseMove}
          >
            {isLoading ? (
              <Skeleton className="h-full min-h-[400px] w-full" />
            ) : graphData.nodes.length === 0 ? (
              <div className="h-full min-h-[400px] flex items-center justify-center text-muted-foreground">
                {t("noSessions")}
              </div>
            ) : (
              <Suspense
                fallback={<Skeleton className="h-full min-h-[400px] w-full" />}
              >
                <ForceGraph2D
                  ref={graphRef}
                  graphData={graphData}
                  nodeColor="color"
                  nodeRelSize={6}
                  linkWidth={(link) =>
                    Math.sqrt((link as { value?: number }).value || 1)
                  }
                  linkColor={() => "#cbd5e1"}
                  onNodeClick={handleNodeClick}
                  onNodeHover={handleNodeHover}
                  width={dimensions.width}
                  height={dimensions.height}
                  backgroundColor="#ffffff"
                />
              </Suspense>
            )}
            {/* Floating tooltip on graph */}
            {hoveredNode && (
              <div
                className="absolute pointer-events-none bg-white border border-stone-200 rounded-lg shadow-lg p-3 max-w-[240px] z-10"
                style={{
                  left: Math.min(mousePos.x + 12, dimensions.width - 260),
                  top: Math.min(mousePos.y + 12, dimensions.height - 120),
                }}
              >
                <p className="font-medium text-sm line-clamp-2 mb-1">
                  {hoveredNode.title}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        typeColors[hoveredNode.type] || typeColors.unknown,
                    }}
                  />
                  <span>{t(`types.${hoveredNode.type}`)}</span>
                </div>
                {hoveredNode.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {hoveredNode.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-stone-100 px-1.5 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {hoveredNode.tags.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{hoveredNode.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs text-stone-400">
                  {t("clickToViewDetails")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* How to Read */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("howToRead.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mt-1 shrink-0" />
                <span>
                  <strong>Nodes</strong> = {t("howToRead.nodes")}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="inline-block w-6 h-0.5 bg-slate-300 mt-2 shrink-0" />
                <span>
                  <strong>Lines</strong> = {t("howToRead.lines")}
                </span>
              </div>
              <p className="pt-2 text-xs">{t("howToRead.clickHint")}</p>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("sessionTypes")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2">
              {Object.entries(typeColors).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm capitalize truncate">
                    {t(`types.${type}`)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("graphStats.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                {t("graphStats.nodes")}: {graphData.nodes.length}
              </p>
              <p>
                {t("graphStats.connections")}: {graphData.links.length}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
