import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DecisionCardSkeletonList } from "@/components/ui/decision-card-skeleton";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { useDecisions, useInvalidateDecisions } from "@/hooks/use-decisions";
import { deleteDecision } from "@/lib/api";
import type { Decision } from "@/lib/types";

function DecisionCard({
  decision,
  onDelete,
}: {
  decision: Decision;
  onDelete: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this decision?")) return;

    setIsDeleting(true);
    try {
      await deleteDecision(decision.id);
      onDelete();
    } catch {
      alert("Failed to delete decision");
    } finally {
      setIsDeleting(false);
    }
  };

  const date = new Date(decision.createdAt).toLocaleDateString("ja-JP");

  const statusColors = {
    draft: "outline",
    active: "default",
    superseded: "secondary",
    deprecated: "destructive",
  } as const;

  return (
    <Link to={`/decisions/${decision.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base font-medium">
              {decision.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              {decision.source === "auto" && (
                <Badge variant="outline" className="text-xs">
                  auto
                </Badge>
              )}
              <Badge variant={statusColors[decision.status]}>
                {decision.status}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-muted-foreground hover:text-destructive"
              >
                {isDeleting ? "..." : "x"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {decision.decision}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{decision.user?.name || "unknown"}</span>
            <span>-</span>
            <span>{date}</span>
          </div>
          {decision.tags && decision.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {decision.tags.slice(0, 5).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function DecisionsPage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error } = useDecisions({
    page,
    limit: 20,
    tag: tagFilter !== "all" ? tagFilter : undefined,
    search: debouncedSearch || undefined,
  });

  const invalidate = useInvalidateDecisions();

  // Get unique tags from decisions
  const availableTags = useMemo(() => {
    if (!data?.data) return [];
    const tagSet = new Set<string>();
    for (const decision of data.data) {
      for (const tag of decision.tags || []) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [data?.data]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Decisions</h1>
        </div>
        <DecisionCardSkeletonList count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Failed to load decisions
      </div>
    );
  }

  const decisions = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Decisions</h1>
        <p className="text-sm text-muted-foreground">
          {pagination?.total || 0} decision
          {(pagination?.total || 0) !== 1 ? "s" : ""}
        </p>
      </div>

      {(pagination?.total || 0) === 0 &&
      !debouncedSearch &&
      tagFilter === "all" ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No decisions found.</p>
          <p className="text-sm mt-2">
            Use /memoria:decision to record design decisions.
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-4 items-center flex-wrap">
            <Input
              placeholder="Search decisions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
            <select
              value={tagFilter}
              onChange={(e) => {
                setTagFilter(e.target.value);
                setPage(1);
              }}
              className="border border-border/70 bg-white/80 rounded-sm px-3 py-2 text-sm"
            >
              <option value="all">All Tags</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          {decisions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No decisions match your filters.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {decisions.map((decision) => (
                  <DecisionCard
                    key={decision.id}
                    decision={decision}
                    onDelete={invalidate}
                  />
                ))}
              </div>

              {pagination && (
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  hasNext={pagination.hasNext}
                  hasPrev={pagination.hasPrev}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
