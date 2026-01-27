// lib/interactive.ts
var MAIN_MENU = [
  {
    key: "1",
    label: "Brainstorm",
    description: "Start design-first workflow with Socratic questioning",
    command: "/memoria:brainstorm"
  },
  {
    key: "2",
    label: "Plan",
    description: "Create implementation plan with 2-5 minute tasks",
    command: "/memoria:plan"
  },
  {
    key: "3",
    label: "TDD",
    description: "Test-driven development with RED-GREEN-REFACTOR",
    command: "/memoria:tdd"
  },
  {
    key: "4",
    label: "Debug",
    description: "Systematic debugging with root cause analysis",
    command: "/memoria:debug"
  },
  {
    key: "5",
    label: "Review",
    description: "Code review based on rules and spec compliance",
    command: "/memoria:review"
  },
  {
    key: "6",
    label: "Search",
    description: "Search sessions, decisions, and patterns",
    command: "/memoria:search"
  },
  {
    key: "7",
    label: "Resume",
    description: "Resume a previous session",
    command: "/memoria:resume"
  }
];
function formatMenu(options) {
  const lines = ["## memoria - Interactive Mode\n"];
  lines.push("Select an action:\n");
  for (const opt of options) {
    lines.push(`  ${opt.key}) **${opt.label}** - ${opt.description}`);
  }
  lines.push("\n_Enter number or command name_");
  return lines.join("\n");
}
function parseMenuSelection(input, options) {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  const byKey = options.find((o) => o.key === trimmed);
  if (byKey) return byKey;
  const byLabel = options.find((o) => o.label.toLowerCase() === trimmed);
  if (byLabel) return byLabel;
  return null;
}
function getRecommendedWorkflow() {
  return `## Recommended Workflow

1. **/memoria:brainstorm** - Design and clarify requirements
2. **/memoria:plan** - Create implementation tasks
3. **/memoria:tdd** - Implement with test-first approach
4. **/memoria:review --full** - Review against spec and code quality

_Follow this workflow for best results_`;
}
function getQuickHelp() {
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
export {
  MAIN_MENU,
  formatMenu,
  getQuickHelp,
  getRecommendedWorkflow,
  parseMenuSelection
};
