// FetchResponses.gs

/**
 * Ensures "Main Sheet" exists and starts with the two fixed columns.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 * @private
 */
function ensureMainSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let mainSheet = spreadsheet.getSheetByName(MAIN_SHEET_NAME);
  if (!mainSheet) {
    mainSheet = spreadsheet.insertSheet(MAIN_SHEET_NAME);
    Logger.log(`Created new sheet: "${MAIN_SHEET_NAME}".`);
  }
  const requiredHeaders = ["Student Name (Sortable)", "Canvas User ID"];
  let currentHeaders;
  if (mainSheet.getLastRow() > 0) {
    currentHeaders = mainSheet.getRange(1, 1, 1, Math.max(mainSheet.getLastColumn(), requiredHeaders.length)).getValues()[0];
  } else {
    mainSheet.appendRow(new Array(requiredHeaders.length).fill(""));
    currentHeaders = new Array(requiredHeaders.length).fill("");
  }
  if (String(currentHeaders[0]).trim() !== requiredHeaders[0]) {
    if (mainSheet.getMaxColumns() === 0 || (currentHeaders[0] !== undefined && String(currentHeaders[0]).trim() !== requiredHeaders[0])) {
      mainSheet.insertColumnBefore(1);
    }
    mainSheet.getRange(1, 1).setValue(requiredHeaders[0]);
  }
  if (mainSheet.getMaxColumns() < 2 || currentHeaders[1] === undefined || String(currentHeaders[1]).trim() !== requiredHeaders[1]) {
    if (mainSheet.getMaxColumns() < 2) {
      mainSheet.insertColumnAfter(1);
    } else if (currentHeaders[1] !== undefined && String(currentHeaders[1]).trim() !== requiredHeaders[1]) {
      mainSheet.insertColumnBefore(2);
    }
    mainSheet.getRange(1, 2).setValue(requiredHeaders[1]);
  }
  return mainSheet;
}

/**
 * Reads existing rows and returns those to keep as-is: rows fully graded for every question, or
 * with at least one comment. Also records which grade/comment cells are unreviewed AI output.
 * @returns {{keptRows: Map<string, any[]>, aiMarks: Map<string, Set<string>>, existingUserIds: Set<string>}}
 *          aiMarks maps userId to entries like "12345:grade" / "12345:comment".
 * @private
 */
function readRowsToPreserve_(mainSheet, orderedQuestionIds) {
  const keptRows = new Map();
  const aiMarks = new Map();
  const existingUserIds = new Set();
  const headerInfo = parseMainSheetHeader_(mainSheet, orderedQuestionIds);
  if (!headerInfo) throw new Error(`Could not read the header row of "${MAIN_SHEET_NAME}".`);
  const { userIdColIndex, questionColumnsMap } = headerInfo;
  const lastRow = mainSheet.getLastRow();
  if (userIdColIndex === -1 || lastRow < 2) return { keptRows, aiMarks, existingUserIds };

  const dataRange = mainSheet.getRange(2, 1, lastRow - 1, mainSheet.getLastColumn());
  const values = dataRange.getValues();
  const backgrounds = dataRange.getBackgrounds();
  const hasValue = (row, index) => index !== undefined && row.length > index && String(row[index] ?? "").trim() !== "";

  values.forEach((rowValues, r) => {
    const userId = hasValue(rowValues, userIdColIndex) ? String(rowValues[userIdColIndex]).trim() : null;
    if (!userId) return;
    existingUserIds.add(userId);
    const isComplete = orderedQuestionIds.length > 0 && orderedQuestionIds.every(qId => {
      const qCols = questionColumnsMap.get(qId);
      return qCols && hasValue(rowValues, qCols.answerColIndex) && hasValue(rowValues, qCols.gradeColIndex);
    });
    // Rows with comments but no grades yet are mid-workflow; don't overwrite them either.
    const hasAnyComment = orderedQuestionIds.some(qId => hasValue(rowValues, questionColumnsMap.get(qId)?.commentColIndex));
    if (!isComplete && !hasAnyComment) return;

    keptRows.set(userId, { rowValues, questionColumnsMap });
    const marks = new Set();
    orderedQuestionIds.forEach(qId => {
      const qCols = questionColumnsMap.get(qId);
      if (!qCols) return;
      if (backgrounds[r][qCols.gradeColIndex] === AI_HIGHLIGHT_COLOR) marks.add(`${qId}:grade`);
      if (backgrounds[r][qCols.commentColIndex] === AI_HIGHLIGHT_COLOR) marks.add(`${qId}:comment`);
    });
    aiMarks.set(userId, marks);
  });
  clearAIMarks_(dataRange); // Rows move when re-sorted; highlights are re-applied after writing.
  return { keptRows, aiMarks, existingUserIds };
}

/**
 * Rebuilds "Main Sheet" from Canvas. Rows already graded or commented are kept unchanged
 * (including their unreviewed-AI highlights); all other rows are refreshed from Canvas.
 * @param {object} config From getConfigFromSheet_() (copied; the assignment ID may be resolved).
 * @param {string} canvasApiKey Canvas API key.
 * @returns {{refreshedCount: number, preservedCount: number}}
 * @throws {Error} If Canvas data can't be retrieved.
 * @private
 */
function fetchQuizResponsesCore_(config, canvasApiKey) {
  const quizResult = getQuizIdFromAssignment_(canvasApiKey, config);
  if (!quizResult) throw new Error(`Could not find a Classic Quiz at CANVAS_QUIZ_URL (ID ${config.assignmentId}). Check that the link opens the quiz in Canvas and that it has essay questions.`);
  // If a quiz URL was provided, use the resolved assignment ID for the submissions endpoint.
  if (quizResult.resolvedAssignmentId) config.assignmentId = quizResult.resolvedAssignmentId;

  const { questionMap, orderedQuestionIds } = getEssayQuestions_(canvasApiKey, config, quizResult.quizId);
  if (orderedQuestionIds.length === 0) throw new Error("No essay questions were found in this Canvas quiz.");

  const mainSheet = ensureMainSheet_();
  const { keptRows, aiMarks, existingUserIds } = readRowsToPreserve_(mainSheet, orderedQuestionIds);

  showToast_('Fetching students and submissions from Canvas…', 'Working…', -1);
  const studentMap = getStudents_(canvasApiKey, config);
  const submissionsPath = `/api/v1/courses/${config.courseId}/assignments/${config.assignmentId}/submissions`;
  const submissions = fetchCanvasAPI_(config.canvasBaseUrl, submissionsPath, canvasApiKey, { 'include[]': 'submission_history', 'per_page': 100 });
  if (!Array.isArray(submissions)) throw new Error("Could not retrieve assignment submissions from Canvas.");
  const answersByStudent = processAssignmentSubmissionsForEssayData_(submissions, studentMap, questionMap);

  const sortName = id => studentMap[id]?.sortable_name || studentMap[id]?.name || id;
  const allStudentIds = Array.from(new Set([...Object.keys(studentMap), ...keptRows.keys()]))
    .sort((a, b) => sortName(a).localeCompare(sortName(b)));

  const sheetData = [prepareMainSheetHeader_(orderedQuestionIds, questionMap)];
  const rowUserIds = [];
  let refreshedCount = 0;
  allStudentIds.forEach(userId => {
    const kept = keptRows.get(userId);
    if (kept) {
      const { rowValues, questionColumnsMap } = kept;
      const row = [rowValues[0] || sortName(userId), userId];
      orderedQuestionIds.forEach(qId => {
        const qCols = questionColumnsMap.get(qId);
        row.push(...(qCols ? [qCols.answerColIndex, qCols.gradeColIndex, qCols.commentColIndex].map(c => rowValues[c] ?? "") : ["", "", ""]));
      });
      sheetData.push(row);
      rowUserIds.push(userId);
    } else if (studentMap[userId]) {
      const answers = answersByStudent[userId]?.answers || {};
      const row = [sortName(userId), userId];
      orderedQuestionIds.forEach(qId => row.push(answers[qId]?.text ?? "", answers[qId]?.score ?? "", answers[qId]?.comment ?? ""));
      sheetData.push(row);
      rowUserIds.push(userId);
      refreshedCount++;
    } else {
      Logger.log(`Student ID ${userId} is not in the current Canvas roster. Skipping.`);
    }
  });
  Logger.log(`"${MAIN_SHEET_NAME}": ${keptRows.size} kept, ${refreshedCount} refreshed (${[...rowUserIds].filter(id => !existingUserIds.has(id)).length} new).`);

  writeToSheet_(mainSheet, sheetData, true);
  reapplyAIMarks_(mainSheet, rowUserIds, orderedQuestionIds, aiMarks);
  return { refreshedCount, preservedCount: keptRows.size };
}

/**
 * Re-highlights unreviewed AI grades/comments of kept rows at their new positions.
 * Column layout after a rebuild: A name, B user ID, then Answer/Grade/Comment per question.
 * @private
 */
function reapplyAIMarks_(mainSheet, rowUserIds, orderedQuestionIds, aiMarks) {
  rowUserIds.forEach((userId, r) => {
    const marks = aiMarks.get(userId);
    if (!marks || marks.size === 0) return;
    orderedQuestionIds.forEach((qId, k) => {
      const answerColumn = 3 + k * 3;
      if (marks.has(`${qId}:grade`)) markAsAIWritten_(mainSheet.getRange(r + 2, answerColumn + 1));
      if (marks.has(`${qId}:comment`)) markAsAIWritten_(mainSheet.getRange(r + 2, answerColumn + 2));
    });
  });
}
