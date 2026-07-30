const test = require("node:test");
const assert = require("node:assert/strict");
const { isScreenReaderMode, hasAccessibilityFlag } = require("../src/detect");

test("explicit override wins over everything else", () => {
  assert.equal(isScreenReaderMode({ accessible: true }), true);
  assert.equal(isScreenReaderMode({ accessible: false }), false);
});

test("--screen-reader flag is detected", () => {
  assert.equal(hasAccessibilityFlag(["node", "cli.js", "--screen-reader"]), true);
  assert.equal(hasAccessibilityFlag(["node", "cli.js", "--a11y"]), true);
  assert.equal(hasAccessibilityFlag(["node", "cli.js", "--verbose"]), false);
});

test("ACCESSIBLE=1 env convention (existing GNOME/AT-SPI convention) is honored", () => {
  const prev = process.env.ACCESSIBLE;
  process.env.ACCESSIBLE = "1";
  try {
    assert.equal(isScreenReaderMode(), true);
  } finally {
    if (prev === undefined) delete process.env.ACCESSIBLE;
    else process.env.ACCESSIBLE = prev;
  }
});

test("TERM_A11Y=1 env var is honored", () => {
  const prev = process.env.TERM_A11Y;
  process.env.TERM_A11Y = "1";
  try {
    assert.equal(isScreenReaderMode(), true);
  } finally {
    if (prev === undefined) delete process.env.TERM_A11Y;
    else process.env.TERM_A11Y = prev;
  }
});

test("defaults to non-accessible in a plain interactive TTY with no flags/env vars", () => {
  const fakeStdout = { isTTY: true };
  const original = process.stdout;
  const prevCI = process.env.CI;
  const prevAccessible = process.env.ACCESSIBLE;
  const prevTermA11y = process.env.TERM_A11Y;
  delete process.env.CI;
  delete process.env.ACCESSIBLE;
  delete process.env.TERM_A11Y;
  Object.defineProperty(process, "stdout", { value: fakeStdout, configurable: true });
  try {
    assert.equal(isScreenReaderMode(), false);
  } finally {
    Object.defineProperty(process, "stdout", { value: original, configurable: true });
    if (prevCI !== undefined) process.env.CI = prevCI;
    if (prevAccessible !== undefined) process.env.ACCESSIBLE = prevAccessible;
    if (prevTermA11y !== undefined) process.env.TERM_A11Y = prevTermA11y;
  }
});

test("non-TTY stdout (piped output) is treated as accessible by default", () => {
  const fakeStdout = { isTTY: undefined };
  const original = process.stdout;
  Object.defineProperty(process, "stdout", { value: fakeStdout, configurable: true });
  try {
    assert.equal(isScreenReaderMode(), true);
  } finally {
    Object.defineProperty(process, "stdout", { value: original, configurable: true });
  }
});
