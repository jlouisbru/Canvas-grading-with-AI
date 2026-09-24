// AnswerKeyDrafts.gs

/**
 * Menu action: drafts an answer key (and optionally rubric criteria) with AI for every
 * question that has no answer key yet. Drafts are highlighted until the instructor reviews them.
 * Only question text is sent to Claude — never student data.
 */
function draftAnswerKeysWithAI() {
  const ui = SpreadsheetApp.getUi();
  const answersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ANSWERS_SHEET_NAME);
  const questions = parseAnswersSheet_();
  if (!answersSheet || !questions || Object.keys(questions).length === 0) {
    ui.alert("No Questions Yet", `Run "1. Fetch from Canvas" first to load the quiz questions.`, ui.ButtonSet.OK);
    return;
  }
  const targets = Object.entries(questions).filter(([, q]) => q.prompt && !q.key);
  if (targets.length === 0) {
    ui.alert("Nothing to Draft", `Every question already has an answer key in Column C of "${ANSWERS_SHEET_NAME}".\n\nTo redraft one, clear its Column C cell and run this again.`, ui.ButtonSet.OK);
    return;
  }

  const choice = ui.alert("Draft Answer Keys with AI",
    `Draft answer keys for ${targets.length} question(s) that don't have one yet?\n\n` +
    `Also draft rubric criteria?\n` +
    `• Yes: answer key + rubric criteria (questions with a rubric are graded criterion by criterion)\n` +
    `• No: answer key only\n\n` +
    `Only the question text is sent to Claude. Drafts are highlighted until you review them.`,
    ui.ButtonSet.YES_NO_CANCEL);
  if (choice !== ui.Button.YES && choice !== ui.Button.NO) return;
  const includeRubric = choice === ui.Button.YES;

  const claudeApiKey = getClaudeApiKey_();
  if (!claudeApiKey) return;
  const model = getSetting_("CLAUDE_GRADING_MODEL", DEFAULT_CLAUDE_GRADING_MODEL);
  const result = draftAnswerKeys_(answersSheet, targets, includeRubric, claudeApiKey, model);

  if (result.authError) { handleClaudeAuthError_(); return; }
  const lines = [`Answer keys drafted: ${result.keysWritten}.`];
  if (includeRubric) lines.push(`Rubrics drafted: ${result.rubricsWritten}.`);
  if (result.rubricsSkipped > 0) lines.push(`Rubrics not written: ${result.rubricsSkipped} (existing criteria were kept, or the drafted points didn't add up to the question's points).`);
  if (result.errors > 0) lines.push(`Couldn't draft: ${result.errors} (details in Extensions → Apps Script → Executions).`);
  if (result.remaining > 0) lines.push(`Time limit reached with ${result.remaining} question(s) left. Run this again to draft the rest.`);
  lines.push("", `Review the highlighted drafts in "${ANSWERS_SHEET_NAME}" and edit anything that doesn't match how you grade. Editing a cell removes its highlight.`);
  showToast_("Answer key drafts ready for review.", "Done", 10);
  ui.alert("Drafts Ready for Review", lines.join("\n"), ui.ButtonSet.OK);
}

/**
 * Drafts and writes answer keys (and rubrics) for the target questions within the time budget.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} answersSheet The "Answers" sheet.
 * @param {Array<[string, object]>} targets [qId, question] pairs from parseAnswersSheet_().
 * @returns {{keysWritten: number, rubricsWritten: number, rubricsSkipped: number, errors: number, remaining: number, authError: boolean}}
 * @private
 */
function draftAnswerKeys_(answersSheet, targets, includeRubric, claudeApiKey, model) {
  const startTime = Date.now();
  const result = { keysWritten: 0, rubricsWritten: 0, rubricsSkipped: 0, errors: 0, remaining: 0, authError: false };

  for (let i = 0; i < targets.length; i++) {
    if (Date.now() - startTime > MAX_AI_RUNTIME_MS) { result.remaining = targets.length - i; break; }
    const [qId, question] = targets[i];
    showToast_(`Drafting answer key ${i + 1} of ${targets.length} (QID ${qId})…`, "Working…", -1);

    const rubricCells = answersSheet.getRange(question.row, 5, 1, MAX_RUBRIC_CRITERIA * 2);
    const rubricIsEmpty = rubricCells.getValues()[0].every(isBlankCell_);
    const draft = callClaudeAPIForAnswerKeyDraft_(question.title, question.prompt, question.maxPoints, includeRubric && rubricIsEmpty, claudeApiKey, model);
    if (draft.isAuthError) { result.authError = true; break; }
    if (!draft.answerKey) {
      Logger.log(`No answer key drafted for QID ${qId}: ${draft.errorMsg}`);
      result.errors++;
      continue;
    }

    const keyCell = answersSheet.getRange(question.row, 3);
    keyCell.setValue(draft.answerKey);
    markAsAIWritten_(keyCell);
    result.keysWritten++;

    if (includeRubric) {
      if (writeDraftRubric_(answersSheet, question, draft.criteria, rubricIsEmpty)) result.rubricsWritten++;
      else result.rubricsSkipped++;
    }
    SpreadsheetApp.flush();
  }
  return result;
}

/**
 * Writes drafted rubric criteria into Columns E+ if the row has no criteria yet and the points
 * add up to the question's points.
 * @returns {boolean} True if the rubric was written.
 * @private
 */
function writeDraftRubric_(answersSheet, question, criteria, rubricIsEmpty) {
  const kept = criteria.slice(0, MAX_RUBRIC_CRITERIA);
  if (!rubricIsEmpty || kept.length === 0) return false;
  const total = kept.reduce((sum, c) => sum + c.points, 0);
  if (question.maxPoints > 0 && Math.abs(total - question.maxPoints) > 0.01) {
    Logger.log(`Drafted rubric points (${total}) don't match max points (${question.maxPoints}) for row ${question.row}. Rubric not written.`);
    return false;
  }
  const cells = answersSheet.getRange(question.row, 5, 1, kept.length * 2);
  cells.setValues([kept.flatMap(c => [c.description, c.points])]);
  markAsAIWritten_(cells);
  return true;
}
