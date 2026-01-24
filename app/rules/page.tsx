import { getRules } from "@/lib/memoria/rules";
import { RuleListClient } from "@/components/rules/rule-list-client";

export default async function RulesPage() {
  const rules = await getRules();

  return <RuleListClient initialRules={rules} />;
}
