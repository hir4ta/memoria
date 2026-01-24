"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { SessionCard } from "./session-card";
import type { Session } from "@/lib/memoria/types";

interface SessionListClientProps {
  sessions: Session[];
}

export function SessionListClient({ sessions }: SessionListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "in_progress">("all");

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      // Status filter
      if (statusFilter !== "all" && session.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSummary = session.summary.toLowerCase().includes(query);
        const matchesTags = session.tags.some((tag) =>
          tag.toLowerCase().includes(query)
        );
        const matchesUser = session.user.name.toLowerCase().includes(query);
        if (!matchesSummary && !matchesTags && !matchesUser) {
          return false;
        }
      }

      return true;
    });
  }, [sessions, searchQuery, statusFilter]);

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No sessions found.</p>
        <p className="text-sm mt-2">
          Sessions will appear here after using Claude Code with the memoria plugin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "completed" | "in_progress")
          }
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
        </select>
        {(searchQuery || statusFilter !== "all") && (
          <span className="text-sm text-muted-foreground">
            {filteredSessions.length} of {sessions.length} sessions
          </span>
        )}
      </div>

      {/* Session List */}
      {filteredSessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No sessions match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
