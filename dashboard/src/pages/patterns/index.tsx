import { useState, useEffect } from "react";
import { Link } from "react-router";
import { getPatterns } from "@/lib/api";
import type { Pattern } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PatternsPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPatterns()
      .then((data) => {
        setPatterns(data);
        setError(null);
      })
      .catch(() => setError("Failed to load patterns"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-destructive">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Patterns</h1>
        <p className="text-sm text-muted-foreground">
          {patterns.length} user{patterns.length !== 1 ? "s" : ""}
        </p>
      </div>

      {patterns.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No patterns found.</p>
          <p className="text-sm mt-2">
            Patterns will be detected and recorded from your coding sessions.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {patterns.map((pattern) => {
            const goodCount = pattern.patterns.filter(
              (p) => p.type === "good"
            ).length;
            const badCount = pattern.patterns.filter(
              (p) => p.type === "bad"
            ).length;

            return (
              <Link key={pattern.user} to={`/patterns/${pattern.user}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">
                      {pattern.user}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant="default" className="text-xs">
                        {goodCount} good
                      </Badge>
                      <Badge variant="destructive" className="text-xs">
                        {badCount} bad
                      </Badge>
                      <span className="text-muted-foreground">
                        Updated:{" "}
                        {new Date(pattern.updatedAt).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
