import { safeReadJson, safeWriteJson } from "./utils.js";

export interface AutoRecordInput {
  sessionPath: string;
  toolName: "Edit" | "Write" | "Bash";
  toolInput: Record<string, unknown>;
  toolResult: { exitCode?: number; stderr?: string; stdout?: string };
  timestamp: string;
}

interface Interaction {
  id: string;
  topic: string;
  timestamp: string;
  filesModified?: string[];
  problem?: string;
  actions?: { type: string; path: string; summary: string }[];
}

interface Session {
  id: string;
  interactions: Interaction[];
}

/**
 * ツール使用を記録する
 * Edit/Write: ファイル変更を記録
 * Bash: エラー時のみ problem として記録
 */
export function recordToolUse(input: AutoRecordInput): void {
  const { sessionPath, toolName, toolInput, toolResult, timestamp } = input;

  // Bash で exitCode が 0 の場合は記録しない
  if (toolName === "Bash" && toolResult.exitCode === 0) {
    return;
  }

  // Bash で exitCode が undefined の場合も記録しない（正常終了扱い）
  if (toolName === "Bash" && toolResult.exitCode === undefined) {
    return;
  }

  const session = safeReadJson<Session>(sessionPath, {
    id: "",
    interactions: [],
  });
  const interactionId = `auto-${Date.now()}`;

  const interaction: Interaction = {
    id: interactionId,
    topic: "",
    timestamp,
  };

  if (toolName === "Edit" || toolName === "Write") {
    const filePath = toolInput.file_path as string;
    const fileName = filePath?.split("/").pop() || "unknown";
    interaction.topic = `File ${toolName.toLowerCase()}: ${fileName}`;
    interaction.filesModified = [filePath];
    interaction.actions = [
      {
        type: toolName.toLowerCase(),
        path: filePath,
        summary: toolName === "Edit" ? "Edited file" : "Created/wrote file",
      },
    ];
  } else if (toolName === "Bash" && toolResult.exitCode !== 0) {
    const command = (toolInput.command as string) || "unknown command";
    interaction.topic = `Command error: ${command.slice(0, 50)}`;
    interaction.problem = `Exit code ${toolResult.exitCode}: ${toolResult.stderr?.slice(0, 500) || "Unknown error"}`;
  }

  session.interactions.push(interaction);
  safeWriteJson(sessionPath, session);
}

// CLI エントリポイント
const isMain =
  process.argv[1]?.endsWith("auto-record.js") ||
  process.argv[1]?.endsWith("auto-record.ts");

if (isMain && process.argv.length > 2) {
  const args = process.argv.slice(2);
  const sessionPathIndex = args.indexOf("--session-path");
  const sessionPath = sessionPathIndex !== -1 ? args[sessionPathIndex + 1] : "";

  if (!sessionPath) {
    console.error(
      JSON.stringify({ success: false, error: "Missing --session-path" }),
    );
    process.exit(0);
  }

  // stdin から JSON を読み込み
  import("node:fs").then((fs) => {
    try {
      const input = fs.readFileSync(0, "utf-8");
      const data = JSON.parse(input);
      recordToolUse({
        sessionPath,
        toolName: data.tool_name,
        toolInput: data.tool_input || {},
        toolResult: data.tool_result || {},
        timestamp: new Date().toISOString(),
      });
      console.log(JSON.stringify({ success: true }));
    } catch (error) {
      console.error(JSON.stringify({ success: false, error: String(error) }));
    }
    process.exit(0);
  });
}
