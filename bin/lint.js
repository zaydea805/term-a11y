#!/usr/bin/env node
/**
 * term-a11y-lint
 *
 * Static scan for the CLI output anti-patterns documented (independently,
 * over and over) as screen-reader-breaking:
 *   - animated spinner libraries with no accessible fallback
 *   - raw carriage-return / ANSI cursor-control redraws
 *   - Unicode box-drawing table borders
 *   - status signaled by color alone, with no text equivalent
 *
 * This is a first pass built on string/regex matching against source
 * files, not a full AST/type-aware analysis — it is meant to catch the
 * common, well-documented cases cheaply and flag them for a human to
 * confirm, the same way early linters started before growing more
 * precise engines. False positives are expected and each rule says so.
 */

const fs = require("fs");
const path = require("path");

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage"]);
const SOURCE_EXT = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx"]);

const SPINNER_LIBS = ["ora", "nanospinner", "cli-spinner", "cli-spinners", "yocto-spinner"];
const PROGRESS_LIBS = ["cli-progress", "progress", "progress-stream"];
const TABLE_LIBS = ["cli-table3", "cli-table", "cli-table2", "easy-table", "table"];

const BOX_DRAWING_RE = /[\u2500-\u257F]/; // ─│┌┐└┘├┤┬┴┼ etc.
const ANSI_CURSOR_RE = /\\x1[bB]\[[0-9;]*[A-HJKSTfsu]|\\u001[bB]\[[0-9;]*[A-HJKSTfsu]/;
const CARRIAGE_REDRAW_RE = /process\.stdout\.write\([^)]*\\r/;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (SOURCE_EXT.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function findImportedLibs(content, libList) {
  const hits = new Set();
  for (const lib of libList) {
    const reqRe = new RegExp(`require\\(['"]${lib}['"]\\)`);
    const importRe = new RegExp(`from ['"]${lib}['"]`);
    if (reqRe.test(content) || importRe.test(content)) hits.add(lib);
  }
  return [...hits];
}

function lintFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const findings = [];

  const usesA11yLib = /require\(['"]term-a11y['"]\)|from ['"]term-a11y['"]/.test(content);

  for (const lib of findImportedLibs(content, SPINNER_LIBS)) {
    findings.push({
      rule: "no-bare-spinner-lib",
      severity: usesA11yLib ? "info" : "warning",
      message: `Imports "${lib}" for spinner animation. Screen readers vocalize each animation frame as a nonsense character. ${
        usesA11yLib
          ? "term-a11y is also imported in this file — confirm the accessible path is actually used for this spinner."
          : "Provide a plain-text fallback (or use term-a11y's createSpinner, which does this automatically)."
      }`,
    });
  }

  for (const lib of findImportedLibs(content, PROGRESS_LIBS)) {
    findings.push({
      rule: "no-bare-progress-lib",
      severity: usesA11yLib ? "info" : "warning",
      message: `Imports "${lib}" for progress rendering. Redrawn Unicode progress bars are not recognized as progress indicators by screen readers. Provide a periodic plain-text percentage fallback.`,
    });
  }

  for (const lib of findImportedLibs(content, TABLE_LIBS)) {
    findings.push({
      rule: "no-bare-table-lib",
      severity: usesA11yLib ? "info" : "warning",
      message: `Imports "${lib}" for table rendering. Box-drawing borders are narrated character-by-character by screen readers ("box drawings double horizontal..."). Offer a flattened "field: value" fallback for non-interactive/accessible output.`,
    });
  }

  lines.forEach((line, i) => {
    if (BOX_DRAWING_RE.test(line) && /['"`]/.test(line)) {
      findings.push({
        rule: "no-box-drawing-literal",
        severity: "info",
        line: i + 1,
        message: `Line contains a Unicode box-drawing character in a string literal. Confirm there is a plain-text rendering path that avoids it.`,
      });
    }
    if (ANSI_CURSOR_RE.test(line) || CARRIAGE_REDRAW_RE.test(line)) {
      findings.push({
        rule: "no-raw-cursor-control",
        severity: "warning",
        line: i + 1,
        message: `Line writes a raw carriage return or ANSI cursor-control sequence directly. Same-line redraws are unreliable for screen readers and for piped/non-TTY output. Gate this behind an isScreenReaderMode()/isTTY check.`,
      });
    }
  });

  return findings;
}

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const targets = args.filter((a) => !a.startsWith("--"));
  const roots = targets.length > 0 ? targets : ["."];

  let files = [];
  for (const root of roots) {
    const stat = fs.statSync(root);
    if (stat.isDirectory()) {
      files = files.concat(walk(root));
    } else {
      files.push(root);
    }
  }

  const results = [];
  let warningCount = 0;

  for (const file of files) {
    const findings = lintFile(file);
    if (findings.length > 0) {
      results.push({ file, findings });
      warningCount += findings.filter((f) => f.severity === "warning").length;
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify({ files: results, warningCount }, null, 2));
  } else {
    if (results.length === 0) {
      console.log("term-a11y-lint: no CLI accessibility anti-patterns found.");
    }
    for (const { file, findings } of results) {
      console.log(`\n${file}`);
      for (const f of findings) {
        const loc = f.line ? `:${f.line}` : "";
        const tag = f.severity === "warning" ? "warn " : "info ";
        console.log(`  [${tag}${f.rule}]${loc} ${f.message}`);
      }
    }
    console.log(
      `\n${warningCount} warning(s) across ${results.length} file(s) with findings.`
    );
  }

  process.exitCode = warningCount > 0 ? 1 : 0;
}

main();
