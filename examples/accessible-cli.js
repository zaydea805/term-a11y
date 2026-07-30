// Same behavior as inaccessible-cli.js, built on term-a11y instead.
const { createSpinner, renderTable, createProgressBar } = require("../src/index");

function doWork() {
  const spinner = createSpinner("Uploading files").start();
  setTimeout(() => spinner.succeed("Done"), 200);

  renderTable(
    [
      { Service: "api", Status: "running" },
      { Service: "worker", Status: "stopped" },
    ]
  );

  const bar = createProgressBar(100, { label: "Progress" });
  bar.update(40);
  bar.done();
}

module.exports = { doWork };
