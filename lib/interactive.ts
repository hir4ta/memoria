export interface MenuOption {
  key: string;
  label: string;
  description: string;
  command: string;
}

/**
 * メインメニュー定義
 */
export const MAIN_MENU: MenuOption[] = [
  {
    key: "1",
    label: "Brainstorm",
    description: "Start design-first workflow with Socratic questioning",
    command: "/memoria:brainstorm",
  },
  {
    key: "2",
    label: "Plan",
    description: "Create implementation plan with 2-5 minute tasks",
    command: "/memoria:plan",
  },
  {
    key: "3",
    label: "TDD",
    description: "Test-driven development with RED-GREEN-REFACTOR",
    command: "/memoria:tdd",
  },
  {
    key: "4",
    label: "Debug",
    description: "Systematic debugging with root cause analysis",
    command: "/memoria:debug",
  },
  {
    key: "5",
    label: "Review",
    description: "Code review based on rules and spec compliance",
    command: "/memoria:review",
  },
  {
    key: "6",
    label: "Search",
    description: "Search sessions, decisions, and patterns",
    command: "/memoria:search",
  },
  {
    key: "7",
    label: "Resume",
    description: "Resume a previous session",
    command: "/memoria:resume",
  },
];

/**
 * メニューをフォーマットして表示用文字列を生成
 */
export function formatMenu(options: MenuOption[]): string {
  const lines = ["## memoria - Interactive Mode\n"];
  lines.push("Select an action:\n");

  for (const opt of options) {
    lines.push(`  ${opt.key}) **${opt.label}** - ${opt.description}`);
  }

  lines.push("\n_Enter number or command name_");
  return lines.join("\n");
}

/**
 * ユーザー入力からメニュー項目を選択
 */
export function parseMenuSelection(
  input: string,
  options: MenuOption[],
): MenuOption | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // 数字で選択
  const byKey = options.find((o) => o.key === trimmed);
  if (byKey) return byKey;

  // ラベルで選択
  const byLabel = options.find((o) => o.label.toLowerCase() === trimmed);
  if (byLabel) return byLabel;

  return null;
}

/**
 * 推奨ワークフローを表示
 */
export function getRecommendedWorkflow(): string {
  return `## Recommended Workflow

1. **/memoria:brainstorm** - Design and clarify requirements
2. **/memoria:plan** - Create implementation tasks
3. **/memoria:tdd** - Implement with test-first approach
4. **/memoria:review --full** - Review against spec and code quality

_Follow this workflow for best results_`;
}

/**
 * クイックヘルプを表示
 */
export function getQuickHelp(): string {
  return `## Quick Help

**Common commands:**
- \`/memoria:resume\` - Continue previous session
- \`/memoria:search <query>\` - Find past sessions/decisions
- \`/memoria:save\` - Force save current session

**Review options:**
- \`--staged\` - Review staged changes (default)
- \`--all\` - Review all changes
- \`--full\` - Two-stage review (spec + code quality)

**Resume options:**
- \`--continue\` - Load pending tasks
- \`--type=<type>\` - Filter by session type
- \`--tag=<tag>\` - Filter by tag`;
}
