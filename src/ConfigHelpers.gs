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
 * Resolves the Canvas configuration from the "Settings" sheet without showing any UI.
 * One link is enough: CANVAS_QUIZ_URL (the quiz's address in Canvas) contains the Canvas address,
 * the course, and the quiz. Older sheets that use ASSIGNMENT_ID with CANVAS_COURSE_URL (or
 * COURSE_ID + CANVAS_BASE_URL) keep working.
 * @returns {{courseId: string, assignmentId: string, canvasBaseUrl: string, quizIdFromUrl: string|null}}
 * @throws {Error} With a user-readable message if a setting is missing or invalid.
 * @private
 */
function resolveConfig_() {
  const quizUrl = String(getSetting_("CANVAS_QUIZ_URL", "")).trim();
  const quizRaw = quizUrl || String(getSetting_("ASSIGNMENT_ID", "")).trim();
  const settingName = quizUrl ? "CANVAS_QUIZ_URL" : "ASSIGNMENT_ID";
  if (!quizRaw) {
    throw new Error("CANVAS_QUIZ_URL is empty. Open the quiz in Canvas, copy the link from the address bar, and paste it into the CANVAS_QUIZ_URL row of Settings.");
  }

  // Extract the quiz or assignment ID from any supported link (or a plain ID).
  let assignmentId = quizRaw;
  let quizIdFromUrl = null;
  const quizUrlMatch = quizRaw.match(/\/quizzes\/(\d+)/i);
  if (quizUrlMatch) {
    quizIdFromUrl = quizUrlMatch[1];
    assignmentId = quizIdFromUrl;
    Logger.log(`${settingName} is a quiz link. Extracted Quiz ID: ${quizIdFromUrl}`);
  } else {
    const assignmentUrlMatch = quizRaw.match(/[?&]assignment_id=(\d+)/i) || quizRaw.match(/\/assignments\/(\d+)/i);
    if (assignmentUrlMatch) {
      assignmentId = assignmentUrlMatch[1];
      Logger.log(`${settingName} is an assignment link. Extracted Assignment ID: ${assignmentId}`);
    }
  }
  if (!/^\d+$/.test(assignmentId)) {
    throw new Error(`${settingName} "${quizRaw}" isn't a Canvas quiz link. Open the quiz in Canvas and copy the whole address from the browser's address bar.`);
  }

  // Course and Canvas address: a CANVAS_QUIZ_URL link's own course wins. Older sheets keep their
  // original order: CANVAS_COURSE_URL, then a link in ASSIGNMENT_ID, then COURSE_ID + CANVAS_BASE_URL.
  const coursePattern = /^(https?:\/\/[^/]+)\/courses\/(\d+)/i;
  const linkCourseMatch = quizRaw.match(coursePattern);
  const courseUrl = String(getSetting_("CANVAS_COURSE_URL", "")).trim();
  let courseId, canvasBaseUrl;
  if (linkCourseMatch && (quizUrl || !courseUrl)) {
    canvasBaseUrl = linkCourseMatch[1];
    courseId = linkCourseMatch[2];
  } else if (courseUrl) {
    const urlMatch = courseUrl.match(coursePattern);
    if (!urlMatch) {
      throw new Error(`CANVAS_COURSE_URL "${courseUrl}" is not a valid Canvas course URL. Expected format: https://canvas.yourinstitution.edu/courses/12345`);
    }
    canvasBaseUrl = urlMatch[1];
    courseId = urlMatch[2];
  } else {
    courseId = String(getSetting_("COURSE_ID", "")).trim();
    canvasBaseUrl = getSetting_("CANVAS_BASE_URL", DEFAULT_CANVAS_BASE_URL);
    if (!courseId) {
      throw new Error(`${settingName} needs the full quiz link (it starts with https:// and includes /courses/…), not just the ID. Copy it from the browser's address bar while viewing the quiz.`);
    }
    if (!canvasBaseUrl) throw new Error("CANVAS_BASE_URL is missing (check Settings sheet or script defaults).");
  }

  Logger.log(`Config read — Course ID: ${courseId}, Assignment ID: ${assignmentId}, Base URL: ${canvasBaseUrl}`);
  return { courseId, assignmentId, canvasBaseUrl, quizIdFromUrl };
}

/**
 * Gets configuration values from the "Settings" sheet, alerting the user if something is wrong.
 * @returns {object|null} Configuration object or null on error.
 * @private
 */
function getConfigFromSheet_() {
  try {
    return resolveConfig_();
  } catch (e) {
    Logger.log(`Error reading config: ${e.message}`);
    notify_('Check Your Quiz Link', `${e.message}\n\nThe link looks like https://canvas.yourinstitution.edu/courses/12345/quizzes/67890. "Check Setup" in the menu tests it.`);
    return null;
  }
}

/**
 * Reads the GRADING_GENEROSITY setting (1-5). Invalid or blank values fall back to the default.
 * @returns {number} Generosity level from 1 (very strict) to 5 (very generous).
 * @private
 */
function getGenerositySetting_() {
  const raw = String(getSetting_("GRADING_GENEROSITY", DEFAULT_GENEROSITY)).trim();
  const level = parseInt(raw, 10);
  if (level >= 1 && level <= 5) return level;
  Logger.log(`Invalid GRADING_GENEROSITY "${raw}". Using ${DEFAULT_GENEROSITY}.`);
  return DEFAULT_GENEROSITY;
}

/**
 * Reads a Yes/No setting.
 * @param {string} settingName Setting name in column A.
 * @param {boolean} defaultValue Value to use when the setting is blank or unrecognized.
 * @returns {boolean}
 * @private
 */
function getYesNoSetting_(settingName, defaultValue) {
  const value = String(getSetting_(settingName, "")).trim().toLowerCase();
  if (["yes", "y", "true"].includes(value)) return true;
  if (["no", "n", "false"].includes(value)) return false;
  return defaultValue;
}
