import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = lazy(() => import("react-force-graph-2d"));

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
  const navigate = useNavigate();
  const graphRef = useRef<unknown>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

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

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Failed to load graph
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Session Graph</h1>
        <p className="text-sm text-muted-foreground">
          Sessions connected by shared tags
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <Skeleton className="h-[600px] w-full" />
            ) : graphData.nodes.length === 0 ? (
              <div className="h-[600px] flex items-center justify-center text-muted-foreground">
                No sessions to display
              </div>
            ) : (
              <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                <ForceGraph2D
                  ref={graphRef}
                  graphData={graphData}
                  nodeLabel="title"
                  nodeColor="color"
                  nodeRelSize={6}
                  linkWidth={(link) =>
                    Math.sqrt((link as { value?: number }).value || 1)
                  }
                  linkColor={() => "#cbd5e1"}
                  onNodeClick={handleNodeClick}
                  onNodeHover={handleNodeHover}
                  width={800}
                  height={600}
                  backgroundColor="#ffffff"
                />
              </Suspense>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Session Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(typeColors).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm capitalize">{type}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Hovered Node Info */}
          {hoveredNode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Selected Session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium line-clamp-2">{hoveredNode.title}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  Type: {hoveredNode.type}
                </p>
                {hoveredNode.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {hoveredNode.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-muted px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Click to view details
                </p>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Graph Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>Nodes: {graphData.nodes.length}</p>
              <p>Connections: {graphData.links.length}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
