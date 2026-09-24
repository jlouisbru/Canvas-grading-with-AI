// FetchData.gs

/** Menu action (step 1): fetches question prompts, then student responses, in one go. */
function fetchEverythingFromCanvas() {
  runCanvasFetch_(true, true);
}

/** Menu action (More tools): fetches only the question prompts into the "Answers" sheet. */
function fetchAndPopulateQuestionPrompts() {
  runCanvasFetch_(true, false);
}

/** Menu action (More tools): fetches only student responses into "Main Sheet". */
function fetchAndPopulateQuizResponses() {
  runCanvasFetch_(false, true);
}

/**
 * Shared driver for the fetch menu actions: reads config and the Canvas key once, runs the
 * requested fetches, and shows one summary with the next step.
 * @param {boolean} includePrompts Fetch question prompts into "Answers".
 * @param {boolean} includeResponses Fetch student responses into "Main Sheet".
 * @private
 */
function runCanvasFetch_(includePrompts, includeResponses) {
  const ui = SpreadsheetApp.getUi();
  const config = getConfigFromSheet_();
  if (!config) return;
  const canvasApiKey = getCanvasApiKey_();
  if (!canvasApiKey) return;

  try {
    const lines = [];
    if (includePrompts) {
      showToast_('Fetching question prompts from Canvas…', 'Working…', -1);
      const prompts = fetchQuestionPromptsCore_({ ...config }, canvasApiKey);
      lines.push(`Loaded ${prompts.questionCount} essay question(s) into "${ANSWERS_SHEET_NAME}". Your answer keys and rubrics were kept.`);
    }
    if (includeResponses) {
      showToast_('Fetching student responses from Canvas…', 'Working…', -1);
      const responses = fetchQuizResponsesCore_({ ...config }, canvasApiKey);
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME).activate();
      lines.push(`Loaded ${responses.refreshedCount} student(s) from Canvas into "${MAIN_SHEET_NAME}".`);
      if (responses.preservedCount > 0) lines.push(`Kept ${responses.preservedCount} row(s) you'd already graded or commented on, unchanged.`);
    }
    lines.push("", getNextStepHint_());
    showToast_('Fetch complete.', 'Done', 5);
    ui.alert('Fetched from Canvas', lines.join("\n"), ui.ButtonSet.OK);
  } catch (error) {
    if (error.isCanvasAuthError) { handleCanvasAuthError_(); showToast_('Canvas API key error.', 'Error', 5); return; }
    Logger.log(`Error fetching from Canvas: ${error.message}\nStack: ${error.stack}`);
    showToast_('Fetch failed.', 'Error', 5);
    ui.alert('Fetch Failed', `${error.message}\n\nTip: "Check Setup" in the menu tests your Canvas settings and key.`, ui.ButtonSet.OK);
  }
}

/**
 * Suggests the next workflow step based on what's already filled in.
 * @returns {string}
 * @private
 */
function getNextStepHint_() {
  const questions = parseAnswersSheet_() || {};
  const missingKeys = Object.values(questions).filter(q => !q.key && q.criteria.length === 0).length;
  if (missingKeys > 0) {
    return `Next: ${missingKeys} question(s) need an answer key (Column C of "${ANSWERS_SHEET_NAME}"). Type them in, or use "2. Draft Answer Keys with AI".`;
  }
  return `Next: "3. Grade Answers".`;
}

/**
 * Builds the managed header row of the "Answers" sheet.
 * @returns {string[]}
 * @private
 */
function getAnswersSheetHeaders_() {
  const headers = [
    "Question ID & Title (from Canvas)",   // Col A
    "Full Question Prompt (from Canvas)",  // Col B
    "Overall Answer Key (Manual Entry)",   // Col C
    "Max Points (from Canvas)"             // Col D
  ];
  for (let i = 1; i <= MAX_RUBRIC_CRITERIA; i++) {
    headers.push(`Criterion ${i} Desc`);
    headers.push(`Criterion ${i} Pts`);
  }
  return headers;
}

/**
 * Returns the "Answers" sheet, creating it or repairing its managed headers if needed.
 * Column widths are left as they are.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 * @private
 */
function ensureAnswersSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const headers = getAnswersSheetHeaders_();
  let answersSheet = spreadsheet.getSheetByName(ANSWERS_SHEET_NAME);
  if (!answersSheet) {
    answersSheet = spreadsheet.insertSheet(ANSWERS_SHEET_NAME);
    Logger.log(`Created new sheet: "${ANSWERS_SHEET_NAME}"`);
  }
  const needsHeaders = answersSheet.getMaxColumns() < headers.length ||
    answersSheet.getRange(1, 1, 1, headers.length).getValues()[0].some((value, i) => value !== headers[i]);
  if (needsHeaders) {
    answersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    answersSheet.setFrozenRows(1);
    Logger.log(`Set managed headers on "${ANSWERS_SHEET_NAME}".`);
  }
  return answersSheet;
}

/**
 * Rebuilds the "Answers" sheet from the Canvas quiz, keeping the answer keys, rubric criteria,
 * and AI-draft highlights already entered for each question.
 * @param {object} config From getConfigFromSheet_().
 * @param {string} canvasApiKey Canvas API key.
 * @returns {{questionCount: number}}
 * @throws {Error} If the quiz can't be found or has no essay questions.
 * @private
 */
function fetchQuestionPromptsCore_(config, canvasApiKey) {
  const answersSheet = ensureAnswersSheet_();
  const numManagedColumns = getAnswersSheetHeaders_().length;

  const quizResult = getQuizIdFromAssignment_(canvasApiKey, config);
  if (!quizResult) throw new Error(`Could not find a quiz for ASSIGNMENT_ID ${config.assignmentId}. Check that it's a Classic Quiz with essay questions.`);
  const { questionMap, orderedQuestionIds } = getEssayQuestions_(canvasApiKey, config, quizResult.quizId);
  if (orderedQuestionIds.length === 0) throw new Error("No essay questions were found in this Canvas quiz.");

  // Remember what the instructor entered (and which cells are unreviewed AI drafts) for each question.
  const preserved = new Map();
  const numCurrentDataRows = answersSheet.getLastRow() - 1;
  if (numCurrentDataRows > 0) {
    const dataRange = answersSheet.getRange(2, 1, numCurrentDataRows, numManagedColumns);
    const values = dataRange.getValues();
    const backgrounds = dataRange.getBackgrounds();
    values.forEach((rowData, r) => {
      const qIdMatch = String(rowData[0] ?? "").match(/\[Q ID: (\d+)\]/);
      if (!qIdMatch) return;
      preserved.set(qIdMatch[1], {
        overallKey: String(rowData[2] ?? "").trim(),
        rubricValues: rowData.slice(4, 4 + MAX_RUBRIC_CRITERIA * 2).map(v => (v === undefined ? "" : v)),
        aiMarkedColumns: backgrounds[r].map((color, c) => (color === AI_HIGHLIGHT_COLOR ? c + 1 : null)).filter(Boolean)
      });
    });
    clearAIMarks_(dataRange);
    dataRange.clearContent();
  }
  Logger.log(`Kept manual data for ${preserved.size} questions from "${ANSWERS_SHEET_NAME}".`);

  const rowsToWrite = orderedQuestionIds.map(qId => {
    const qInfo = questionMap[qId];
    const kept = preserved.get(qId);
    const rubricValues = kept ? kept.rubricValues : [];
    const row = [`[Q ID: ${qId}] ${qInfo.title}`, qInfo.prompt, kept ? kept.overallKey : "", qInfo.points_possible];
    for (let k = 0; k < MAX_RUBRIC_CRITERIA * 2; k++) row.push(rubricValues[k] ?? "");
    return row;
  });
  answersSheet.getRange(2, 1, rowsToWrite.length, numManagedColumns).setValues(rowsToWrite);

  // Re-apply unreviewed-draft highlights at each question's (possibly new) row.
  orderedQuestionIds.forEach((qId, i) => {
    (preserved.get(qId)?.aiMarkedColumns || []).forEach(col => markAsAIWritten_(answersSheet.getRange(i + 2, col)));
  });
  return { questionCount: rowsToWrite.length };
}
