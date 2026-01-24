import { notFound } from "next/navigation";
import Link from "next/link";
import { getDecision } from "@/lib/memoria/decisions";
import { DecisionDetail } from "@/components/decisions/decision-detail";
import { DeleteDecisionButton } from "@/components/decisions/delete-decision-button";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DecisionPage({ params }: Props) {
  const { id } = await params;
  const decision = await getDecision(id);

  if (!decision) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/decisions">
            <Button variant="ghost" size="sm">
              ← Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold line-clamp-1">{decision.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/decisions/${id}/edit`}>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </Link>
          <DeleteDecisionButton id={id} />
        </div>
      </div>
      <DecisionDetail decision={decision} />
    </div>
  );
}
