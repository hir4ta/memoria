import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDecision } from "@/lib/api";
import type { Decision } from "@/lib/types";

export function DecisionDetailPage() {
  const { t, i18n } = useTranslation("decisions");
  const { t: tc } = useTranslation("common");
  const { id } = useParams<{ id: string }>();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getDecision(id)
      .then((data) => {
        setDecision(data);
        setError(null);
      })
      .catch(() => setError("Failed to load decision"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-center py-12">{tc("loading")}</div>;
  }

  if (error || !decision) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">
          {error || t("errors:decisionNotFound")}
        </p>
        <Link to="/decisions" className="text-primary underline mt-4 block">
          {t("errors:backToDecisions")}
        </Link>
      </div>
    );
  }

  const date = new Date(decision.createdAt).toLocaleString(
    i18n.language === "ja" ? "ja-JP" : "en-US",
  );

  const statusColors = {
    draft: "outline",
    active: "default",
    superseded: "secondary",
    deprecated: "destructive",
  } as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/decisions"
          className="text-muted-foreground hover:text-foreground"
        >
          &larr; {tc("back")}
        </Link>
        <h1 className="text-2xl font-bold">{t("detail.title")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{decision.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{tc("user")}:</span>{" "}
              {decision.user.name}
            </div>
            <div>
              <span className="text-muted-foreground">{tc("date")}:</span>{" "}
              {date}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{tc("status")}:</span>
              <Badge variant={statusColors[decision.status]}>
                {t(`status.${decision.status}`)}
              </Badge>
            </div>
            {decision.source && (
              <div>
                <span className="text-muted-foreground">
                  {t("detail.source")}:
                </span>{" "}
                <Badge variant="outline">
                  {decision.source === "auto"
                    ? t("detail.autoDetected")
                    : t("detail.manual")}
                </Badge>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              {t("detail.decision")}
            </h3>
            <p className="whitespace-pre-wrap">{decision.decision}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              {t("detail.reasoning")}
            </h3>
            <p className="whitespace-pre-wrap">{decision.reasoning}</p>
          </div>

          {decision.alternatives.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {t("detail.alternatives")}
              </h3>
              <ul className="space-y-2">
                {decision.alternatives.map((alt) => (
                  <li key={`${alt.option}-${alt.rejected}`} className="text-sm">
                    <span className="font-medium">{alt.option}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      - {alt.rejected}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <span className="text-muted-foreground text-sm">{tc("tags")}:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {decision.tags.length > 0 ? (
                decision.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-sm">
                  {tc("noTags")}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
