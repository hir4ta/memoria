import Link from "next/link";
import { DecisionForm } from "@/components/decisions/decision-form";
import { Button } from "@/components/ui/button";

// For now, use a default user name
// In production, this would come from authentication
const DEFAULT_USER_NAME = "Developer";

export default function NewDecisionPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/decisions">
          <Button variant="ghost" size="sm">
            ← Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Decision</h1>
      </div>
      <DecisionForm userName={DEFAULT_USER_NAME} />
    </div>
  );
}
