# term-a11y

Accessible spinners, progress bars, and tables for command-line tools — and a linter that catches the patterns that break them, before they ship.

## The problem

Most CLI tools assume the person reading the output can see it. Spinners redraw the same line with animated braille characters. Progress bars use Unicode blocks. Tables are drawn with box characters. All of this looks great in a normal terminal and is close to unusable with a screen reader.

This isn't a hypothetical. It's been reported and fixed, piecemeal, by several teams already:

- A CLI accessibility study documented blind developers describing spinner animations as an unintelligible stream of individual characters read aloud one at a time — not as a progress indicator at all.
- Google Cloud's `gcloud` ships a dedicated `accessibility/screen_reader` setting that swaps spinners for plain "working" text.
- GitHub rewrote its CLI's spinner and prompt library for the same reason, then later shipped a `gh a11y` mode.
- Google's Gemini CLI added its own `--screen-reader` flag.
- Anthropic's Claude Code has an open issue (#11002) asking for the same thing, describing NVDA freezing mid-session during streaming output.

Four teams, four separate implementations of roughly the same fix. None of it is reusable outside the tool it was built for. That's what this project is trying to change.

## What it does

`term-a11y` is two things:

**A drop-in replacement for `ora`, `cli-progress`, and `cli-table3`** that automatically renders plain, linear text when it detects a screen-reader context, and falls back to normal animated output otherwise. You don't need to build any special-case logic — you just call the function.

**A linter (`term-a11y-lint`)** that scans a JavaScript/TypeScript codebase for the anti-patterns directly — bare spinner libraries, raw ANSI cursor control, Unicode box-drawing — so you can catch these issues in code review or CI, even in a project that isn't using the library yet.

## Installation

```bash
npm install term-a11y
```

## Using the library

```js
const { createSpinner, createProgressBar, renderTable } = require("term-a11y");

const spinner = createSpinner("Uploading files").start();
// ... do the work ...
spinner.succeed("Upload complete");

const bar = createProgressBar(100, { label: "Processing" });
bar.update(40);
bar.done();

renderTable([
  { Service: "api", Status: "running" },
  { Service: "worker", Status: "stopped" },
]);
```

That's the entire API surface you need to learn. Everything else — whether to render accessibly or not — is decided for you.

### How it decides

There's no reliable way to ask "is a screen reader currently running?" from inside a Node process, on any platform. So detection works the same way every other tool in this space has solved it: a combination of explicit opt-in and reasonable defaults, checked in this order:

1. An explicit flag: `--screen-reader`, `--a11y`, or `--no-tty-fx`
2. `TERM_A11Y=1`
3. `ACCESSIBLE=1` — this isn't a new convention I invented. It's the existing variable GNOME's AT-SPI stack and Debian's `dpkg-reconfigure` already use to mean "a screen reader is active." Reusing it means anyone who's already set it up for other tools gets this for free.
4. Non-TTY output (piped or redirected) — this isn't really about accessibility, but animated output in a log file or a piped command is broken regardless of who's reading it, so it gets the same treatment.
5. `CI=true`

You can also just skip all of that and set it explicitly:

```js
createSpinner("Uploading files", { accessible: true });
```

### What changes

| | Default | Accessible |
|---|---|---|
| Spinner | Animated frames, redrawn in place | One line up front, then periodic "still working" text if it runs long |
| Progress bar | Redrawn `[####----]` bar | Plain percentage lines at 10% intervals (configurable) |
| Table | ASCII-bordered grid | Flattened `Field: value` blocks, one row after another |

## Using the linter

```bash
npx term-a11y-lint ./src
```

```
src/upload.js
  [warn no-bare-spinner-lib] Imports "ora" for spinner animation. Screen readers
  vocalize each animation frame as a nonsense character. Provide a plain-text
  fallback (or use term-a11y's createSpinner, which does this automatically).

1 warning(s) across 1 file(s) with findings.
```

It exits with a non-zero status when it finds something, so it works as a CI gate:

```yaml
- run: npx term-a11y-lint ./src
```

Pass `--json` if you want machine-readable output instead.

### What it currently checks for

- `no-bare-spinner-lib` — imports of `ora`, `nanospinner`, `cli-spinner`, `cli-spinners`, or `yocto-spinner` with no visible accessible fallback
- `no-bare-progress-lib` — imports of `cli-progress`, `progress`, or `progress-stream`, same reasoning
- `no-bare-table-lib` — imports of `cli-table3`, `cli-table`, `cli-table2`, `easy-table`, or `table`
- `no-box-drawing-literal` — Unicode box-drawing characters found in a string literal
- `no-raw-cursor-control` — a raw `\r` or ANSI cursor-control sequence written directly to stdout

I want to be upfront about the limits here: this is regex and string matching against source files, not a real AST-aware analyzer. It'll have false positives — an import that's already guarded by an accessibility check will still get flagged, for instance. Treat a finding as "worth a second look," not as a verdict.

## What's missing

This is an early, narrow tool, and I'd rather say that plainly than let the README oversell it:

- No detection for color used as the *only* signal of status (e.g., a result shown only in red or green with no accompanying word). It's a real problem — it's just hard to catch reliably with static analysis, and I didn't want to ship something that gives false confidence.
- No port of the accessible-output library to Python, Go, or Rust yet. The linter's approach isn't tied to JavaScript, but the implementation currently is.
- This doesn't replace testing with an actual screen reader. NVDA, JAWS, and VoiceOver all have their own quirks that a linter won't catch, and if you're building something that needs to work well for blind and low-vision users, please test it with the real thing.

## Contributing

If you use a screen reader and something here doesn't actually hold up in practice, please open an issue. Secondhand assumptions about what "sounds right" are exactly the kind of mistake this project exists to avoid, and I'd rather hear about it than keep guessing.

## License

MIT
