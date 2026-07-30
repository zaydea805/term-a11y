const { isScreenReaderMode, hasAccessibilityFlag } = require("./detect");
const { createSpinner } = require("./spinner");
const { createProgressBar } = require("./progress");
const { renderTable } = require("./table");

module.exports = {
  isScreenReaderMode,
  hasAccessibilityFlag,
  createSpinner,
  createProgressBar,
  renderTable,
};
