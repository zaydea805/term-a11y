// Deliberately inaccessible example — used to demo/verify term-a11y-lint.
const ora = require("ora");
const Table = require("cli-table3");

function doWork() {
  const spinner = ora("Uploading files").start();
  setTimeout(() => spinner.succeed("Done"), 2000);

  const table = new Table({ head: ["Service", "Status"] });
  table.push(["api", "running"], ["worker", "stopped"]);
  console.log(table.toString());

  process.stdout.write("Progress: 40%\r");
}

module.exports = { doWork };
