const { isScreenReaderMode } = require("./detect");

/**
 * createProgressBar(total, options)
 *
 * Accessible mode: prints plain "N% (current/total)" lines at coarse
 * intervals (default: every 10%) instead of redrawing a Unicode block
 * bar. This mirrors gcloud's documented `accessibility/screen_reader`
 * behavior ("Percentage progress bars: Progress is displayed as a
 * percentage") rather than inventing a new convention.
 *
 * Normal mode: a conventional single-line redrawn bar.
 */
function createProgressBar(total, options = {}) {
  const accessible = isScreenReaderMode(options);
  const stream = options.stream || process.stdout;
  const label = options.label || "Progress";
  const stepPercent = options.stepPercent ?? 10;
  const width = options.width ?? 30;

  let current = 0;
  let lastAnnouncedPercent = -1;

  function percent() {
    return total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  }

  function render() {
    const pct = percent();

    if (accessible) {
      // Only announce at each step threshold, not on every tick — a
      // screen reader user does not want 1,000 individual "1%, 2%, 3%..."
      // announcements for a large loop.
      const bucket = Math.floor(pct / stepPercent) * stepPercent;
      if (bucket !== lastAnnouncedPercent) {
        lastAnnouncedPercent = bucket;
        stream.write(`${label}: ${pct}% (${current}/${total})\n`);
      }
      return;
    }

    const filled = Math.round((pct / 100) * width);
    const bar = "#".repeat(filled) + "-".repeat(width - filled);
    stream.write(`\r${label}: [${bar}] ${pct}% (${current}/${total})`);
  }

  return {
    update(value) {
      current = value;
      render();
    },
    increment(step = 1) {
      current += step;
      render();
    },
    done() {
      current = total;
      render();
      stream.write(accessible ? `${label}: complete.\n` : "\n");
    },
    get accessible() {
      return accessible;
    },
  };
}

module.exports = { createProgressBar };
