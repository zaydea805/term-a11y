const { isScreenReaderMode } = require("./detect");

const FRAMES = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];

/**
 * createSpinner(label, options)
 *
 * Accessible mode: never redraws a line and never emits animation frames
 * (screen readers vocalize each braille frame as a nonsense character —
 * this is the exact complaint documented against gh CLI's old spinner,
 * Claude Code, and countless others). Instead it prints one static line
 * up front and, if the task runs long, periodic plain-text heartbeats
 * ("Still working... (12s)") so the user knows the process hasn't hung
 * without flooding their screen reader with repeated announcements.
 *
 * Normal mode: a conventional single-line animated spinner.
 */
function createSpinner(label, options = {}) {
  const accessible = isScreenReaderMode(options);
  const stream = options.stream || process.stdout;
  const heartbeatMs = options.heartbeatMs ?? 8000;

  let frame = 0;
  let timer = null;
  let heartbeat = null;
  let startedAt = null;
  let currentLabel = label;

  function start() {
    startedAt = Date.now();

    if (accessible) {
      stream.write(`${currentLabel}...\n`);
      heartbeat = setInterval(() => {
        const secs = Math.round((Date.now() - startedAt) / 1000);
        stream.write(`Still working: ${currentLabel} (${secs}s)\n`);
      }, heartbeatMs);
      if (heartbeat.unref) heartbeat.unref();
      return api;
    }

    timer = setInterval(() => {
      stream.write(`\r${FRAMES[frame % FRAMES.length]} ${currentLabel}`);
      frame += 1;
    }, 80);
    if (timer.unref) timer.unref();
    return api;
  }

  function update(newLabel) {
    currentLabel = newLabel;
    if (accessible) stream.write(`${newLabel}...\n`);
    return api;
  }

  function stopWith(symbol, finalLabel) {
    if (timer) clearInterval(timer);
    if (heartbeat) clearInterval(heartbeat);
    const text = finalLabel ?? currentLabel;
    if (accessible) {
      stream.write(`${text}\n`);
    } else {
      stream.write(`\r${symbol} ${text}\n`);
    }
    return api;
  }

  const api = {
    start,
    update,
    succeed: (text) => stopWith("\u2713", text),
    fail: (text) => stopWith("\u2717", text),
    stop: (text) => stopWith("", text),
    get accessible() {
      return accessible;
    },
  };

  return api;
}

module.exports = { createSpinner };
