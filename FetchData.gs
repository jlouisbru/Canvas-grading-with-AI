// FetchData.gs

/**
 * Fetches essay question prompts from Canvas and populates the "Answers" sheet.
 * This function will NOT programmatically resize columns. Existing/default widths will be maintained.
 */
function fetchAndPopulateQuestionPrompts() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const answersSheetName = "Answers";
  let answersSheet = spreadsheet.getSheetByName(answersSheetName);

  const baseHeaders = [
    "Question ID & Title (from Canvas)",   // Col A
    "Full Question Prompt (from Canvas)",  // Col B
    "Overall Answer Key (Manual Entry)",   // Col C
    "Max Points (from Canvas)"             // Col D
  ];
  for (let i = 1; i <= MAX_RUBRIC_CRITERIA; i++) {
    baseHeaders.push(`Criterion ${i} Desc`);
    baseHeaders.push(`Criterion ${i} Pts`);
  }
  const numManagedColumns = baseHeaders.length;

  if (!answersSheet) {
    answersSheet = spreadsheet.insertSheet(answersSheetName);
    Logger.log(`Created new sheet: "${answersSheetName}"`);
    // Set headers - Google Sheets will apply default widths
    answersSheet.getRange(1, 1, 1, numManagedColumns).setValues([baseHeaders]);
    answersSheet.setFrozenRows(1);
    Logger.log(`Set headers on new "Answers" sheet. No programmatic column resizing applied.`);
  } else {
    // Check if headers need update. If so, set them.
    // No programmatic resizing will occur. Columns retain current/default widths.
    let headersNeedUpdateForManagedPart = false;
    if (answersSheet.getMaxColumns() < numManagedColumns) {
      headersNeedUpdateForManagedPart = true;
    } else {
      const currentManagedHeaderValues = answersSheet.getRange(1, 1, 1, numManagedColumns).getValues()[0];
      for (let i = 0; i < numManagedColumns; i++) {
        if (currentManagedHeaderValues[i] !== baseHeaders[i]) {
          headersNeedUpdateForManagedPart = true;
          break;
        }
      }
    }
    if (headersNeedUpdateForManagedPart) {
      Logger.log(`Headers for managed columns on "Answers" sheet need update.`);
      answersSheet.getRange(1, 1, 1, numManagedColumns).setValues([baseHeaders]);
      answersSheet.setFrozenRows(1); // Ensure frozen rows if headers are reset
      Logger.log(`Updated headers for script-managed columns on "Answers" sheet. No programmatic column resizing applied.`);
    } else {
      Logger.log(`Headers on "Answers" sheet are current. No changes to headers or column widths made by script.`);
    }
  }

  try {
    const config = getConfigFromSheet_();
    if (!config) return;
    const canvasApiKey = getCanvasApiKey_();
    if (!canvasApiKey) return;

    showToast_('Fetching question prompts from Canvas...', 'Processing...', -1);

    const quizId = getQuizIdFromAssignment_(canvasApiKey, config);
    if (!quizId) {
      throw new Error(`Could not determine Quiz ID from Assignment ID ${config.assignmentId}.`);
    }

    const { questionMap: canvasQuestionMap, orderedQuestionIds: canvasOrderedQIds } = getEssayQuestions_(canvasApiKey, config, quizId);

    if (canvasOrderedQIds.length === 0) {
      ui.alert("Info", "No essay questions found in the specified Canvas quiz.", ui.ButtonSet.OK);
      showToast_('No questions found in Canvas.', 'Info', 5);
      const lastRow = answersSheet.getLastRow();
      if (lastRow > 1) {
        answersSheet.getRange(2, 1, lastRow - 1, numManagedColumns).clearContent();
        Logger.log("Cleared old data from managed columns in 'Answers' sheet as no questions were found in Canvas.");
      }
      return;
    }

    const manualDataStore = new Map();
    const numCurrentDataRows = answersSheet.getLastRow() - 1;

    if (numCurrentDataRows > 0) {
      const colsToReadForExistingData = Math.min(answersSheet.getMaxColumns(), numManagedColumns);
      if (colsToReadForExistingData > 0) {
        const existingAnswersValues = answersSheet.getRange(2, 1, numCurrentDataRows, colsToReadForExistingData).getValues();
        existingAnswersValues.forEach(rowData => {
          const fullQIdCellText = rowData[0] ? String(rowData[0]).trim() : "";
          const qIdMatch = fullQIdCellText.match(/\[Q ID: (\d+)\]/);
          if (qIdMatch && qIdMatch[1]) {
            const qId = qIdMatch[1];
            const overallKey = (rowData.length > 2 && rowData[2] !== undefined) ? String(rowData[2]).trim() : "";
            const rubricValues = [];
            for (let k = 0; k < MAX_RUBRIC_CRITERIA * 2; k++) {
              const rubricCellIndex = 4 + k;
              if (rubricCellIndex < rowData.length) {
                rubricValues.push(rowData[rubricCellIndex] !== undefined ? String(rowData[rubricCellIndex]) : "");
              } else {
                rubricValues.push("");
              }
            }
            manualDataStore.set(qId, { overallKey: overallKey, rubricValues: rubricValues });
          }
        });
      }
    }
    Logger.log(`Loaded manual data for ${manualDataStore.size} questions from "Answers" sheet (managed columns).`);

    if (numCurrentDataRows > 0 && numManagedColumns > 0) {
      answersSheet.getRange(2, 1, numCurrentDataRows, numManagedColumns).clearContent();
    }

    let questionsProcessedCount = 0;
    canvasOrderedQIds.forEach(qId => {
      const qInfo = canvasQuestionMap[qId];
      if (!qInfo) {
        Logger.log(`Warning: QID ${qId} from Canvas ordered list not found in questionMap. Skipping.`);
        return;
      }

      const preservedData = manualDataStore.get(qId);
      const overallKeyToUse = preservedData ? preservedData.overallKey : "";
      const rubricValuesToUse = preservedData ? preservedData.rubricValues : [];

      const newRowValues = [
        `[Q ID: ${qId}] ${qInfo.title}`,
        qInfo.prompt,
        overallKeyToUse,
        qInfo.points_possible
      ];

      for (let k = 0; k < MAX_RUBRIC_CRITERIA * 2; k++) {
        newRowValues.push(rubricValuesToUse[k] || "");
      }
      answersSheet.appendRow(newRowValues); // Data rows are appended
      questionsProcessedCount++;
    });

    showToast_('"Answers" sheet rebuilt successfully!', 'Success', 5);
    ui.alert('Answers Sheet Rebuilt',
      `"Answers" sheet has been rebuilt and synchronized with Canvas.\n\n${questionsProcessedCount} questions processed within ${numManagedColumns} managed columns.\n\n` +
      `Column widths were not programmatically changed by this script.\n\n`+
      `Please review and update Column C ('Overall Answer Key') and any rubric criteria (Columns E onwards) as needed. Any user-added columns beyond the managed area should be preserved.`,
      ui.ButtonSet.OK);

  } catch (error) {
    Logger.log(`Error in fetchAndPopulateQuestionPrompts: ${error.message}\nStack: ${error.stack}`);
    showToast_('Error updating "Answers" sheet.', 'Error', 5);
    ui.alert('Error Updating "Answers" Sheet', `Could not update "Answers" sheet: ${error.message}. Please check the logs.`, ui.ButtonSet.OK);
  }
}

// fetchAndPopulateQuizResponses needs to call a modified writeToSheet_
// (or a new version of it) to handle the +8px padding.
// We will modify the existing writeToSheet_ in SheetProcessingHelpers.gs for this.
// The call within fetchAndPopulateQuizResponses will then need to indicate this special handling.
function fetchAndPopulateQuizResponses() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const mainSheetName = "Main Sheet";
  let mainSheet = spreadsheet.getSheetByName(mainSheetName);

  if (!mainSheet) {
    mainSheet = spreadsheet.insertSheet(mainSheetName);
    Logger.log(`Created new sheet: "${mainSheetName}" because it was not found.`);
    ui.alert("Sheet Created", `The sheet named "${mainSheetName}" was not found and has been created.`, ui.ButtonSet.OK);
  }
  mainSheet.activate();
  showToast_('Starting: Fetch Quiz Responses...', 'Initializing', -1);

  try {
    const config = getConfigFromSheet_();
    if (!config) {
      showToast_('Initialization Error: Config missing.', 'Error', 5);
      return;
    }
    const canvasApiKey = getCanvasApiKey_();
    if (!canvasApiKey) {
      showToast_('Initialization Error: Canvas API Key missing.', 'Error', 5);
      return;
    }
    showToast_('Config OK. Fetching Canvas Data...', 'Processing...', -1); // Essential: Start of Canvas interaction

    const quizId = getQuizIdFromAssignment_(canvasApiKey, config);
    if (!quizId) {
      showToast_('Error: Could not determine Quiz ID.', 'Error', 7);
      throw new Error(`Could not determine Quiz ID from Assignment ID ${config.assignmentId}.`);
    }

    const { questionMap, orderedQuestionIds } = getEssayQuestions_(canvasApiKey, config, quizId);

    if (orderedQuestionIds.length === 0) {
      showToast_('No essay questions found in quiz.', 'Info', 7);
      ui.alert("Info", "No essay questions found in the specified Canvas quiz.", ui.ButtonSet.OK);
      return;
    }
    Logger.log(`Found ${orderedQuestionIds.length} essay questions.`);
    showToast_(`${orderedQuestionIds.length} questions found. Fetching students & submissions...`, 'Canvas API', -1); // Essential: Grouping major API calls

    // --- Header Setup Logic (No individual toasts here, assumed quick) ---
    const requiredHeaders = ["Student Name (Sortable)", "Canvas User ID"];
    // ... (The detailed header setup logic remains unchanged) ...
    let currentHeaders = [];
    let sheetLastCol = mainSheet.getLastColumn();
    let sheetMaxCol = mainSheet.getMaxColumns();
    if (mainSheet.getLastRow() > 0) {
        currentHeaders = mainSheet.getRange(1, 1, 1, Math.max(sheetLastCol, requiredHeaders.length)).getValues()[0];
    } else {
        mainSheet.appendRow(new Array(requiredHeaders.length).fill(""));
        currentHeaders = new Array(requiredHeaders.length).fill("");
    }
    if (String(currentHeaders[0]).trim() !== requiredHeaders[0]) {
        if (mainSheet.getMaxColumns() === 0 || (currentHeaders[0] !== undefined && String(currentHeaders[0]).trim() !== requiredHeaders[0])) {
           mainSheet.insertColumnBefore(1);
        }
        mainSheet.getRange(1, 1).setValue(requiredHeaders[0]);
    }
    if (mainSheet.getMaxColumns() < 2 || (currentHeaders[1] === undefined || String(currentHeaders[1]).trim() !== requiredHeaders[1])) {
        if (mainSheet.getMaxColumns() < 2) {
            mainSheet.insertColumnAfter(1);
        } else if (currentHeaders[1] !== undefined && String(currentHeaders[1]).trim() !== requiredHeaders[1]) {
            mainSheet.insertColumnBefore(2);
        }
        mainSheet.getRange(1, 2).setValue(requiredHeaders[1]);
    }
    // --- End of Header Setup Logic ---

    const qidsForHeaderParsing = orderedQuestionIds.length > 0 ? orderedQuestionIds : getHeaderValues_(mainSheet).map(h => (String(h).match(/\[Q ID: (\d+)\]/) || [])[1]).filter(Boolean);
    const mainSheetHeaderInfo = parseMainSheetHeader_(mainSheet, qidsForHeaderParsing);

    if (!mainSheetHeaderInfo) {
        showToast_('Error: Could not parse main sheet header.', 'Error', 7);
        throw new Error(`Could not parse main sheet header on "${mainSheetName}".`);
    }

    const studentNameColIndexForRead = 0;
    const { userIdColIndex: sheetUserIdColIndexForRead, questionColumnsMap } = mainSheetHeaderInfo;

    const fullyPopulatedStudentRows = new Map();
    const mainSheetLastRow = mainSheet.getLastRow();

    if (sheetUserIdColIndexForRead !== -1 && mainSheetLastRow >= 2) {
      const existingStudentDataValues = mainSheet.getRange(2, 1, mainSheetLastRow - 1, mainSheet.getLastColumn()).getValues();
      existingStudentDataValues.forEach(rowValues => {
        const userId = (rowValues.length > sheetUserIdColIndexForRead && rowValues[sheetUserIdColIndexForRead]) ? String(rowValues[sheetUserIdColIndexForRead]).trim() : null;
        if (userId) {
          let isRowCompleteForFetching = orderedQuestionIds.length > 0;
          for (const qId of orderedQuestionIds) {
            const qCols = questionColumnsMap.get(qId);
            const answerCell = (qCols && rowValues.length > qCols.answerColIndex) ? rowValues[qCols.answerColIndex] : undefined;
            const gradeCell = (qCols && rowValues.length > qCols.gradeColIndex) ? rowValues[qCols.gradeColIndex] : undefined;
            const hasAnswer = answerCell !== undefined && String(answerCell).trim() !== "";
            const hasGrade = gradeCell !== undefined && String(gradeCell).trim() !== "";
            if (!qCols || !hasAnswer || !hasGrade) { isRowCompleteForFetching = false; break; }
          }
          if (isRowCompleteForFetching) { fullyPopulatedStudentRows.set(userId, rowValues); }
        }
      });
      Logger.log(`Found ${fullyPopulatedStudentRows.size} students with complete answer/grade data on sheet.`);
    }

    const studentMapFromCanvas = getStudents_(canvasApiKey, config);
    Logger.log(`Fetched ${Object.keys(studentMapFromCanvas).length} students from Canvas.`);

    const assignmentSubmissionsApiPath = `/api/v1/courses/${config.courseId}/assignments/${config.assignmentId}/submissions`;
    const assignmentSubmissions = fetchCanvasAPI_(config.canvasBaseUrl, assignmentSubmissionsApiPath, canvasApiKey, { 'include[]': 'submission_history', 'per_page': 100 });

    if (!Array.isArray(assignmentSubmissions)) {
      showToast_('Error: Could not retrieve assignment submissions.', 'Error', 7);
      throw new Error("Could not retrieve assignment submissions in the expected array format.");
    }
    Logger.log(`Received ${assignmentSubmissions.length} total assignment submission records.`);
    showToast_('Canvas data fetched. Processing student answers...', 'Processing...', -1); // Essential: After all major API calls

    const studentDataFromCanvas = processAssignmentSubmissionsForEssayData_(assignmentSubmissions, studentMapFromCanvas, questionMap);
    showToast_('Student answers processed. Compiling sheet data...', 'Processing...', -1); // Essential: After primary data processing

    const finalSheetHeader = prepareMainSheetHeader_(orderedQuestionIds, questionMap);
    const finalSheetData = [finalSheetHeader];

    const allStudentIds = new Set([...Object.keys(studentMapFromCanvas), ...Array.from(fullyPopulatedStudentRows.keys())]);
    const sortedAllStudentIds = Array.from(allStudentIds).sort((idA, idB) => {
        const nameA = studentMapFromCanvas[idA]?.sortable_name || studentMapFromCanvas[idA]?.name || idA;
        const nameB = studentMapFromCanvas[idB]?.sortable_name || studentMapFromCanvas[idB]?.name || idB;
        return nameA.localeCompare(nameB);
    });

    let updatedCount = 0, newCount = 0, preservedCount = 0;
    let studentsProcessedInLoop = 0;

    Logger.log(`Processing ${sortedAllStudentIds.length} unique student entries for the sheet.`);

    sortedAllStudentIds.forEach(userId => {
      studentsProcessedInLoop++;
      if (studentsProcessedInLoop % 10 === 0 || studentsProcessedInLoop === sortedAllStudentIds.length) {
        showToast_(`Compiling data for student ${studentsProcessedInLoop}/${sortedAllStudentIds.length}...`, 'Processing...', -1);
      }

      if (fullyPopulatedStudentRows.has(userId)) {
        const existingRow = fullyPopulatedStudentRows.get(userId);
        const newRow = [];
        const studentNameOnSheet = (existingRow.length > studentNameColIndexForRead) ? existingRow[studentNameColIndexForRead] : "Unknown";
        const canvasStudentInfo = studentMapFromCanvas[userId];
        newRow.push(studentNameOnSheet || (canvasStudentInfo?.sortable_name || canvasStudentInfo?.name || "Unknown Student"));
        newRow.push(userId);
        orderedQuestionIds.forEach(qId => {
          const qCols = questionColumnsMap.get(qId);
          if (qCols) {
            newRow.push((existingRow.length > qCols.answerColIndex) ? (existingRow[qCols.answerColIndex] ?? "") : "");
            newRow.push((existingRow.length > qCols.gradeColIndex) ? (existingRow[qCols.gradeColIndex] ?? "") : "");
            newRow.push((qCols.commentColIndex !== undefined && existingRow.length > qCols.commentColIndex && existingRow[qCols.commentColIndex] !== undefined) ? existingRow[qCols.commentColIndex] : "");
          } else { newRow.push("", "", ""); }
        });
        finalSheetData.push(newRow);
        preservedCount++;
      } else {
        const studentInfo = studentMapFromCanvas[userId];
        if (studentInfo) {
          const answersForStudent = studentDataFromCanvas[userId]?.answers || {};
          const row = [ studentInfo.sortable_name || studentInfo.name, userId ];
          orderedQuestionIds.forEach(qId => {
            const answerInfo = answersForStudent[qId];
            row.push(answerInfo?.text ?? "");
            row.push(answerInfo?.score ?? "");
            row.push(answerInfo?.comment ?? "");
          });
          finalSheetData.push(row);
          let wasOnSheet = false;
          if (sheetUserIdColIndexForRead !== -1 && mainSheetLastRow >=2) {
             const existingStudentIdValues = mainSheet.getRange(2, sheetUserIdColIndexForRead + 1, mainSheetLastRow - 1, 1).getValues();
             wasOnSheet = existingStudentIdValues.some(r => (r[0]) ? String(r[0]).trim() === userId : false);
          }
          if (wasOnSheet) updatedCount++;
          else newCount++;
        } else {
          Logger.log(`Student ID ${userId} not in current Canvas roster. Skipping.`);
        }
      }
    });
    Logger.log(`Main sheet ("${mainSheetName}"): ${preservedCount} students preserved, ${updatedCount} updated, ${newCount} new/added.`);
    showToast_(`Data compiled. Writing ${finalSheetData.length -1} student(s) to sheet...`, 'Processing...', -1); // Essential: Before writing to sheet

    writeToSheet_(mainSheet, finalSheetData, true);

    showToast_('Fetch Complete! Sheet updated.', 'Success', 10);
    ui.alert('Fetch Complete (Main Sheet)',
      `Student data processed for the sheet "${mainSheetName}".\n` +
      `Preserved complete rows: ${preservedCount}\n` +
      `Updated/New rows from Canvas: ${updatedCount + newCount}\n\n` +
      `"Student Name (Sortable)" and "Canvas User ID" columns are now ensured.\n` +
      `Column widths set to fit headers with additional padding.\n`+
      `Grades and comments (if available) from Canvas have been included.\n` +
      `Check sheet and Logs (View > Logs) for details.`,
      ui.ButtonSet.OK);

  } catch (error) {
    Logger.log(`Error in fetchAndPopulateQuizResponses (targeting "${mainSheetName}"): ${error.message}\nStack: ${error.stack}`);
    showToast_('Fetch Failed. Check logs.', 'Error', 10);
    ui.alert(`Fetch Error (Sheet: "${mainSheetName}")`, `${error.message}. Check Logs for details (View > Logs).`, ui.ButtonSet.OK);
  }
}
