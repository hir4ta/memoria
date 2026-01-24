"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Decision } from "@/lib/memoria/types";

interface DecisionListClientProps {
  decisions: Decision[];
}

export function DecisionListClient({ decisions }: DecisionListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "superseded" | "deprecated"
  >("all");

  const filteredDecisions = useMemo(() => {
    return decisions.filter((decision) => {
      // Status filter
      if (statusFilter !== "all" && decision.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = decision.title.toLowerCase().includes(query);
        const matchesDecision = decision.decision.toLowerCase().includes(query);
        const matchesTags = decision.tags.some((tag) =>
          tag.toLowerCase().includes(query)
        );
        const matchesUser = decision.user.name.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDecision && !matchesTags && !matchesUser) {
          return false;
        }
      }

      return true;
    });
  }, [decisions, searchQuery, statusFilter]);

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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search decisions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value as "all" | "active" | "superseded" | "deprecated"
            )
          }
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="superseded">Superseded</option>
          <option value="deprecated">Deprecated</option>
        </select>
        {(searchQuery || statusFilter !== "all") && (
          <span className="text-sm text-muted-foreground">
            {filteredDecisions.length} of {decisions.length} decisions
          </span>
        )}
      </div>

      {/* Decision List */}
      {filteredDecisions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No decisions match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDecisions.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} />
          ))}
        </div>
      )}
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
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {decision.decision}
          </p>
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
