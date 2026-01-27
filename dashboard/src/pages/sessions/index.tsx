import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { SessionCardSkeletonList } from "@/components/ui/session-card-skeleton";
import {
  useInvalidateSessions,
  useSessions,
  useTags,
} from "@/hooks/use-sessions";
import { deleteSession } from "@/lib/api";
import type { Session, SessionType, Tag } from "@/lib/types";

const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: "decision", label: "Decision" },
  { value: "implementation", label: "Implementation" },
  { value: "research", label: "Research" },
  { value: "exploration", label: "Exploration" },
  { value: "discussion", label: "Discussion" },
  { value: "debug", label: "Debug" },
  { value: "review", label: "Review" },
];

function SessionCard({
  session,
  tags,
  onDelete,
}: {
  session: Session;
  tags: Tag[];
  onDelete: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this session?")) return;

    setIsDeleting(true);
    try {
      await deleteSession(session.id);
      onDelete();
    } catch {
      alert("Failed to delete session");
    } finally {
      setIsDeleting(false);
    }
  };

  const date = new Date(session.createdAt).toLocaleDateString("ja-JP");
  const userName = session.context?.user?.name || "unknown";
  const interactionCount = session.interactions?.length || 0;

  // Get tag color from tags.json
  const getTagColor = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    return tag?.color || "#6B7280";
  };

  return (
    <Link to={`/sessions/${session.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <span className="line-clamp-1">
                {session.title || "Untitled session"}
              </span>
            </CardTitle>
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
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>{userName}</span>
            <span>-</span>
            <span>{date}</span>
            {session.context?.branch && (
              <>
                <span>-</span>
                <span className="font-mono text-xs">
                  {session.context.branch}
                </span>
              </>
            )}
            {session.sessionType && (
              <>
                <span>-</span>
                <Badge variant="outline" className="text-xs font-normal">
                  {session.sessionType}
                </Badge>
              </>
            )}
            {interactionCount > 0 && (
              <>
                <span>-</span>
                <span className="text-xs">
                  {interactionCount} interaction
                  {interactionCount !== 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>
          {session.goal && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
              {session.goal}
            </p>
          )}
          {session.tags && session.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {session.tags.slice(0, 5).map((tagId) => (
                <Badge
                  key={tagId}
                  variant="secondary"
                  className="text-xs"
                  style={{
                    backgroundColor: `${getTagColor(tagId)}20`,
                    color: getTagColor(tagId),
                    borderColor: getTagColor(tagId),
                  }}
                >
                  {tagId}
                </Badge>
              ))}
              {session.tags.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{session.tags.length - 5}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function SessionsPage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error } = useSessions({
    page,
    limit: 20,
    tag: tagFilter !== "all" ? tagFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    search: debouncedSearch || undefined,
  });

  const { data: tagsData } = useTags();
  const tags = tagsData?.tags || [];
  const invalidate = useInvalidateSessions();

  // Get unique tags from all sessions for filter dropdown
  const availableTags = useMemo(() => {
    if (!data?.data) return [];
    const tagSet = new Set<string>();
    for (const session of data.data) {
      for (const tag of session.tags || []) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [data?.data]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sessions</h1>
        </div>
        <SessionCardSkeletonList count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Failed to load sessions
      </div>
    );
  }

  const sessions = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <p className="text-sm text-muted-foreground">
          {pagination?.total || 0} session
          {(pagination?.total || 0) !== 1 ? "s" : ""}
        </p>
      </div>

      {(pagination?.total || 0) === 0 &&
      !debouncedSearch &&
      tagFilter === "all" &&
      typeFilter === "all" ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No sessions found.</p>
          <p className="text-sm mt-2">
            Sessions will appear here after using Claude Code with the memoria
            plugin.
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-4 items-center flex-wrap">
            <Input
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="border border-border/70 bg-white/80 rounded-sm px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              {SESSION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
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

          {sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No sessions match your filters.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    tags={tags}
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
