import {
  AlertTriangle,
  ArrowRightFromLine,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Code,
  FileText,
  Link,
  MessageSquare,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionYaml } from "@/lib/api";
import type { SessionYaml } from "@/lib/types";

interface SessionContextCardProps {
  sessionId: string;
  embedded?: boolean; // If true, render without outer Card wrapper
}

// Section icons using lucide-react
const sectionIcons: Record<string, ReactNode> = {
  summary: <FileText className="h-4 w-4" />,
  plan: <ClipboardList className="h-4 w-4" />,
  discussions: <MessageSquare className="h-4 w-4" />,
  code_examples: <Code className="h-4 w-4" />,
  references: <Link className="h-4 w-4" />,
  handoff: <ArrowRightFromLine className="h-4 w-4" />,
  errors: <AlertTriangle className="h-4 w-4" />,
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
  label,
  children,
}: {
  sectionKey: string;
  label: string;
  children: ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const icon = sectionIcons[sectionKey] || <FileText className="h-4 w-4" />;
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
          <span className="text-muted-foreground">{icon}</span>
          <span className="font-medium text-sm">{label}</span>
        </div>
        <span className="text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
      </button>
      {isExpanded && <div className="px-4 py-3">{children}</div>}
    </div>
  );
}

function SummarySection({
  summary,
  t,
}: {
  summary: SessionYaml["summary"];
  t: (key: string) => string;
}) {
  if (!summary) return null;

  return (
    <div className="space-y-2 text-sm">
      {summary.goal && (
        <div>
          <span className="text-muted-foreground">
            {t("context.fields.goal")}:
          </span>{" "}
          <span>{summary.goal}</span>
        </div>
      )}
      {summary.outcome && (
        <div>
          <span className="text-muted-foreground">
            {t("context.fields.outcome")}:
          </span>{" "}
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
          <span className="text-muted-foreground">
            {t("context.fields.description")}:
          </span>
          <p className="mt-1 whitespace-pre-wrap">{summary.description}</p>
        </div>
      )}
      {summary.session_type && (
        <div>
          <span className="text-muted-foreground">
            {t("context.fields.type")}:
          </span>{" "}
          <Badge variant="outline" className="text-xs">
            {summary.session_type}
          </Badge>
        </div>
      )}
    </div>
  );
}

function PlanSection({
  plan,
  t,
}: {
  plan: SessionYaml["plan"];
  t: (key: string) => string;
}) {
  if (!plan) return null;

  return (
    <div className="space-y-3 text-sm">
      {plan.goals && plan.goals.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            {t("context.fields.goals")}
          </div>
          <ul className="list-disc list-inside space-y-1">
            {plan.goals.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
        </div>
      )}
      {plan.tasks && plan.tasks.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            {t("context.fields.tasks")}
          </div>
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
          <div className="text-xs text-muted-foreground mb-1">
            {t("context.fields.remaining")}
          </div>
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
  t,
}: {
  discussions: SessionYaml["discussions"];
  t: (key: string) => string;
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
            <span className="text-muted-foreground">
              {t("context.fields.decision")}:
            </span>
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
              <span className="text-muted-foreground">
                {t("context.fields.alternatives")}:{" "}
              </span>
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
  t,
}: {
  codeExamples: SessionYaml["code_examples"];
  t: (key: string) => string;
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
              <div className="text-xs text-muted-foreground mb-1">
                {t("context.fields.before")}:
              </div>
              <pre className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto">
                {example.before}
              </pre>
            </div>
          )}
          {example.after && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {t("context.fields.after")}:
              </div>
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

function ErrorsSection({
  errors,
  t,
}: {
  errors: SessionYaml["errors"];
  t: (key: string) => string;
}) {
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
              <span className="text-muted-foreground">
                {t("context.fields.context")}:{" "}
              </span>
              {error.context}
            </div>
          )}
          {error.cause && (
            <div className="text-xs">
              <span className="text-muted-foreground">
                {t("context.fields.cause")}:{" "}
              </span>
              {error.cause}
            </div>
          )}
          {error.solution && (
            <div className="text-xs text-green-600 dark:text-green-400">
              <span className="text-muted-foreground">
                {t("context.fields.solution")}:{" "}
              </span>
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

function HandoffSection({
  handoff,
  t,
}: {
  handoff: SessionYaml["handoff"];
  t: (key: string) => string;
}) {
  if (!handoff) return null;

  return (
    <div className="space-y-2 text-sm">
      {handoff.stopped_reason && (
        <div>
          <span className="text-muted-foreground">
            {t("context.fields.stoppedReason")}:
          </span>{" "}
          <span>{handoff.stopped_reason}</span>
        </div>
      )}
      {handoff.notes && handoff.notes.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            {t("context.fields.notes")}
          </div>
          <ul className="list-disc list-inside space-y-1">
            {handoff.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
      {handoff.next_steps && handoff.next_steps.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            {t("context.fields.nextSteps")}
          </div>
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

export function SessionContextCard({
  sessionId,
  embedded = false,
}: SessionContextCardProps) {
  const { t } = useTranslation("sessions");
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

  const headerContent = (
    <>
      <div className="text-lg flex items-center gap-2 font-semibold">
        <BookOpen className="h-5 w-5 text-muted-foreground" />
        {t("context.title")}
        <Badge variant="secondary" className="text-xs font-normal">
          {t("context.sections", { count: sections })}
        </Badge>
        <Badge variant="outline" className="text-xs font-normal">
          {t("context.yaml")}
        </Badge>
      </div>
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
    </>
  );

  const contentSections = (
    <div className="space-y-3">
      {yaml.summary && (yaml.summary.goal || yaml.summary.description) && (
        <SectionCard
          sectionKey="summary"
          label={t("context.sectionLabels.summary")}
        >
          <SummarySection summary={yaml.summary} t={t} />
        </SectionCard>
      )}

      {yaml.plan &&
        (yaml.plan.tasks?.length || yaml.plan.remaining?.length) && (
          <SectionCard
            sectionKey="plan"
            label={t("context.sectionLabels.plan")}
          >
            <PlanSection plan={yaml.plan} t={t} />
          </SectionCard>
        )}

      {yaml.discussions && yaml.discussions.length > 0 && (
        <SectionCard
          sectionKey="discussions"
          label={t("context.sectionLabels.discussions")}
        >
          <DiscussionsSection discussions={yaml.discussions} t={t} />
        </SectionCard>
      )}

      {yaml.code_examples && yaml.code_examples.length > 0 && (
        <SectionCard
          sectionKey="code_examples"
          label={t("context.sectionLabels.code_examples")}
        >
          <CodeExamplesSection codeExamples={yaml.code_examples} t={t} />
        </SectionCard>
      )}

      {yaml.errors && yaml.errors.length > 0 && (
        <SectionCard
          sectionKey="errors"
          label={t("context.sectionLabels.errors")}
        >
          <ErrorsSection errors={yaml.errors} t={t} />
        </SectionCard>
      )}

      {yaml.handoff &&
        (yaml.handoff.stopped_reason ||
          yaml.handoff.notes?.length ||
          yaml.handoff.next_steps?.length) && (
          <SectionCard
            sectionKey="handoff"
            label={t("context.sectionLabels.handoff")}
          >
            <HandoffSection handoff={yaml.handoff} t={t} />
          </SectionCard>
        )}

      {yaml.references && yaml.references.length > 0 && (
        <SectionCard
          sectionKey="references"
          label={t("context.sectionLabels.references")}
        >
          <ReferencesSection references={yaml.references} />
        </SectionCard>
      )}
    </div>
  );

  // Embedded mode: render without Card wrapper
  if (embedded) {
    return (
      <div className="space-y-4">
        <div className="pb-3">{headerContent}</div>
        {contentSections}
      </div>
    );
  }

  // Default: render with Card wrapper
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          {t("context.title")}
          <Badge variant="secondary" className="text-xs font-normal">
            {t("context.sections", { count: sections })}
          </Badge>
          <Badge variant="outline" className="text-xs font-normal">
            {t("context.yaml")}
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
      <CardContent>{contentSections}</CardContent>
    </Card>
  );
}
