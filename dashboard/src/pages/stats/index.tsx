import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface OverviewStats {
  sessions: { total: number; byType: Record<string, number> };
  decisions: { total: number; byStatus: Record<string, number> };
  interactions: { total: number };
}

interface ActivityData {
  activity: { date: string; sessions: number; decisions: number }[];
  days: number;
}

interface TagStats {
  tags: { name: string; count: number }[];
}

async function fetchOverview(): Promise<OverviewStats> {
  const res = await fetch("/api/stats/overview");
  if (!res.ok) throw new Error("Failed to fetch overview");
  return res.json();
}

async function fetchActivity(days = 30): Promise<ActivityData> {
  const res = await fetch(`/api/stats/activity?days=${days}`);
  if (!res.ok) throw new Error("Failed to fetch activity");
  return res.json();
}

async function fetchTagStats(): Promise<TagStats> {
  const res = await fetch("/api/stats/tags");
  if (!res.ok) throw new Error("Failed to fetch tag stats");
  return res.json();
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

export function StatsPage() {
  const { t } = useTranslation("stats");

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
  } = useQuery({
    queryKey: ["stats", "overview"],
    queryFn: fetchOverview,
  });

  const {
    data: activity,
    isLoading: activityLoading,
    error: activityError,
  } = useQuery({
    queryKey: ["stats", "activity"],
    queryFn: () => fetchActivity(30),
  });

  const {
    data: tagStats,
    isLoading: tagsLoading,
    error: tagsError,
  } = useQuery({
    queryKey: ["stats", "tags"],
    queryFn: fetchTagStats,
  });

  if (overviewError || activityError || tagsError) {
    return (
      <div className="text-center py-12 text-destructive">
        {t("errors:failedToLoad.statistics")}
      </div>
    );
  }

  // Prepare session type data
  const sessionTypeData = overview
    ? Object.entries(overview.sessions.byType).map(([name, value]) => ({
        name: name || "unknown",
        value,
      }))
    : [];

  // Prepare decision status data
  const decisionStatusData = overview
    ? Object.entries(overview.decisions.byStatus).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {overviewLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              title={t("totalSessions")}
              value={overview?.sessions.total || 0}
            />
            <StatCard
              title={t("totalDecisions")}
              value={overview?.decisions.total || 0}
            />
            <StatCard
              title={t("totalInteractions")}
              value={overview?.interactions.total || 0}
            />
            <StatCard
              title={t("avgInteractionsPerSession")}
              value={
                overview && overview.sessions.total > 0
                  ? (
                      overview.interactions.total / overview.sessions.total
                    ).toFixed(1)
                  : "0"
              }
            />
          </>
        )}
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("activityChart")}</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activity?.activity || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.slice(5)}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Sessions"
                />
                <Line
                  type="monotone"
                  dataKey="decisions"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Decisions"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Session Type Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("sessionsByType")}</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : sessionTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sessionTypeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" name="Sessions" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {t("noData")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Tags Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("topTags")}</CardTitle>
          </CardHeader>
          <CardContent>
            {tagsLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : tagStats?.tags && tagStats.tags.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={tagStats.tags.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" name="Usage" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {t("noTags")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Decision Status */}
      {decisionStatusData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("decisionsByStatus")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              {decisionStatusData.map(({ name, value }) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground capitalize">
                    {name}:
                  </span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
