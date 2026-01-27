import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionYaml } from "@/lib/api";
import type { SessionYaml } from "@/lib/types";

interface SessionContextCardProps {
  sessionId: string;
}

// Section icons
const sectionIcons: Record<string, string> = {
  summary: "📝",
  plan: "📋",
  discussions: "💬",
  code_examples: "💻",
  references: "🔗",
  handoff: "📌",
  errors: "🔧",
};

// Section labels
const sectionLabels: Record<string, string> = {
  summary: "Summary",
  plan: "Plan & Tasks",
  discussions: "Discussions",
  code_examples: "Code Examples",
  references: "References",
  handoff: "Handoff",
  errors: "Errors & Solutions",
};

// Section colors
const sectionColors: Record<string, string> = {
  summary: "border-l-blue-500",
  plan: "border-l-purple-500",
  discussions: "border-l-indigo-500",
  code_examples: "border-l-green-500",
  references: "border-l-yellow-500",
  handoff: "border-l-orange-500",
  errors: "border-l-red-500",
};

function SectionCard({
  sectionKey,
  children,
}: {
  sectionKey: string;
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const icon = sectionIcons[sectionKey] || "📄";
  const label = sectionLabels[sectionKey] || sectionKey;
  const borderColor = sectionColors[sectionKey] || "border-l-gray-500";

  return (
    <div
      className={`border-l-4 ${borderColor} bg-card rounded-r-lg shadow-sm overflow-hidden`}
    >
      <button
        type="button"
        className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-medium text-sm">{label}</span>
        </div>
        <span className="text-muted-foreground text-xs">
          {isExpanded ? "▼" : "▶"}
        </span>
      </button>
      {isExpanded && <div className="px-4 py-3">{children}</div>}
    </div>
  );
}

function SummarySection({ summary }: { summary: SessionYaml["summary"] }) {
  if (!summary) return null;

  return (
    <div className="space-y-2 text-sm">
      {summary.goal && (
        <div>
          <span className="text-muted-foreground">Goal:</span>{" "}
          <span>{summary.goal}</span>
        </div>
      )}
      {summary.outcome && (
        <div>
          <span className="text-muted-foreground">Outcome:</span>{" "}
          <Badge
            variant={summary.outcome === "success" ? "default" : "secondary"}
            className="text-xs"
          >
            {summary.outcome}
          </Badge>
        </div>
      )}
      {summary.description && (
        <div>
          <span className="text-muted-foreground">Description:</span>{" "}
          <span>{summary.description}</span>
        </div>
      )}
      {summary.session_type && (
        <div>
          <span className="text-muted-foreground">Type:</span>{" "}
          <Badge variant="outline" className="text-xs">
            {summary.session_type}
          </Badge>
        </div>
      )}
    </div>
  );
}

function PlanSection({ plan }: { plan: SessionYaml["plan"] }) {
  if (!plan) return null;

  return (
    <div className="space-y-3 text-sm">
      {plan.goals && plan.goals.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Goals</div>
          <ul className="list-disc list-inside space-y-1">
            {plan.goals.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
        </div>
      )}
      {plan.tasks && plan.tasks.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Tasks</div>
          <ul className="space-y-1 font-mono text-xs">
            {plan.tasks.map((task) => (
              <li
                key={task}
                className={
                  task.startsWith("[x]")
                    ? "text-green-600 dark:text-green-400"
                    : ""
                }
              >
                {task}
              </li>
            ))}
          </ul>
        </div>
      )}
      {plan.remaining && plan.remaining.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Remaining</div>
          <ul className="list-disc list-inside space-y-1 text-orange-600 dark:text-orange-400">
            {plan.remaining.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DiscussionsSection({
  discussions,
}: {
  discussions: SessionYaml["discussions"];
}) {
  if (!discussions || discussions.length === 0) return null;

  return (
    <div className="space-y-3">
      {discussions.map((discussion) => (
        <div
          key={`${discussion.topic}-${discussion.decision}`}
          className="bg-muted/30 rounded p-3 space-y-2 text-sm"
        >
          <div className="font-medium">{discussion.topic}</div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Decision:</span>
            <Badge variant="default" className="text-xs">
              {discussion.decision}
            </Badge>
          </div>
          {discussion.reasoning && (
            <div className="text-muted-foreground text-xs">
              {discussion.reasoning}
            </div>
          )}
          {discussion.alternatives && discussion.alternatives.length > 0 && (
            <div className="text-xs">
              <span className="text-muted-foreground">Alternatives: </span>
              {discussion.alternatives.join(", ")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CodeExamplesSection({
  codeExamples,
}: {
  codeExamples: SessionYaml["code_examples"];
}) {
  if (!codeExamples || codeExamples.length === 0) return null;

  return (
    <div className="space-y-3">
      {codeExamples.map((example) => (
        <div
          key={`${example.file}-${example.description || ""}`}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              {example.file}
            </Badge>
            {example.description && (
              <span className="text-xs text-muted-foreground">
                {example.description}
              </span>
            )}
          </div>
          {example.before && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Before:</div>
              <pre className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto">
                {example.before}
              </pre>
            </div>
          )}
          {example.after && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">After:</div>
              <pre className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto">
                {example.after}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ErrorsSection({ errors }: { errors: SessionYaml["errors"] }) {
  if (!errors || errors.length === 0) return null;

  return (
    <div className="space-y-3">
      {errors.map((error) => (
        <div
          key={`${error.error}-${error.cause || ""}`}
          className="bg-destructive/10 border border-destructive/20 rounded p-3 space-y-2 text-sm"
        >
          <div className="font-mono text-xs text-destructive">
            {error.error}
          </div>
          {error.context && (
            <div className="text-xs">
              <span className="text-muted-foreground">Context: </span>
              {error.context}
            </div>
          )}
          {error.cause && (
            <div className="text-xs">
              <span className="text-muted-foreground">Cause: </span>
              {error.cause}
            </div>
          )}
          {error.solution && (
            <div className="text-xs text-green-600 dark:text-green-400">
              <span className="text-muted-foreground">Solution: </span>
              {error.solution}
            </div>
          )}
          {error.files && error.files.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {error.files.map((file) => (
                <Badge
                  key={file}
                  variant="secondary"
                  className="text-xs font-mono"
                >
                  {file}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function HandoffSection({ handoff }: { handoff: SessionYaml["handoff"] }) {
  if (!handoff) return null;

  return (
    <div className="space-y-2 text-sm">
      {handoff.stopped_reason && (
        <div>
          <span className="text-muted-foreground">Stopped reason:</span>{" "}
          <span>{handoff.stopped_reason}</span>
        </div>
      )}
      {handoff.notes && handoff.notes.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Notes</div>
          <ul className="list-disc list-inside space-y-1">
            {handoff.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
      {handoff.next_steps && handoff.next_steps.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Next Steps</div>
          <ul className="list-disc list-inside space-y-1 text-primary">
            {handoff.next_steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReferencesSection({
  references,
}: {
  references: SessionYaml["references"];
}) {
  if (!references || references.length === 0) return null;

  return (
    <div className="space-y-2">
      {references.map((ref) => (
        <div
          key={`${ref.type || ""}-${ref.url || ref.path || ref.title || ""}`}
          className="flex items-start gap-2 text-sm"
        >
          {ref.type && (
            <Badge variant="outline" className="text-xs">
              {ref.type}
            </Badge>
          )}
          {ref.url ? (
            <a
              href={ref.url}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              {ref.title || ref.url}
            </a>
          ) : ref.path ? (
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
              {ref.path}
            </code>
          ) : (
            ref.title
          )}
          {ref.description && (
            <span className="text-muted-foreground text-xs">
              - {ref.description}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function SessionContextCard({ sessionId }: SessionContextCardProps) {
  const [yaml, setYaml] = useState<SessionYaml | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchYaml() {
      try {
        const data = await getSessionYaml(sessionId);
        if (data.exists && data.data) {
          setYaml(data.data);
        }
      } catch (err) {
        setError("Failed to load context");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchYaml();
  }, [sessionId]);

  if (loading) {
    return null; // Don't show loading state for optional content
  }

  if (error || !yaml) {
    return null; // Don't show error for optional content
  }

  // Count available sections
  const sections = [
    yaml.summary && (yaml.summary.goal || yaml.summary.description),
    yaml.plan && (yaml.plan.tasks?.length || yaml.plan.remaining?.length),
    yaml.discussions && yaml.discussions.length > 0,
    yaml.code_examples && yaml.code_examples.length > 0,
    yaml.errors && yaml.errors.length > 0,
    yaml.handoff &&
      (yaml.handoff.stopped_reason ||
        yaml.handoff.notes?.length ||
        yaml.handoff.next_steps?.length),
    yaml.references && yaml.references.length > 0,
  ].filter(Boolean).length;

  if (sections === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-xl">📝</span>
          Session Context
          <Badge variant="secondary" className="text-xs font-normal">
            {sections} sections
          </Badge>
          <Badge variant="outline" className="text-xs font-normal">
            YAML
          </Badge>
        </CardTitle>
        {yaml.summary && (
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
            {yaml.summary.outcome && (
              <Badge
                variant={
                  yaml.summary.outcome === "success" ? "default" : "outline"
                }
                className="text-xs"
              >
                {yaml.summary.outcome}
              </Badge>
            )}
            {yaml.summary.session_type && (
              <Badge variant="outline" className="text-xs">
                {yaml.summary.session_type}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {yaml.summary && (yaml.summary.goal || yaml.summary.description) && (
          <SectionCard sectionKey="summary">
            <SummarySection summary={yaml.summary} />
          </SectionCard>
        )}

        {yaml.plan &&
          (yaml.plan.tasks?.length || yaml.plan.remaining?.length) && (
            <SectionCard sectionKey="plan">
              <PlanSection plan={yaml.plan} />
            </SectionCard>
          )}

        {yaml.discussions && yaml.discussions.length > 0 && (
          <SectionCard sectionKey="discussions">
            <DiscussionsSection discussions={yaml.discussions} />
          </SectionCard>
        )}

        {yaml.code_examples && yaml.code_examples.length > 0 && (
          <SectionCard sectionKey="code_examples">
            <CodeExamplesSection codeExamples={yaml.code_examples} />
          </SectionCard>
        )}

        {yaml.errors && yaml.errors.length > 0 && (
          <SectionCard sectionKey="errors">
            <ErrorsSection errors={yaml.errors} />
          </SectionCard>
        )}

        {yaml.handoff &&
          (yaml.handoff.stopped_reason ||
            yaml.handoff.notes?.length ||
            yaml.handoff.next_steps?.length) && (
            <SectionCard sectionKey="handoff">
              <HandoffSection handoff={yaml.handoff} />
            </SectionCard>
          )}

        {yaml.references && yaml.references.length > 0 && (
          <SectionCard sectionKey="references">
            <ReferencesSection references={yaml.references} />
          </SectionCard>
        )}
      </CardContent>
    </Card>
  );
}
