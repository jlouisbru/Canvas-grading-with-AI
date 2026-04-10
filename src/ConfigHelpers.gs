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
    return (value !== undefined && String(value).trim() !== "" && String(value).trim() !== "•••••") ? value : defaultValue;
  } catch (e) {
    Logger.log(`Error reading setting "${settingName}": ${e.message}. Returning default.`);
    return defaultValue;
  }
}

/**
 * Clears the settings cache, forcing a re-read of the Settings sheet on the next getSetting_ call.
 * Use this instead of directly nullifying _settingsCache from other files.
 * @private
 */
function clearSettingsCache_() {
  _settingsCache = null;
}

/**
 * Updates a single entry in the settings cache without clearing it.
 * Use this to keep the cache consistent after writing a masked value back to the sheet.
 * @param {string} key The setting name (Column A value).
 * @param {any} value The new value to store in the cache.
 * @private
 */
function updateSettingsCache_(key, value) {
  if (_settingsCache) _settingsCache.set(key, value);
}

/**
 * Gets configuration values from the "Settings" sheet.
 * @returns {object|null} Configuration object or null on error.
 * @private
 */
function getConfigFromSheet_() {
  const ui = SpreadsheetApp.getUi();
  try {
    let courseId, canvasBaseUrl;

    const assignmentIdRaw = String(getSetting_("ASSIGNMENT_ID", "")).trim();
    if (!assignmentIdRaw) throw new Error("ASSIGNMENT_ID is missing from the 'Settings' sheet.");

    // Normalize ASSIGNMENT_ID: extract numeric ID and quiz ID from any URL format.
    let assignmentId = assignmentIdRaw;
    let quizIdFromUrl = null;

    const quizUrlMatch = assignmentIdRaw.match(/\/quizzes\/(\d+)/i);
    if (quizUrlMatch) {
      quizIdFromUrl = quizUrlMatch[1];
      assignmentId = quizIdFromUrl;
      Logger.log(`ASSIGNMENT_ID is a quiz URL. Extracted Quiz ID: ${quizIdFromUrl}`);
    } else {
      const assignmentUrlMatch = assignmentIdRaw.match(/[?&]assignment_id=(\d+)/i);
      if (assignmentUrlMatch) {
        assignmentId = assignmentUrlMatch[1];
        Logger.log(`ASSIGNMENT_ID is an assignment URL. Extracted Assignment ID: ${assignmentId}`);
      }
    }

    // Resolve course ID and base URL — try each source in priority order.
    const assignmentIdUrlCourseMatch = assignmentIdRaw.match(/^(https?:\/\/[^/]+)\/courses\/(\d+)/i);
    const courseUrl = String(getSetting_("CANVAS_COURSE_URL", "")).trim();

    if (courseUrl) {
      const urlMatch = courseUrl.match(/^(https?:\/\/[^/]+)\/courses\/(\d+)/i);
      if (!urlMatch) {
        throw new Error(`CANVAS_COURSE_URL "${courseUrl}" is not a valid Canvas course URL. Expected format: https://canvas.yourinstitution.edu/courses/12345`);
      }
      canvasBaseUrl = urlMatch[1];
      courseId = urlMatch[2];
      Logger.log(`Parsed from CANVAS_COURSE_URL — Base URL: ${canvasBaseUrl}, Course ID: ${courseId}`);
    } else if (assignmentIdUrlCourseMatch) {
      canvasBaseUrl = assignmentIdUrlCourseMatch[1];
      courseId = assignmentIdUrlCourseMatch[2];
      Logger.log(`Parsed from ASSIGNMENT_ID URL — Base URL: ${canvasBaseUrl}, Course ID: ${courseId}`);
    } else {
      courseId = String(getSetting_("COURSE_ID", "")).trim();
      canvasBaseUrl = getSetting_("CANVAS_BASE_URL", DEFAULT_CANVAS_BASE_URL);
      if (!courseId) throw new Error("COURSE_ID is missing. Set CANVAS_COURSE_URL, a full URL in ASSIGNMENT_ID, or COURSE_ID in the 'Settings' sheet.");
      if (!canvasBaseUrl) throw new Error("CANVAS_BASE_URL is missing (check Settings sheet or script defaults).");
    }

    Logger.log(`Config read — Course ID: ${courseId}, Assignment ID: ${assignmentId}, Base URL: ${canvasBaseUrl}`);
    return { courseId, assignmentId, canvasBaseUrl, quizIdFromUrl };
  } catch (e) {
    Logger.log(`Error reading config: ${e.message}`);
    ui.alert('Configuration Error', `Could not read configuration.\n\nError: ${e.message}\n\nPlease ensure:\n- Either "CANVAS_COURSE_URL" (e.g., https://canvas.yourinstitution.edu/courses/12345)\n  OR both "CANVAS_BASE_URL" and "COURSE_ID" are set in the "Settings" sheet.\n- "ASSIGNMENT_ID" is also set.\n- Run "Setup/Verify \'Settings\' Sheet" from the menu if needed.`, ui.ButtonSet.OK);
    return null;
  }
}
