// APIKeyHelpers.gs

/**
 * Strips ALL whitespace from an API key string — spaces, tabs, newlines, carriage
 * returns, non-breaking spaces (U+00A0), zero-width spaces (U+200B), BOM (U+FEFF), etc.
 * API keys never contain legitimate whitespace, so any whitespace is a copy-paste artifact.
 * @param {string} rawKey The raw key string.
 * @returns {string|null} The cleaned key, or null if empty after cleaning.
 * @private
 */
function sanitizeApiKey_(rawKey) {
  if (!rawKey) return null;
  const cleaned = String(rawKey).replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]+/g, '');
  return cleaned || null;
}

/**
 * Clears a stored API key from Script Properties, forcing re-entry on next use.
 * @param {string} propertyKey Script Properties key to delete.
 * @param {string} serviceName User-friendly service name for logging.
 * @private
 */
function clearStoredApiKey_(propertyKey, serviceName) {
  try {
    PropertiesService.getScriptProperties().deleteProperty(propertyKey);
    Logger.log(`Cleared ${serviceName} API key from Script Properties.`);
  } catch (e) {
    Logger.log(`Error clearing ${serviceName} key from Script Properties: ${e.message}`);
  }
}

/**
 * Replaces the value of a named setting in the "Settings" sheet with "•••••".
 * Also updates the in-memory settings cache to reflect the masked value.
 * @param {string} settingName The name of the setting to mask (column A value).
 * @private
 */
function maskSettingInSheet_(settingName) {
  try {
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");
    if (!settingsSheet) return;
    const data = settingsSheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === settingName) {
        settingsSheet.getRange(i + 1, 2).setValue("•••••");
        updateSettingsCache_(settingName, "•••••");
        Logger.log(`Masked "${settingName}" in Settings sheet.`);
        break;
      }
    }
  } catch (e) {
    Logger.log(`Could not mask "${settingName}" in Settings sheet: ${e.message}`);
  }
}

/**
 * Called when the Canvas API returns a 401/403 auth error.
 * Clears the stored key and shows a clear error message with recovery instructions.
 * After calling this, the next call to getCanvasApiKey_() will re-check the Settings
 * sheet (in case the user pasted a new key there) before prompting.
 * @private
 */
function handleCanvasAuthError_() {
  clearStoredApiKey_("CANVAS_API_KEY", "Canvas");
  clearSettingsCache_();
  SpreadsheetApp.getUi().alert(
    "Canvas API Key Rejected (401)",
    "Canvas rejected your API key — it may be invalid, expired, or lack the required permissions.\n\n" +
    "Your stored key has been cleared.\n\n" +
    "To fix this:\n" +
    "1. In Canvas, go to Account > Settings > Approved Integrations.\n" +
    "2. Generate a new access token and copy it.\n" +
    "3. Paste it into the CANVAS_API_KEY row of the 'Settings' sheet.\n" +
    "4. Re-run the Canvas operation.\n\n" +
    "Alternatively, re-run the operation and enter the key when prompted.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Called when the Claude API returns a 401/403 auth error.
 * Clears the stored key and shows a clear error message with recovery instructions.
 * After calling this, the next call to getClaudeApiKey_() will re-check the Settings
 * sheet (in case the user pasted a new key there) before prompting.
 * @private
 */
function handleClaudeAuthError_() {
  clearStoredApiKey_("CLAUDE_API_KEY", "Claude");
  clearSettingsCache_();
  SpreadsheetApp.getUi().alert(
    "Claude API Key Rejected (401)",
    "The Claude API rejected your key — it may be invalid, expired, or lack billing credits.\n\n" +
    "Your stored key has been cleared.\n\n" +
    "To fix this:\n" +
    "1. Go to console.anthropic.com and copy a valid API key.\n" +
    "2. Paste it into the CLAUDE_API_KEY row of the 'Settings' sheet.\n" +
    "3. Re-run the grading operation.\n\n" +
    "Alternatively, re-run the operation and enter the key when prompted.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Retrieves an API key from Script Properties, Settings sheet, or prompts the user.
 * Applies aggressive whitespace sanitization to handle copy-paste formatting issues
 * (extra spaces, newlines, non-breaking spaces, etc.).
 * On each call, also re-checks the Settings sheet for a freshly pasted key, so that
 * pasting a new key into Settings works without needing to reset anything manually.
 * @param {string} serviceName User-friendly name of the service (e.g., "Canvas", "Claude").
 * @param {string} propertyKey The key used for storing/retrieving from Script Properties.
 * @param {string} settingSheetKey The key name in the "Settings" sheet.
 * @param {string} promptTitle Title for the UI prompt if key is not found.
 * @param {string} promptInstructions Instructions for the UI prompt.
 * @returns {string|null} The API key or null if not found/cancelled.
 * @private
 */
function getServiceApiKey_(serviceName, propertyKey, settingSheetKey, promptTitle, promptInstructions) {
  const scriptProperties = PropertiesService.getScriptProperties();

  // 1. Check Script Properties first (fastest path).
  const storedKey = scriptProperties.getProperty(propertyKey);
  if (storedKey) {
    const cleanKey = sanitizeApiKey_(storedKey);
    if (cleanKey) {
      // If the stored key had stray whitespace (e.g. from an old paste), re-save the clean version.
      if (cleanKey !== storedKey) {
        scriptProperties.setProperty(propertyKey, cleanKey);
        Logger.log(`${serviceName} API Key from Script Properties was sanitized and re-saved.`);
      } else {
        Logger.log(`Using ${serviceName} API Key from Script Properties.`);
      }
      return cleanKey;
    }
    // Key existed but was empty/whitespace-only after sanitizing — fall through.
    Logger.log(`${serviceName} key in Script Properties was blank after sanitization. Checking Settings sheet.`);
  }

  // 2. Re-check the Settings sheet (catches newly pasted keys, e.g. after a key reset).
  //    Force-clear the cache so we read the current sheet state, not a stale cached value.
  clearSettingsCache_();
  const rawSheetKey = getSetting_(settingSheetKey, null);
  const sheetKey = sanitizeApiKey_(String(rawSheetKey || ''));
  if (sheetKey) {
    scriptProperties.setProperty(propertyKey, sheetKey);
    maskSettingInSheet_(settingSheetKey);
    Logger.log(`${serviceName} API Key read from Settings sheet (sanitized), saved to Script Properties, and masked.`);
    return sheetKey;
  }

  // 3. Prompt the user.
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(promptTitle, promptInstructions, ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() === ui.Button.OK) {
    const enteredKey = sanitizeApiKey_(response.getResponseText());
    if (enteredKey) {
      scriptProperties.setProperty(propertyKey, enteredKey);
      maskSettingInSheet_(settingSheetKey);
      ui.alert(`${serviceName} API Key saved to Script Properties for future use by this script project.`);
      return enteredKey;
    } else {
      ui.alert(`No valid ${serviceName} API key entered (the input was empty or contained only whitespace). Script cannot proceed.`);
      return null;
    }
  } else {
    ui.alert(`${serviceName} API Key entry cancelled. Script cannot proceed with operations requiring this key.`);
    return null;
  }
}

/**
 * Helper to get Canvas API Key using the generic retriever.
 * @returns {string|null} Canvas API Key or null.
 * @private
 */
function getCanvasApiKey_() {
  const promptMessage = 'Canvas API Key Needed:\n\n1. In Canvas, go to Account > Settings.\n2. Scroll down to "Approved Integrations".\n3. Click "+ New Access Token".\n4. Purpose: "Google Sheet Grading" (or similar).\n5. Expiration Date: Optional, but recommended.\n6. Click "Generate Token".\n7. **Copy the generated token NOW.** You cannot view it again.\n\nPaste the copied token below:\n\nNOTE: Ensure the token has permissions to read submissions/questions AND update grades/submissions.';
  return getServiceApiKey_("Canvas", "CANVAS_API_KEY", "CANVAS_API_KEY", "Canvas API Key Setup", promptMessage);
}

/**
 * Helper to get Claude API Key using the generic retriever.
 * @returns {string|null} Claude API Key or null.
 * @private
 */
function getClaudeApiKey_() {
  return getServiceApiKey_("Claude", "CLAUDE_API_KEY", "CLAUDE_API_KEY", "Claude API Key Needed",
    "Please enter your Claude API key (from console.anthropic.com).\n\nMake sure your account has billing/credits enabled at console.anthropic.com/settings/billing.");
}

/**
 * Menu action: clears the stored Claude API key so it can be re-entered.
 * After clearing, the user can either paste a new key into the CLAUDE_API_KEY row
 * of the Settings sheet, or they will be prompted when next running a grading operation.
 */
function resetClaudeApiKey() {
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    "Reset Claude API Key",
    "This will delete the stored Claude API key from Script Properties.\n\n" +
    "After resetting, you can either:\n" +
    "• Paste a new key into the CLAUDE_API_KEY row of the 'Settings' sheet, or\n" +
    "• Re-run any grading operation and enter the key when prompted.\n\n" +
    "Proceed?",
    ui.ButtonSet.YES_NO
  );
  if (confirm === ui.Button.YES) {
    clearStoredApiKey_("CLAUDE_API_KEY", "Claude");
    clearSettingsCache_();
    ui.alert("Done", "Claude API key cleared. Paste a new key into the 'Settings' sheet or re-run a grading operation to be prompted.", ui.ButtonSet.OK);
  }
}

/**
 * Menu action: clears the stored Canvas API key so it can be re-entered.
 * After clearing, the user can either paste a new key into the CANVAS_API_KEY row
 * of the Settings sheet, or they will be prompted when next running a Canvas operation.
 */
function resetCanvasApiKey() {
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    "Reset Canvas API Key",
    "This will delete the stored Canvas API key from Script Properties.\n\n" +
    "After resetting, you can either:\n" +
    "• Paste a new key into the CANVAS_API_KEY row of the 'Settings' sheet, or\n" +
    "• Re-run any Canvas operation and enter the key when prompted.\n\n" +
    "Proceed?",
    ui.ButtonSet.YES_NO
  );
  if (confirm === ui.Button.YES) {
    clearStoredApiKey_("CANVAS_API_KEY", "Canvas");
    clearSettingsCache_();
    ui.alert("Done", "Canvas API key cleared. Paste a new key into the 'Settings' sheet or re-run a Canvas operation to be prompted.", ui.ButtonSet.OK);
  }
}
