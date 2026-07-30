# term-a11y

Accessible-by-default spinners, progress bars, and tables for CLI tools — plus a linter that catches screen-reader-breaking output patterns in your codebase before you ship.

## Why this exists

Screen readers can't interpret animated terminal output. A spinner redrawing braille frames gets read aloud as nonsense; a Unicode-bordered table gets narrated character by character ("box drawings double horizontal, box drawings double horizontal…"); a carriage-return progress bar just sounds like noise. This is a documented, recurring problem:

- An academic study on CLI accessibility recorded a blind developer describing a spinner as *"little dots submit, little blah, blah, blah, blah, completed with status failure."*
- Google Cloud's `gcloud` CLI ships its own bespoke `accessibility/screen_reader` property that disables spinners in favor of plain "working" text.
- GitHub rebuilt its CLI's spinner and prompt library from scratch for the same reason, and later shipped a dedicated `gh a11y` screen-reader mode.
- Google's Gemini CLI shipped its own `--screen-reader` flag.
- Anthropic's Claude Code has an open GitHub issue (#11002) requesting the same fix, describing NVDA freezing during token-streaming output.

Four different teams have independently rebuilt the same fix, from scratch, in isolation. **term-a11y is the reusable version of that fix**, so the next CLI author doesn't have to.

## Install

```bash
npm install term-a11y
```

## Usage

```js
const { createSpinner, createProgressBar, renderTable } = require("term-a11y");

const spinner = createSpinner("Uploading files").start();
// ... do work ...
spinner.succeed("Upload complete");

const bar = createProgressBar(100, { label: "Processing" });
bar.update(40);
bar.done();

renderTable([
  { Service: "api", Status: "running" },
  { Service: "worker", Status: "stopped" },
]);
```

That's the whole API change required. Accessible mode is auto-detected — you don't need to ask your users to pass a flag (though they can). Detection checks, in order:

1. An explicit `--screen-reader` / `--a11y` / `--no-tty-fx` CLI flag
2. `TERM_A11Y=1`
3. `ACCESSIBLE=1` — the existing GNOME/AT-SPI and Debian `dpkg-reconfigure` convention for "a screen reader is active"; term-a11y piggybacks on it rather than inventing a competing one
4. Non-TTY stdout (piped/redirected output never gets spinner frames or box-drawing, accessible or not)
5. `CI=true`

You can always override auto-detection explicitly:

```js
createSpinner("Uploading files", { accessible: true });
```

### What changes in accessible mode

| | Normal mode | Accessible mode |
|---|---|---|
| Spinner | Animated braille frames, single-line redraw | One static line, then periodic plain-text heartbeats |
| Progress bar | Redrawn `[####----]` bar | Plain `Progress: 40% (40/100)` lines at coarse thresholds |
| Table | ASCII-bordered grid | Flattened `Field: value` blocks, one per row |

## The linter

`term-a11y-lint` statically scans a codebase for the same anti-patterns, so you can catch them in code review or CI before they ship — even in files that don't use this library yet.

```bash
npx term-a11y-lint ./src
```

```
src/upload.js
  [warn no-bare-spinner-lib] Imports "ora" for spinner animation. Screen readers vocalize
  each animation frame as a nonsense character. Provide a plain-text fallback (or use
  term-a11y's createSpinner, which does this automatically).

1 warning(s) across 1 file(s) with findings.
```

Exits with code `1` when it finds warnings, so it can gate a CI job:

```yaml
- run: npx term-a11y-lint ./src
```

Use `--json` for machine-readable output.

**Current rules:**

- `no-bare-spinner-lib` — imports of `ora`, `nanospinner`, `cli-spinner`, `cli-spinners`, `yocto-spinner` with no accessible fallback
- `no-bare-progress-lib` — imports of `cli-progress`, `progress`, `progress-stream` with no accessible fallback
- `no-bare-table-lib` — imports of `cli-table3`, `cli-table`, `cli-table2`, `easy-table`, `table` with no accessible fallback
- `no-box-drawing-literal` — Unicode box-drawing characters in string literals
- `no-raw-cursor-control` — raw `\r` / ANSI cursor-control sequences written directly to stdout

This is a first pass built on regex/string matching against source files, not a full AST/type-aware analyzer. It's meant to catch the common, well-documented cases cheaply and flag them for a human to confirm — expect some false positives, and treat findings as a prompt to check, not an automatic verdict.

## What this doesn't do (yet)

- No Python/Go/Rust port of the accessible-output library yet (the linter itself is language-agnostic in spirit but currently only scans JS/TS)
- No detection of color-used-as-the-only-signal (e.g., a status shown only via red/green text with no accompanying word) — a real anti-pattern, just harder to detect reliably by static analysis; open to ideas
- Not a replacement for testing with a real screen reader (NVDA, JAWS, VoiceOver) — it catches the common structural mistakes, not everything

## Contributing

This is a young, narrow-scope project. If you're a screen reader user and something here doesn't actually help, please open an issue — lived experience beats guessing.

## License

MIT
