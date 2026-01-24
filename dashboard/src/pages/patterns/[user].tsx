import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { getPatterns } from "@/lib/api";
import type { Pattern, PatternItem } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PatternDetailPage() {
  const { user } = useParams<{ user: string }>();
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getPatterns()
      .then((data) => {
        const found = data.find((p) => p.user === user);
        setPattern(found || null);
        setError(found ? null : "Pattern not found");
      })
      .catch(() => setError("Failed to load patterns"))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (error || !pattern) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error || "Pattern not found"}</p>
        <Link to="/patterns" className="text-primary underline mt-4 block">
          Back to patterns
        </Link>
      </div>
    );
  }

  const goodPatterns = pattern.patterns.filter((p) => p.type === "good");
  const badPatterns = pattern.patterns.filter((p) => p.type === "bad");

  const PatternCard = ({ item }: { item: PatternItem }) => (
    <Card
      className={
        item.type === "good" ? "border-green-500/50" : "border-red-500/50"
      }
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-2">
          <Badge variant={item.type === "good" ? "default" : "destructive"}>
            {item.type}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(item.detectedAt).toLocaleDateString("ja-JP")}
          </span>
        </div>
        <p className="text-sm mb-2">{item.description}</p>
        {item.example && (
          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
            {item.example}
          </pre>
        )}
        {item.suggestion && (
          <p className="text-sm text-muted-foreground mt-2">
            Suggestion: {item.suggestion}
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/patterns"
          className="text-muted-foreground hover:text-foreground"
        >
          &larr; Back
        </Link>
        <h1 className="text-2xl font-bold">Patterns: {pattern.user}</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-green-600">
                Good Patterns ({goodPatterns.length})
              </CardTitle>
            </CardHeader>
          </Card>
          {goodPatterns.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No good patterns recorded
            </p>
          ) : (
            goodPatterns.map((p, i) => <PatternCard key={i} item={p} />)
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-red-600">
                Bad Patterns ({badPatterns.length})
              </CardTitle>
            </CardHeader>
          </Card>
          {badPatterns.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No bad patterns recorded
            </p>
          ) : (
            badPatterns.map((p, i) => <PatternCard key={i} item={p} />)
          )}
        </div>
      </div>
    </div>
  );
}
