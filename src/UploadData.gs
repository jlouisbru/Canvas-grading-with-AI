// UploadData.gs

/**
 * Uploads essay grades and comments from the active sheet to Canvas.
 */
function uploadEssayGradesToCanvas() {
  const ui = SpreadsheetApp.getUi();
  try {
    const config = getConfigFromSheet_();
    if (!config) return;
    const apiKey = getCanvasApiKey_();
    if (!apiKey) return;

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    Logger.log(`Attempting to upload grades and comments from sheet: "${sheet.getName()}"`);
    if (["Answers", "Settings"].includes(sheet.getName())) {
      ui.alert("Upload Warning", "Please select the main data sheet for uploading.", ui.ButtonSet.OK);
      return;
    }
    const allData = sheet.getDataRange().getValues();

    if (allData.length < 2) {
      ui.alert("No student data found starting from row 2 to upload.");
      return;
    }

    const headerRow = allData[0];
    const studentDataRows = allData.slice(1);
    const userIdColIndex = headerRow.indexOf("Canvas User ID");
    if (userIdColIndex === -1) {
      throw new Error("Column 'Canvas User ID' not found in header row (Row 1).");
    }

    const questionDetailsMap = {};
    const qIdRegex = /\[Q ID: (\d+)\]/;
    headerRow.forEach((header, index) => {
      const headerStr = String(header);
      const match = headerStr.match(qIdRegex);
      if (match && match[1]) {
        const qId = match[1];
        if (!questionDetailsMap[qId]) {
          questionDetailsMap[qId] = { gradeColIndex: null, commentColIndex: null };
        }
        if (headerStr.includes(" Grade")) questionDetailsMap[qId].gradeColIndex = index;
        else if (headerStr.includes(" Comment")) questionDetailsMap[qId].commentColIndex = index;
      }
    });

    if (Object.keys(questionDetailsMap).length === 0) {
      throw new Error("No question columns (Grade or Comment) found in header (Row 1).");
    }
    Logger.log(`Found details for ${Object.keys(questionDetailsMap).length} questions for upload.`);

    const quizId = getQuizIdFromAssignment_(apiKey, config);
    if (!quizId) {
      throw new Error("Cannot upload: Failed to determine Quiz ID.");
    }

    const confirm = ui.alert('Confirm Grade & Comment Upload',
      `Upload grades AND comments for ${studentDataRows.length} students from sheet "${sheet.getName()}"?\n` +
      `Existing essay question grades AND comments in Canvas will be OVERWRITTEN.\n` +
      `Only non-blank, numeric grades and non-blank comments are uploaded.`,
      ui.ButtonSet.OK_CANCEL);
    if (confirm !== ui.Button.OK) {
      ui.alert('Upload cancelled.');
      return;
    }

    showToast_('Fetching submission details...', 'Preparing Upload', -1);
    const userQuizSubmissionMap = fetchAndMapQuizSubmissions_(apiKey, config, quizId);
    if (!userQuizSubmissionMap) {
      showToast_('Upload Failed.', 'Error', 5);
      ui.alert('Upload Error', 'Failed to fetch quiz submission details. Check Logs.', ui.ButtonSet.OK);
      return;
    }

    showToast_('Uploading grades & comments...', 'Uploading...', -1);
    let successCount = 0, failCount = 0, skippedCount = 0, itemsToUpdateCount = 0;

    studentDataRows.forEach((row, rowIndex) => {
      const userId = String(row[userIdColIndex]);
      const studentInfo = `Sheet Row ${rowIndex + 2}, User ${userId}`;
      const submissionDetails = userQuizSubmissionMap[userId];

      if (!submissionDetails) {
        Logger.log(`Skipping ${studentInfo}: No submission found.`);
        skippedCount++;
        return;
      }

      const { quizSubmissionId, attempt } = submissionDetails;
      const questionsPayload = {};
      Object.keys(questionDetailsMap).forEach(qId => {
        const details = questionDetailsMap[qId];
        let questionUpdateData = {};
        let hasDataToUpload = false;

        if (details.gradeColIndex !== null) {
          const gradeValue = row[details.gradeColIndex];
          if (String(gradeValue).trim() !== "" && !isNaN(parseFloat(String(gradeValue))) && isFinite(Number(gradeValue))) {
            questionUpdateData.score = parseFloat(String(gradeValue));
            hasDataToUpload = true;
            itemsToUpdateCount++;
          } else if (String(gradeValue).trim() !== "") {
            Logger.log(`Skipping invalid grade in ${studentInfo}, QID ${qId}: '${gradeValue}'`);
          }
        }
        if (details.commentColIndex !== null) {
          const commentValue = row[details.commentColIndex];
          if (commentValue !== undefined && String(commentValue).trim() !== "") {
            questionUpdateData.comment = String(commentValue).trim();
            hasDataToUpload = true;
            if (details.gradeColIndex === null || String(row[details.gradeColIndex]).trim() === "" || isNaN(parseFloat(String(row[details.gradeColIndex])))) {
                itemsToUpdateCount++; // Count if only comment is being updated
            }
          }
        }
        if (hasDataToUpload) questionsPayload[qId] = questionUpdateData;
      });

      if (Object.keys(questionsPayload).length > 0) {
        const apiPath = `/api/v1/courses/${config.courseId}/quizzes/${quizId}/submissions/${quizSubmissionId}`;
        const payload = { quiz_submissions: [{ attempt: attempt, questions: questionsPayload }] };
        try {
          fetchCanvasAPI_(config.canvasBaseUrl, apiPath, apiKey, {}, 'put', payload);
          successCount++;
          Utilities.sleep(200);
        } catch (e) {
          failCount++;
          Logger.log(`FAILED upload for ${studentInfo}: ${e.message}\nPayload: ${JSON.stringify(payload)}`);
        }
      } else {
        Logger.log(`No valid grades or comments to upload for ${studentInfo}.`);
      }
    });

    showToast_('Upload Complete!', 'Success', 5);
    Utilities.sleep(1000); // Allow toast to be seen before alert
    let summary = `Upload Complete!\n\n` +
      `Attempted updates for: ${itemsToUpdateCount} grade/comment entries.\n` +
      `Successful student submissions updated: ${successCount}\n` +
      `Failed student submissions: ${failCount}\n` +
      `Skipped (no submission): ${skippedCount}\n\n`;
    if (failCount > 0) summary += `Check logs for failure details.`;
    ui.alert('Upload Summary', summary, ui.ButtonSet.OK);
    Logger.log(`Upload summary: SuccessStudents=${successCount}, FailStudents=${failCount}, SkippedStudents=${skippedCount}, ItemsToUpdate=${itemsToUpdateCount}`);

  } catch (error) {
    showToast_('Upload Failed.', 'Error', 5);
    Logger.log(`Error in uploadEssayGradesToCanvas: ${error.message}\nStack: ${error.stack}`);
    ui.alert('Upload Error', error.message + '. Check Logs.', ui.ButtonSet.OK);
  }
}
