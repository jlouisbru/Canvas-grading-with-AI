// SheetUtilities.gs

/**
 * Adds the "Grading with AI" menu when the spreadsheet opens. Steps are numbered in workflow order.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Grading with AI')
    .addItem('Start Here (step-by-step panel)', 'showStartHerePanel')
    .addSeparator()
    .addItem('1. Fetch from Canvas', 'fetchEverythingFromCanvas')
    .addItem('2. Draft Answer Keys with AI (optional)', 'draftAnswerKeysWithAI')
    .addItem('3. Grade Answers', 'gradeAnswers')
    .addItem('4. Write Feedback', 'writeFeedback')
    .addItem('5. Upload to Canvas', 'uploadEssayGradesToCanvas')
    .addSeparator()
    .addItem('Stop Current AI Run', 'stopAIRun')
    .addItem('Check Setup', 'checkSetup')
    .addSubMenu(ui.createMenu('More Tools')
      .addItem('Mark Selected Cells as Reviewed (Ctrl+Alt+Shift+1)', 'markSelectionAsReviewed')
      .addItem('Mark All AI Cells as Reviewed', 'markAllAsReviewed')
      .addSeparator()
      .addItem('Clear Grades', 'clearGrades')
      .addItem('Clear Comments', 'clearComments')
      .addItem('Clear Grades and Comments', 'clearGradesAndComments')
      .addSeparator()
      .addItem('Fetch Question Prompts Only', 'fetchAndPopulateQuestionPrompts')
      .addItem('Fetch Student Responses Only', 'fetchAndPopulateQuizResponses')
      .addSeparator()
      .addItem('Set Up Settings Sheet', 'setupSettingsSheet')
      .addItem('Reset Claude API Key', 'resetClaudeApiKey')
      .addItem('Reset Canvas API Key', 'resetCanvasApiKey'))
    .addToUi();
}

/**
 * Settings rows, in display order. Rows marked optional (advanced alternatives) are never
 * added automatically; `choices` become a dropdown, and `allowOther` lets users type other values.
 * @returns {Array<{name: string, value: *, description: string, choices?: string[], allowOther?: boolean, optional?: boolean}>}
 * @private
 */
function getSettingsDefinitions_() {
  const modelDescription = target => `Choose the Claude model for ${target}: claude-sonnet-5 (balanced, default), claude-opus-5 (highest quality, about 2.5x the cost), or claude-haiku-4-5-20251001 (fastest, lowest cost). Note: Model may need to be updated over time.`;
  return [
    { name: "CANVAS_QUIZ_URL", value: "", description: "Open the quiz in Canvas and paste its link from the address bar (e.g., https://canvas.yourinstitution.edu/courses/12345/quizzes/67890). That one link tells the tool your Canvas site, course, and quiz." },
    { name: "CLAUDE_GRADING_MODEL", value: DEFAULT_CLAUDE_GRADING_MODEL, description: modelDescription("auto-grading"), choices: CLAUDE_MODEL_CHOICES, allowOther: true },
    { name: "CLAUDE_COMMENTING_MODEL", value: DEFAULT_CLAUDE_COMMENTING_MODEL, description: modelDescription("generating comments"), choices: CLAUDE_MODEL_CHOICES, allowOther: true },
    { name: "CANVAS_API_KEY", value: "", description: "Paste your Canvas API Key here to save it. It will be stored securely in Script Properties and replaced with ••••• automatically." },
    { name: "CLAUDE_API_KEY", value: "", description: "Paste your Claude API Key here to save it. It will be stored securely in Script Properties and replaced with ••••• automatically." },
    { name: "CLAUDE_EFFORT", value: "high", description: "Choose how much the model thinks before answering: low, medium, high (default), xhigh, or max. Lower is faster and cheaper; higher can be more careful on complex answers but is slower. Applies to Sonnet and Opus; ignored for Haiku.", choices: VALID_EFFORT_LEVELS },
    { name: "GRADING_GENEROSITY", value: String(DEFAULT_GENEROSITY), description: "How strictly answers are graded against the answer key: 1 Very Strict, 2 Strict, 3 Normal (default), 4 Generous, 5 Very Generous.", choices: GENEROSITY_CHOICES },
    { name: "INCLUDE_ANSWER_KEY_IN_FEEDBACK", value: "No", description: "Yes: feedback starts by stating the correct answer. No: feedback explains what was missing without giving the answer away.", choices: YES_NO_CHOICES },
    // Older setups: ASSIGNMENT_ID (ID or link) plus CANVAS_COURSE_URL, or COURSE_ID + CANVAS_BASE_URL. Still read if CANVAS_QUIZ_URL is blank.
    { name: "ASSIGNMENT_ID", value: "", description: "Older alternative to CANVAS_QUIZ_URL: the assignment or quiz ID (or link).", optional: true },
    { name: "CANVAS_COURSE_URL", value: "", description: "Older alternative: the course link, used with a plain ASSIGNMENT_ID.", optional: true },
    { name: "COURSE_ID", value: "", description: "Older alternative: the Canvas course ID, used with a plain ASSIGNMENT_ID.", optional: true },
    { name: "CANVAS_BASE_URL", value: DEFAULT_CANVAS_BASE_URL, description: "Older alternative: the base URL of your Canvas site, used with COURSE_ID.", optional: true },
    { name: "CLAUDE_API_ENDPOINT", value: DEFAULT_CLAUDE_API_ENDPOINT, description: "Advanced: the Claude Messages API endpoint.", optional: true }
  ];
}

/**
 * Menu action: creates the "Settings" sheet, or adds any missing (non-optional) rows to it,
 * and applies the dropdowns. Existing values are never changed.
 */
function setupSettingsSheet() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const definitions = getSettingsDefinitions_().filter(d => !d.optional);
  let settingsSheet = spreadsheet.getSheetByName(SETTINGS_SHEET_NAME);
  const isNew = !settingsSheet;
  if (isNew) {
    settingsSheet = spreadsheet.insertSheet(SETTINGS_SHEET_NAME);
    settingsSheet.getRange(1, 1, 1, 3).setValues([["Setting Name", "Value", "Description"]]).setFontWeight("bold");
    settingsSheet.setFrozenRows(1);
  }

  const existingNames = new Set(settingsSheet.getDataRange().getValues().map(row => String(row[0]).trim()));
  const missing = definitions.filter(d => !existingNames.has(d.name));
  if (missing.length > 0) {
    settingsSheet.getRange(settingsSheet.getLastRow() + 1, 1, missing.length, 3)
      .setValues(missing.map(d => [d.name, d.value, d.description]));
    missing.forEach(d => Logger.log(`Added setting "${d.name}".`));
  }
  applySettingsDropdowns_(settingsSheet);
  if (isNew) [1, 2, 3].forEach(col => settingsSheet.autoResizeColumn(col));
  clearSettingsCache_();

  const added = missing.length > 0 ? `Added: ${missing.map(d => d.name).join(", ")}.` : "All settings rows were already present.";
  ui.alert(isNew ? "Settings Sheet Created" : "Settings Sheet Updated",
    `${added}\n\nNext: paste the quiz link into CANVAS_QUIZ_URL and your API keys into their rows. Then use "Check Setup".`,
    ui.ButtonSet.OK);
}

/**
 * Adds dropdowns to the Value cells of settings that have fixed choices.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} settingsSheet The "Settings" sheet.
 * @private
 */
function applySettingsDropdowns_(settingsSheet) {
  const names = settingsSheet.getRange(1, 1, settingsSheet.getLastRow(), 1).getValues().map(row => String(row[0]).trim());
  getSettingsDefinitions_().filter(d => d.choices).forEach(d => {
    const rowIndex = names.indexOf(d.name);
    if (rowIndex === -1) return;
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(d.choices, true)
      .setAllowInvalid(Boolean(d.allowOther))
      .build();
    settingsSheet.getRange(rowIndex + 1, 2).setDataValidation(rule);
  });
}

/** Menu action: clears every grade on "Main Sheet". */
function clearGrades() {
  clearMainSheetColumns_(true, false);
}

/** Menu action: clears every comment on "Main Sheet". */
function clearComments() {
  clearMainSheetColumns_(false, true);
}

/** Menu action: clears every grade and comment on "Main Sheet". */
function clearGradesAndComments() {
  clearMainSheetColumns_(true, true);
}

/**
 * Clears grade and/or comment columns (values and AI highlights) for all questions after one confirmation.
 * @param {boolean} clearGradeColumns Clear grades.
 * @param {boolean} clearCommentColumns Clear comments.
 * @private
 */
function clearMainSheetColumns_(clearGradeColumns, clearCommentColumns) {
  const ui = SpreadsheetApp.getUi();
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME);
  if (!mainSheet || mainSheet.getLastRow() < 2) {
    ui.alert("Nothing to Clear", `"${MAIN_SHEET_NAME}" has no student rows yet.`, ui.ButtonSet.OK);
    return;
  }
  const headerInfo = parseMainSheetHeader_(mainSheet, []);
  if (!headerInfo || headerInfo.questionColumnsMap.size === 0) {
    ui.alert("Nothing to Clear", `No question columns were found on "${MAIN_SHEET_NAME}".`, ui.ButtonSet.OK);
    return;
  }
  const what = clearGradeColumns && clearCommentColumns ? "grades and comments" : (clearGradeColumns ? "grades" : "comments");
  const questionCount = headerInfo.questionColumnsMap.size;
  const confirmed = ui.alert("Confirm Clear",
    `Clear all ${what} on "${MAIN_SHEET_NAME}" for ${questionCount} question(s)?\n\nStudent answers aren't affected. To recover cleared cells later, use File → Version history.`,
    ui.ButtonSet.YES_NO);
  if (confirmed !== ui.Button.YES) return;

  const numRows = mainSheet.getLastRow() - 1;
  headerInfo.questionColumnsMap.forEach(cols => {
    const columns = [clearGradeColumns ? cols.gradeColIndex : null, clearCommentColumns ? cols.commentColIndex : null].filter(c => c !== null);
    columns.forEach(colIndex => {
      const range = mainSheet.getRange(2, colIndex + 1, numRows, 1);
      range.clearContent();
      clearAIMarks_(range);
    });
  });
  showToast_(`Cleared ${what} for ${questionCount} question(s).`, "Done", 5);
}
