import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Decision } from "@/lib/memoria/types";

interface DecisionDetailProps {
  decision: Decision;
}

export function DecisionDetail({ decision }: DecisionDetailProps) {
  const date = new Date(decision.createdAt).toLocaleString("ja-JP");
  const statusColor =
    decision.status === "active"
      ? "bg-green-100 text-green-800"
      : decision.status === "superseded"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-gray-100 text-gray-800";

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">User</p>
              <p className="font-medium">{decision.user.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{date}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge className={statusColor} variant="secondary">
                {decision.status}
              </Badge>
            </div>
          </div>
          {decision.tags.length > 0 && (
            <div>
              <p className="text-muted-foreground text-sm mb-2">Tags</p>
              <div className="flex flex-wrap gap-1">
                {decision.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Decision</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{decision.decision}</p>
        </CardContent>
      </Card>

      {/* Reasoning */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reasoning</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{decision.reasoning}</p>
        </CardContent>
      </Card>

      {/* Alternatives */}
      {decision.alternatives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Alternatives Considered ({decision.alternatives.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {decision.alternatives.map((alt, i) => (
                <div key={`alt-${i}`} className="border-l-2 border-muted pl-4 py-2">
                  <p className="text-sm font-medium">{alt.option}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Rejected: {alt.rejected}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Sessions */}
      {decision.relatedSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Related Sessions ({decision.relatedSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {decision.relatedSessions.map((sessionId) => (
                <Link
                  key={sessionId}
                  href={`/sessions/${sessionId}`}
                  className="block text-sm text-primary hover:underline font-mono"
                >
                  {sessionId}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
