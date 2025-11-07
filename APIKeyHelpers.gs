// APIKeyHelpers.gs

/**
 * Retrieves an API key from Script Properties, Settings sheet, or prompts the user.
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
  let apiKey = scriptProperties.getProperty(propertyKey);
  if (apiKey) {
    Logger.log(`Using ${serviceName} API Key from Script Properties.`);
    return apiKey;
  }

  apiKey = getSetting_(settingSheetKey, null);
  if (apiKey && String(apiKey).trim() !== "") {
    Logger.log(`Using ${serviceName} API Key from "Settings" sheet for ${settingSheetKey}.`);
    return String(apiKey).trim();
  }

  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(promptTitle, promptInstructions, ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() === ui.Button.OK) {
    apiKey = response.getResponseText()?.trim();
    if (apiKey) {
      scriptProperties.setProperty(propertyKey, apiKey);
      ui.alert(`${serviceName} API Key saved to Script Properties for future use by this script project.`);
      return apiKey;
    } else {
      ui.alert(`No ${serviceName} API key entered. Script cannot proceed with operations requiring this key.`);
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
 return getServiceApiKey_("Claude", "CLAUDE_API_KEY", "CLAUDE_API_KEY", "Claude API Key Needed", "Please enter your Claude API key:");
}
