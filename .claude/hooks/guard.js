// PreToolUse guard for Edit/Write/MultiEdit.
// 1. Evaluation ground truth (answer key, recorded AI fixtures, eval targets) is read-only for Claude.
// 2. Deterministic rules in src/rules/ must never import the Claude SDK or the src/ai/ module.
const PROTECTED = [/(^|\/)data\/answer-key\.json$/, /(^|\/)tests\/fixtures\//, /(^|\/)eval\/targets\.json$/];
const RULES_DIR = /(^|\/)src\/rules\//;
const AI_IMPORT = /['"](@anthropic-ai\/sdk|[^'"]*\/ai(\/[^'"]*)?)['"]/;

function block(message) {
  process.stderr.write(message);
  process.exit(2);
}

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  const input = JSON.parse(raw || "{}").tool_input || {};
  const path = (input.file_path || "").replace(/\\/g, "/");

  if (PROTECTED.some((p) => p.test(path))) {
    block(`Blocked: ${path} is evaluation ground truth. Fix the code, not the answer key, fixtures or targets. ` +
      "If the ground truth itself is wrong, stop and ask the user to change it.");
  }

  if (RULES_DIR.test(path)) {
    const text = [input.content, input.new_string, ...(input.edits || []).map((e) => e.new_string)]
      .filter(Boolean).join("\n");
    if (AI_IMPORT.test(text)) {
      block("Blocked: src/rules/ is deterministic code. Arithmetic, GST, PO matching and duplicate checks " +
        "must not call Claude (no @anthropic-ai/sdk or src/ai/ imports).");
    }
  }
});
