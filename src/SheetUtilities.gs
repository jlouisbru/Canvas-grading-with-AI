// SheetUtilities.gs

/**
 * Adds custom menus to the Google Sheet UI when the sheet is opened.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  // Menu 1: Canvas Tools
  ui.createMenu('Canvas Tools')
    .addItem('Fetch Essay Quiz Responses (Main Sheet)', 'fetchAndPopulateQuizResponses')
    .addItem('Fetch Question Prompts to "Answers" Sheet', 'fetchAndPopulateQuestionPrompts')
    .addSeparator()
    .addItem('Upload Essay Grades & Comments to Canvas', 'uploadEssayGradesToCanvas')
    .addToUi();

  // Menu 2: Grading Tools
  ui.createMenu('Grading Tools')
    .addItem('Grade without Rubric (using Claude.ai)', 'autoGradeWithClaude')
    .addItem('Give Feedback without Rubric (using Claude.ai)', 'generateAIComments')
    .addSeparator()
    .addItem('Grade with Rubric (using Claude.ai)', 'aiRubricGrade')
    .addItem('Give Feedback with Rubric (using Claude.ai)', 'aiRubricComment')
    .addToUi();

  // Menu 3: Sheet Tools
  ui.createMenu('Sheet Tools')
    .addItem('Clear Grades/Comments on Main Sheet', 'clearGradesAndOrComments')
    .addSeparator()
    .addItem('Setup/Verify "Settings" Sheet', 'setupSettingsSheet_')
    .addToUi();
}

/**
 * Creates or verifies the "Settings" sheet with default values.
 * This function is also a menu item.
 * @private
 */
function setupSettingsSheet_() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "Settings";
  let settingsSheet = spreadsheet.getSheetByName(sheetName);

  const settings = [
    ["CANVAS_COURSE_URL", "", "Paste your Canvas course URL here (e.g., https://canvas.yourinstitution.edu/courses/12345). If set, CANVAS_BASE_URL and COURSE_ID are ignored."],
    ["ASSIGNMENT_ID", "", "Enter the Canvas Assignment ID (for the Quiz) here."],
    ["COURSE_ID", "", "Optional if CANVAS_COURSE_URL is set. Otherwise, enter the Canvas Course ID here."],
    ["CANVAS_BASE_URL", DEFAULT_CANVAS_BASE_URL, "Optional if CANVAS_COURSE_URL is set. Otherwise, the base URL of your Canvas instance (e.g., https://canvas.yourinstitution.edu)."],
    ["CLAUDE_API_ENDPOINT", DEFAULT_CLAUDE_API_ENDPOINT, "The API endpoint for Claude Messages API."],
    ["CLAUDE_GRADING_MODEL", DEFAULT_CLAUDE_GRADING_MODEL, "Claude model for auto-grading (e.g., claude-haiku-4-5-20251001)."],
    ["CLAUDE_COMMENTING_MODEL", DEFAULT_CLAUDE_COMMENTING_MODEL, "Claude model for generating comments (e.g., claude-haiku-4-5-20251001)."],
    ["CANVAS_API_KEY", "", "Optional: Your Canvas API Key. Leave blank to use Script Properties (prompted on first use) or if key is already in Script Properties."],
    ["CLAUDE_API_KEY", "", "Optional: Your Claude API Key. Leave blank to use Script Properties (prompted on first use) or if key is already in Script Properties."]
  ];

  if (!settingsSheet) {
    settingsSheet = spreadsheet.insertSheet(sheetName);
    Logger.log(`Created new sheet: "${sheetName}"`);
    const allRows = [["Setting Name", "Value", "Description"], ...settings];
    settingsSheet.getRange(1, 1, allRows.length, 3).setValues(allRows);
    settingsSheet.setFrozenRows(1);
    settingsSheet.autoResizeColumn(1);
    settingsSheet.autoResizeColumn(2);
    settingsSheet.autoResizeColumn(3);
    ui.alert("Settings Sheet Created", `A new sheet named "Settings" has been created.\n\nQuickest setup: paste your Canvas course URL into CANVAS_COURSE_URL (e.g., https://canvas.yourinstitution.edu/courses/12345), then fill in ASSIGNMENT_ID.\n\nAlternatively, fill in COURSE_ID and CANVAS_BASE_URL separately.\n\nAPI keys are best stored in Script Properties (you'll be prompted if not found).`, ui.ButtonSet.OK);
  } else {
    const existingData = settingsSheet.getDataRange().getValues();
    const existingSettingsMap = new Map();
    existingData.forEach(row => {
      if (row[0]) existingSettingsMap.set(String(row[0]).trim(), row[1]);
    });

    const missingSettings = settings.filter(s => !existingSettingsMap.has(s[0]));
    if (missingSettings.length > 0) {
      const lastRow = settingsSheet.getLastRow();
      settingsSheet.getRange(lastRow + 1, 1, missingSettings.length, 3).setValues(missingSettings);
      missingSettings.forEach(s => Logger.log(`Added missing setting "${s[0]}" to "Settings" sheet.`));
      settingsSheet.autoResizeColumn(1);
      settingsSheet.autoResizeColumn(2);
      settingsSheet.autoResizeColumn(3);
      ui.alert("Settings Sheet Verified", `"Settings" sheet found. Missing default settings (if any) have been added. Please review — set CANVAS_COURSE_URL (or COURSE_ID + CANVAS_BASE_URL) and ASSIGNMENT_ID.`, ui.ButtonSet.OK);
    } else {
      ui.alert("Settings Sheet Verified", `"Settings" sheet already exists. Please ensure CANVAS_COURSE_URL (or COURSE_ID + CANVAS_BASE_URL) and ASSIGNMENT_ID are correct.`, ui.ButtonSet.OK);
    }
  }
}

/**
 * Clears grades and/or comments from the main sheet.
 */
function clearGradesAndOrComments() {
  const ui = SpreadsheetApp.getUi();
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  if (["Answers", "Settings"].includes(mainSheet.getName())) {
    ui.alert("Action Not Allowed", "This function can only be run on the main data sheet.", ui.ButtonSet.OK);
    return;
  }
  if (mainSheet.getLastRow() < 2) {
    ui.alert("Info", "Main sheet has no student data (expected from row 2 onwards).", ui.ButtonSet.OK);
    return;
  }

  const clearChoiceResponse = ui.prompt("Clear Grades/Comments", "Clear 'GRADES', 'COMMENTS', or 'BOTH'?", ui.ButtonSet.OK_CANCEL);
  if (clearChoiceResponse.getSelectedButton() !== ui.Button.OK) { ui.alert("Cancelled."); return; }
  const clearType = clearChoiceResponse.getResponseText().toUpperCase().trim();
  if (!["GRADES", "COMMENTS", "BOTH"].includes(clearType)) { ui.alert("Invalid input. Cancelled."); return; }

  const questionScopeResponse = ui.prompt("Clear for Which Questions?", "Clear for 'ALL' questions or 'SPECIFIC' QID(s)?", ui.ButtonSet.OK_CANCEL);
  if (questionScopeResponse.getSelectedButton() !== ui.Button.OK) { ui.alert("Cancelled."); return; }
  const questionScope = questionScopeResponse.getResponseText().toUpperCase().trim();

  let targetQIds = [];
  if (questionScope === "SPECIFIC") {
    const qIdResponse = ui.prompt("Enter Specific Question ID(s)", "Comma-separated QID(s) (e.g., 123, 456).", ui.ButtonSet.OK_CANCEL);
    if (qIdResponse.getSelectedButton() !== ui.Button.OK || !qIdResponse.getResponseText()) { ui.alert("Cancelled."); return; }
    targetQIds = qIdResponse.getResponseText().split(',').map(id => String(id).trim()).filter(id => id && !isNaN(id));
    if (targetQIds.length === 0) { ui.alert("No valid QIDs entered. Cancelled."); return; }
  } else if (questionScope !== "ALL") { ui.alert("Invalid input. Cancelled."); return; }

  const confirmMsg = `Clear ${clearType} for ${questionScope === 'ALL' ? 'all questions' : 'QID(s): ' + targetQIds.join(', ')} on sheet "${mainSheet.getName()}"?\nCANNOT BE UNDONE.`;
  if (ui.alert("Confirm Clear Action", confirmMsg, ui.ButtonSet.YES_NO) !== ui.Button.YES) { ui.alert("Cancelled."); return; }

  showToast_('Clearing cells...', 'Processing...', -1);

  const headerValues = getHeaderValues_(mainSheet);
  const allHeaderQIds = [];
  headerValues.forEach(header => {
    const match = String(header).match(/\[Q ID: (\d+)\]/);
    if (match && match[1] && !allHeaderQIds.includes(match[1])) allHeaderQIds.push(match[1]);
  });

  const qIdsToProcess = questionScope === "ALL" ? allHeaderQIds : targetQIds;
  if (qIdsToProcess.length === 0) {
    ui.alert("Info", "No matching question columns found for specified IDs.", ui.ButtonSet.OK);
    showToast_('No matching questions.', 'Info', 5);
    return;
  }

  const mainSheetHeaderInfo = parseMainSheetHeader_(mainSheet, qIdsToProcess);
  if (!mainSheetHeaderInfo || mainSheetHeaderInfo.questionColumnsMap.size === 0) {
    ui.alert("Error", "Could not parse header or find relevant question columns.", ui.ButtonSet.OK);
    showToast_('Header parse error.', 'Error', 5);
    return;
  }
  const { questionColumnsMap } = mainSheetHeaderInfo;
  const studentDataStartRow = 2;
  const numStudentRows = mainSheet.getLastRow() - studentDataStartRow + 1;
  if (numStudentRows <= 0) {
    ui.alert("Info", "No student data rows found.", ui.ButtonSet.OK);
    showToast_('No student data.', 'Info', 5);
    return;
  }

  let cellsCleared = 0, questionsAffectedCount = 0;
  qIdsToProcess.forEach(qId => {
    const qCols = questionColumnsMap.get(qId);
    if (qCols) {
      questionsAffectedCount++;
      if (["GRADES", "BOTH"].includes(clearType) && qCols.gradeColIndex !== undefined) {
        mainSheet.getRange(studentDataStartRow, qCols.gradeColIndex + 1, numStudentRows).clearContent();
        cellsCleared += numStudentRows;
        Logger.log(`Cleared grade column for QID ${qId}`);
      }
      if (["COMMENTS", "BOTH"].includes(clearType) && qCols.commentColIndex !== undefined) {
        mainSheet.getRange(studentDataStartRow, qCols.commentColIndex + 1, numStudentRows).clearContent();
        cellsCleared += numStudentRows;
        Logger.log(`Cleared comment column for QID ${qId}`);
      }
    } else {
      Logger.log(`Warning: QID ${qId} for clearing not found in parsed header.`);
    }
  });

  let finalMessage = (questionsAffectedCount > 0 && cellsCleared > 0) ?
    `Cleared data for ${questionsAffectedCount} question(s), affecting ${cellsCleared} cells.` :
    (questionsAffectedCount > 0 ? `Found ${questionsAffectedCount} question(s) but no cells cleared (empty or columns not found).` :
    "No relevant question columns found or no cells needed clearing.");

  showToast_('Clearing complete!', 'Success', 5);
  ui.alert("Clear Complete", finalMessage, ui.ButtonSet.OK);
  Logger.log(`Clear op complete. Cells cleared: ${cellsCleared}, Questions affected: ${questionsAffectedCount}`);
}
