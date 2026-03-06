// ConfigHelpers.gs

// Module-level cache: populated once per script execution, eliminating
// repeated getDataRange().getValues() calls for every getSetting_ lookup.
let _settingsCache = null;

/**
 * Helper function to get a specific setting value from the "Settings" sheet.
 * Results are cached for the lifetime of the current script execution.
 * @param {string} settingName The name of the setting (as it appears in Column A of "Settings").
 * @param {any} defaultValue The value to return if the setting is not found.
 * @returns {any} The setting value or the default.
 * @private
 */
function getSetting_(settingName, defaultValue) {
  try {
    if (!_settingsCache) {
      const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");
      if (!settingsSheet) {
        Logger.log(`"Settings" sheet not found. Returning default for ${settingName}.`);
        return defaultValue;
      }
      const data = settingsSheet.getDataRange().getValues();
      const headerOffset = (data[0] && data[0][0] === "Setting Name") ? 1 : 0;
      _settingsCache = new Map();
      for (let i = headerOffset; i < data.length; i++) {
        if (data[i][0]) _settingsCache.set(String(data[i][0]).trim(), data[i][1]);
      }
      Logger.log(`Settings cache populated with ${_settingsCache.size} entries.`);
    }
    const value = _settingsCache.get(settingName);
    return (value !== undefined && String(value).trim() !== "") ? value : defaultValue;
  } catch (e) {
    Logger.log(`Error reading setting "${settingName}": ${e.message}. Returning default.`);
    return defaultValue;
  }
}

/**
 * Gets configuration values from the "Settings" sheet.
 * @returns {object|null} Configuration object or null on error.
 * @private
 */
function getConfigFromSheet_() {
  const ui = SpreadsheetApp.getUi();
  try {
    const courseId = String(getSetting_("COURSE_ID", "")).trim();
    const assignmentId = String(getSetting_("ASSIGNMENT_ID", "")).trim();
    const canvasBaseUrl = getSetting_("CANVAS_BASE_URL", DEFAULT_CANVAS_BASE_URL);

    if (!courseId) throw new Error("COURSE_ID is missing from the 'Settings' sheet.");
    if (!assignmentId) throw new Error("ASSIGNMENT_ID is missing from the 'Settings' sheet.");
    if (!canvasBaseUrl) throw new Error("CANVAS_BASE_URL is missing (check Settings sheet or script defaults).");

    Logger.log(`Config read - Course ID: ${courseId}, Assignment ID: ${assignmentId}, Base URL: ${canvasBaseUrl}`);
    return { courseId, assignmentId, canvasBaseUrl };
  } catch (e) {
    Logger.log(`Error reading config: ${e.message}`);
    ui.alert('Configuration Error', `Could not read configuration.\n\nError: ${e.message}\n\nPlease ensure:\n- "Settings" sheet is correctly populated with COURSE_ID and ASSIGNMENT_ID.\n- Run "Setup/Verify 'Settings' Sheet" from menu if needed.`, ui.ButtonSet.OK);
    return null;
  }
}
