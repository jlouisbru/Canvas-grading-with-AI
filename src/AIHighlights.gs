// AIHighlights.gs

/**
 * Highlights a cell written by AI and adds a review note, so instructors can see
 * what still needs checking before upload.
 * @param {GoogleAppsScript.Spreadsheet.Range} range The cell (or cells) to mark.
 * @private
 */
function markAsAIWritten_(range) {
  range.setBackground(AI_HIGHLIGHT_COLOR).setNote(AI_CELL_NOTE);
}

/**
 * Removes the AI highlight and note from any AI-marked cells in a range.
 * Cells without the AI highlight are left untouched.
 * @param {GoogleAppsScript.Spreadsheet.Range} range The range to clear.
 * @returns {number} How many cells were un-marked.
 * @private
 */
function clearAIMarks_(range) {
  const backgrounds = range.getBackgrounds();
  const notes = range.getNotes();
  let cleared = 0;
  const newBackgrounds = backgrounds.map((row, r) => row.map((color, c) => {
    if (color !== AI_HIGHLIGHT_COLOR) return color;
    cleared++;
    if (notes[r][c] === AI_CELL_NOTE) notes[r][c] = "";
    return null;
  }));
  if (cleared > 0) {
    range.setBackgrounds(newBackgrounds);
    range.setNotes(notes);
  }
  return cleared;
}

/**
 * Counts AI-highlighted cells in a range.
 * @param {GoogleAppsScript.Spreadsheet.Range} range The range to inspect.
 * @returns {number}
 * @private
 */
function countAIMarks_(range) {
  return range.getBackgrounds().flat().filter(color => color === AI_HIGHLIGHT_COLOR).length;
}

/**
 * Counts how many questions in the "Answers" sheet still have AI-drafted (unreviewed)
 * answer keys or rubric criteria.
 * @returns {number}
 * @private
 */
function countUnreviewedAnswerKeyDrafts_() {
  const answersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ANSWERS_SHEET_NAME);
  if (!answersSheet || answersSheet.getLastRow() < 2) return 0;
  const lastKeyColumn = 4 + MAX_RUBRIC_CRITERIA * 2; // Columns C through the last criterion column
  const backgrounds = answersSheet.getRange(2, 3, answersSheet.getLastRow() - 1, lastKeyColumn - 2).getBackgrounds();
  return backgrounds.filter(row => row.includes(AI_HIGHLIGHT_COLOR)).length;
}

/**
 * Simple trigger: when a person edits an AI-highlighted cell, treat it as reviewed.
 * Script writes don't fire this trigger, so AI output stays highlighted until a person touches it.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e The edit event.
 */
function onEdit(e) {
  if (!e?.range) return;
  const sheetName = e.range.getSheet().getName();
  if (sheetName !== MAIN_SHEET_NAME && sheetName !== ANSWERS_SHEET_NAME) return;
  if (e.range.getNumRows() * e.range.getNumColumns() > 1000) return; // Skip huge pastes to keep edits fast.
  clearAIMarks_(e.range);
}

/**
 * Keyboard shortcut (Ctrl+Alt+Shift+1, a Sheets macro) and menu action: marks the selected
 * cells as reviewed. Works on one cell, a column, or several selected ranges at once.
 */
function markSelectionAsReviewed() {
  const rangeList = SpreadsheetApp.getActiveSpreadsheet().getActiveRangeList();
  const ranges = rangeList ? rangeList.getRanges() : [];
  const cleared = ranges.reduce((sum, range) => sum + clearAIMarks_(range), 0);
  showToast_(cleared > 0 ? `Marked ${cleared} cell(s) as reviewed.` : "No AI-highlighted cells in the selection.", "Reviewed", 3);
}

/**
 * Menu action: marks every AI-written cell on "Main Sheet" and "Answers" as reviewed.
 */
function markAllAsReviewed() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let cleared = 0;
  [MAIN_SHEET_NAME, ANSWERS_SHEET_NAME].forEach(name => {
    const sheet = spreadsheet.getSheetByName(name);
    if (sheet && sheet.getLastRow() >= 2 && sheet.getLastColumn() >= 1) {
      cleared += clearAIMarks_(sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()));
    }
  });
  notify_("Marked as Reviewed", cleared > 0
    ? `Removed the AI highlight from ${cleared} cell(s).`
    : "There were no highlighted AI-written cells.");
}
