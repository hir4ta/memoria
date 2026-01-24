import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Pattern } from "@/lib/memoria/types";

interface PatternListProps {
  patterns: Pattern[];
}

export function PatternList({ patterns }: PatternListProps) {
  if (patterns.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No patterns detected yet.</p>
        <p className="text-sm mt-2">
          Patterns will appear here as Claude Code learns your coding style.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {patterns.map((pattern) => {
        const goodCount = pattern.patterns.filter((p) => p.type === "good").length;
        const badCount = pattern.patterns.filter((p) => p.type === "bad").length;

        return (
          <Link key={pattern.id} href={`/patterns/${encodeURIComponent(pattern.user.name)}`}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {pattern.user.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800" variant="secondary">
                      {goodCount} Good
                    </Badge>
                    <Badge className="bg-red-100 text-red-800" variant="secondary">
                      {badCount} Bad
                    </Badge>
                  </div>
                  <span className="text-muted-foreground">
                    · Updated {new Date(pattern.updatedAt).toLocaleDateString("ja-JP")}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
