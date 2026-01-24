import { notFound } from "next/navigation";
import Link from "next/link";
import { getPatternsByUser } from "@/lib/memoria/patterns";
import { PatternDetail } from "@/components/patterns/pattern-detail";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ user: string }>;
}

export default async function UserPatternsPage({ params }: Props) {
  const { user } = await params;

  // Safely decode URI component
  let decodedUser: string;
  try {
    decodedUser = decodeURIComponent(user);
  } catch {
    notFound();
  }

  const pattern = await getPatternsByUser(decodedUser);

  if (!pattern) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/patterns">
          <Button variant="ghost" size="sm">
            ← Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{pattern.user.name}&apos;s Patterns</h1>
      </div>
      <PatternDetail pattern={pattern} />
    </div>
  );
}
