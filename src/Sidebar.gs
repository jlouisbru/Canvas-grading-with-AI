// Sidebar.gs

/** Menu action: opens the Start Here panel. */
function showStartHerePanel() {
  const html = HtmlService.createHtmlOutputFromFile("Sidebar").setTitle("Start Here");
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Called by the Start Here panel (google.script.run): current setup, progress, and run status.
 * Reads the sheets only — no Canvas or Claude calls — so it's fast enough to refresh often.
 * @returns {object}
 */
function getStartHereStatus() {
  let configError = null;
  try {
    resolveConfig_();
  } catch (e) {
    configError = e.message;
  }
  const hasCanvasKey = Boolean(findSavedApiKey_("Canvas", "CANVAS_API_KEY", "CANVAS_API_KEY"));
  const hasClaudeKey = Boolean(findSavedApiKey_("Claude", "CLAUDE_API_KEY", "CLAUDE_API_KEY"));
  return {
    setup: { configError, hasCanvasKey, hasClaudeKey },
    steps: getWorkflowStatus_(),
    run: getRunStatus_(),
    settings: {
      gradingModel: String(getSetting_("CLAUDE_GRADING_MODEL", DEFAULT_CLAUDE_GRADING_MODEL)),
      feedbackModel: String(getSetting_("CLAUDE_COMMENTING_MODEL", DEFAULT_CLAUDE_COMMENTING_MODEL)),
      effort: getEffortSetting_() || "high",
      generosity: getGenerositySetting_(),
      includeAnswerKey: getYesNoSetting_("INCLUDE_ANSWER_KEY_IN_FEEDBACK", false)
    }
  };
}

/**
 * Called by the Start Here panel: switches to one of the tool's sheets.
 * @param {string} sheetName "Main Sheet", "Answers", or "Settings".
 */
function showSheet(sheetName) {
  if (![MAIN_SHEET_NAME, ANSWERS_SHEET_NAME, SETTINGS_SHEET_NAME].includes(sheetName)) {
    throw new Error(`Unknown sheet: ${sheetName}`);
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error(`The "${sheetName}" sheet doesn't exist yet.`);
  sheet.activate();
}
