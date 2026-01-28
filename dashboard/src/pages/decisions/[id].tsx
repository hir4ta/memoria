import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { deleteDecision, getDecision, updateDecision } from "@/lib/api";
import type { Decision } from "@/lib/types";

export function DecisionDetailPage() {
  const { t, i18n } = useTranslation("decisions");
  const { t: tc } = useTranslation("common");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDecision, setEditDecision] = useState("");
  const [editReasoning, setEditReasoning] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editStatus, setEditStatus] = useState<Decision["status"]>("active");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getDecision(id)
      .then((data) => {
        setDecision(data);
        setEditTitle(data.title);
        setEditDecision(data.decision);
        setEditReasoning(data.reasoning);
        setEditTags(data.tags.join(", "));
        setEditStatus(data.status);
        setError(null);
      })
      .catch(() => setError("Failed to load decision"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!decision || !id) return;
    setSaveError(null);
    try {
      const updated = await updateDecision(id, {
        ...decision,
        title: editTitle,
        decision: editDecision,
        reasoning: editReasoning,
        tags: editTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: editStatus,
      });
      setDecision(updated);
      setIsEditing(false);
    } catch {
      setSaveError("Failed to save");
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteDecision(id);
      setDeleteDialogOpen(false);
      navigate("/decisions");
    } catch {
      // Keep dialog open on error
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    if (!id) return;
    window.open(`/api/export/decisions/${id}/markdown`, "_blank");
  };

  if (loading) {
    return <div className="text-center py-12">{tc("loading")}</div>;
  }

  if (error || !decision) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">
          {error || t("errors:decisionNotFound")}
        </p>
        <Link to="/decisions" className="text-primary underline mt-4 block">
          {t("errors:backToDecisions")}
        </Link>
      </div>
    );
  }

  const date = new Date(decision.createdAt).toLocaleString(
    i18n.language === "ja" ? "ja-JP" : "en-US",
  );

  const statusColors = {
    draft: "outline",
    active: "default",
    superseded: "secondary",
    deprecated: "destructive",
  } as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/decisions"
            className="text-muted-foreground hover:text-foreground"
          >
            &larr; {tc("back")}
          </Link>
          <h1 className="text-2xl font-bold">{t("detail.title")}</h1>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                {tc("cancel")}
              </Button>
              <Button onClick={handleSave}>{tc("save")}</Button>
              {saveError && (
                <span className="text-destructive text-sm">{saveError}</span>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleExport}>
                {tc("export")}
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                {tc("edit")}
              </Button>
              <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
              >
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">{tc("delete")}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {tc("deleteDialog.description")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                      {tc("cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? tc("deleting") : tc("delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                className="text-lg font-bold"
              />
            ) : (
              decision.title
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{tc("user")}:</span>{" "}
              {decision.user.name}
            </div>
            <div>
              <span className="text-muted-foreground">{tc("date")}:</span>{" "}
              {date}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{tc("status")}:</span>
              {isEditing ? (
                <Select
                  value={editStatus}
                  onValueChange={(value) =>
                    setEditStatus(value as Decision["status"])
                  }
                >
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t("status.draft")}</SelectItem>
                    <SelectItem value="active">{t("status.active")}</SelectItem>
                    <SelectItem value="superseded">
                      {t("status.superseded")}
                    </SelectItem>
                    <SelectItem value="deprecated">
                      {t("status.deprecated")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={statusColors[decision.status]}>
                  {t(`status.${decision.status}`)}
                </Badge>
              )}
            </div>
            {decision.source && (
              <div>
                <span className="text-muted-foreground">
                  {t("detail.source")}:
                </span>{" "}
                <Badge variant="outline">
                  {decision.source === "auto"
                    ? t("detail.autoDetected")
                    : t("detail.manual")}
                </Badge>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              {t("detail.decision")}
            </h3>
            {isEditing ? (
              <Textarea
                value={editDecision}
                onChange={(e) => setEditDecision(e.target.value)}
                className="min-h-[100px]"
              />
            ) : (
              <p className="whitespace-pre-wrap">{decision.decision}</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              {t("detail.reasoning")}
            </h3>
            {isEditing ? (
              <Textarea
                value={editReasoning}
                onChange={(e) => setEditReasoning(e.target.value)}
                className="min-h-[100px]"
              />
            ) : (
              <p className="whitespace-pre-wrap">{decision.reasoning}</p>
            )}
          </div>

          {decision.alternatives.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {t("detail.alternatives")}
              </h3>
              <ul className="space-y-2">
                {decision.alternatives.map((alt) => (
                  <li key={`${alt.option}-${alt.rejected}`} className="text-sm">
                    <span className="font-medium">{alt.option}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      - {alt.rejected}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <span className="text-muted-foreground text-sm">{tc("tags")}:</span>
            {isEditing ? (
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
                className="mt-1"
              />
            ) : (
              <div className="flex flex-wrap gap-1 mt-1">
                {decision.tags.length > 0 ? (
                  decision.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">
                    {tc("noTags")}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
