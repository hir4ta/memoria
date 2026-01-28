import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DecisionCardSkeletonList } from "@/components/ui/decision-card-skeleton";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const { t, i18n } = useTranslation("decisions");
  const { t: tc } = useTranslation("common");
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDecision(decision.id);
      onDelete();
      setDialogOpen(false);
    } catch {
      // Silently fail - could add toast here
    } finally {
      setIsDeleting(false);
    }
  };

  const date = new Date(decision.createdAt).toLocaleDateString(
    i18n.language === "ja" ? "ja-JP" : "en-US",
  );

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
                {t(`status.${decision.status}`)}
              </Badge>
              <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDialogOpen(true);
                    }}
                    disabled={isDeleting}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    {isDeleting ? "..." : "×"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {tc("deleteDialog.description")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                      {tc("cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? tc("deleting") : tc("delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {decision.decision}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {decision.user?.name && (
              <>
                <span>{decision.user.name}</span>
                <span>-</span>
              </>
            )}
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
  const { t } = useTranslation("decisions");
  const { t: tc } = useTranslation("common");
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
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
        <DecisionCardSkeletonList count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        {t("errors:failedToLoad.decisions")}
      </div>
    );
  }

  const decisions = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("decisionCount", { count: pagination?.total || 0 })}
        </p>
      </div>

      {(pagination?.total || 0) === 0 &&
      !debouncedSearch &&
      tagFilter === "all" ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>{t("noDecisionsFound")}</p>
          <p className="text-sm mt-2">{t("noDecisionsDescription")}</p>
        </div>
      ) : (
        <>
          <div className="flex gap-4 items-center flex-wrap">
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
            <Select
              value={tagFilter}
              onValueChange={(value) => {
                setTagFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={tc("allTags")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tc("allTags")}</SelectItem>
                {availableTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {decisions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{t("noMatchingFilters")}</p>
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
