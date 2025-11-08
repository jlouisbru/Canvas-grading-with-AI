// CanvasAPIHelpers.gs

/**
 * Fetches data from the Canvas API, handling pagination for GET requests.
 * @param {string} canvasBaseUrl The base URL of the Canvas instance.
 * @param {string} path The API endpoint path (e.g., "/api/v1/courses").
 * @param {string} apiKey The Canvas API key.
 * @param {object} [params={}] URL parameters for GET requests.
 * @param {string} [method='get'] HTTP method (get, post, put, etc.).
 * @param {object} [payload=null] Payload for POST/PUT requests.
 * @returns {Array|object|string|null} Parsed JSON response (array for paginated GET, object for single GET, or response body for others).
 * @throws {Error} If API request fails or path/URL is invalid.
 * @private
 */
function fetchCanvasAPI_(canvasBaseUrl, path, apiKey, params = {}, method = 'get', payload = null) {
  if (!path?.startsWith('/')) throw new Error("Invalid API path. Must start with '/'. Path: " + path);
  if (!canvasBaseUrl) throw new Error("Canvas Base URL is missing.");
  let url = canvasBaseUrl + path;
  const options = {
    method: method.toLowerCase(),
    headers: { 'Authorization': 'Bearer ' + apiKey },
    contentType: 'application/json',
    muteHttpExceptions: true
  };
  if (payload && ['post', 'put', 'patch'].includes(options.method)) {
    options.payload = JSON.stringify(payload);
  }

  if (options.method === 'get' && Object.keys(params).length > 0) {
    const queryParts = [];
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        const value = params[key];
        if (key.endsWith('[]') && Array.isArray(value)) {
          value.forEach(v => queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`));
        } else if (key.endsWith('[]') && !Array.isArray(value)) {
            queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        } else if (Array.isArray(value)) {
            value.forEach(v => queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`));
        }
        else {
          queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
      }
    }
    if (queryParts.length > 0) {
      url += (url.includes('?') ? '&' : '?') + queryParts.join('&');
    }
  }

  let results = [];
  let collectedResponse = null;
  let isPaginatedResult = false;
  let nextPageUrl = url;

  do {
    const currentUrl = nextPageUrl;
    let response;
    Logger.log(`Canvas API: ${options.method.toUpperCase()} ${currentUrl}`);
    try {
      response = UrlFetchApp.fetch(currentUrl, options);
    } catch (e) {
      Logger.log(`Network error during Canvas API call: ${options.method.toUpperCase()} ${currentUrl}: ${e.message}`);
      throw new Error(`Network error fetching ${path}: ${e.message}.`);
    }

    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode >= 200 && responseCode < 300) {
      let jsonResponse = null;
      try {
        jsonResponse = responseBody ? JSON.parse(responseBody) : null;
      } catch (e) {
        if (options.method !== 'get' || !responseBody) {
          Logger.log(`OK ${responseCode} for ${options.method.toUpperCase()} ${currentUrl}, but non-JSON/empty body: ${responseBody.substring(0,200)}...`);
          return responseBody;
        }
        Logger.log(`Failed to parse JSON from ${currentUrl}. Status: ${responseCode}. Error: ${e.message}. Body: ${responseBody.substring(0,200)}...`);
        throw new Error(`Failed to parse JSON response from ${path}. Error: ${e.message}.`);
      }

      if (options.method === 'get') {
        let pageContent = jsonResponse;
        let wasWrapped = false;
        if (!Array.isArray(jsonResponse) && typeof jsonResponse === 'object' && jsonResponse !== null) {
          const knownWrapperKeys = ['quiz_submissions', 'assignment_submissions', 'quiz_questions', 'users', 'enrollments', 'submissions', 'questions'];
          let unwrapped = false;
          for (const key of knownWrapperKeys) {
            if (jsonResponse[key] && Array.isArray(jsonResponse[key])) {
              pageContent = jsonResponse[key];
              unwrapped = true;
              wasWrapped = true;
              break;
            }
          }
          if (!unwrapped) {
            let lastPathSegment = path.split('/').filter(Boolean).pop();
            if (lastPathSegment && jsonResponse[lastPathSegment] && Array.isArray(jsonResponse[lastPathSegment])) {
                pageContent = jsonResponse[lastPathSegment];
                wasWrapped = true;
            } else if (lastPathSegment && !lastPathSegment.endsWith('s') && jsonResponse[lastPathSegment + 's'] && Array.isArray(jsonResponse[lastPathSegment + 's'])) {
                pageContent = jsonResponse[lastPathSegment + 's'];
                wasWrapped = true;
            }
          }
        }

        if (Array.isArray(pageContent)) {
          results = results.concat(pageContent);
          isPaginatedResult = true;
        } else if (pageContent !== null && typeof pageContent === 'object' && !isPaginatedResult && currentUrl === url && !wasWrapped) {
          collectedResponse = pageContent;
        } else if (pageContent !== null && !Array.isArray(pageContent)) {
            Logger.log(`Warning: Non-array page content from GET ${currentUrl}. Type: ${typeof pageContent}. Content: ${JSON.stringify(pageContent).substring(0,100)}. Adding to results as a single item.`);
            results.push(pageContent);
            isPaginatedResult = true;
        } else if (pageContent === null && !isPaginatedResult && currentUrl === url) {
            collectedResponse = null;
        }

        const linkHeader = response.getHeaders()['Link'] || response.getHeaders()['link'];
        const match = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
        nextPageUrl = match?.[1] || null;

        if (nextPageUrl && collectedResponse !== null && !isPaginatedResult) {
            Logger.log(`Switching to array results for ${path} due to presence of 'next' link with an initial single object response.`);
            results = [collectedResponse];
            collectedResponse = null;
            isPaginatedResult = true;
        }
      } else {
        return jsonResponse ?? responseBody;
      }
    } else {
      let errorDetails = `Status: ${responseCode}.`;
      try {
        const errorJson = JSON.parse(responseBody);
        errorDetails += ` Message: ${JSON.stringify(errorJson.errors || errorJson.message || errorJson)}`;
      } catch (e) {
        errorDetails += ` Response: ${responseBody.substring(0,500)}...`;
      }
      Logger.log(`HTTP Error ${responseCode} for ${options.method.toUpperCase()} ${currentUrl}: ${errorDetails}`);
      throw new Error(`Canvas API request failed for ${path}. ${errorDetails}`);
    }
  } while (options.method === 'get' && nextPageUrl);

  if (options.method === 'get') {
    return isPaginatedResult ? results : collectedResponse;
  }
}

/**
 * Retrieves the Canvas Quiz ID from the Assignment ID.
 * @param {string} apiKey Canvas API Key.
 * @param {object} config Configuration object (courseId, assignmentId, canvasBaseUrl).
 * @returns {string|null} The Quiz ID or null if not found.
 * @private
 */
function getQuizIdFromAssignment_(apiKey, config) {
  Logger.log(`Fetching assignment details for Assignment ID: ${config.assignmentId}`);
  try {
    const assignmentDetails = fetchCanvasAPI_(config.canvasBaseUrl, `/api/v1/courses/${config.courseId}/assignments/${config.assignmentId}`, apiKey);
    if (!assignmentDetails?.quiz_id) {
      Logger.log(`Warning: Could not find Quiz ID for Assignment ID ${config.assignmentId}. This assignment may not be a quiz, or the API response was unexpected.`);
      return null;
    }
    Logger.log(`Found Quiz ID: ${assignmentDetails.quiz_id}`);
    return String(assignmentDetails.quiz_id);
  } catch (e) {
    Logger.log(`Failed to get assignment details for assignment ${config.assignmentId}: ${e.message}`);
    return null;
  }
}

/**
 * Fetches essay questions for a given quiz from Canvas.
 * @param {string} apiKey Canvas API Key.
 * @param {object} config Configuration object.
 * @param {string} quizId The Canvas Quiz ID.
 * @returns {{questionMap: object, orderedQuestionIds: string[]}}
 * @private
 */
function getEssayQuestions_(apiKey, config, quizId) {
  Logger.log(`Fetching questions for Quiz ID: ${quizId}`);
  let allQuestions;
  try {
    allQuestions = fetchCanvasAPI_(config.canvasBaseUrl, `/api/v1/courses/${config.courseId}/quizzes/${quizId}/questions`, apiKey, { 'per_page': 100 });
  } catch (e) {
    Logger.log(`ERROR fetching quiz questions for Quiz ID ${quizId}: ${e.message}`);
    throw new Error(`Failed to fetch questions for Quiz ID ${quizId}. Check API permissions or Quiz ID validity. Original error: ${e.message}`);
  }

  if (!Array.isArray(allQuestions)) {
    Logger.log(`ERROR: Failed to fetch quiz questions or format was unexpected for Quiz ID ${quizId}. Response type: ${typeof allQuestions}`);
    throw new Error(`Received unexpected data format when fetching questions for Quiz ID ${quizId}. Expected an array.`);
  }

  const essayQuestions = allQuestions
    .filter(q => q.question_type === 'essay_question')
    .sort((a, b) => a.position - b.position);
  Logger.log(`Found ${essayQuestions.length} essay questions for Quiz ID ${quizId}.`);

  const questionMap = {};
  const orderedQuestionIds = essayQuestions.map(q => {
    const qIdStr = String(q.id);
    questionMap[qIdStr] = {
      title: stripHtml_(q.question_name || `Essay Question (ID: ${qIdStr})`),
      prompt: stripHtml_(q.question_text || (q.question_name || `Essay Question (ID: ${qIdStr})`)),
      position: q.position,
      points_possible: q.points_possible
    };
    return qIdStr;
  });
  return { questionMap, orderedQuestionIds };
}

/**
 * Fetches student enrollments from Canvas for a course.
 * @param {string} apiKey Canvas API Key.
 * @param {object} config Configuration object.
 * @returns {object} A map of student ID to student details.
 * @private
 */
function getStudents_(apiKey, config) {
  Logger.log(`Fetching student list for Course ID: ${config.courseId}`);
  const students = fetchCanvasAPI_(config.canvasBaseUrl, `/api/v1/courses/${config.courseId}/users`, apiKey, { 'enrollment_type[]': 'student', 'per_page': 100 });
  if (!Array.isArray(students)) {
    Logger.log(`ERROR: Failed to fetch student list or format was unexpected for course ${config.courseId}. Proceeding with empty student list.`);
    return {};
  }
  const studentMap = {};
  students.forEach(s => {
    studentMap[String(s.id)] = { name: s.name, sortable_name: s.sortable_name };
  });
  Logger.log(`Fetched ${Object.keys(studentMap).length} students for course ${config.courseId}.`);
  return studentMap;
}

/**
 * Processes Canvas assignment submissions to extract essay question answers, scores, and comments.
 * @param {Array<object>} assignmentSubmissions Array of submission objects from Canvas.
 * @param {object} studentMap Map of student IDs to student details.
 * @param {object} questionMap Map of question IDs to question details.
 * @returns {object} A map of student ID to their answers and scores.
 * @private
 */
function processAssignmentSubmissionsForEssayData_(assignmentSubmissions, studentMap, questionMap) {
  Logger.log("Processing assignment submissions for essay answers, scores, and comments...");
  const studentAnswers = {};

  assignmentSubmissions.forEach((sub) => {
    const userIdStr = String(sub?.user_id);
    if (!userIdStr || !studentMap[userIdStr]) {
      return;
    }

    if (!studentAnswers[userIdStr]) {
      studentAnswers[userIdStr] = { answers: {} };
    }

    const lastAttemptHistory = sub?.submission_history?.slice(-1)[0];
    if (lastAttemptHistory?.submission_data) {
      const quizData = lastAttemptHistory.submission_data;
      if (Array.isArray(quizData)) {
        quizData.forEach(answerData => {
          const questionIdStr = String(answerData?.question_id);
          if (questionIdStr && questionMap[questionIdStr]) {
            studentAnswers[userIdStr].answers[questionIdStr] = {
              text: stripHtml_(answerData.text || ''),
              score: (answerData.score !== undefined && answerData.score !== null) ? answerData.score : "",
              comment: stripHtml_(answerData.comment || '')
            };
          }
        });
      }
    } else if (sub?.submission_data && !lastAttemptHistory) {
        Logger.log(`Submission for user ${userIdStr} has submission_data but no submission_history. Processing submission_data directly.`);
        const quizData = sub.submission_data;
         if (Array.isArray(quizData)) {
            quizData.forEach(answerData => {
                const questionIdStr = String(answerData?.question_id);
                if (questionIdStr && questionMap[questionIdStr]) {
                    studentAnswers[userIdStr].answers[questionIdStr] = {
                        text: stripHtml_(answerData.text || ''),
                        score: (answerData.score !== undefined && answerData.score !== null) ? answerData.score : "",
                        comment: stripHtml_(answerData.comment || '')
                    };
                }
            });
        }
    }
  });
  Logger.log("Finished processing assignment submissions for student answers/scores/comments from Canvas.");
  return studentAnswers;
}

/**
 * Fetches quiz submission details and maps user IDs to their latest submission ID and attempt.
 * @param {string} apiKey Canvas API Key.
 * @param {object} config Configuration object.
 * @param {string} quizId The Canvas Quiz ID.
 * @returns {object|null} Map of user ID to {quizSubmissionId, attempt}, or null on error.
 * @private
 */
function fetchAndMapQuizSubmissions_(apiKey, config, quizId) {
  const apiPath = `/api/v1/courses/${config.courseId}/quizzes/${quizId}/submissions`;
  Logger.log(`Fetching quiz submissions from: ${apiPath}`);
  let quizSubmissionsResponse;
  try {
    quizSubmissionsResponse = fetchCanvasAPI_(config.canvasBaseUrl, apiPath, apiKey, { 'per_page': 100 });
  } catch (e) {
    Logger.log(`Error fetching quiz submissions for quiz ${quizId}: ${e.message}`);
    return null;
  }

  let submissionsArray;
  if (quizSubmissionsResponse && quizSubmissionsResponse.quiz_submissions && Array.isArray(quizSubmissionsResponse.quiz_submissions)) {
    submissionsArray = quizSubmissionsResponse.quiz_submissions;
  } else if (Array.isArray(quizSubmissionsResponse)) {
      Logger.log("Quiz submissions response was a direct array.");
      submissionsArray = quizSubmissionsResponse;
  }
  else {
    Logger.log(`Invalid or empty response for quiz submissions for quiz ${quizId}. Response type: ${typeof quizSubmissionsResponse}, Content: ${JSON.stringify(quizSubmissionsResponse).substring(0,100)}`);
    return null;
  }

  const userQuizSubmissionMap = {};
  submissionsArray.forEach(qs => {
    if (qs && qs.user_id && qs.id && qs.attempt !== undefined && qs.attempt !== null) {
      const userIdStr = String(qs.user_id);
      if (!userQuizSubmissionMap[userIdStr] || qs.attempt > userQuizSubmissionMap[userIdStr].attempt) {
        userQuizSubmissionMap[userIdStr] = { quizSubmissionId: qs.id, attempt: qs.attempt };
      }
    }
  });
  Logger.log(`Mapped ${Object.keys(userQuizSubmissionMap).length} users to latest quiz submission details for quiz ${quizId}.`);
  return userQuizSubmissionMap;
}
