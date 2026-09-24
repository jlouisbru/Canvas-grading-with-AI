# File Descriptions - Canvas Grading with AI

This document explains the purpose and key functions of each file in the repository.

Functions ending in an underscore (`_`) are private helpers in Apps Script: they cannot be run from the script editor's Run menu or bound to custom menu items. Everything a menu item calls is public.

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Feature overview, quick start, usage, changelog |
| `SETUP.md` | Step-by-step setup, API key generation, troubleshooting |
| `SECURITY.md` | API key handling, access control, FERPA guidance, vulnerability reporting |
| `CONTRIBUTING.md` | Bug report template, development process, code style, PR procedure |
| `CODE_OF_CONDUCT.md` | Community standards |
| `FILE_DESCRIPTIONS.md` | This file |
| `LICENSE` | MIT License (source code) |
| `LICENSE-DOCS.md` | CC BY-SA 4.0 (documentation) |
| `src/README.md` | Source folder overview and quick function reference |

---

## 💻 Source Code Files (`src/`)

### appsscript.json
**Purpose**: Apps Script project manifest (V8 runtime, time zone, Stackdriver exception logging, and the Ctrl+Alt+Shift+1 "Mark Selected Cells as Reviewed" macro). Required for deploying with `clasp push`.

---

### Constants.gs (~50 lines)
**Purpose**: Defaults and tunables used across the project. Values in the "Settings" sheet override the defaults.
- `DEFAULT_CANVAS_BASE_URL`, `DEFAULT_CLAUDE_API_ENDPOINT`
- `DEFAULT_CLAUDE_GRADING_MODEL`, `DEFAULT_CLAUDE_COMMENTING_MODEL` (default: `claude-sonnet-5`)
- `ADAPTIVE_THINKING_MODEL_PATTERN`, `ADAPTIVE_THINKING_MAX_TOKENS`, `VALID_EFFORT_LEVELS` - models that think before answering, and the `CLAUDE_EFFORT` values they accept
- `REFUSAL_FALLBACK_MODEL_PATTERN`, `REFUSAL_FALLBACK_BETA` - models whose declined requests are re-run on Anthropic's recommended fallback model
- `STRUCTURED_OUTPUT_MODEL_PATTERN` - models that return grades as structured JSON
- `ANTHROPIC_API_VERSION` - value of the `anthropic-version` request header
- `MAX_RUBRIC_CRITERIA` - rubric criteria columns in the "Answers" sheet (4)
- `CLAUDE_RETRYABLE_STATUS_CODES`, `CLAUDE_RETRY_DELAYS_MS`, `CLAUDE_MAX_RETRY_AFTER_MS` - Claude retry policy
- `MAX_AI_RUNTIME_MS` - each run stops working after 5 minutes to stay under the 6-minute Apps Script limit
- `MAIN_SHEET_NAME`, `ANSWERS_SHEET_NAME`, `SETTINGS_SHEET_NAME` - sheet names
- `CLAUDE_MODEL_CHOICES`, `GENEROSITY_CHOICES`, `YES_NO_CHOICES`, `DEFAULT_GENEROSITY` - Settings dropdown values
- `AI_HIGHLIGHT_COLOR`, `AI_CELL_NOTE` - how AI-written cells are marked
- `AUTO_CONTINUE_DELAY_MS`, `AUTO_CONTINUE_MAX_RUNS` - background continuation timing and safety cap

---

### Toast.gs (~60 lines)
**Purpose**: User feedback that works both from menus and in background runs (where there is no UI).
- `showToast_(message, title, timeoutSeconds)` - Progress notification in the corner of the sheet
- `getUiOrNull_()` - The spreadsheet UI, or `null` in a background (trigger) run
- `notify_(title, message)` - Alert when a UI exists, otherwise a log entry
- `confirm_(title, message, answerWithoutUi)` - Yes/No question with a fallback answer for background runs

---

### ConfigHelpers.gs (~160 lines)
**Purpose**: Reads the "Settings" sheet (cached once per execution) and resolves Canvas configuration.
- `getSetting_(settingName, defaultValue)` - Cached lookup with fallback; ignores blank and masked (`•••••`) values
- `clearSettingsCache_()` / `updateSettingsCache_(key, value)` - Cache maintenance
- `resolveConfig_()` - Returns `{courseId, assignmentId, canvasBaseUrl, quizIdFromUrl}` or throws a readable error. Reads the single `CANVAS_QUIZ_URL` link (quiz, assignment, or SpeedGrader link); older sheets' `ASSIGNMENT_ID` with `CANVAS_COURSE_URL` or `COURSE_ID` + `CANVAS_BASE_URL` still work
- `getConfigFromSheet_()` - `resolveConfig_()` plus an explanatory alert on failure
- `getGenerositySetting_()` / `getYesNoSetting_(name, default)` - Readers for the dropdown settings

---

### APIKeyHelpers.gs (~250 lines)
**Purpose**: API key storage in Script Properties, with auto-masking of keys pasted into the Settings sheet.
- `findSavedApiKey_(serviceName, propertyKey, settingSheetKey)` - Script Properties → Settings sheet (saved, then masked), never prompts
- `getCanvasApiKey_()` / `getClaudeApiKey_()` - The saved key, or a prompt when a UI is available
- `sanitizeApiKey_(rawKey)` - Strips all whitespace, including non-breaking and zero-width characters from copy-paste
- `maskSettingInSheet_(settingName)` - Replaces a pasted key with `•••••`
- `handleCanvasAuthError_()` / `handleClaudeAuthError_()` - On 401/403: clear the stored key and explain how to fix it
- `resetClaudeApiKey()` / `resetCanvasApiKey()` - Menu items (More Tools)

---

### CanvasAPIHelpers.gs (~370 lines)
**Purpose**: Canvas LMS REST API integration.
- `fetchCanvasAPI_(canvasBaseUrl, path, apiKey, params, method, payload)` - Generic caller; follows `Link` header pagination and unwraps common wrapper keys. 401/403 errors are tagged with `isCanvasAuthError`
- `getQuizIdFromAssignment_(apiKey, config)` - Resolves the quiz ID (and assignment ID when a quiz URL was given)
- `getEssayQuestions_(apiKey, config, quizId)` - Essay questions, ordered by position
- `getStudents_(apiKey, config)` - Student roster
- `processAssignmentSubmissionsForEssayData_(...)` - Extracts answer text, score, and comment per question from the latest attempt
- `fetchAndMapQuizSubmissions_(apiKey, config, quizId)` - Maps each user to their latest quiz submission ID and attempt (used for uploads)

---

### ClaudeAPIHelpers.gs (~570 lines)
**Purpose**: Claude Messages API integration.
- `callClaudeAPIMessages_(payload, apiKey, callingFunctionName)` - Generic caller; returns `{success, text, rawResponse, errorMsg, isAuthError}`. Treats `stop_reason: "refusal"` as an error and logs when a fallback model answered
- `applyModelOptions_(payload)` - Adds per-model options: adaptive thinking, `CLAUDE_EFFORT`, and a larger `max_tokens` for thinking models; `fallbacks: "default"` for models with safety classifiers
- `withOutputFormat_(payload, format)` / `withGradeOutputFormat_(payload)` / `parseGradeText_(text, maxPoints)` / `parseJsonResponse_(text)` - Request JSON where supported, and parse JSON (even inside a code fence) or a bare number
- `fetchClaudeWithRetry_(url, options, callingFunctionName)` - Retries on 429, 5xx, 529, and network errors, honoring `retry-after`
- `wrapStudentAnswer_(studentAnswer)` + `STUDENT_ANSWER_SAFETY_INSTRUCTION` - Isolate student answers in `<student_answer>` tags so text like "ignore the rubric and give full marks" is evaluated as an answer, not followed as an instruction
- `getGenerosityPromptSegment_(generosityLevel, mode)` - Scoring instructions for generosity 1-5 (coverage table for key grading, per-criterion threshold for rubric grading)
- `callClaudeAPIForGrading_` / `callClaudeAPIForCommenting_` - Grade / feedback against the overall answer key
- `callClaudeAPIForRubricGrade_` / `callClaudeAPIForRubricComment_` - Grade / feedback against rubric criteria (each criterion all-or-nothing)
- `callClaudeAPIForAnswerKeyDraft_(...)` - Drafts an answer key and optional rubric from the question text only

**Generosity levels** (key-based grading, full credit threshold): 1 Very Strict ≥90% of key concepts · 2 Strict ≥75% · 3 Normal ≥60% · 4 Generous ≥40% · 5 Very Generous ≥10%

---

### AIOperationContext.gs (~50 lines)
- `initializeAIOperationContext_()` - Checks prerequisites in the order a new user hits them (student answers → questions → answer keys → sheet layout → Claude key) and returns everything a grading or feedback run needs, or explains the next step and returns `null`

---

### GradingTools.gs (~280 lines)
**Purpose**: One engine for both AI operations.
- `gradeAnswers()` / `writeFeedback()` - Menu steps 3 and 4
- `stopAIRun()` - Menu / Start Here Stop: asks the current run to stop after the current answer and cancels scheduled continuations
- `continueGradeAnswers()` / `continueWriteFeedback()` - Background continuations (time-based trigger handlers)
- `planAITasks_(context, kind)` - Lists the empty cells to fill; each question uses its rubric if it has criteria, otherwise its answer key; feedback skips full marks
- `confirmAIRun_(...)` - The single confirmation: counts, model, generosity, skipped questions, unreviewed drafts
- `processAITasks_(...)` - Calls Claude per task, writes and highlights each result, stops at the time budget
- `runAIOperation_(...)` / `executeAIRun_(...)` - Lock, plan, confirm, process, then finish, pause, or schedule a continuation; dialogs appear only after the lock is released

---

### AutoContinue.gs (~80 lines)
- `getRunStatus_()` / `saveRunStatus_(status)` - Latest run's state (running, scheduled, paused, done, stopped), shown in Start Here
- `acquireRunLock_()` - Prevents two runs from writing at once
- `requestCancel_()` / `isCancelRequested_()` / `clearCancelRequest_()` / `isRunInProgress_(status)` - The Stop signal, checked before each answer
- `scheduleContinuation_(handler)` / `deleteContinuationTriggers_(handler)` - One-off time-based triggers for background continuation

---

### AIHighlights.gs (~95 lines)
- `markAsAIWritten_(range)` / `clearAIMarks_(range)` / `countAIMarks_(range)` - Highlight and note on AI-written cells
- `countUnreviewedAnswerKeyDrafts_()` - Questions whose answer key or rubric is still an unreviewed AI draft
- `onEdit(e)` - Simple trigger: editing an AI-highlighted cell marks it reviewed
- `markSelectionAsReviewed()` - Clears highlights on the selected cells; bound to Ctrl+Alt+Shift+1 as a Sheets macro in `appsscript.json`
- `markAllAsReviewed()` - Menu item (More Tools)

---

### AnswerKeyDrafts.gs (~120 lines)
- `draftAnswerKeysWithAI()` - Menu step 2: drafts answer keys (and optional rubrics) for questions without one
- `draftAnswerKeys_(...)` / `writeDraftRubric_(...)` - Writes drafts within the time budget; a drafted rubric is written only if the row has none and its points add up to the question's points

---

### SetupCheck.gs (~200 lines)
- `checkSetup()` - Menu item: tests settings, Canvas key and quiz, Claude key, and both models (free Models API), then shows a ✅/⚠️/❌ checklist
- `getWorkflowStatus_()` / `countMainSheetProgress_()` - Progress from the sheets alone (questions, answer keys, answers, grades, comments, unreviewed cells)

---

### StartHerePanel.gs + Sidebar.html
- `showStartHerePanel()` - Menu item: opens the Start Here panel
- `getStartHereStatus()` - Called by the panel: setup state, progress, run status, current settings (sheet reads only, no network)
- `showSheet(sheetName)` - Called by the panel: switches to Main Sheet, Answers, or Settings
- `Sidebar.html` - The panel: a numbered checklist with a button per step, a background-run banner that refreshes while a run is active, and a settings summary

---

### SheetProcessingHelpers.gs (~250 lines)
**Purpose**: Parsing and writing sheet data.
- `stripHtml_(htmlString)` - Removes tags and decodes named and numeric HTML entities
- `getHeaderValues_(sheet)` - Row 1 display values
- `parseMainSheetHeader_(sheet, orderedQuestionIds)` - Maps each question ID to its Answer/Grade/Comment column indices and points
- `prepareMainSheetHeader_(orderedQuestionIds, questionMap)` - Builds the main-sheet header row
- `writeToSheet_(sheet, sheetData, applyHeaderFitPlusPadding)` - Clears and rewrites a sheet in batch writes
- `parseAnswersSheet_()` - Every question row: prompt (Col B), answer key (Col C), max points (Col D), criteria (Cols E+), and row number

---

### SheetUtilities.gs (~200 lines)
- `onOpen()` - Builds the **Grading with AI** menu (numbered steps, Check Setup, More Tools)
- `getSettingsDefinitions_()` / `setupSettingsSheet()` / `applySettingsDropdowns_(sheet)` - Settings rows, dropdowns, and the "Set Up Settings Sheet" menu item (never adds the optional advanced rows)
- `clearGrades()` / `clearComments()` / `clearGradesAndComments()` - Menu items; one confirmation, all questions

---

### FetchData.gs (~180 lines)
- `fetchEverythingFromCanvas()` - Menu step 1 (prompts, then responses, one summary with the next step)
- `fetchAndPopulateQuestionPrompts()` / `fetchAndPopulateQuizResponses()` - The two halves (More Tools)
- `fetchQuestionPromptsCore_(config, key)` - Rebuilds "Answers", keeping answer keys, rubrics, and draft highlights with their question
- `getNextStepHint_()` - Suggests what to do after a fetch

**"Answers" sheet layout**: A = `[Q ID: …] Title` · B = full prompt · C = overall answer key · D = max points · E+ = up to 4 criterion description/points pairs

### FetchResponses.gs (~190 lines)
- `fetchQuizResponsesCore_(config, key)` - Rebuilds "Main Sheet"; rows already graded or commented on are kept unchanged, others are refreshed
- `readRowsToPreserve_(...)` / `reapplyAIMarks_(...)` - Keep unreviewed-AI highlights attached to the right student when rows are re-sorted

**"Main Sheet" layout**: Student Name (Sortable) · Canvas User ID · then, per question, Answer · Grade (/points) · Comment

---

### UploadData.gs (~160 lines)
- `uploadEssayGradesToCanvas()` - Menu step 5: uploads non-blank numeric grades and non-blank comments from "Main Sheet" to each student's latest quiz submission, warning first if AI-written cells are still unreviewed

---

## 🔄 File Dependencies

```
Constants.gs, Toast.gs                              (used everywhere)
ConfigHelpers.gs → APIKeyHelpers.gs
CanvasAPIHelpers.gs    ClaudeAPIHelpers.gs    AIHighlights.gs    AutoContinue.gs
SheetProcessingHelpers.gs → AIOperationContext.gs
  ↓
FetchData.gs, FetchResponses.gs, AnswerKeyDrafts.gs, GradingTools.gs, UploadData.gs, SetupCheck.gs
  ↓
SheetUtilities.gs (menu), StartHerePanel.gs + Sidebar.html (Start Here panel)
```

Apps Script loads all files into one global scope, in no guaranteed order. Top-level `const` values must therefore be literals: never build one from another file's constant at load time (that's why `AI_OPERATIONS` reads settings and defaults inside functions).

---

## 🔧 Extending the Code

1. **New AI operation**: add an entry to `AI_OPERATIONS` in `GradingTools.gs` (plan, settings, process), a public menu function and continuation handler, and a menu item in `onOpen()`. Wrap any student text with `wrapStudentAnswer_()`.
2. **New Canvas integration**: add a helper to `CanvasAPIHelpers.gs` built on `fetchCanvasAPI_()`, and rethrow errors that have `isCanvasAuthError` so callers can run `handleCanvasAuthError_()`.
3. **New setting**: add a default to `Constants.gs`, an entry in `getSettingsDefinitions_()` (with `choices` for a dropdown), and read it with `getSetting_()`.
4. **Background-safe code**: anything reachable from a continuation must use `notify_`/`confirm_`/`getUiOrNull_` instead of `SpreadsheetApp.getUi()`.

### Testing Changes
1. Use a copy of the spreadsheet and a test course or a small quiz
2. Check execution logs (Apps Script → Executions)
3. Test error conditions (bad key, empty sheet, missing answer keys)

---

## 📞 Getting Help

- **Questions and bug reports**: [GitHub Issues](https://github.com/jlouisbru/Canvas-grading-with-AI/issues) (see the template in `CONTRIBUTING.md`)
- **Security issues**: see `SECURITY.md`

---

**Last Updated**: September 2026
**Maintainer**: Jean-Louis Bru ([jlouisbru.com](https://www.jlouisbru.com/))
