import { notFound } from "next/navigation";
import Link from "next/link";
import { getDecision } from "@/lib/memoria/decisions";
import { DecisionForm } from "@/components/decisions/decision-form";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditDecisionPage({ params }: Props) {
  const { id } = await params;
  const decision = await getDecision(id);

  if (!decision) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/decisions/${id}`}>
          <Button variant="ghost" size="sm">
            ← Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Decision</h1>
      </div>
      <DecisionForm decision={decision} userName={decision.user.name} />
    </div>
  );
}
