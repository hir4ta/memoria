import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteSession, getSession, getTags, updateSession } from "@/lib/api";
import type { Interaction, Session, Tag } from "@/lib/types";

function InteractionCard({
  interaction,
  index,
}: {
  interaction: Interaction;
  index: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const timestamp = new Date(interaction.timestamp).toLocaleString("ja-JP");
  const hasDetails =
    interaction.thinking ||
    (interaction.proposals && interaction.proposals.length > 0) ||
    interaction.reasoning ||
    (interaction.actions && interaction.actions.length > 0);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            #{index + 1}
          </Badge>
          <span className="font-medium">{interaction.topic}</span>
        </div>
        <span className="text-xs text-muted-foreground">{timestamp}</span>
      </div>

      {interaction.request && (
        <div className="bg-muted rounded p-3">
          <div className="text-xs text-muted-foreground mb-1">Request</div>
          <div className="text-sm whitespace-pre-wrap">
            {interaction.request}
          </div>
        </div>
      )}

      {interaction.problem && (
        <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
          <div className="text-xs text-destructive mb-1">Problem</div>
          <div className="text-sm whitespace-pre-wrap">
            {interaction.problem}
          </div>
        </div>
      )}

      {interaction.choice && (
        <div className="bg-primary/10 border border-primary/20 rounded p-3">
          <div className="text-xs text-primary mb-1">Choice</div>
          <div className="text-sm font-medium">{interaction.choice}</div>
        </div>
      )}

      {interaction.webLinks && interaction.webLinks.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Web Links</div>
          <div className="flex flex-wrap gap-1">
            {interaction.webLinks.map((link) => (
              <a
                key={link}
                href={link}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary underline hover:no-underline"
              >
                {new URL(link).hostname}
              </a>
            ))}
          </div>
        </div>
      )}

      {interaction.filesModified && interaction.filesModified.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Files Modified
          </div>
          <div className="flex flex-wrap gap-1">
            {interaction.filesModified.map((file) => (
              <Badge
                key={file}
                variant="secondary"
                className="text-xs font-mono"
              >
                {file}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {hasDetails && (
        <div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {isExpanded ? "▼ Hide details" : "▶ Show details"}
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-3 pl-3 border-l-2 border-muted">
              {interaction.thinking && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Thinking
                  </div>
                  <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap overflow-x-auto">
                    {interaction.thinking}
                  </pre>
                </div>
              )}

              {interaction.proposals && interaction.proposals.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Proposals
                  </div>
                  <ul className="text-sm space-y-1">
                    {interaction.proposals.map((proposal, i) => (
                      <li
                        key={`${proposal.option}-${i}`}
                        className={`p-2 rounded ${
                          proposal.option === interaction.choice
                            ? "bg-primary/10 border border-primary/20"
                            : "bg-muted"
                        }`}
                      >
                        <span className="font-medium">{proposal.option}</span>
                        {proposal.description && (
                          <span className="text-muted-foreground">
                            {" "}
                            - {proposal.description}
                          </span>
                        )}
                        {proposal.option === interaction.choice && (
                          <Badge className="ml-2 text-xs" variant="default">
                            Selected
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {interaction.reasoning && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Reasoning
                  </div>
                  <div className="text-sm bg-muted p-2 rounded whitespace-pre-wrap">
                    {interaction.reasoning}
                  </div>
                </div>
              )}

              {interaction.actions && interaction.actions.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Actions
                  </div>
                  <ul className="text-sm space-y-1">
                    {interaction.actions.map((action, i) => (
                      <li
                        key={`${action.path}-${i}`}
                        className="flex items-center gap-2"
                      >
                        <Badge
                          variant={
                            action.type === "create"
                              ? "default"
                              : action.type === "delete"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {action.type}
                        </Badge>
                        <span className="font-mono text-xs">{action.path}</span>
                        {action.summary && (
                          <span className="text-muted-foreground">
                            - {action.summary}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editTags, setEditTags] = useState("");

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [sessionData, tagsData] = await Promise.all([
        getSession(id),
        getTags(),
      ]);
      setSession(sessionData);
      setTags(tagsData.tags || []);
      setEditTitle(sessionData.title || "");
      setEditGoal(sessionData.goal || "");
      setEditTags(sessionData.tags.join(", "));
      setError(null);
    } catch {
      setError("Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!session || !id) return;
    try {
      const updated = await updateSession(id, {
        ...session,
        title: editTitle,
        goal: editGoal,
        tags: editTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setSession(updated);
      setIsEditing(false);
    } catch {
      alert("Failed to save");
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm("Delete this session?")) return;
    try {
      await deleteSession(id);
      navigate("/");
    } catch {
      alert("Failed to delete");
    }
  };

  const getTagColor = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    return tag?.color || "#6B7280";
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (error || !session) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error || "Session not found"}</p>
        <Link to="/" className="text-primary underline mt-4 block">
          Back to sessions
        </Link>
      </div>
    );
  }

  const date = new Date(session.createdAt).toLocaleString("ja-JP");
  const userName = session.context.user?.name || "unknown";
  const interactionCount = session.interactions?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            &larr; Back
          </Link>
          <h1 className="text-2xl font-bold">Session Detail</h1>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Session title"
                className="text-lg font-bold"
              />
            ) : (
              session.title || "Untitled session"
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div>
              <label
                htmlFor="edit-goal"
                className="text-sm text-muted-foreground"
              >
                Goal
              </label>
              <Input
                id="edit-goal"
                value={editGoal}
                onChange={(e) => setEditGoal(e.target.value)}
                placeholder="Session goal"
                className="mt-1"
              />
            </div>
          ) : (
            session.goal && (
              <p className="text-muted-foreground">{session.goal}</p>
            )
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">User:</span> {userName}
            </div>
            <div>
              <span className="text-muted-foreground">Date:</span> {date}
            </div>
            <div>
              <span className="text-muted-foreground">Branch:</span>{" "}
              <span className="font-mono">
                {session.context.branch || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Interactions:</span>{" "}
              {interactionCount}
            </div>
          </div>

          <div>
            <span className="text-muted-foreground text-sm">Tags:</span>
            {isEditing ? (
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
                className="mt-1"
              />
            ) : (
              <div className="flex flex-wrap gap-1 mt-1">
                {session.tags.length > 0 ? (
                  session.tags.map((tagId) => (
                    <Badge
                      key={tagId}
                      variant="secondary"
                      className="text-xs"
                      style={{
                        backgroundColor: `${getTagColor(tagId)}20`,
                        color: getTagColor(tagId),
                        borderColor: getTagColor(tagId),
                      }}
                    >
                      {tagId}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">No tags</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {interactionCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Interactions ({interactionCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {session.interactions.map((interaction, index) => (
                <InteractionCard
                  key={interaction.id}
                  interaction={interaction}
                  index={index}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {interactionCount === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No interactions recorded in this session.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
