// SheetProcessingHelpers.gs

/**
 * Strips HTML tags and decodes HTML entities from a string.
 * @param {string} htmlString The string containing HTML.
 * @returns {string} The cleaned string.
 * @private
 */
function stripHtml_(htmlString) {
  if (typeof htmlString !== 'string') {
    return htmlString === null || typeof htmlString === 'undefined' ? '' : String(htmlString);
  }
  return htmlString
    .replace(/<[^>]*>/g, '')
    .replace(/ /gi, ' ')
    .replace(/&/gi, '&')
    .replace(/</gi, '<')
    .replace(/>/gi, '>')
    .replace(/"/gi, '"')
    .replace(/'/gi, "'")
    .trim();
}

/**
 * Gets the header values from the first row of a sheet.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The sheet object.
 * @returns {string[]} An array of header values, or an empty array if the sheet has no rows.
 * @private
 */
function getHeaderValues_(sheet) {
    if (sheet.getLastRow() < 1) {
        return [];
    }
    return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
}

/**
 * Parses the main sheet header (Row 1) to map question IDs to column indices.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The main data sheet.
 * @param {string[]} orderedQuestionIds Array of ordered question IDs from Canvas, or an array of QIDs derived from existing headers if Canvas data is unavailable.
 * @returns {{userIdColIndex: number, questionColumnsMap: Map<string, object>}|null} Parsed header info or null on error.
 * @private
 */
function parseMainSheetHeader_(sheet, orderedQuestionIds) {
  if (sheet.getLastRow() < 1) {
    Logger.log("Main sheet has no rows, cannot parse header.");
    SpreadsheetApp.getUi().alert("Error", "Main sheet is missing the header row (Row 1).");
    return null;
  }
  const headerValues = getHeaderValues_(sheet);
  const userIdColIndex = headerValues.indexOf("Canvas User ID");

  if (userIdColIndex === -1) {
    Logger.log("Could not find 'Canvas User ID' in header row 1.");
    return null; 
  }

  const questionColumnsMap = new Map();
  headerValues.forEach((headerText, i) => {
    const qIdMatch = String(headerText).match(/\[Q ID: (\d+)\]/);
    if (qIdMatch && qIdMatch[1]) {
      const qId = qIdMatch[1];
      
      // If orderedQuestionIds is provided and not empty, use it as a filter.
      // Otherwise, process all found QIDs in the header.
      if (orderedQuestionIds && orderedQuestionIds.length > 0 && !orderedQuestionIds.includes(qId)) {
          return; 
      }

      if (!headerText.includes(" Grade") && !headerText.includes(" Comment")) { 
        if (i + 2 < headerValues.length &&
            String(headerValues[i+1]).includes(`[Q ID: ${qId}] Grade`) &&
            String(headerValues[i+2]).includes(`[Q ID: ${qId}] Comment`)) {
          const pointsMatch = String(headerValues[i+1]).match(/\(\/(\d+(\.\d+)?)\)/);
          const points = pointsMatch && pointsMatch[1] ? parseFloat(pointsMatch[1]) : 0;
          questionColumnsMap.set(qId, {
            answerColIndex: i,
            gradeColIndex: i + 1,
            commentColIndex: i + 2,
            points: points
          });
        }
      }
    }
  });
  return { userIdColIndex, questionColumnsMap };
}

/**
 * Prepares the header row array for the main data sheet based on Canvas questions.
 * @param {string[]} orderedQuestionIds Array of ordered question IDs.
 * @param {object} questionMap Map of question ID to question details.
 * @returns {string[]} The header row array.
 * @private
 */
function prepareMainSheetHeader_(orderedQuestionIds, questionMap) {
  const headerRow = ["Student Name (Sortable)", "Canvas User ID"];
  orderedQuestionIds.forEach(qId => {
    const qInfo = questionMap[qId];
    const qIdText = `[Q ID: ${qId}]`;
    headerRow.push(`${qIdText} ${qInfo?.title || `Essay Q (ID: ${qId})`}`);
    headerRow.push(`${qIdText} Grade (/${qInfo?.points_possible ?? '?'})`);
    headerRow.push(`${qIdText} Comment`);
  });
  return headerRow;
}

/**
 * Writes data to a sheet.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The sheet to write to.
 * @param {Array<Array<any>>} sheetData The 2D array of data to write. First row is assumed to be headers.
 * @param {boolean} [applyHeaderFitPlusPadding=false] If true, columns are sized to fit headers then padded by 8px.
 *                                                    If false, no script-driven column resizing occurs after initial header set.
 * @private
 */
function writeToSheet_(sheet, sheetData, applyHeaderFitPlusPadding = false) {
  const headerStartRow = 1;

  if (!sheetData || sheetData.length === 0 || !sheetData[0] || sheetData[0].length === 0) {
    Logger.log(`Sheet data for "${sheet.getName()}" is empty or invalid. Skipping write.`);
    const maxRows = sheet.getMaxRows();
    const maxCols = sheet.getMaxColumns();
    if (maxRows >= headerStartRow && maxCols > 0) {
        sheet.getRange(headerStartRow, 1, maxRows - headerStartRow + 1, maxCols).clearContent();
        Logger.log(`Cleared range ${sheet.getName()}!${headerStartRow}:${maxRows} due to empty data for write.`);
    }
    return;
  }

  // 1. Clear existing content
  const maxRowsSheet = sheet.getMaxRows();
  const maxColsSheet = sheet.getMaxColumns();
  if (maxRowsSheet >= headerStartRow && maxColsSheet > 0) {
    const rowsToClear = maxRowsSheet - headerStartRow + 1;
    if (rowsToClear > 0) {
        sheet.getRange(headerStartRow, 1, rowsToClear, maxColsSheet).clearContent();
        Logger.log(`Cleared range ${sheet.getName()}!${headerStartRow}:${maxRowsSheet}`);
    }
  }

  // 2. Write only the header row
  const headerRowData = [sheetData[0]];
  const numHeaderCols = headerRowData[0].length;
  sheet.getRange(headerStartRow, 1, 1, numHeaderCols).setValues(headerRowData);
  Logger.log(`Wrote header row to "${sheet.getName()}".`);

  const columnWidthsToApply = [];

  if (applyHeaderFitPlusPadding) {
    // 3a. Auto-resize columns based on the header content and store padded widths
    for (let i = 1; i <= numHeaderCols; i++) {
      try {
        sheet.autoResizeColumn(i);
        let currentWidth = sheet.getColumnWidth(i);
        columnWidthsToApply.push(currentWidth + 8); // Add 8 pixels padding
      } catch (e) {
        Logger.log(`Could not auto-resize column ${i} for header on "${sheet.getName()}": ${e.message}. Using default width + padding.`);
        columnWidthsToApply.push(100 + 8); // Default width (100px) + padding if resize fails
      }
    }
    Logger.log(`Auto-resized columns for headers, added padding, and stored widths for "${sheet.getName()}". Padded Widths: ${columnWidthsToApply.join(', ')}`);
  }
  // If applyHeaderFitPlusPadding is false, columnWidthsToApply remains empty, and step 5 for resizing won't run.

  // 4. Write the data rows (if any)
  if (sheetData.length > 1) {
    const dataRows = sheetData.slice(1);
    const dataToWrite = dataRows.map(row => {
        const newRow = row.slice(0, numHeaderCols); // Ensure row is not longer than header
        while (newRow.length < numHeaderCols) { // Pad if shorter
            newRow.push("");
        }
        return newRow;
    });

    if (dataToWrite.length > 0) {
        sheet.getRange(headerStartRow + 1, 1, dataToWrite.length, numHeaderCols).setValues(dataToWrite);
        Logger.log(`Wrote ${dataToWrite.length} data rows to "${sheet.getName()}".`);
    }
  }

  // 5. Re-apply the stored (and padded) column widths IF applyHeaderFitPlusPadding was true.
  if (applyHeaderFitPlusPadding && columnWidthsToApply.length > 0) {
    for (let i = 0; i < columnWidthsToApply.length; i++) {
      try {
        sheet.setColumnWidth(i + 1, columnWidthsToApply[i]);
      } catch (e) {
        Logger.log(`Could not re-apply stored/padded column width for col ${i + 1} on "${sheet.getName()}" to ${columnWidthsToApply[i]}: ${e.message}`);
      }
    }
    Logger.log(`Re-applied stored header-based (with padding) column widths to "${sheet.getName()}".`);
  } else if (!applyHeaderFitPlusPadding) {
      Logger.log(`No programmatic column resizing applied after data write for "${sheet.getName()}" as per request.`);
  }

  sheet.setFrozenRows(headerStartRow);
  Logger.log(`Finished writing to sheet: "${sheet.getName()}".`);
}

/**
 * Parses rubric data from the "Answers" sheet.
 * @returns {object|null} A map of question ID to rubric details, or null if "Answers" sheet not found.
 * @private
 */
function parseRubricDataFromAnswersSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi(); // Ensure ui is defined
  const answersSheet = spreadsheet.getSheetByName("Answers");
  if (!answersSheet) {
    ui.alert("Error", "The 'Answers' sheet was not found. Run 'Fetch Question Prompts'.", ui.ButtonSet.OK);
    return null;
  }

  const rubricDataMap = {};
  const answersSheetValues = answersSheet.getDataRange().getValues();
  for (let i = 1; i < answersSheetValues.length; i++) { 
    const row = answersSheetValues[i];
    const qIdTitleCell = row[0] ? String(row[0]) : "";
    const qIdMatch = qIdTitleCell.match(/\[Q ID: (\d+)\]/);
    if (!qIdMatch?.[1]) continue; 
    const qId = qIdMatch[1];

    const overallKey = String(row[2] || "").trim(); 
    const canvasMaxPointsStr = String(row[3] || "").trim(); 
    const canvasMaxPoints = canvasMaxPointsStr && !isNaN(parseFloat(canvasMaxPointsStr)) ? parseFloat(canvasMaxPointsStr) : 0;

    if (canvasMaxPoints <= 0 && overallKey) { 
        Logger.log(`Warning for QID ${qId}: Max Points (Col D) is missing or zero. Value: '${canvasMaxPointsStr}'. Rubric grading may rely on criteria points total if Canvas points are 0.`);
    }

    const criteria = [];
    for (let j = 0; j < MAX_RUBRIC_CRITERIA; j++) {
      const descColIndex = 4 + (j * 2);    
      const ptsColIndex = descColIndex + 1; 
      if (descColIndex < row.length && ptsColIndex < row.length) {
        const desc = String(row[descColIndex]).trim();
        const ptsStr = String(row[ptsColIndex]).trim();
        if (desc && ptsStr && !isNaN(parseFloat(ptsStr)) && parseFloat(ptsStr) > 0) {
          criteria.push({ description: desc, points: parseFloat(ptsStr) });
        } else if (desc || (ptsStr && ptsStr !== "0"  && ptsStr !== "")) { 
          Logger.log(`QID ${qId}, Criterion ${j+1}: Incomplete or invalid. Description: '${desc}', Points: '${ptsStr}'. Skipping this criterion.`);
        }
      } else {
        break; 
      }
    }
    
    if (canvasMaxPoints > 0 || criteria.length > 0 ) {
         rubricDataMap[qId] = { overallKey, canvasMaxPoints, criteria };
    } else if (overallKey) { 
         rubricDataMap[qId] = { overallKey, canvasMaxPoints: 0, criteria: [] }; 
    }
  }
  Logger.log(`Parsed rubric data for ${Object.keys(rubricDataMap).length} questions from "Answers" sheet.`);
  return rubricDataMap;
}
