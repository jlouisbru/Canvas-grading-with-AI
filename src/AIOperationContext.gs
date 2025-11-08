// AIOperationContext.gs

/**
 * Initializes common context for AI operations (API keys, sheet objects, config, header info, answer/rubric data).
 * @param {GoogleAppsScript.Spreadsheet.Sheet} mainSheet The main data sheet.
 * @param {boolean} needsRubricData Whether to parse rubric data specifically from "Answers" sheet.
 * @param {boolean} needsAnswerKeyMap Whether to parse overall answer key data from "Answers" sheet.
 * @returns {object|null} Context object or null on critical failure.
 * @private
 */
function initializeAIOperationContext_(mainSheet, needsRubricData, needsAnswerKeyMap) {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const answersSheet = spreadsheet.getSheetByName("Answers");

  if (!answersSheet && (needsRubricData || needsAnswerKeyMap)) {
    ui.alert("Error: 'Answers' Sheet Missing", "The 'Answers' sheet was not found. Please run 'Fetch Question Prompts to \"Answers\" Sheet' first.", ui.ButtonSet.OK);
    return null;
  }

  const claudeApiKey = getClaudeApiKey_();
  if (!claudeApiKey) return null;

  const config = getConfigFromSheet_();
  if (!config) return null;

  const canvasApiKey = getCanvasApiKey_();
  if (!canvasApiKey) {
      ui.alert("Error: Canvas API Key Missing", "Canvas API Key is required to determine question context for AI operations from the main sheet header. Please provide it when prompted or in Settings.");
      return null;
  }
  const quizId = getQuizIdFromAssignment_(canvasApiKey, config);

  // Fetch questionMap and orderedQuestionIds for accurate header parsing context.
  // If quizId is null, these will be empty.
  const { questionMap = {}, orderedQuestionIds = [] } = quizId ? getEssayQuestions_(canvasApiKey, config, quizId) : {};
  if (quizId && orderedQuestionIds.length === 0) {
      Logger.log("Info: No essay questions found in the Canvas quiz for QuizID: " + quizId + ". Header parsing will use existing sheet structure.");
  }

  // If orderedQuestionIds is empty (e.g., no quizId or no essay questions),
  // parseMainSheetHeader_ will attempt to derive QIDs from the existing header.
  const qidsForHeaderParsing = orderedQuestionIds.length > 0 ? orderedQuestionIds : getHeaderValues_(mainSheet).map(h => (String(h).match(/\[Q ID: (\d+)\]/) || [])[1]).filter(Boolean);
  const mainSheetHeaderInfo = parseMainSheetHeader_(mainSheet, qidsForHeaderParsing);

  if (!mainSheetHeaderInfo) {
    ui.alert("Error: Main Sheet Header Invalid", "Could not parse main sheet header. Ensure Row 1 is correct (Student Name, Canvas User ID, QID columns). Run 'Fetch Essay Quiz Responses' to rebuild if needed.", ui.ButtonSet.OK);
    return null;
  }
  if (mainSheetHeaderInfo.questionColumnsMap.size === 0) {
      Logger.log("Warning: No question columns (e.g., '[Q ID: xxx] Question Title') were parsed from the main sheet header. AI operations may not find questions to process.");
  }

  let rubricDataMap = null;
  if (needsRubricData && answersSheet) {
    rubricDataMap = parseRubricDataFromAnswersSheet_();
    if (!rubricDataMap) {
        Logger.log("Rubric data parsing from 'Answers' sheet resulted in null (likely 'Answers' sheet missing error handled by parseRubricDataFromAnswersSheet_).");
        // Alert is handled by parseRubricDataFromAnswersSheet_ if sheet is missing
    } else if (Object.keys(rubricDataMap).length === 0) {
        ui.alert("No Rubric Data Found", "No valid rubric data (Max Points in Col D, Criteria in Cols E+) found in the 'Answers' sheet. Rubric-based AI operations cannot proceed.", ui.ButtonSet.OK);
        return null; // Fatal for rubric operations if no data at all
    }
  }

  let answerKeyDataMap = null;
  if (needsAnswerKeyMap && answersSheet) {
      answerKeyDataMap = {};
      const answersSheetValues = answersSheet.getDataRange().getValues();
      for (let i = 1; i < answersSheetValues.length; i++) {
          const row = answersSheetValues[i];
          const qIdTitleCell = row[0] ? String(row[0]) : "";
          const promptText = row[1] ? String(row[1]) : "";
          const keyText = row[2] ? String(row[2]) : "";
          const qIdMatch = qIdTitleCell.match(/\[Q ID: (\d+)\]/);
          if (qIdMatch && qIdMatch[1] && keyText.trim()) {
              answerKeyDataMap[qIdMatch[1]] = { prompt: promptText.trim(), key: keyText.trim() };
          } else if (qIdTitleCell.trim() && i > 0 && !keyText.trim() && qIdMatch?.[1]) {
              Logger.log(`Skipping QID ${qIdMatch[1]} in 'Answers' for AI Overall Key: missing key in Col C.`);
          }
      }
      if (Object.keys(answerKeyDataMap).length === 0) {
          ui.alert("No Answer Keys Found", "No valid overall answer keys found in Column C of 'Answers' sheet. AI operations requiring answer keys cannot proceed.", ui.ButtonSet.OK);
          return null; // Fatal if answer keys are essential
      }
  }

  return {
    ui, spreadsheet, mainSheet, answersSheet, claudeApiKey, config,
    canvasApiKey, quizId, questionMap, orderedQuestionIds, mainSheetHeaderInfo,
    rubricDataMap, answerKeyDataMap
  };
}
