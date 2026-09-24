// SetupCheck.gs

/**
 * Menu action: tests the settings, both API keys, the quiz, and the chosen models, then shows
 * a plain-language checklist. Checking models uses the free Models API (no tokens are billed).
 */
function checkSetup() {
  showToast_("Checking your setup…", "Check Setup", -1);
  const items = runSetupChecks_();
  const icon = { ok: "✅", warn: "⚠️", fail: "❌" };
  const text = items.map(item => `${icon[item.state]} ${item.label}: ${item.detail}`).join("\n");
  const allGood = items.every(item => item.state === "ok");
  showToast_(allGood ? "Everything looks good." : "Some items need attention.", "Check Setup", 5);
  notify_(allGood ? "Setup Looks Good" : "Setup Check", text);
}

/**
 * Runs each setup check in order, stopping dependent checks when a prerequisite fails.
 * @returns {Array<{label: string, state: "ok"|"warn"|"fail", detail: string}>}
 * @private
 */
function runSetupChecks_() {
  const items = [];
  const add = (label, state, detail) => items.push({ label, state, detail });

  let config = null;
  try {
    config = resolveConfig_();
    add("Canvas settings", "ok", `course ${config.courseId} on ${config.canvasBaseUrl.replace(/^https?:\/\//, "")}, assignment ${config.assignmentId}`);
  } catch (e) {
    add("Canvas settings", "fail", e.message);
  }

  const canvasKey = findSavedApiKey_("Canvas", "CANVAS_API_KEY", "CANVAS_API_KEY");
  if (!canvasKey) {
    add("Canvas API key", "fail", "not saved yet. Paste it into the CANVAS_API_KEY row of Settings.");
  } else if (config) {
    checkCanvasAccess_(config, canvasKey, add);
  } else {
    add("Canvas API key", "warn", "saved, but not tested until the Canvas settings are fixed.");
  }

  const claudeKey = findSavedApiKey_("Claude", "CLAUDE_API_KEY", "CLAUDE_API_KEY");
  if (!claudeKey) {
    add("Claude API key", "fail", "not saved yet. Paste it into the CLAUDE_API_KEY row of Settings.");
  } else {
    checkClaudeAccess_(claudeKey, add);
  }

  getWorkflowStatus_().forEach(step => add(step.label, step.state, step.detail));
  return items;
}

/**
 * Tests the Canvas key against the course, then finds the quiz and counts its essay questions.
 * @private
 */
function checkCanvasAccess_(config, canvasKey, add) {
  try {
    const course = fetchCanvasAPI_(config.canvasBaseUrl, `/api/v1/courses/${config.courseId}`, canvasKey);
    add("Canvas API key", "ok", `works (course: ${course?.name || config.courseId})`);
  } catch (e) {
    add("Canvas API key", "fail", e.isCanvasAuthError
      ? "Canvas rejected it. Generate a new token (Account → Settings → Approved Integrations) and paste it into Settings."
      : `couldn't reach the course: ${e.message}`);
    return;
  }
  try {
    const quizResult = getQuizIdFromAssignment_(canvasKey, config);
    if (!quizResult) {
      add("Quiz", "fail", `ASSIGNMENT_ID ${config.assignmentId} isn't a Classic Quiz in this course.`);
      return;
    }
    const { orderedQuestionIds } = getEssayQuestions_(canvasKey, config, quizResult.quizId);
    add("Quiz", orderedQuestionIds.length > 0 ? "ok" : "fail",
      orderedQuestionIds.length > 0 ? `found, with ${orderedQuestionIds.length} essay question(s)` : "found, but it has no essay questions");
  } catch (e) {
    add("Quiz", "fail", e.message);
  }
}

/**
 * Tests the Claude key and both configured models via the Models API.
 * @private
 */
function checkClaudeAccess_(claudeKey, add) {
  const models = [
    ["Grading model", getSetting_("CLAUDE_GRADING_MODEL", DEFAULT_CLAUDE_GRADING_MODEL)],
    ["Feedback model", getSetting_("CLAUDE_COMMENTING_MODEL", DEFAULT_CLAUDE_COMMENTING_MODEL)]
  ];
  const modelsUrl = String(getSetting_("CLAUDE_API_ENDPOINT", DEFAULT_CLAUDE_API_ENDPOINT)).replace(/\/v1\/messages\/?$/, "/v1/models/");
  if (!modelsUrl.endsWith("/v1/models/")) {
    add("Claude API key", "warn", "saved, but a custom CLAUDE_API_ENDPOINT is set, so it can't be tested here.");
    return;
  }
  let keyReported = false;
  for (const [label, modelId] of models) {
    const result = checkClaudeModel_(modelsUrl, claudeKey, String(modelId));
    if (result.isAuthError) {
      add("Claude API key", "fail", "Anthropic rejected it. Copy a valid key from console.anthropic.com and paste it into Settings.");
      return;
    }
    if (!keyReported && result.reachedApi) {
      add("Claude API key", "ok", "works");
      keyReported = true;
    }
    add(label, result.ok ? "ok" : "fail", result.detail);
  }
}

/**
 * Looks up one model with the Models API.
 * @returns {{ok: boolean, reachedApi: boolean, isAuthError: boolean, detail: string}}
 * @private
 */
function checkClaudeModel_(modelsUrl, apiKey, modelId) {
  try {
    const response = UrlFetchApp.fetch(modelsUrl + encodeURIComponent(modelId), {
      method: "get",
      headers: { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_API_VERSION },
      muteHttpExceptions: true
    });
    const code = response.getResponseCode();
    if (code === 200) {
      const displayName = JSON.parse(response.getContentText()).display_name;
      return { ok: true, reachedApi: true, isAuthError: false, detail: displayName ? `${modelId} (${displayName})` : modelId };
    }
    if (code === 401 || code === 403) return { ok: false, reachedApi: true, isAuthError: true, detail: "" };
    if (code === 404) return { ok: false, reachedApi: true, isAuthError: false, detail: `"${modelId}" isn't an available model ID. Pick one from the dropdown in Settings.` };
    return { ok: false, reachedApi: false, isAuthError: false, detail: `couldn't check ${modelId} (HTTP ${code}). Try again in a minute.` };
  } catch (e) {
    return { ok: false, reachedApi: false, isAuthError: false, detail: `couldn't reach Anthropic: ${e.message}` };
  }
}

/**
 * Summarizes progress through the workflow from the sheets alone (no network calls).
 * Used by Check Setup and the Start Here panel.
 * @returns {Array<{id: string, label: string, state: "ok"|"warn"|"fail", detail: string}>}
 * @private
 */
function getWorkflowStatus_() {
  const steps = [];
  const questions = parseAnswersSheet_() || {};
  const questionList = Object.values(questions);
  if (questionList.length === 0) {
    steps.push({ id: "fetch", label: "Questions", state: "fail", detail: `none yet. Run "1. Fetch from Canvas".` });
    return steps;
  }
  steps.push({ id: "fetch", label: "Questions", state: "ok", detail: `${questionList.length} question(s) loaded` });

  const withKey = questionList.filter(q => q.key || q.criteria.length > 0).length;
  const drafts = countUnreviewedAnswerKeyDrafts_();
  const rubrics = questionList.filter(q => q.criteria.length > 0).length;
  steps.push({
    id: "keys", label: "Answer keys",
    state: withKey < questionList.length ? "fail" : (drafts > 0 ? "warn" : "ok"),
    detail: `${withKey} of ${questionList.length} questions` +
      (rubrics > 0 ? ` (${rubrics} with a rubric)` : "") +
      (drafts > 0 ? `; ${drafts} AI draft(s) to review` : "")
  });

  const counts = countMainSheetProgress_();
  if (counts.answers === 0) {
    steps.push({ id: "responses", label: "Student answers", state: "fail", detail: `none yet. Run "1. Fetch from Canvas".` });
    return steps;
  }
  steps.push({ id: "responses", label: "Student answers", state: "ok", detail: `${counts.answers} answer(s) from ${counts.students} student(s)` });
  steps.push({ id: "grade", label: "Grades", state: counts.graded < counts.answers ? "warn" : "ok", detail: `${counts.graded} of ${counts.answers} answers graded` });
  steps.push({ id: "feedback", label: "Feedback", state: "ok", detail: `${counts.comments} comment(s) written` });
  steps.push({ id: "review", label: "AI review", state: counts.unreviewed > 0 ? "warn" : "ok",
    detail: counts.unreviewed > 0 ? `${counts.unreviewed} AI-written cell(s) still highlighted` : "nothing left to review" });
  return steps;
}

/**
 * Counts students, answers, grades, comments, and unreviewed AI cells on "Main Sheet".
 * @returns {{students: number, answers: number, graded: number, comments: number, unreviewed: number}}
 * @private
 */
function countMainSheetProgress_() {
  const counts = { students: 0, answers: 0, graded: 0, comments: 0, unreviewed: 0 };
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME);
  if (!mainSheet || mainSheet.getLastRow() < 2) return counts;
  const headerInfo = parseMainSheetHeader_(mainSheet, []);
  if (!headerInfo) return counts;
  const range = mainSheet.getRange(2, 1, mainSheet.getLastRow() - 1, mainSheet.getLastColumn());
  const rows = range.getValues();
  counts.students = rows.filter(row => !isBlankCell_(row[headerInfo.userIdColIndex])).length;
  headerInfo.questionColumnsMap.forEach(cols => {
    rows.forEach(row => {
      if (isBlankCell_(row[cols.answerColIndex])) return;
      counts.answers++;
      if (!isBlankCell_(row[cols.gradeColIndex])) counts.graded++;
      if (!isBlankCell_(row[cols.commentColIndex])) counts.comments++;
    });
  });
  counts.unreviewed = countAIMarks_(range);
  return counts;
}
