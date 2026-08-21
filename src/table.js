const { isScreenReaderMode } = require("./detect");

/**
 * renderTable(rows, options)
 *
 * rows: array of plain objects, e.g. [{ name: "api", status: "running" }, ...]
 *
 * Accessible mode: flattens each row into a "Field: value" block separated
 * by blank lines, instead of drawing box characters. Screen readers narrate
 * "box drawings double horizontal" for every border character of a
 * Unicode table (this is verbatim what the CLI-accessibility research
 * documents users hearing) — a flattened list has zero of those characters
 * and reads linearly, top to bottom, the way a screen reader already
 * wants to consume text.
 *
 * Normal mode: a plain ASCII table using +/-/| characters. We deliberately
 * default to ASCII box characters rather than Unicode box-drawing glyphs
 * even in the non-accessible path — ASCII renders identically in every
 * terminal, font, and locale, and it's one less thing to special-case.
 *
 * A missing field renders as a blank cell in the grid (an empty box reads
 * unambiguously to a sighted user) but as the words "(not set)" in
 * accessible mode — a blank spoken value trailing into silence reads as
 * broken output rather than "this field intentionally has no value."
 */
function renderTable(rows, options = {}) {
  const accessible = isScreenReaderMode(options);
  const stream = options.stream || process.stdout;

  if (!rows || rows.length === 0) {
    stream.write("(no rows)\n");
    return;
  }

  const columns = options.columns || Object.keys(rows[0]);

  if (accessible) {
    rows.forEach((row, i) => {
      columns.forEach((col) => {
        stream.write(`${col}: ${row[col] ?? "(not set)"}\n`);
      });
      if (i < rows.length - 1) stream.write("\n");
    });
    return;
  }

  const widths = columns.map((col) =>
    Math.max(col.length, ...rows.map((r) => String(r[col] ?? "").length))
  );

  const sep = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";
  const headerLine =
    "|" + columns.map((col, i) => ` ${col.padEnd(widths[i])} `).join("|") + "|";

  stream.write(sep + "\n");
  stream.write(headerLine + "\n");
  stream.write(sep + "\n");
  rows.forEach((row) => {
    const line =
      "|" +
      columns.map((col, i) => ` ${String(row[col] ?? "").padEnd(widths[i])} `).join("|") +
      "|";
    stream.write(line + "\n");
  });
  stream.write(sep + "\n");
}

module.exports = { renderTable };
