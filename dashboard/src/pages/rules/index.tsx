import { useState, useEffect } from "react";
import { getRules } from "@/lib/api";
import type { Rules, RuleItem } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function RulesPage() {
  const [rulesData, setRulesData] = useState<Rules[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRules()
      .then((data) => {
        setRulesData(data);
        setError(null);
      })
      .catch(() => setError("Failed to load rules"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-destructive">{error}</div>;
  }

  // Flatten all rules and group by category
  const allRules = rulesData.flatMap((r) => r.rules);
  const categories = [...new Set(allRules.map((r) => r.category))];

  const rulesByCategory = categories.reduce(
    (acc, category) => {
      acc[category] = allRules.filter((r) => r.category === category);
      return acc;
    },
    {} as Record<string, RuleItem[]>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rules</h1>
        <p className="text-sm text-muted-foreground">
          {allRules.length} rule{allRules.length !== 1 ? "s" : ""}
        </p>
      </div>

      {allRules.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No rules found.</p>
          <p className="text-sm mt-2">
            Rules will be extracted from your CLAUDE.md and coding sessions.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {rulesByCategory[category].map((rule) => (
                    <li key={rule.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium">{rule.rule}</p>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {rule.addedBy}
                        </Badge>
                      </div>
                      {rule.example && (
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {rule.example}
                        </pre>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
