const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const LINT_BIN = path.join(__dirname, "..", "bin", "lint.js");
const EXAMPLES = path.join(__dirname, "..", "examples");

function runLint(target) {
  try {
    const stdout = execFileSync("node", [LINT_BIN, "--json", target], {
      encoding: "utf8",
    });
    return { exitCode: 0, json: JSON.parse(stdout) };
  } catch (err) {
    // execFileSync throws when the child exits non-zero (warnings found)
    return { exitCode: err.status, json: JSON.parse(err.stdout) };
  }
}

test("flags the known anti-patterns in the inaccessible example", () => {
  const { exitCode, json } = runLint(path.join(EXAMPLES, "inaccessible-cli.js"));
  assert.equal(exitCode, 1);
  const rules = json.files[0].findings.map((f) => f.rule);
  assert.ok(rules.includes("no-bare-spinner-lib"));
  assert.ok(rules.includes("no-bare-table-lib"));
  assert.ok(rules.includes("no-raw-cursor-control"));
});

test("is clean on the accessible example", () => {
  const { exitCode, json } = runLint(path.join(EXAMPLES, "accessible-cli.js"));
  assert.equal(exitCode, 0);
  assert.equal(json.warningCount, 0);
});

test("is clean on the library's own source", () => {
  const { exitCode, json } = runLint(path.join(__dirname, "..", "src"));
  assert.equal(exitCode, 0);
  assert.equal(json.warningCount, 0);
});
