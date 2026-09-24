// AutoContinue.gs
//
// Long AI runs stop at the 5-minute mark (Apps Script allows 6). Instead of asking the user
// to re-run by hand, the operation schedules itself to continue in the background.

const RUN_STATUS_PROPERTY = "AI_RUN_STATUS";

/**
 * Reads the status of the most recent AI operation.
 * @returns {{operation: string, state: string, runNumber: number, written: number, errors: number, message: string, updatedAt: string}|null}
 * @private
 */
function getRunStatus_() {
  const raw = PropertiesService.getScriptProperties().getProperty(RUN_STATUS_PROPERTY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    Logger.log(`Ignoring unreadable run status: ${e.message}`);
    return null;
  }
}

/**
 * Saves the status of the current AI operation (shown in the Start Here panel).
 * @param {object} status Fields: operation, state ("running" | "scheduled" | "paused" | "done" | "stopped"), runNumber, written, errors, message.
 * @private
 */
function saveRunStatus_(status) {
  const record = { ...status, updatedAt: new Date().toISOString() };
  PropertiesService.getScriptProperties().setProperty(RUN_STATUS_PROPERTY, JSON.stringify(record));
}

/**
 * Takes the script-wide lock so two AI operations can't write to the sheet at once.
 * @returns {GoogleAppsScript.Lock.Lock|null} The held lock, or null if another run holds it.
 * @private
 */
function acquireRunLock_() {
  const lock = LockService.getScriptLock();
  return lock.tryLock(2000) ? lock : null;
}

/**
 * Deletes pending background continuations for a handler function.
 * @param {string} handlerName Name of the public function the trigger calls.
 * @private
 */
function deleteContinuationTriggers_(handlerName) {
  try {
    ScriptApp.getProjectTriggers()
      .filter(trigger => trigger.getHandlerFunction() === handlerName)
      .forEach(trigger => ScriptApp.deleteTrigger(trigger));
  } catch (e) {
    Logger.log(`Could not clean up triggers for ${handlerName}: ${e.message}`);
  }
}

/**
 * Schedules a background run of a handler function in about a minute.
 * @param {string} handlerName Name of the public function to run.
 * @returns {boolean} True if the continuation was scheduled.
 * @private
 */
function scheduleContinuation_(handlerName) {
  try {
    ScriptApp.newTrigger(handlerName).timeBased().after(AUTO_CONTINUE_DELAY_MS).create();
    return true;
  } catch (e) {
    Logger.log(`Could not schedule automatic continuation (${handlerName}): ${e.message}`);
    return false;
  }
}
