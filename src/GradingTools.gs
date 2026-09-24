// GradingTools.gs

const GENEROSITY_LABELS = { 1: "Very Strict", 2: "Strict", 3: "Normal", 4: "Generous", 5: "Very Generous" };

/**
 * The two AI operations. Each question is handled automatically: questions with rubric
 * criteria in the "Answers" sheet use rubric grading/feedback, the others use the answer key.
 * Only strings live here: settings and other files' constants are read at call time.
 */
const AI_OPERATIONS = {
  grade: {
    title: "Grading",
    resultName: "grade",
    continueHandler: "continueGradeAnswers",
    plan: context => planAITasks_(context, "grade"),
    readSettings: () => ({
      model: getSetting_("CLAUDE_GRADING_MODEL", DEFAULT_CLAUDE_GRADING_MODEL),
      generosity: getGenerositySetting_()
    }),
    process: (task, context, settings) => gradeOneAnswer_(task, context, settings)
  },
  feedback: {
    title: "Feedback",
    resultName: "comment",
    continueHandler: "continueWriteFeedback",
    plan: context => planAITasks_(context, "feedback"),
    readSettings: () => ({
      model: getSetting_("CLAUDE_COMMENTING_MODEL", DEFAULT_CLAUDE_COMMENTING_MODEL),
      includeAnswerKey: getYesNoSetting_("INCLUDE_ANSWER_KEY_IN_FEEDBACK", false)
    }),
    process: (task, context, settings) => writeOneComment_(task, context, settings)
  }
};

/** Menu action: grades every answer that doesn't have a grade yet. */
function gradeAnswers() {
  runAIOperation_("grade", false);
}

/** Menu action: writes feedback for every answer that has no comment and didn't get full marks. */
function writeFeedback() {
  runAIOperation_("feedback", false);
}

/**
 * Menu / Start Here action: stops the current grading, feedback, or answer-key drafting run after
 * the answer it's working on, and cancels any scheduled background continuation. Everything
 * already written is kept, so running the step again picks up where it stopped.
 */
function stopAIRun() {
  // The stop signal is left set on purpose: a run that is about to start (its confirmation is
  // still open) or about to schedule a continuation sees it and stops. Fresh runs clear it
  // before their confirmation, so a leftover signal never blocks the next run.
  requestCancel_();
  Object.values(AI_OPERATIONS).forEach(op => deleteContinuationTriggers_(op.continueHandler));
  const status = getRunStatus_();
  if (isRunInProgress_(status)) {
    showToast_("Stopping after the current answer finishes…", "Stop", 15);
    return;
  }
  if (status && status.state === "scheduled") {
    const title = AI_OPERATIONS[status.operation]?.title || "The run";
    saveRunStatus_({ ...status, state: "stopped", message: `${title} stopped by you. Finished cells are kept; run it again to continue.` });
    notify_("Stopped", `The background continuation was cancelled. ${status.written} cell(s) were written and are kept.\n\nRun the step again whenever you want to continue.`);
    return;
  }
  notify_("Nothing Running", "No grading, feedback, or drafting run is in progress. (If one was just about to start, it stops right away.)");
}

/** Background continuation of gradeAnswers (called by a time-based trigger). */
function continueGradeAnswers() {
  runAIOperation_("grade", true);
}

/** Background continuation of writeFeedback (called by a time-based trigger). */
function continueWriteFeedback() {
  runAIOperation_("feedback", true);
}

/**
 * Returns true if a cell value is empty.
 * @param {*} value A cell value.
 * @returns {boolean}
 * @private
 */
function isBlankCell_(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

/**
 * Lists the cells an operation needs to fill, plus questions that can't be processed.
 * @param {object} context From initializeAIOperationContext_().
 * @param {"grade"|"feedback"} kind Which operation to plan.
 * @returns {{tasks: object[], skipped: string[]}}
 * @private
 */
function planAITasks_(context, kind) {
  const { mainSheet, questionColumnsMap, questions, headerValues } = context;
  const rows = mainSheet.getRange(2, 1, mainSheet.getLastRow() - 1, mainSheet.getLastColumn()).getValues();
  const tasks = [];
  const skipped = [];

  for (const [qId, cols] of questionColumnsMap) {
    const question = questions[qId];
    const useRubric = Boolean(question && question.criteria.length > 0);
    if (!question || (!useRubric && !question.key)) {
      skipped.push(`QID ${qId}: no answer key or rubric yet`);
      continue;
    }
    const points = useRubric ? (question.maxPoints || cols.points) : (cols.points || question.maxPoints);
    if (!(points > 0)) {
      skipped.push(`QID ${qId}: points possible is missing`);
      continue;
    }
    const questionText = question.prompt || headerValues[cols.answerColIndex];

    rows.forEach((row, i) => {
      const answer = row[cols.answerColIndex];
      if (isBlankCell_(answer)) return;
      const gradeCell = row[cols.gradeColIndex];
      const targetColIndex = kind === "grade" ? cols.gradeColIndex : cols.commentColIndex;
      if (!isBlankCell_(row[targetColIndex])) return;

      const grade = isBlankCell_(gradeCell) ? null : parseFloat(String(gradeCell));
      if (kind === "feedback" && grade !== null && !isNaN(grade) && grade >= points) return; // Full marks: no feedback needed.

      tasks.push({
        qId, useRubric, points, questionText,
        answer: String(answer),
        grade: (grade === null || isNaN(grade)) ? null : grade,
        sheetRow: i + 2,
        sheetColumn: targetColIndex + 1
      });
    });
  }
  return { tasks, skipped };
}

/**
 * Grades one answer with Claude.
 * @returns {{value: number|null, isAuthError: boolean, errorMsg: string}}
 * @private
 */
function gradeOneAnswer_(task, context, settings) {
  const question = context.questions[task.qId];
  const result = task.useRubric
    ? callClaudeAPIForRubricGrade_(task.questionText, task.answer, task.points, question.criteria, context.claudeApiKey, settings.model, settings.generosity)
    : callClaudeAPIForGrading_(task.questionText, question.key, task.answer, task.points, context.claudeApiKey, settings.model, settings.generosity);
  return { value: result.grade === null ? null : Number(result.grade), isAuthError: result.isAuthError, errorMsg: result.errorMsg };
}

/**
 * Writes feedback for one answer with Claude.
 * @returns {{value: string|null, isAuthError: boolean, errorMsg: string}}
 * @private
 */
function writeOneComment_(task, context, settings) {
  const question = context.questions[task.qId];
  const includeAnswerKey = settings.includeAnswerKey && Boolean(question.key);
  const result = task.useRubric
    ? callClaudeAPIForRubricComment_(task.questionText, task.answer, question.key || "(No overall answer key was provided; use the rubric criteria.)",
        task.grade, task.points, question.criteria, context.claudeApiKey, settings.model, includeAnswerKey)
    : callClaudeAPIForCommenting_(task.questionText, question.key, task.answer, task.grade, task.points, context.claudeApiKey, settings.model, includeAnswerKey);
  return { value: result.comment ? result.comment.trim() : null, isAuthError: result.isAuthError, errorMsg: result.errorMsg };
}

/**
 * Asks the user to confirm a run, showing what will happen and anything worth knowing first.
 * @returns {boolean} True to proceed.
 * @private
 */
function confirmAIRun_(operationName, tasks, skipped, settings) {
  const questionCount = new Set(tasks.map(t => t.qId)).size;
  const lines = [];
  if (operationName === "grade") {
    lines.push(`Grade ${tasks.length} answer(s) across ${questionCount} question(s) using ${settings.model}, generosity ${settings.generosity} (${GENEROSITY_LABELS[settings.generosity]})?`);
    lines.push("", "Only empty grade cells are filled.");
  } else {
    lines.push(`Write feedback for ${tasks.length} answer(s) across ${questionCount} question(s) using ${settings.model}?`);
    lines.push("", `Answers with full marks are skipped. Include answer key in feedback: ${settings.includeAnswerKey ? "Yes" : "No"}.`);
  }
  lines.push("AI-written cells are highlighted until you review them.");
  if (skipped.length > 0) lines.push("", "Skipped:", ...skipped.map(s => `• ${s}`));
  const unreviewedDrafts = countUnreviewedAnswerKeyDrafts_();
  if (unreviewedDrafts > 0) {
    lines.push("", `⚠ ${unreviewedDrafts} question(s) use AI-drafted answer keys or rubrics you haven't reviewed yet (highlighted in the "${ANSWERS_SHEET_NAME}" sheet).`);
  }
  return confirm_(`Confirm ${AI_OPERATIONS[operationName].title}`, lines.join("\n"), true);
}

/**
 * Runs Claude on each task until done or the time budget runs out, writing and highlighting results.
 * @returns {{written: number, errors: number, processed: number, timedOut: boolean, authError: boolean, cancelled: boolean}}
 * @private
 */
function processAITasks_(operationName, tasks, context, settings, executionStart, statusBase) {
  const op = AI_OPERATIONS[operationName];
  const outcome = { written: 0, errors: 0, processed: 0, timedOut: false, authError: false, cancelled: false };

  for (const task of tasks) {
    if (Date.now() - executionStart > MAX_AI_RUNTIME_MS) { outcome.timedOut = true; break; }
    if (isCancelRequested_()) { outcome.cancelled = true; break; }
    showToast_(`${op.title} ${outcome.processed + 1} of ${tasks.length} (QID ${task.qId}, row ${task.sheetRow})…`, "Working…", -1);

    const result = op.process(task, context, settings);
    if (result.isAuthError) { outcome.authError = true; break; }
    outcome.processed++;

    if (result.value !== null && result.value !== "") {
      const cell = context.mainSheet.getRange(task.sheetRow, task.sheetColumn);
      cell.setValue(result.value);
      markAsAIWritten_(cell);
      SpreadsheetApp.flush(); // Show each result as soon as it arrives.
      outcome.written++;
    } else {
      Logger.log(`No ${op.resultName} for QID ${task.qId}, row ${task.sheetRow}: ${result.errorMsg}`);
      outcome.errors++;
    }
    saveRunStatus_({ ...statusBase, state: "running", written: statusBase.written + outcome.written, errors: statusBase.errors + outcome.errors,
      message: `${op.title}: ${tasks.length - outcome.processed} answer(s) to go.` });
  }
  return outcome;
}

/**
 * Shared driver for grading and feedback. Holds the lock only while working; dialogs are
 * shown after it's released, so a scheduled continuation is never blocked by an open alert.
 * @param {"grade"|"feedback"} operationName Which operation to run.
 * @param {boolean} isContinuation True when called by a background trigger.
 * @private
 */
function runAIOperation_(operationName, isContinuation) {
  const executionStart = Date.now();
  const lock = acquireRunLock_();
  if (!lock) {
    if (isContinuation) {
      retryContinuationLater_(operationName);
    } else {
      notify_("Already Running", "Another grading or feedback run is in progress. Wait for it to finish (see the Start Here panel), then try again.");
    }
    return;
  }
  let result;
  try {
    result = executeAIRun_(operationName, isContinuation, executionStart);
  } finally {
    lock.releaseLock();
  }
  if (result.authError) handleClaudeAuthError_();
  if (result.message) notify_(result.message.title, result.message.text);
}

/**
 * A background continuation found another run holding the lock. Instead of dropping the chain,
 * try again in about a minute, up to AUTO_CONTINUE_MAX_LOCK_RETRIES times.
 * The status record is only updated if it belongs to this operation, so the run that holds
 * the lock keeps reporting its own progress.
 * @param {"grade"|"feedback"} operationName The operation that couldn't start.
 * @private
 */
function retryContinuationLater_(operationName) {
  const op = AI_OPERATIONS[operationName];
  if (isCancelRequested_()) {
    Logger.log(`${op.title} continuation not rescheduled: the user asked to stop.`);
    return;
  }
  const status = getRunStatus_();
  const ownsStatus = status?.operation === operationName;
  const retries = (ownsStatus ? (status.lockRetries || 0) : 0) + 1;
  const rescheduled = retries <= AUTO_CONTINUE_MAX_LOCK_RETRIES && scheduleContinuation_(op.continueHandler);
  Logger.log(`${op.title} continuation found another run busy (retry ${retries}); ${rescheduled ? "rescheduled" : "giving up"}.`);
  if (!ownsStatus) return;
  saveRunStatus_(rescheduled
    ? { ...status, state: "scheduled", lockRetries: retries, message: `${op.title} is waiting for another run to finish, then continues automatically.` }
    : { ...status, state: "paused", message: `${op.title} couldn't continue because another run stayed busy. Run it again to continue.` });
}

/**
 * Plans, confirms, and processes one run, then records whether it finished, paused, or will
 * continue in the background.
 * @returns {{message: {title: string, text: string}|null, authError: boolean}}
 * @private
 */
function executeAIRun_(operationName, isContinuation, executionStart) {
  const op = AI_OPERATIONS[operationName];
  deleteContinuationTriggers_(op.continueHandler);
  const previous = getRunStatus_();
  const chain = (isContinuation && previous?.operation === operationName) ? previous : { written: 0, errors: 0, runNumber: 0 };
  const statusBase = { operation: operationName, runNumber: chain.runNumber + 1, written: chain.written, errors: chain.errors };
  if (isContinuation && isCancelRequested_()) {
    clearCancelRequest_();
    saveRunStatus_({ ...statusBase, state: "stopped", message: `${op.title} stopped by you. Finished cells are kept; run it again to continue.` });
    return { message: null, authError: false };
  }
  if (!isContinuation) clearCancelRequest_(); // A fresh run starts with no pending stop request.

  const context = initializeAIOperationContext_();
  if (!context) {
    if (isContinuation) saveRunStatus_({ ...statusBase, state: "stopped", message: `${op.title} stopped: setup problem (see the execution log).` });
    return { message: null, authError: false };
  }

  const settings = op.readSettings();
  const { tasks, skipped } = op.plan(context);
  const skippedNote = skipped.length ? `\n\nSkipped:\n${skipped.map(s => `• ${s}`).join("\n")}` : "";
  if (tasks.length === 0) {
    const doneText = operationName === "grade" ? "Every answer already has a grade." : "Every answer that needs feedback already has a comment.";
    saveRunStatus_({ ...statusBase, state: "done", message: `${op.title} complete. ${doneText}` });
    return { message: { title: `${op.title} Complete`, text: doneText + skippedNote }, authError: false };
  }
  if (!isContinuation && !confirmAIRun_(operationName, tasks, skipped, settings)) {
    showToast_("Cancelled.", op.title, 5);
    return { message: null, authError: false };
  }

  saveRunStatus_({ ...statusBase, state: "running", message: `${op.title}: ${tasks.length} answer(s) to go.` });
  const outcome = processAITasks_(operationName, tasks, context, settings, executionStart, statusBase);
  const totals = { ...statusBase, written: statusBase.written + outcome.written, errors: statusBase.errors + outcome.errors };
  const errorNote = totals.errors > 0 ? `\nCouldn't complete: ${totals.errors} (details in Extensions → Apps Script → Executions).` : "";

  if (outcome.authError) {
    saveRunStatus_({ ...totals, state: "stopped", message: `${op.title} stopped: the Claude API key was rejected.` });
    return { message: null, authError: true };
  }
  if (outcome.cancelled) {
    clearCancelRequest_();
    const remaining = tasks.length - outcome.processed;
    saveRunStatus_({ ...totals, state: "stopped", message: `${op.title} stopped by you with ${remaining} to go. Finished cells are kept; run it again to continue.` });
    showToast_(`${op.title} stopped.`, "Stopped", 10);
    return { message: { title: `${op.title} Stopped`, text: `Stopped as you asked. Written: ${totals.written}. ${remaining} answer(s) not done yet.\n\nEverything written is kept; run the step again to continue.${errorNote}` }, authError: false };
  }
  if (!outcome.timedOut) {
    saveRunStatus_({ ...totals, state: "done", message: `${op.title} complete: ${totals.written} written.` });
    showToast_(`${op.title} complete: ${totals.written} written.`, "Done", 10);
    return { message: { title: `${op.title} Complete`, text: `Written: ${totals.written}. AI-written cells are highlighted until you review them.${errorNote}` }, authError: false };
  }

  const remaining = tasks.length - outcome.processed;
  if (isCancelRequested_()) { // Stop was pressed just as the time limit hit: don't schedule a continuation.
    clearCancelRequest_();
    saveRunStatus_({ ...totals, state: "stopped", message: `${op.title} stopped by you with ${remaining} to go. Finished cells are kept; run it again to continue.` });
    return { message: { title: `${op.title} Stopped`, text: `Stopped as you asked. Written: ${totals.written}. ${remaining} answer(s) not done yet.${errorNote}` }, authError: false };
  }
  const canContinue = outcome.written > 0 && statusBase.runNumber < AUTO_CONTINUE_MAX_RUNS && scheduleContinuation_(op.continueHandler);
  if (!canContinue) {
    saveRunStatus_({ ...totals, state: "paused", message: `${op.title} paused with ${remaining} to go. Run it again to continue.` });
    return { message: { title: `${op.title} Paused`, text: `Written so far: ${totals.written}. ${remaining} answer(s) to go.\n\nRun it again to continue — finished cells are skipped.${errorNote}` }, authError: false };
  }
  saveRunStatus_({ ...totals, state: "scheduled", message: `${op.title} paused at the 5-minute limit; continuing automatically in about a minute (${remaining} to go).` });
  showToast_(`Paused at the time limit. Continuing automatically in about a minute (${remaining} to go).`, op.title, 15);
  const message = isContinuation ? null : { title: `${op.title} Continues in the Background`,
    text: `Written so far: ${totals.written}. ${remaining} answer(s) to go.\n\nGoogle limits each run to a few minutes, so the rest continues automatically in about a minute. You can close this spreadsheet; progress appears in the Start Here panel.${errorNote}` };
  return { message, authError: false };
}
