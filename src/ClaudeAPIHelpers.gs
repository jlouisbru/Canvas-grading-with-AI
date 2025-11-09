// ClaudeAPIHelpers.gs

/**
 * Generic Claude API Caller for Messages API.
 * @param {object} payload The full payload for the Claude Messages API.
 * @param {string} apiKey Claude API Key.
 * @param {string} [callingFunctionName="Claude API"] For logging purposes.
 * @returns {{success: boolean, text: string|null, rawResponse: string, errorMsg: string}}
 * @private
 */
function callClaudeAPIMessages_(payload, apiKey, callingFunctionName = "Claude API") {
  const claudeApiUrl = getSetting_("CLAUDE_API_ENDPOINT", DEFAULT_CLAUDE_API_ENDPOINT);
  const options = {
    method: "post",
    contentType: "application/json",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  let rawResponse = "";
  let errorMsg = "";
  let responseText = null;
  let success = false;

  Logger.log(`${callingFunctionName}: Calling Claude. Model: ${payload.model}. Max Tokens: ${payload.max_tokens}. User Message (first 100 chars): ${payload.messages[0]?.content?.substring(0,100)}`);

  try {
    const response = UrlFetchApp.fetch(claudeApiUrl, options);
    const responseCode = response.getResponseCode();
    rawResponse = response.getContentText();

    if (responseCode === 200) {
      const jsonResponse = JSON.parse(rawResponse);
      if (jsonResponse.content && jsonResponse.content.length > 0 && jsonResponse.content[0].text) {
        responseText = jsonResponse.content[0].text.trim();
        success = true;
        Logger.log(`${callingFunctionName}: Claude success. Response (first 100 chars): ${responseText.substring(0,100)}`);
      } else {
        errorMsg = `${callingFunctionName}: Claude API response OK but content/text missing.`;
        Logger.log(errorMsg + " Full Resp: " + rawResponse.substring(0, 500));
      }
    } else {
      errorMsg = `${callingFunctionName}: Claude API Error. Status: ${responseCode}. Response: ${rawResponse.substring(0, 500)}`;
      Logger.log(errorMsg);
    }
  } catch (e) {
    errorMsg = `${callingFunctionName}: Exception during Claude API call: ${e.message}`;
    Logger.log(errorMsg + (rawResponse ? ` Raw Response (if any from fetch error): ${rawResponse.substring(0,200)}` : ""));
  }
  return { success, text: responseText, rawResponse, errorMsg };
}

/**
 * Generates the generosity instruction string for Claude prompts.
 * @param {number} generosityLevel The user-selected generosity level (1-5).
 * @returns {string} The instruction string.
 * @private
 */
function getGenerosityPromptSegment_(generosityLevel) {
  let generosityDescription = "";
  switch (generosityLevel) {
    case 1:
      generosityDescription = "Level 1 (Very Strict): The student's answer must align almost perfectly with the key/rubric criteria. Deduct significantly for any deviation, omission, or imprecision. Partial credit should be minimal.";
      break;
    case 2:
      generosityDescription = "Level 2 (Strict): The student's answer must closely align with the key/rubric criteria. Deduct for deviations, omissions, or imprecision, but allow for very minor flexibility.";
      break;
    case 3:
      generosityDescription = "Level 3 (Normal/Balanced): Evaluate the answer fairly against the key/rubric criteria. Award partial credit for correct components and penalize for incorrect or missing components proportionately.";
      break;
    case 4:
      generosityDescription = "Level 4 (Generous): Be more lenient if the student's answer captures the main concepts of the key/rubric criteria, even if some details are missing or not perfectly expressed. Award more partial credit.";
      break;
    case 5:
      generosityDescription = "Level 5 (Very Generous - EXTREMELY LENIENT): Award FULL POINTS unless the answer is completely off-topic or fails to address the question at all. If the student demonstrates ANY understanding or makes ANY reasonable attempt to answer the question, they should receive full credit. Minor errors, omissions, incomplete explanations, or imperfect wording should NOT reduce the score. The student must essentially not answer the question or provide a completely irrelevant response to lose points. When in doubt, award full points.";
      break;
    default: // Should not happen if validated, but fallback to normal
      generosityDescription = "Level 3 (Normal/Balanced): Defaulting to normal generosity. Evaluate the answer fairly.";
  }
  return `\n\nA generosity level has been set for this grading task: ${generosityDescription}\nApply this generosity level consistently when determining the score.`;
}

/**
 * Calls Claude API for grading based on an overall answer key, incorporating generosity.
 * @param {string} questionPrompt The text of the question.
 * @param {string} answerKey The ideal answer key.
 * @param {string} studentAnswer The student's answer.
 * @param {number} pointsPossible Maximum points for the question.
 * @param {string} apiKey Claude API Key.
 * @param {string} modelName The Claude model to use.
 * @param {number} generosityLevel The generosity level (1-5).
 * @returns {{grade: string|null, rawResponse: string, errorMsg: string}}
 * @private
 */
function callClaudeAPIForGrading_(questionPrompt, answerKey, studentAnswer, pointsPossible, apiKey, modelName, generosityLevel) {
  const generosityInstruction = getGenerosityPromptSegment_(generosityLevel);
  const promptSentToAI = `You are an AI grading assistant. A student provided an answer to a question. Compare it to the answer key and provide a numerical grade. The question is worth ${pointsPossible} points.\nStrictly follow these instructions:\n1. Your response MUST be ONLY the numerical grade (e.g., "1", "0.5", "0").\n2. Do NOT provide any explanation or any other text besides the numerical grade.\n3. If the student's answer is fully correct according to the key, award full points.\n4. If the student's answer is partially correct, award partial points based on the alignment with the key.\n5. If the student's answer is completely incorrect or irrelevant, award 0 points.\n6. The grade must not exceed ${pointsPossible} points. The grade must not be less than 0.\n${generosityInstruction}\n\nQuestion Context: "${questionPrompt}"\nAnswer Key: "${answerKey}"\nStudent's Answer: "${studentAnswer}"\nPoints Possible: ${pointsPossible}`;
  const payload = { model: modelName, max_tokens: 20, messages: [{ "role": "user", "content": promptSentToAI }] };

  // ... (rest of the function: calling callClaudeAPIMessages_ and parsing grade, remains the same)
  const { success, text, rawResponse, errorMsg: apiErrorMsg } = callClaudeAPIMessages_(payload, apiKey, "ClaudeGrading (Overall Key)");
  let parsedGrade = null;
  let errorMsg = apiErrorMsg;

  if (success && text) {
    const gradeMatch = text.match(/^(-?\d+(\.\d+)?)$/);
    if (gradeMatch && gradeMatch[1]) {
      let grade = parseFloat(gradeMatch[1]);
      if (!isNaN(grade)) {
        if (grade < 0) grade = 0;
        if (grade > pointsPossible) grade = pointsPossible;
        parsedGrade = String(grade);
      } else {
        errorMsg = `Claude returned non-numerical grade: ${text}. ` + (errorMsg || "");
      }
    } else {
      errorMsg = `Could not parse numerical grade from Claude response: ${text}. Expected only a number. ` + (errorMsg || "");
    }
  }
  if (errorMsg && !apiErrorMsg) Logger.log(errorMsg);
  return { grade: parsedGrade, rawResponse, errorMsg };
}

/**
 * Calls Claude API for commenting based on an overall answer key.
 * @param {string} questionPrompt The text of the question.
 * @param {string} answerKey The ideal answer key.
 * @param {string} studentAnswer The student's answer.
 * @param {number} studentGrade The grade the student received.
 * @param {number} pointsPossible Maximum points for the question.
 * @param {string} apiKey Claude API Key.
 * @param {string} modelName The Claude model to use.
 * @param {boolean} includeAnswerKey Whether to include the answer key in the comment.
 * @returns {{comment: string|null, rawResponse: string, errorMsg: string}}
 * @private
 */
function callClaudeAPIForCommenting_(questionPrompt, answerKey, studentAnswer, studentGrade, pointsPossible, apiKey, modelName, includeAnswerKey) {
  let systemPrompt = `You are an AI teaching assistant providing feedback. Your goal is to help the recipient understand why their answer was not fully correct and what the correct answer entails, based on the provided answer key.
Be concise and constructive. Do not repeat the grade received.
When referring to the recipient of the feedback, use "you" or "your" instead of "the student" or "student's".`;

  if (includeAnswerKey) {
    systemPrompt += `\nStart your comment by stating the correct answer or key elements from the answer key. Then, briefly explain why your answer didn't fully match the answer key or was incorrect, in relation to the answer key.`;
  } else {
    systemPrompt += `\nDirectly explain why your answer didn't fully match the answer key or was incorrect, in relation to the answer key. Do NOT restate the answer key itself.`;
  }
  systemPrompt += `\nIf your answer has some correct elements, acknowledge them briefly if appropriate before pointing out omissions or errors.
Your entire response should be just the feedback comment text, suitable for a spreadsheet cell.`;

  const userPromptContent = `The question was: "${questionPrompt}"
The ideal answer key is: "${answerKey}"
Your answer was: "${studentAnswer}"
You received ${studentGrade} out of ${pointsPossible} points for this answer.

Please provide a feedback comment based on these details, following the instructions in the system prompt. Remember to use "you" and "your" when referring to the recipient.`;
  const payload = { model: modelName, max_tokens: 300, system: systemPrompt, messages: [{ "role": "user", "content": userPromptContent }] };

  const { success, text, rawResponse, errorMsg } = callClaudeAPIMessages_(payload, apiKey, "ClaudeCommenting (Overall Key)");
  if (!success && errorMsg) Logger.log(errorMsg);
  return { comment: (success && text) ? text : null, rawResponse, errorMsg };
}

/**
 * Calls Claude API for rubric-based grading, incorporating generosity.
 * @param {string} questionText The text of the question.
 * @param {string} studentAnswer The student's answer.
 * @param {number} questionMaxPoints Maximum points for the question.
 * @param {Array<{description: string, points: number}>} rubricCriteria Array of rubric criteria.
 * @param {string} apiKey Claude API Key.
 * @param {string} modelName The Claude model to use.
 * @param {number} generosityLevel The generosity level (1-5).
 * @returns {{grade: number|null, rawResponse: string, errorMsg: string}}
 * @private
 */
function callClaudeAPIForRubricGrade_(questionText, studentAnswer, questionMaxPoints, rubricCriteria, apiKey, modelName, generosityLevel) {
  const generosityInstruction = getGenerosityPromptSegment_(generosityLevel);
  let promptSystem = `You are an AI grading assistant. Your task is to assess a student's answer based on a detailed rubric and provide ONLY a numerical grade.
Strictly follow these instructions:
1.  You will receive: the question text, the student's answer, the total maximum points for the question, and a list of rubric criteria (each with a description and maximum points for that criterion).
2.  Internal Evaluation (Do not show this in your output):
    a.  For each rubric criterion provided, evaluate how well the student's answer meets that criterion. Apply the specified generosity level when assessing each criterion.
    b.  Assign a score for EACH criterion using DISCRETE SCORING ONLY:
        - If the criterion is MET: Award the FULL points for that criterion
        - If the criterion is NOT MET: Award 0 points for that criterion
        - DO NOT award partial points for individual criteria (e.g., no 0.5 points for a 1-point criterion)
        - Each criterion score must be either 0 or the full point value specified for that criterion
3.  Overall Grade Calculation:
    a.  Sum the scores you assigned for each individual rubric criterion. This sum is the student's overall grade for the question.
    b.  The overall grade MUST NOT exceed the question's total maximum points (${questionMaxPoints}). If your sum of criteria scores exceeds this, cap the overall grade at ${questionMaxPoints}. If the sum is less than 0, the grade should be 0.
    c.  Because you are using discrete scoring (0 or full points per criterion), the final grade will be one of the valid combinations of criterion points (e.g., for two 1-point criteria, valid grades are: 0, 1, or 2 only).
4.  Output Format: Your response MUST be ONLY the final numerical overall grade (e.g., "1", "2", "0"). Do NOT provide any explanation, prefix, suffix, or any other text besides the numerical grade.
${generosityInstruction.replace("key/rubric criteria", "rubric criteria")}`; // Make generosity context specific for rubric

  let promptUser = `Please provide a numerical grade for the following student answer:\n\nQuestion: "${questionText}"\nStudent's Answer: "${studentAnswer}"\n\nTotal Maximum Points for this Question: ${questionMaxPoints}\n\nRubric Criteria:\n`;
  if (rubricCriteria && rubricCriteria.length > 0) {
    rubricCriteria.forEach((criterion, index) => {
      promptUser += `${index + 1}. Criterion Description: "${criterion.description}" (Max Points for this criterion: ${criterion.points})\n`;
    });
    promptUser += `\nIMPORTANT: For each criterion above, award either 0 points (not met) or the full point value (met). Do not give partial credit for individual criteria.\n`;
  } else {
    promptUser += "No specific rubric criteria were provided. Grade based on the overall quality of the answer relative to the question and its maximum points, applying the specified generosity. If unable to determine a fair grade, assign 0.\n";
    promptSystem += "\nIf no rubric criteria are provided, assess generally against the question's intent and max points, or assign 0 if no basis for scoring. Apply the generosity level.";
  }
  promptUser += "\nRemember, your response must be ONLY the numerical grade.";
  const payload = { model: modelName, max_tokens: 20, system: promptSystem, messages: [{ "role": "user", "content": promptUser }] };

  // ... (rest of the function: calling callClaudeAPIMessages_ and parsing grade, remains the same)
  const { success, text, rawResponse, errorMsg: apiErrorMsg } = callClaudeAPIMessages_(payload, apiKey, "ClaudeRubricGrade");
  let parsedGrade = null;
  let errorMsg = apiErrorMsg;

  if (success && text) {
    const gradeMatch = text.match(/^(-?\d+(\.\d+)?)$/);
    if (gradeMatch && gradeMatch[1]) {
      let grade = parseFloat(gradeMatch[1]);
      if (!isNaN(grade)) {
        if (grade < 0) grade = 0;
        if (grade > questionMaxPoints) grade = questionMaxPoints;
        parsedGrade = grade;
      } else {
        errorMsg = `Claude (RubricGrade) returned non-numerical grade: '${text}'. ` + (errorMsg || "");
      }
    } else {
      errorMsg = `Could not parse numerical grade from Claude (RubricGrade) response: '${text}'. Expected only a number. ` + (errorMsg || "");
    }
  }
  if (errorMsg && !apiErrorMsg) Logger.log(errorMsg + (rawResponse ? ` Raw Response: ${rawResponse.substring(0,100)}` : ""));
  return { grade: parsedGrade, rawResponse, errorMsg };
}

/**
 * Calls Claude API for rubric-based commenting.
 * @param {string} questionText The text of the question.
 * @param {string} studentAnswer The student's answer.
 * @param {string} overallAnswerKey The overall answer key for context.
 * @param {number} studentGrade The grade the student received.
 * @param {number} questionMaxPoints Maximum points for the question.
 * @param {Array<{description: string, points: number}>} rubricCriteria Array of rubric criteria.
 * @param {string} apiKey Claude API Key.
 * @param {string} modelName The Claude model to use.
 * @param {boolean} includeAnswerKey Whether to include the overallAnswerKey at the start of the comment.
 * @returns {{comment: string|null, rawResponse: string, errorMsg: string}}
 * @private
 */
function callClaudeAPIForRubricComment_(questionText, studentAnswer, overallAnswerKey, studentGrade, questionMaxPoints, rubricCriteria, apiKey, modelName, includeAnswerKey) {
  let promptSystem = `You are an AI teaching assistant. Your task is to provide a constructive feedback comment for a student's answer, explaining why they received a specific grade.
This feedback is based on an overall answer key (for general correctness) and potentially a detailed rubric (for specific criteria).
Strictly follow these instructions:
1.  You will receive: the question text, the student's answer, the overall answer key, the grade the student received, the total maximum points for the question, and a list of rubric criteria (if available).
2.  The student received ${studentGrade} out of ${questionMaxPoints} points.
3.  Feedback Comment Generation:`;

  if (includeAnswerKey) {
    promptSystem += `\n    a.  The comment MUST start with: "The correct answer generally involves: ${overallAnswerKey.replace(/"/g, '\\"')}." (Ensure the overall answer key is accurately inserted and provides context). Then, explain WHY the student received their grade.`;
  } else {
    promptSystem += `\n    a.  Explain WHY the student received their grade (${studentGrade}/${questionMaxPoints}). Do NOT start by restating the overall answer key.`;
  }

  promptSystem += `
    b.  If rubric criteria WERE provided to you, refer to their performance against those specific rubric criteria. Mention strengths and weaknesses related to the criteria.
    c.  If rubric criteria were NOT provided (or were empty), explain the grade based on how the student's answer compares to the overall answer key and general expectations for the question.
    d.  Use "you" and "your" when addressing the student (e.g., "Your explanation of X was good, but you missed Y for Z criterion."). Be constructive and focus on areas for improvement if the grade is not full.
4.  Output Format: Your response MUST be ONLY the feedback comment text, suitable for a spreadsheet cell. Do NOT include any prefixes, salutations, or any other text beyond the comment itself. Aim for a paragraph break (e.g. \\n\\n in output string) between the correct answer summary (if included) and your specific feedback if appropriate.`;

  let promptUser = `Please provide a feedback comment for the student's answer below.\n\nQuestion: "${questionText}"\nStudent's Answer: "${studentAnswer}"\n\nOverall Answer Key (for general context, may or may not be directly included in your output based on system instructions): "${overallAnswerKey}"\nStudent's Grade: ${studentGrade} out of ${questionMaxPoints} possible points.\n\n`;

  if (rubricCriteria && rubricCriteria.length > 0) {
    promptUser += "Rubric Criteria that were likely used for grading (refer to these in your feedback):\n";
    rubricCriteria.forEach((criterion, index) => {
      promptUser += `${index + 1}. Criterion Description: "${criterion.description}" (Max Points for this criterion: ${criterion.points})\n`;
    });
  } else {
    promptUser += "No specific rubric criteria were provided for this question. Please explain the grade based on the student's answer relative to the overall answer key and the question's total maximum points.\n";
  }
  promptUser += "\nRemember, your response must be ONLY the feedback comment text, following all system instructions.";
  const payload = { model: modelName, max_tokens: 1000, system: promptSystem, messages: [{ "role": "user", "content": promptUser }] };

  const { success, text, rawResponse, errorMsg } = callClaudeAPIMessages_(payload, apiKey, "ClaudeRubricComment");
  if (!success && errorMsg) Logger.log(errorMsg + (rawResponse ? ` Raw Response: ${rawResponse.substring(0,100)}` : ""));
  return { comment: (success && text) ? text : null, rawResponse, errorMsg };
}
