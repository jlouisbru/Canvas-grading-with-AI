// AIOperationContext.gs

/**
 * Gathers everything an AI grading or feedback run needs, checking prerequisites in the order
 * a new user would hit them. Explains what to do next and returns null if something is missing.
 * Works with or without a UI (menu runs and background continuations).
 * @returns {{mainSheet: GoogleAppsScript.Spreadsheet.Sheet, claudeApiKey: string, headerValues: string[],
 *            questionColumnsMap: Map<string, object>, questions: object}|null}
 * @private
 */
function initializeAIOperationContext_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const mainSheet = spreadsheet.getSheetByName(MAIN_SHEET_NAME);
  if (!mainSheet || mainSheet.getLastRow() < 2) {
    notify_("No Student Answers Yet", `There are no student answers on "${MAIN_SHEET_NAME}" yet.\n\nRun "1. Fetch from Canvas" first.`);
    return null;
  }

  const questions = parseAnswersSheet_();
  if (!questions || Object.keys(questions).length === 0) {
    notify_("No Questions Yet", `The "${ANSWERS_SHEET_NAME}" sheet has no questions yet.\n\nRun "1. Fetch from Canvas" first.`);
    return null;
  }
  const hasAnyKeyOrRubric = Object.values(questions).some(q => q.key || q.criteria.length > 0);
  if (!hasAnyKeyOrRubric) {
    notify_("No Answer Keys Yet", `Add an answer key for each question in Column C of the "${ANSWERS_SHEET_NAME}" sheet (and rubric criteria in Columns E+ if you want rubric grading).\n\nTip: "2. Draft Answer Keys with AI" writes drafts for you to review.`);
    return null;
  }

  const headerValues = getHeaderValues_(mainSheet);
  const qidsFromHeader = headerValues
    .map(h => (String(h).match(/\[Q ID: (\d+)\]/) || [])[1])
    .filter(Boolean);
  const headerInfo = parseMainSheetHeader_(mainSheet, qidsFromHeader);
  if (!headerInfo || headerInfo.questionColumnsMap.size === 0) {
    notify_("Main Sheet Layout Not Recognized", `Could not find the question columns on "${MAIN_SHEET_NAME}".\n\nRun "1. Fetch from Canvas" to rebuild it.`);
    return null;
  }

  const claudeApiKey = getClaudeApiKey_();
  if (!claudeApiKey) return null;

  return { mainSheet, claudeApiKey, headerValues, questionColumnsMap: headerInfo.questionColumnsMap, questions };
}
