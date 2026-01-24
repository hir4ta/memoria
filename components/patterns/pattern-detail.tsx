import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Pattern, PatternItem } from "@/lib/memoria/types";

interface PatternDetailProps {
  pattern: Pattern;
}

export function PatternDetail({ pattern }: PatternDetailProps) {
  const goodPatterns = pattern.patterns.filter((p) => p.type === "good");
  const badPatterns = pattern.patterns.filter((p) => p.type === "bad");

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Last updated: {new Date(pattern.updatedAt).toLocaleDateString("ja-JP")}
      </p>

      {/* Good Patterns */}
      {goodPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-green-700">
              Good Patterns ({goodPatterns.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {goodPatterns.map((item, i) => (
                <PatternItemView key={item.id || `good-${i}`} item={item} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bad Patterns */}
      {badPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-700">
              Bad Patterns ({badPatterns.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {badPatterns.map((item, i) => (
                <PatternItemView key={item.id || `bad-${i}`} item={item} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {pattern.patterns.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No patterns recorded yet.</p>
        </div>
      )}
    </div>
  );
}

function PatternItemView({ item }: { item: PatternItem }) {
  const typeColor =
    item.type === "good"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";

  return (
    <div className="border-l-2 border-muted pl-4 py-2">
      <div className="flex items-center gap-2 mb-2">
        <Badge className={typeColor} variant="secondary">
          {item.type === "good" ? "Good" : "Bad"}
        </Badge>
        <span className="text-xs text-muted-foreground capitalize">
          {item.source}
        </span>
        <span className="text-xs text-muted-foreground">
          · {new Date(item.detectedAt).toLocaleDateString("ja-JP")}
        </span>
      </div>
      <p className="text-sm">{item.description}</p>
      {item.example && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-1">Example:</p>
          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
            {item.example}
          </pre>
        </div>
      )}
      {item.suggestion && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium">Suggestion:</span> {item.suggestion}
        </p>
      )}
    </div>
  );
}
