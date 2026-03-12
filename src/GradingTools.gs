// GradingTools.gs

/**
 * Prompts the user for a grading generosity level.
 * @param {GoogleAppsScript.Base.Ui} ui The Spreadsheet UI service.
 * @returns {number|null} The generosity level (1-5) or null if cancelled/invalid.
 * @private
 */
function getGradingGenerosityLevel_(ui) {
  const promptTitle = "Set Grading Generosity";
  const promptMessage = "Enter grading generosity (1-5):\n\n1: Very Strict (exact match to key/rubric)\n2: Strict\n3: Normal/Balanced (default)\n4: Generous\n5: Very Generous (main concepts suffice)\n\nEnter a number between 1 and 5:";
  const response = ui.prompt(promptTitle, promptMessage, ui.ButtonSet.OK_CANCEL);

  if (response.getSelectedButton() === ui.Button.OK) {
    const levelStr = response.getResponseText().trim();
    const level = parseInt(levelStr, 10);
    if (!isNaN(level) && level >= 1 && level <= 5) {
      return level;
    } else {
      ui.alert("Invalid Input", "Generosity level must be a number between 1 and 5. Defaulting to 3 (Normal).", ui.ButtonSet.OK);
      return 3; // Default to normal if input is bad
    }
  } else {
    ui.alert("Cancelled", "Grading generosity not set. Operation cancelled.", ui.ButtonSet.OK);
    return null; // User cancelled
  }
}

/**
 * Grades student answers using Claude AI based on an overall answer key, with user-defined generosity.
 * Writes each grade to the sheet immediately after the API call, so partial results
 * are preserved if the operation is interrupted.
 */
function autoGradeWithClaude() {
  const ui = SpreadsheetApp.getUi();
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Main Sheet");
  if (!mainSheet) {
    ui.alert("Sheet Not Found", "Could not find a sheet named 'Main Sheet'.", ui.ButtonSet.OK);
    return;
  }
  const context = initializeAIOperationContext_(mainSheet, false, true); // Needs answerKeyMap
  if (!context) return;

  const { claudeApiKey, mainSheetHeaderInfo, answerKeyDataMap } = context;
  if (!answerKeyDataMap || Object.keys(answerKeyDataMap).length === 0) {
    ui.alert("AI Grading Aborted", "No answer keys loaded from 'Answers' sheet (Column C).", ui.ButtonSet.OK);
    showToast_('AI Grading Aborted: No keys.', 'Error', 5);
    return;
  }

  const generosityLevel = getGradingGenerosityLevel_(ui);
  if (generosityLevel === null) {
    showToast_('AI Grading Cancelled.', 'Info', 5);
    return;
  }
  Logger.log(`Using generosity level: ${generosityLevel} for overall key grading.`);

  ui.alert("AI Grading Starting", `The script will attempt to grade answers using Claude AI with generosity level ${generosityLevel}. This may take time.`, ui.ButtonSet.OK);
  showToast_(`Starting AI Grading (Generosity: ${generosityLevel})...`, 'Processing...', -1);

  const { questionColumnsMap } = mainSheetHeaderInfo;
  const gradingModel = getSetting_("CLAUDE_GRADING_MODEL", DEFAULT_CLAUDE_GRADING_MODEL);

  const lastRow = mainSheet.getLastRow();
  const dataRange = mainSheet.getRange(2, 1, lastRow - 1, mainSheet.getLastColumn());
  const studentDataValues = dataRange.getValues(); // Read all data once to check existing grades
  let gradesWritten = 0, errorsEncountered = 0;

  let abortDueToAuthError = false;
  for (const [qId, qColInfo] of questionColumnsMap) {
    if (abortDueToAuthError) break;
    const pointsPossible = qColInfo.points;

    for (let i = 0; i < studentDataValues.length; i++) {
      if (abortDueToAuthError) break;
      const studentRowValues = studentDataValues[i];
      const sheetRowNumber = i + 2;

      const studentAnswer = studentRowValues[qColInfo.answerColIndex];
      const currentGrade = studentRowValues[qColInfo.gradeColIndex];

      if (studentAnswer && String(studentAnswer).trim() &&
          (currentGrade === "" || currentGrade === null || currentGrade === undefined || String(currentGrade).trim() === "")) {
        const keyData = answerKeyDataMap[qId];
        if (keyData?.key) {
          showToast_(`Grading QID ${qId} (Row ${sheetRowNumber}, Gen: ${generosityLevel})...`, 'Processing...', -1);
          Logger.log(`Grading QID ${qId} for row ${sheetRowNumber}. Points: ${pointsPossible}, Generosity: ${generosityLevel}`);
          const apiResult = callClaudeAPIForGrading_(keyData.prompt, keyData.key, String(studentAnswer), pointsPossible, claudeApiKey, gradingModel, generosityLevel);

          if (apiResult.isAuthError) {
            abortDueToAuthError = true;
            break;
          }

          if (apiResult.grade !== null) {
            // Write immediately to the sheet — result is saved even if operation is interrupted later.
            mainSheet.getRange(sheetRowNumber, qColInfo.gradeColIndex + 1).setValue(parseFloat(apiResult.grade));
            SpreadsheetApp.flush(); // Push cell update to the UI right away so the user sees it appear
            gradesWritten++;
          } else {
            Logger.log(`Claude returned invalid grade for QID ${qId}, row ${sheetRowNumber}. Error: ${apiResult.errorMsg}`);
            errorsEncountered++;
          }
        } else {
          Logger.log(`No answer key for QID ${qId}. Skipping AI grade for row ${sheetRowNumber}.`);
        }
      }
    }
  }

  if (abortDueToAuthError) {
    handleClaudeAuthError_();
    showToast_('Grading aborted: API key error.', 'Error', 10);
    ui.alert("Grading Aborted", `The Claude API rejected the key mid-operation.\nGrades written before the error: ${gradesWritten}\n\nSee the previous alert for recovery instructions.`, ui.ButtonSet.OK);
    return;
  }

  showToast_('AI Grading Complete!', 'Success', 10);
  ui.alert("AI Grading Complete", `Grading finished with generosity level ${generosityLevel}.\nGrades written: ${gradesWritten}\nErrors/Skipped: ${errorsEncountered}`, ui.ButtonSet.OK);
  Logger.log(`AI Grading Complete. Generosity: ${generosityLevel}, Grades: ${gradesWritten}, Errors: ${errorsEncountered}`);
}

/**
 * Prompts the user whether to include the answer key in AI-generated feedback.
 * @param {GoogleAppsScript.Base.Ui} ui The Spreadsheet UI service.
 * @param {string} feedbackType For customizing the prompt message (e.g., "overall key", "rubric").
 * @returns {boolean|null} True to include answer key, false to omit, null if cancelled.
 * @private
 */
function getIncludeAnswerKeyChoice_(ui, feedbackType = "key-based") {
  const promptTitle = "Include Answer Key in Feedback?";
  let promptMessage = `Do you want the AI to include the answer from the "Answers" sheet in the generated feedback comment?\n\n(Feedback will otherwise focus on explaining the student's performance).`;
  if (feedbackType === "rubric") {
    promptMessage = `Do you want the AI to start the feedback by stating the "Overall Answer Key" (from Col C of "Answers" sheet)?\n\n(Feedback will otherwise focus on explaining performance against the rubric and key).`;
  }

  const response = ui.alert(promptTitle, promptMessage, ui.ButtonSet.YES_NO_CANCEL);

  if (response === ui.Button.YES) {
    return true;
  } else if (response === ui.Button.NO) {
    return false;
  } else { // CANCEL or closed dialog
    return null;
  }
}


/**
 * Generates AI feedback comments for student answers based on the overall answer key.
 * Writes each comment to the sheet immediately after the API call.
 */
function generateAIComments() {
  const ui = SpreadsheetApp.getUi();
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Main Sheet");
  if (!mainSheet) {
    ui.alert("Sheet Not Found", "Could not find a sheet named 'Main Sheet'.", ui.ButtonSet.OK);
    return;
  }
  const context = initializeAIOperationContext_(mainSheet, false, true);
  if (!context) return;

  const { claudeApiKey, mainSheetHeaderInfo, answerKeyDataMap } = context;
  if (!answerKeyDataMap || Object.keys(answerKeyDataMap).length === 0) {
    ui.alert("AI Commenting Aborted", "No answer keys loaded from 'Answers' sheet (Column C).", ui.ButtonSet.OK);
    showToast_('AI Commenting Aborted.', 'Error', 5);
    return;
  }

  const includeAnswerKey = getIncludeAnswerKeyChoice_(ui, "key-based");
  if (includeAnswerKey === null) {
    showToast_('AI Commenting Cancelled.', 'Info', 5);
    return;
  }

  ui.alert("AI Commenting Starting", "The script will generate feedback comments using Claude AI. This may take time.", ui.ButtonSet.OK);
  showToast_('Starting AI Comment Generation...', 'Processing...', -1);

  const { questionColumnsMap } = mainSheetHeaderInfo;
  const commentingModel = getSetting_("CLAUDE_COMMENTING_MODEL", DEFAULT_CLAUDE_COMMENTING_MODEL);

  const lastRow = mainSheet.getLastRow();
  if (lastRow < 2) { showToast_('No student rows found.', 'Info', 5); return; }
  const studentDataValues = mainSheet.getRange(2, 1, lastRow - 1, mainSheet.getLastColumn()).getValues();

  let commentsWritten = 0, errorsEncountered = 0;
  let abortDueToAuthError = false;

  for (const [qId, qColInfo] of questionColumnsMap) {
    if (abortDueToAuthError) break;
    const keyData = answerKeyDataMap[qId];
    if (!keyData?.key) {
      Logger.log(`No answer key for QID ${qId} in 'Answers' sheet. Skipping this question.`);
      continue;
    }
    const pointsPossible = qColInfo.points;

    for (let i = 0; i < studentDataValues.length; i++) {
      if (abortDueToAuthError) break;
      const row = studentDataValues[i];
      const sheetRow = i + 2;

      const studentAnswer   = row[qColInfo.answerColIndex];
      const studentGradeRaw = row[qColInfo.gradeColIndex];
      const currentComment  = row[qColInfo.commentColIndex];

      if (!studentAnswer || !String(studentAnswer).trim()) continue;
      if (currentComment && String(currentComment).trim() !== "") continue;

      const studentGradeStr = String(studentGradeRaw ?? "").trim();
      const studentGrade = studentGradeStr !== "" ? parseFloat(studentGradeStr) : null;
      if (studentGrade !== null && !isNaN(studentGrade) && studentGrade >= pointsPossible) {
        Logger.log(`Skipping comment for QID ${qId}, Row ${sheetRow}: Student received full marks.`);
        continue;
      }

      showToast_(`Generating comment for QID ${qId}, row ${sheetRow}...`, 'Processing...', -1);
      Logger.log(`AI comment for QID ${qId}, row ${sheetRow}. Grade: ${studentGrade !== null ? studentGrade : 'ungraded'}/${pointsPossible}`);
      const apiResult = callClaudeAPIForCommenting_(
        keyData.prompt, keyData.key, String(studentAnswer),
        studentGrade, pointsPossible, claudeApiKey, commentingModel, includeAnswerKey
      );

      if (apiResult.isAuthError) { abortDueToAuthError = true; break; }

      if (apiResult.comment) {
        mainSheet.getRange(sheetRow, qColInfo.commentColIndex + 1).setValue(apiResult.comment.trim());
        SpreadsheetApp.flush();
        commentsWritten++;
      } else {
        Logger.log(`No valid comment for QID ${qId}, row ${sheetRow}. Error: ${apiResult.errorMsg}`);
        errorsEncountered++;
      }
    }
  }

  if (abortDueToAuthError) {
    handleClaudeAuthError_();
    showToast_('Commenting aborted: API key error.', 'Error', 10);
    return;
  }

  showToast_(`AI Comments Done! Written: ${commentsWritten}, Skipped/Errors: ${errorsEncountered}`, 'Success', 10);
  ui.alert("AI Commenting Complete", `Finished generating comments.\nComments written: ${commentsWritten}\nErrors/Skipped: ${errorsEncountered}`, ui.ButtonSet.OK);
  Logger.log(`generateAIComments complete. Written: ${commentsWritten}, Errors: ${errorsEncountered}`);
}

/**
 * Grades student answers using Claude AI and rubric data from the "Answers" sheet.
 * Writes each grade to the sheet immediately after the API call, so partial results
 * are preserved if the operation is interrupted.
 */
function aiRubricGrade() {
  const ui = SpreadsheetApp.getUi();
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Main Sheet");
  if (!mainSheet) {
    ui.alert("Sheet Not Found", "Could not find a sheet named 'Main Sheet'.", ui.ButtonSet.OK);
    return;
  }
  const context = initializeAIOperationContext_(mainSheet, true, false); // Needs rubricDataMap
  if (!context) return;

  const { claudeApiKey, mainSheetHeaderInfo, rubricDataMap } = context;
  if (!rubricDataMap || Object.keys(rubricDataMap).length === 0) {
    return; // Alert handled by initializer
  }

  const generosityLevel = getGradingGenerosityLevel_(ui);
  if (generosityLevel === null) {
    showToast_('AI Rubric Grading Cancelled.', 'Info', 5);
    return;
  }
  Logger.log(`Using generosity level: ${generosityLevel} for rubric grading.`);

  const userResponse = ui.alert("Confirm AI Rubric-Based Grading",
    `Grade answers using Claude AI and rubrics with generosity level ${generosityLevel}?\nOnly empty grade cells will be filled.`,
    ui.ButtonSet.YES_NO);
  if (userResponse !== ui.Button.YES) {
    ui.alert("AI Rubric Grading Cancelled.", ui.ButtonSet.OK);
    return;
  }
  showToast_(`Starting AI Rubric Grading (Generosity: ${generosityLevel})...`, 'Processing...', -1);

  const { questionColumnsMap } = mainSheetHeaderInfo;
  const gradingModel = getSetting_("CLAUDE_GRADING_MODEL", DEFAULT_CLAUDE_GRADING_MODEL);
  const mainSheetHeaderValues = getHeaderValues_(mainSheet);

  const lastRow = mainSheet.getLastRow();
  const dataRange = mainSheet.getRange(2, 1, lastRow - 1, mainSheet.getLastColumn());
  const studentDataValues = dataRange.getValues(); // Read all data once to check existing grades
  let gradesWritten = 0, errorsEncountered = 0;

  let abortDueToAuthError = false;
  for (const [qId, qColInfo] of questionColumnsMap) {
    if (abortDueToAuthError) break;
    const questionHeaderText = mainSheetHeaderValues[qColInfo.answerColIndex];

    for (let i = 0; i < studentDataValues.length; i++) {
      if (abortDueToAuthError) break;
      const studentRowValues = studentDataValues[i];
      const sheetRowNumber = i + 2;

      const studentAnswer = studentRowValues[qColInfo.answerColIndex];
      const currentGrade = studentRowValues[qColInfo.gradeColIndex];

      if (studentAnswer && String(studentAnswer).trim() &&
          (currentGrade === "" || currentGrade === null || currentGrade === undefined || String(currentGrade).trim() === "")) {
        const rubricInfo = rubricDataMap[qId];
        if (rubricInfo?.canvasMaxPoints > 0) {
          showToast_(`AI Rubric Grade: QID ${qId} (Row ${sheetRowNumber}, Gen: ${generosityLevel})...`, 'Processing...', -1);
          Logger.log(`AI Rubric Grade: QID ${qId}, Row ${sheetRowNumber}. Max Points: ${rubricInfo.canvasMaxPoints}, Generosity: ${generosityLevel}`);
          const apiResult = callClaudeAPIForRubricGrade_(questionHeaderText, String(studentAnswer), rubricInfo.canvasMaxPoints, rubricInfo.criteria, claudeApiKey, gradingModel, generosityLevel);

          if (apiResult.isAuthError) {
            abortDueToAuthError = true;
            break;
          }

          if (apiResult.grade !== null) {
            // Write immediately to the sheet — result is saved even if operation is interrupted later.
            mainSheet.getRange(sheetRowNumber, qColInfo.gradeColIndex + 1).setValue(apiResult.grade);
            SpreadsheetApp.flush(); // Push cell update to the UI right away so the user sees it appear
            gradesWritten++;
          } else {
            Logger.log(`Claude returned invalid rubric grade for QID ${qId}, row ${sheetRowNumber}. Error: ${apiResult.errorMsg}`);
            errorsEncountered++;
          }
        } else if (rubricInfo) {
          Logger.log(`Skipping AI Rubric Grade for QID ${qId}, row ${sheetRowNumber}: Max points is 0 or not set.`);
        } else {
          Logger.log(`No rubric data for QID ${qId}. Skipping AI Rubric Grade for row ${sheetRowNumber}.`);
        }
      }
    }
  }

  if (abortDueToAuthError) {
    handleClaudeAuthError_();
    showToast_('Rubric grading aborted: API key error.', 'Error', 10);
    ui.alert("Rubric Grading Aborted", `The Claude API rejected the key mid-operation.\nGrades written before the error: ${gradesWritten}\n\nSee the previous alert for recovery instructions.`, ui.ButtonSet.OK);
    return;
  }

  showToast_('AI Rubric Grading Complete!', 'Success', 10);
  ui.alert("AI Rubric Grading Complete", `Process finished with generosity level ${generosityLevel}.\nGrades written: ${gradesWritten}\nErrors/Skipped: ${errorsEncountered}`, ui.ButtonSet.OK);
  Logger.log(`AI Rubric Grading Complete. Generosity: ${generosityLevel}, Grades: ${gradesWritten}, Errors: ${errorsEncountered}`);
}

/**
 * Generates AI rubric-based feedback comments for student answers.
 * Writes each comment to the sheet immediately after the API call.
 */
function aiRubricComment() {
  const ui = SpreadsheetApp.getUi();
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Main Sheet");
  if (!mainSheet) {
    ui.alert("Sheet Not Found", "Could not find a sheet named 'Main Sheet'.", ui.ButtonSet.OK);
    return;
  }
  const context = initializeAIOperationContext_(mainSheet, true, false);
  if (!context) return;

  const { claudeApiKey, mainSheetHeaderInfo, rubricDataMap } = context;
  if (!rubricDataMap || Object.keys(rubricDataMap).length === 0) return;

  const includeAnswerKey = getIncludeAnswerKeyChoice_(ui, "rubric");
  if (includeAnswerKey === null) {
    showToast_('AI Rubric Commenting Cancelled.', 'Info', 5);
    return;
  }

  ui.alert("AI Rubric Commenting Starting", "The script will generate rubric-based feedback comments using Claude AI. This may take time.", ui.ButtonSet.OK);
  showToast_('Starting AI Rubric Comment Generation...', 'Processing...', -1);

  const { questionColumnsMap } = mainSheetHeaderInfo;
  const commentingModel = getSetting_("CLAUDE_COMMENTING_MODEL", DEFAULT_CLAUDE_COMMENTING_MODEL);
  const mainSheetHeaderValues = getHeaderValues_(mainSheet);

  const lastRow = mainSheet.getLastRow();
  if (lastRow < 2) { showToast_('No student rows found.', 'Info', 5); return; }
  const studentDataValues = mainSheet.getRange(2, 1, lastRow - 1, mainSheet.getLastColumn()).getValues();

  let commentsWritten = 0, errorsEncountered = 0;
  let abortDueToAuthError = false;

  for (const [qId, qColInfo] of questionColumnsMap) {
    if (abortDueToAuthError) break;
    const questionHeaderText = mainSheetHeaderValues[qColInfo.answerColIndex];
    const rubricInfo = rubricDataMap[qId];

    if (!rubricInfo || rubricInfo.canvasMaxPoints <= 0) {
      Logger.log(`No rubric data or valid max points for QID ${qId}. Skipping this question.`);
      continue;
    }
    if (!rubricInfo.overallKey) {
      Logger.log(`No overall answer key (Col C) for QID ${qId} in 'Answers' sheet. Skipping this question.`);
      continue;
    }

    for (let i = 0; i < studentDataValues.length; i++) {
      if (abortDueToAuthError) break;
      const row = studentDataValues[i];
      const sheetRow = i + 2;

      const studentAnswer   = row[qColInfo.answerColIndex];
      const studentGradeRaw = row[qColInfo.gradeColIndex];
      const currentComment  = row[qColInfo.commentColIndex];

      if (!studentAnswer || !String(studentAnswer).trim()) continue;
      if (currentComment && String(currentComment).trim() !== "") continue;

      const studentGradeStr = String(studentGradeRaw ?? "").trim();
      const studentGrade = studentGradeStr !== "" ? parseFloat(studentGradeStr) : null;
      if (studentGrade !== null && !isNaN(studentGrade) && studentGrade >= rubricInfo.canvasMaxPoints) {
        Logger.log(`Skipping comment for QID ${qId}, Row ${sheetRow}: Student received full marks.`);
        continue;
      }

      showToast_(`AI Rubric Comment: QID ${qId} for row ${sheetRow}...`, 'Processing...', -1);
      Logger.log(`AI rubric comment for QID ${qId}, row ${sheetRow}. Grade: ${studentGrade !== null ? studentGrade : 'ungraded'}/${rubricInfo.canvasMaxPoints}`);
      const apiResult = callClaudeAPIForRubricComment_(
        questionHeaderText, String(studentAnswer), rubricInfo.overallKey,
        studentGrade, rubricInfo.canvasMaxPoints, rubricInfo.criteria,
        claudeApiKey, commentingModel, includeAnswerKey
      );

      if (apiResult.isAuthError) { abortDueToAuthError = true; break; }

      if (apiResult.comment) {
        mainSheet.getRange(sheetRow, qColInfo.commentColIndex + 1).setValue(apiResult.comment.trim());
        SpreadsheetApp.flush();
        commentsWritten++;
      } else {
        Logger.log(`No valid rubric comment for QID ${qId}, row ${sheetRow}. Error: ${apiResult.errorMsg}`);
        errorsEncountered++;
      }
    }
  }

  if (abortDueToAuthError) {
    handleClaudeAuthError_();
    showToast_('Rubric commenting aborted: API key error.', 'Error', 10);
    return;
  }

  showToast_(`AI Rubric Comments Done! Written: ${commentsWritten}, Skipped/Errors: ${errorsEncountered}`, 'Success', 10);
  ui.alert("AI Rubric Commenting Complete", `Finished generating rubric-based comments.\nComments written: ${commentsWritten}\nErrors/Skipped: ${errorsEncountered}`, ui.ButtonSet.OK);
  Logger.log(`aiRubricComment complete. Written: ${commentsWritten}, Errors: ${errorsEncountered}`);
}
