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
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const context = initializeAIOperationContext_(mainSheet, false, true); // Needs answerKeyMap
  if (!context) return;

  const { ui, claudeApiKey, mainSheetHeaderInfo, answerKeyDataMap } = context;
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
  for (let i = 0; i < studentDataValues.length; i++) {
    if (abortDueToAuthError) break;
    const studentRowValues = studentDataValues[i];
    const sheetRowNumber = i + 2;

    for (const [qId, qColInfo] of questionColumnsMap) {
      const studentAnswer = studentRowValues[qColInfo.answerColIndex];
      const currentGrade = studentRowValues[qColInfo.gradeColIndex];
      const pointsPossible = qColInfo.points;

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
 * Generates AI comments for student answers that did not receive full marks.
 * Writes each comment to the sheet immediately after the API call, so partial results
 * are preserved if the operation is interrupted.
 */
function generateAIComments() {
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const context = initializeAIOperationContext_(mainSheet, false, true); // Needs answerKeyMap
  if (!context) return;

  const { ui, claudeApiKey, mainSheetHeaderInfo, answerKeyDataMap } = context;
   if (!answerKeyDataMap || Object.keys(answerKeyDataMap).length === 0) {
    ui.alert("AI Commenting Aborted", "No answer keys loaded from 'Answers' sheet (Column C).", ui.ButtonSet.OK);
    showToast_('AI Commenting Aborted.', 'Error', 5);
    return;
  }

  const includeAnswerKey = getIncludeAnswerKeyChoice_(ui, "overall key");
  if (includeAnswerKey === null) {
    showToast_('AI Feedback Generation Cancelled.', 'Info', 5);
    return;
  }
  Logger.log(`User chose to ${includeAnswerKey ? 'include' : 'omit'} answer key in feedback (overall key).`);


  const userResponse = ui.alert("Confirm AI Feedback Generation",
    `Generate AI comments for answers not receiving full marks, using 'Overall Answer Key' (Col C)?\nAnswer key will be ${includeAnswerKey ? 'INCLUDED' : 'OMITTED'} in the comment.`,
    ui.ButtonSet.YES_NO);
  if (userResponse !== ui.Button.YES) {
    ui.alert("AI Feedback Generation Cancelled.", ui.ButtonSet.OK);
    return;
  }
  showToast_('Starting AI Comment Generation...', 'Processing...', -1);

  const { questionColumnsMap } = mainSheetHeaderInfo;
  const commentingModel = getSetting_("CLAUDE_COMMENTING_MODEL", DEFAULT_CLAUDE_COMMENTING_MODEL);

  const lastRow = mainSheet.getLastRow();
  const dataRange = mainSheet.getRange(2, 1, lastRow - 1, mainSheet.getLastColumn());
  const studentDataValues = dataRange.getValues(); // Read all data once to check existing comments/grades
  let commentsWritten = 0, errorsEncountered = 0;

  let abortDueToAuthError = false;
  for (let i = 0; i < studentDataValues.length; i++) {
    if (abortDueToAuthError) break;
    const studentRowValues = studentDataValues[i];
    const sheetRowNumber = i + 2;

    for (const [qId, qColInfo] of questionColumnsMap) {
      const studentAnswer = studentRowValues[qColInfo.answerColIndex];
      const studentGradeRaw = studentRowValues[qColInfo.gradeColIndex];
      const currentComment = studentRowValues[qColInfo.commentColIndex];
      const pointsPossible = qColInfo.points;

      const studentGradeStr = String(studentGradeRaw ?? "").trim();
      if (studentAnswer && String(studentAnswer).trim() && studentGradeStr &&
          (!currentComment || String(currentComment).trim() === "")) {
        const studentGrade = parseFloat(studentGradeStr);
        if (!isNaN(studentGrade) && studentGrade < pointsPossible) {
          const keyData = answerKeyDataMap[qId];
          if (keyData?.key) {
            showToast_(`Generating comment for QID ${qId}, row ${sheetRowNumber}...`, 'Processing...', -1);
            Logger.log(`Requesting AI comment for QID ${qId}, row ${sheetRowNumber}. Grade: ${studentGrade}/${pointsPossible}`);
            const apiResult = callClaudeAPIForCommenting_(keyData.prompt, keyData.key, String(studentAnswer), studentGrade, pointsPossible, claudeApiKey, commentingModel, includeAnswerKey);

            if (apiResult.isAuthError) {
              abortDueToAuthError = true;
              break;
            }

            if (apiResult.comment) {
              // Write immediately to the sheet — result is saved even if operation is interrupted later.
              mainSheet.getRange(sheetRowNumber, qColInfo.commentColIndex + 1).setValue(apiResult.comment.trim());
              commentsWritten++;
            } else {
              Logger.log(`Claude did not return a valid comment for QID ${qId}, row ${sheetRowNumber}. Error: ${apiResult.errorMsg}`);
              errorsEncountered++;
            }
          } else {
            Logger.log(`No answer key for QID ${qId}. Skipping AI comment for row ${sheetRowNumber}.`);
          }
        }
      }
    }
  }

  if (abortDueToAuthError) {
    handleClaudeAuthError_();
    showToast_('Feedback generation aborted: API key error.', 'Error', 10);
    ui.alert("Feedback Generation Aborted", `The Claude API rejected the key mid-operation.\nComments written before the error: ${commentsWritten}\n\nSee the previous alert for recovery instructions.`, ui.ButtonSet.OK);
    return;
  }

  showToast_('AI Comment Generation Complete!', 'Success', 10);
  ui.alert("AI Comment Generation Complete", `Process finished.\nComments written: ${commentsWritten}\nErrors/Skipped: ${errorsEncountered}`, ui.ButtonSet.OK);
  Logger.log(`AI Comment Generation Complete. Comments: ${commentsWritten}, Errors: ${errorsEncountered}`);
}

/**
 * Grades student answers using Claude AI and rubric data from the "Answers" sheet.
 * Writes each grade to the sheet immediately after the API call, so partial results
 * are preserved if the operation is interrupted.
 */
function aiRubricGrade() {
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const ui = SpreadsheetApp.getUi();
  if (["Answers", "Settings"].includes(mainSheet.getName())) {
    ui.alert("Incorrect Sheet", "Please select main student data sheet.", ui.ButtonSet.OK);
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
  for (let i = 0; i < studentDataValues.length; i++) {
    if (abortDueToAuthError) break;
    const studentRowValues = studentDataValues[i];
    const sheetRowNumber = i + 2;

    for (const [qId, qColInfo] of questionColumnsMap) {
      const studentAnswer = studentRowValues[qColInfo.answerColIndex];
      const currentGrade = studentRowValues[qColInfo.gradeColIndex];
      const questionHeaderText = mainSheetHeaderValues[qColInfo.answerColIndex];

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
 * Generates AI comments for student answers based on rubric data.
 * Writes each comment to the sheet immediately after the API call, so partial results
 * are preserved if the operation is interrupted.
 */
function aiRubricComment() {
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const ui = SpreadsheetApp.getUi();
  if (["Answers", "Settings"].includes(mainSheet.getName())) {
    ui.alert("Incorrect Sheet", "Please select main student data sheet.", ui.ButtonSet.OK);
    return;
  }
  const context = initializeAIOperationContext_(mainSheet, true, false); // Needs rubricDataMap
  if (!context) return;

  const { claudeApiKey, mainSheetHeaderInfo, rubricDataMap } = context;
  if (!rubricDataMap || Object.keys(rubricDataMap).length === 0) {
    return;
  }

  const includeAnswerKey = getIncludeAnswerKeyChoice_(ui, "rubric");
  if (includeAnswerKey === null) {
    showToast_('AI Rubric Commenting Cancelled.', 'Info', 5);
    return;
  }
  Logger.log(`User chose to ${includeAnswerKey ? 'include' : 'omit'} overall answer key in rubric feedback.`);

  const userResponse = ui.alert("Confirm AI Rubric-Based Commenting",
    `Generate comments using rubrics from 'Answers' sheet?\nThe overall answer key (Col C) will be ${includeAnswerKey ? 'INCLUDED' : 'OMITTED'} at the start of the comment.\nComments generated for non-full scores where comment cell is empty.`,
    ui.ButtonSet.YES_NO);
  if (userResponse !== ui.Button.YES) {
    ui.alert("AI Rubric Commenting Cancelled.", ui.ButtonSet.OK);
    return;
  }
  showToast_('Starting AI Rubric Commenting...', 'Processing...', -1);

  const { questionColumnsMap } = mainSheetHeaderInfo;
  const commentingModel = getSetting_("CLAUDE_COMMENTING_MODEL", DEFAULT_CLAUDE_COMMENTING_MODEL);
  const mainSheetHeaderValues = getHeaderValues_(mainSheet);

  const lastRow = mainSheet.getLastRow();
  const dataRange = mainSheet.getRange(2, 1, lastRow - 1, mainSheet.getLastColumn());
  const studentDataValues = dataRange.getValues(); // Read all data once to check existing comments/grades
  let commentsWritten = 0, errorsEncountered = 0;

  let abortDueToAuthError = false;
  for (let i = 0; i < studentDataValues.length; i++) {
    if (abortDueToAuthError) break;
    const studentRowValues = studentDataValues[i];
    const sheetRowNumber = i + 2;

    for (const [qId, qColInfo] of questionColumnsMap) {
      const studentAnswer = studentRowValues[qColInfo.answerColIndex];
      const studentGradeRaw = studentRowValues[qColInfo.gradeColIndex];
      const currentComment = studentRowValues[qColInfo.commentColIndex];
      const questionHeaderText = mainSheetHeaderValues[qColInfo.answerColIndex];

      const studentGradeStr = String(studentGradeRaw ?? "").trim();
      if (studentAnswer && String(studentAnswer).trim() && studentGradeStr &&
          (!currentComment || String(currentComment).trim() === "")) {
        const studentGrade = parseFloat(studentGradeStr);
        const rubricInfo = rubricDataMap[qId];

        if (rubricInfo?.canvasMaxPoints > 0 && !isNaN(studentGrade)) {
          if (studentGrade < rubricInfo.canvasMaxPoints && rubricInfo.overallKey) {
            showToast_(`AI Rubric Comment: QID ${qId} for row ${sheetRowNumber}...`, 'Processing...', -1);
            Logger.log(`AI Rubric Comment: QID ${qId}, Row ${sheetRowNumber}. Grade: ${studentGrade}/${rubricInfo.canvasMaxPoints}`);
            const apiResult = callClaudeAPIForRubricComment_(questionHeaderText, String(studentAnswer), rubricInfo.overallKey, studentGrade, rubricInfo.canvasMaxPoints, rubricInfo.criteria, claudeApiKey, commentingModel, includeAnswerKey);

            if (apiResult.isAuthError) {
              abortDueToAuthError = true;
              break;
            }

            if (apiResult.comment) {
              // Write immediately to the sheet — result is saved even if operation is interrupted later.
              mainSheet.getRange(sheetRowNumber, qColInfo.commentColIndex + 1).setValue(apiResult.comment.trim());
              commentsWritten++;
            } else {
              Logger.log(`Claude returned invalid rubric comment for QID ${qId}, row ${sheetRowNumber}. Error: ${apiResult.errorMsg}`);
              errorsEncountered++;
            }
          } else if (!rubricInfo.overallKey) {
            Logger.log(`Skipping comment for QID ${qId}, Row ${sheetRowNumber}: Missing Overall Answer Key in 'Answers' sheet (Col C).`);
          } else {
            Logger.log(`Skipping comment for QID ${qId}, Row ${sheetRowNumber}: Student received full marks.`);
          }
        } else if (!rubricInfo || rubricInfo.canvasMaxPoints <= 0) {
          Logger.log(`No rubric data or valid max points for QID ${qId}. Skipping AI Rubric Comment for row ${sheetRowNumber}.`);
        } else if (isNaN(studentGrade)) {
          Logger.log(`Invalid grade for QID ${qId}, Row ${sheetRowNumber}: '${studentGradeRaw}'. Skipping AI Rubric Comment.`);
        }
      }
    }
  }

  if (abortDueToAuthError) {
    handleClaudeAuthError_();
    showToast_('Rubric commenting aborted: API key error.', 'Error', 10);
    ui.alert("Rubric Commenting Aborted", `The Claude API rejected the key mid-operation.\nComments written before the error: ${commentsWritten}\n\nSee the previous alert for recovery instructions.`, ui.ButtonSet.OK);
    return;
  }

  showToast_('AI Rubric Commenting Complete!', 'Success', 10);
  ui.alert("AI Rubric Commenting Complete", `Process finished.\nComments written: ${commentsWritten}\nErrors/Skipped: ${errorsEncountered}`, ui.ButtonSet.OK);
  Logger.log(`AI Rubric Commenting Complete. Comments: ${commentsWritten}, Errors: ${errorsEncountered}`);
}
