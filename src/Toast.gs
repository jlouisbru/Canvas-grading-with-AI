// Toast.gs

/**
 * Displays a toast message in the bottom right corner of the screen.
 * Safe to call from background (trigger) runs, where no one may be viewing the sheet.
 * @param {string} message The message to display.
 * @param {string} title The title for the toast.
 * @param {number} [timeoutSeconds] The duration in seconds. If undefined, default duration is used by Sheets. -1 for indefinite.
 */
function showToast_(message, title, timeoutSeconds) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(message, title, timeoutSeconds);
  } catch (e) {
    Logger.log(`Toast not shown (${title}: ${message}): ${e.message}`);
  }
}

/**
 * Returns the spreadsheet UI, or null when running without one (e.g., a time-based trigger).
 * @returns {GoogleAppsScript.Base.Ui|null}
 * @private
 */
function getUiOrNull_() {
  try {
    return SpreadsheetApp.getUi();
  } catch (e) {
    return null;
  }
}

/**
 * Shows an alert when a UI is available; otherwise writes the message to the execution log.
 * @param {string} title Alert title.
 * @param {string} message Alert body.
 * @private
 */
function notify_(title, message) {
  const ui = getUiOrNull_();
  if (ui) {
    ui.alert(title, message, ui.ButtonSet.OK);
  } else {
    Logger.log(`${title}: ${message}`);
  }
}

/**
 * Asks a Yes/No question. Returns the default answer when no UI is available.
 * @param {string} title Dialog title.
 * @param {string} message Dialog body.
 * @param {boolean} answerWithoutUi Value to return when running in the background.
 * @returns {boolean} True if the user chose Yes.
 * @private
 */
function confirm_(title, message, answerWithoutUi) {
  const ui = getUiOrNull_();
  if (!ui) return answerWithoutUi;
  return ui.alert(title, message, ui.ButtonSet.YES_NO) === ui.Button.YES;
}
