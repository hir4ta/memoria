"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RuleFormDialog } from "./rule-form";
import { removeRuleAction } from "@/app/actions/rules";
import type { Rules } from "@/lib/memoria/types";

interface RuleListClientProps {
  initialRules: Rules | null;
}

export function RuleListClient({ initialRules }: RuleListClientProps) {
  const router = useRouter();
  const ruleCount = initialRules?.rules.length ?? 0;

  const handleSuccess = () => {
    router.refresh();
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) {
      return;
    }
    const result = await removeRuleAction(ruleId);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || "Failed to delete rule");
    }
  };

  if (!initialRules || initialRules.rules.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Coding Rules</h1>
            <p className="text-sm text-muted-foreground">0 rules</p>
          </div>
          <RuleFormDialog onSuccess={handleSuccess}>
            <Button>+ Add Rule</Button>
          </RuleFormDialog>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <p>No coding rules defined yet.</p>
          <p className="text-sm mt-2">
            Rules will appear here when you add them.
          </p>
        </div>
      </div>
    );
  }

  // Group rules by category
  const rulesByCategory = initialRules.rules.reduce(
    (acc, rule) => {
      const category = rule.category || "General";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(rule);
      return acc;
    },
    {} as Record<string, typeof initialRules.rules>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Coding Rules</h1>
          <p className="text-sm text-muted-foreground">
            {ruleCount} rule{ruleCount !== 1 ? "s" : ""}
          </p>
        </div>
        <RuleFormDialog onSuccess={handleSuccess}>
          <Button>+ Add Rule</Button>
        </RuleFormDialog>
      </div>

      <p className="text-xs text-muted-foreground">
        Last updated: {new Date(initialRules.updatedAt).toLocaleDateString("ja-JP")}
      </p>

      {Object.entries(rulesByCategory).map(([category, categoryRules]) => (
        <Card key={category}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">{category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryRules.map((rule) => (
                <div key={rule.id} className="border-l-2 border-muted pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium">{rule.rule}</p>
                    <div className="flex gap-1 ml-2">
                      <RuleFormDialog
                        rule={rule}
                        onSuccess={handleSuccess}
                      >
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </RuleFormDialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(rule.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  {rule.example && (
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                      {rule.example}
                    </pre>
                  )}
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      Added by {rule.addedBy}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
