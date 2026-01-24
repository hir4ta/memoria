import Link from "next/link";
import { getDecisions } from "@/lib/memoria/decisions";
import { DecisionListClient } from "@/components/decisions/decision-list-client";
import { Button } from "@/components/ui/button";

export default async function DecisionsPage() {
  const decisions = await getDecisions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Decisions</h1>
          <p className="text-sm text-muted-foreground">
            {decisions.length} decision{decisions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/decisions/new">
          <Button>+ New Decision</Button>
        </Link>
      </div>
      <DecisionListClient decisions={decisions} />
    </div>
  );
}
