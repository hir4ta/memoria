// lib/utils.ts
import * as fs from "node:fs";
import * as path from "node:path";
function safeReadJson(filePath, fallback) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}
function safeWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// lib/auto-record.ts
function recordToolUse(input) {
  const { sessionPath, toolName, toolInput, toolResult, timestamp } = input;
  if (toolName === "Bash" && toolResult.exitCode === 0) {
    return;
  }
  if (toolName === "Bash" && toolResult.exitCode === void 0) {
    return;
  }
  const session = safeReadJson(sessionPath, {
    id: "",
    interactions: []
  });
  const interactionId = `auto-${Date.now()}`;
  const interaction = {
    id: interactionId,
    topic: "",
    timestamp
  };
  if (toolName === "Edit" || toolName === "Write") {
    const filePath = toolInput.file_path;
    const fileName = filePath?.split("/").pop() || "unknown";
    interaction.topic = `File ${toolName.toLowerCase()}: ${fileName}`;
    interaction.filesModified = [filePath];
    interaction.actions = [
      {
        type: toolName.toLowerCase(),
        path: filePath,
        summary: toolName === "Edit" ? "Edited file" : "Created/wrote file"
      }
    ];
  } else if (toolName === "Bash" && toolResult.exitCode !== 0) {
    const command = toolInput.command || "unknown command";
    interaction.topic = `Command error: ${command.slice(0, 50)}`;
    interaction.problem = `Exit code ${toolResult.exitCode}: ${toolResult.stderr?.slice(0, 500) || "Unknown error"}`;
  }
  session.interactions.push(interaction);
  safeWriteJson(sessionPath, session);
}
var isMain = process.argv[1]?.endsWith("auto-record.js") || process.argv[1]?.endsWith("auto-record.ts");
if (isMain && process.argv.length > 2) {
  const args = process.argv.slice(2);
  const sessionPathIndex = args.indexOf("--session-path");
  const sessionPath = sessionPathIndex !== -1 ? args[sessionPathIndex + 1] : "";
  if (!sessionPath) {
    console.error(
      JSON.stringify({ success: false, error: "Missing --session-path" })
    );
    process.exit(0);
  }
  import("node:fs").then((fs2) => {
    try {
      const input = fs2.readFileSync(0, "utf-8");
      const data = JSON.parse(input);
      recordToolUse({
        sessionPath,
        toolName: data.tool_name,
        toolInput: data.tool_input || {},
        toolResult: data.tool_result || {},
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log(JSON.stringify({ success: true }));
    } catch (error) {
      console.error(JSON.stringify({ success: false, error: String(error) }));
    }
    process.exit(0);
  });
}
export {
  recordToolUse
};
