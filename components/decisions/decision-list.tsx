import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Decision } from "@/lib/memoria/types";

interface DecisionListProps {
  decisions: Decision[];
}

export function DecisionList({ decisions }: DecisionListProps) {
  if (decisions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No decisions recorded yet.</p>
        <p className="text-sm mt-2">
          Decisions will appear here when you use the /memoria command to record them.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {decisions.map((decision) => (
        <DecisionCard key={decision.id} decision={decision} />
      ))}
    </div>
  );
}

function DecisionCard({ decision }: { decision: Decision }) {
  const date = new Date(decision.createdAt).toLocaleDateString("ja-JP");
  const statusColor =
    decision.status === "active"
      ? "bg-green-100 text-green-800"
      : decision.status === "superseded"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-gray-100 text-gray-800";

  return (
    <Link href={`/decisions/${decision.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base font-medium">{decision.title}</CardTitle>
            <Badge className={statusColor} variant="secondary">
              {decision.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{decision.decision}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>{decision.user.name}</span>
            <span>·</span>
            <span>{date}</span>
          </div>
          {decision.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {decision.tags.slice(0, 5).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
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
