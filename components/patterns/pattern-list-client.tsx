"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Pattern } from "@/lib/memoria/types";

interface PatternListClientProps {
  patterns: Pattern[];
}

export function PatternListClient({ patterns }: PatternListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPatterns = useMemo(() => {
    if (!searchQuery) return patterns;

    const query = searchQuery.toLowerCase();
    return patterns.filter((pattern) => {
      // Match by user name
      if (pattern.user.name.toLowerCase().includes(query)) {
        return true;
      }
      // Match by pattern description
      if (
        pattern.patterns.some((p) => p.description.toLowerCase().includes(query))
      ) {
        return true;
      }
      return false;
    });
  }, [patterns, searchQuery]);

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
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search users or patterns..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        {searchQuery && (
          <span className="text-sm text-muted-foreground">
            {filteredPatterns.length} of {patterns.length} users
          </span>
        )}
      </div>

      {/* Pattern List */}
      {filteredPatterns.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No users match your search.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPatterns.map((pattern) => {
            const goodCount = pattern.patterns.filter((p) => p.type === "good").length;
            const badCount = pattern.patterns.filter((p) => p.type === "bad").length;

            return (
              <Link
                key={pattern.id}
                href={`/patterns/${encodeURIComponent(pattern.user.name)}`}
              >
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">
                      {pattern.user.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge
                          className="bg-green-100 text-green-800"
                          variant="secondary"
                        >
                          {goodCount} Good
                        </Badge>
                        <Badge
                          className="bg-red-100 text-red-800"
                          variant="secondary"
                        >
                          {badCount} Bad
                        </Badge>
                      </div>
                      <span className="text-muted-foreground">
                        · Updated{" "}
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
