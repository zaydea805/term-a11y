/**
 * detect.js
 *
 * Decides whether the current process should emit screen-reader-friendly
 * output. There is no reliable, cross-platform way to ask "is NVDA/JAWS/
 * VoiceOver currently running and attached to this terminal?" from Node.js,
 * so — like every other tool that has solved this problem in isolation
 * (gcloud's `accessibility/screen_reader` property, GitHub CLI's `gh a11y`,
 * Gemini CLI's `--screen-reader` flag) — we rely on a combination of an
 * explicit opt-in and reasonable environment conventions.
 *
 * Detection order (first match wins):
 *   1. Explicit CLI flags:      --screen-reader / --a11y / --no-tty-fx
 *   2. Explicit env var:        TERM_A11Y=1
 *   3. Existing OS convention:  ACCESSIBLE=1
 *      (the same variable GNOME/AT-SPI and Debian's dpkg-reconfigure
 *      already use to signal "a screen reader is active" — we piggyback
 *      on it instead of inventing a competing convention)
 *   4. Non-interactive output:  !process.stdout.isTTY
 *      (piped/redirected output should never contain spinner frames or
 *      carriage-return redraws regardless of accessibility — this also
 *      happens to make output screen-reader-safe by default in CI logs,
 *      log files, etc.)
 *   5. CI environment:          process.env.CI
 *
 * Consumers can always override the automatic decision by passing
 * `{ accessible: true | false }` to any function in this library.
 */

const FLAG_PATTERNS = [/^--screen-reader$/, /^--a11y$/, /^--no-tty-fx$/];

function hasAccessibilityFlag(argv = process.argv) {
  return argv.some((arg) => FLAG_PATTERNS.some((re) => re.test(arg)));
}

function isScreenReaderMode(overrides = {}) {
  if (typeof overrides.accessible === "boolean") return overrides.accessible;

  if (hasAccessibilityFlag()) return true;
  if (process.env.TERM_A11Y === "1") return true;
  if (process.env.ACCESSIBLE === "1") return true;
  if (process.stdout && !process.stdout.isTTY) return true;
  if (process.env.CI) return true;

  return false;
}

module.exports = { isScreenReaderMode, hasAccessibilityFlag };
