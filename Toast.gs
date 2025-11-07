// Toast.gs

/**
 * Displays a toast message in the bottom right corner of the screen.
 * @param {string} message The message to display.
 * @param {string} title The title for the toast.
 * @param {number} [timeoutSeconds] The duration in seconds. If undefined, default duration is used by Sheets. -1 for indefinite.
 */
function showToast_(message, title, timeoutSeconds) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, title, timeoutSeconds);
}
