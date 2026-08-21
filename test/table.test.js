const test = require("node:test");
const assert = require("node:assert/strict");
const { renderTable } = require("../src/table");

function capture() {
  const chunks = [];
  return {
    stream: { write: (chunk) => chunks.push(chunk) },
    output: () => chunks.join(""),
  };
}

test("accessible mode renders a missing field as \"(not set)\", not the literal word 'undefined'", () => {
  const { stream, output } = capture();
  renderTable(
    [
      { Service: "api", Status: "running" },
      { Service: "worker" },
    ],
    { accessible: true, stream }
  );
  assert.ok(!output().includes("Status: undefined"));
  assert.ok(output().includes("Status: (not set)"));
});

test("non-accessible mode renders a missing field as a blank cell", () => {
  const { stream, output } = capture();
  renderTable(
    [
      { Service: "api", Status: "running" },
      { Service: "worker" },
    ],
    { accessible: false, stream }
  );
  assert.ok(!output().includes("undefined"));
});
