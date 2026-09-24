# Setup Guide: Canvas Grading with AI

This guide walks you through setting up the Canvas Grading with AI tool. We recommend using the **template spreadsheet method** for the easiest setup experience.

## 🎯 Recommended Method: Copy Template Spreadsheet

**Estimated time**: 5-10 minutes

This is the fastest and easiest way to get started. The template includes all the code pre-installed.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Obtaining API Keys](#obtaining-api-keys)
3. [Method 1: Copy Template Spreadsheet (Recommended)](#method-1-copy-template-spreadsheet-recommended)
4. [Method 2: Manual Installation (Advanced)](#method-2-manual-installation-advanced)
5. [Configuring Your Settings](#configuring-your-settings)
6. [First-Time Authorization](#first-time-authorization)
7. [Testing Your Installation](#testing-your-installation)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts & Access
- ✅ Google Account (with Google Sheets access)
- ✅ Canvas LMS Account (instructor role)
- ✅ Anthropic Account (for Claude API)

### Required Information
Before starting, gather:
- Your Canvas institution URL (e.g., `https://canvas.chapman.edu`)
- Canvas Course ID
- Canvas Assignment ID (for the quiz you want to grade)

---

## Obtaining API Keys

### Canvas API Token

1. **Log into Canvas**
   - Go to your institution's Canvas site

2. **Navigate to Account Settings**
   - Click on your profile picture (top-left)
   - Select **Account** → **Settings**

3. **Generate Access Token**
   - Scroll to **Approved Integrations**
   - Click **+ New Access Token**
   - Enter purpose: "Google Sheets AI Grading"
   - Optional: Set expiration date
   - Click **Generate Token**

4. **Save Your Token**
   - **⚠️ IMPORTANT**: Copy the token immediately
   - You cannot view it again after closing the dialog
   - Store it securely (you'll enter it when first using the tool)

### Claude API Key

1. **Create Anthropic Account**
   - Go to [console.anthropic.com](https://console.anthropic.com/)
   - Sign up or log in

2. **Generate API Key**
   - Navigate to **API Keys** section
   - Click **Create Key**
   - Name it (e.g., "Canvas Grading Tool")
   - Copy the generated key

3. **Add Billing Information**
   - Claude API requires billing setup
   - Navigate to **Billing** section
   - Add payment method
   - Note: The default model, Claude Sonnet 5, costs $2 per million input tokens and $10 per million output tokens (thinking counts as output). As a rough guide, grading and commenting 30 students on 5 essay questions costs a dollar or two at the default effort. Setting `CLAUDE_EFFORT` to `medium` or `low` reduces that; Claude Opus 5 costs about 2.5 times as much, and Claude Haiku 4.5 does the job for well under $1 (see [Changing AI Models](#changing-ai-models))

---

## Method 1: Copy Template Spreadsheet (Recommended)

### Why Use the Template?
✅ All code pre-installed  
✅ Settings sheet already configured  
✅ No manual copying required  
✅ Ready to use in minutes  

### Step 1: Access the Template

1. **Open the template spreadsheet**:
   - Go to: [Canvas AI Grading Template](https://docs.google.com/spreadsheets/d/1e2AKNNvqC4knz_jcwL0FVTWHY3bmk1ll9-cL0XQGIeY/edit?usp=sharing)
   - You'll see a Google Sheets document with three tabs: Main sheet, Answers, and Settings

2. **Review the template** (optional):
   - Click **Extensions** → **Apps Script** to see the pre-installed code
   - All 12 script files are already there
   - Close the Apps Script editor

### Step 2: Make Your Copy

1. **Copy the spreadsheet**:
   - Click **File** → **Make a copy**
   - A dialog appears

2. **Name your copy**:
   - Enter a descriptive name, such as:
     - "Canvas AI Grading - BIO 101 Fall 2024"
     - "AI Grading - [Your Course Name]"

3. **Choose location**:
   - Select a folder in your Google Drive
   - Or leave it in "My Drive"

4. **Create the copy**:
   - Click **Make a copy**
   - Your new spreadsheet opens automatically

### Step 3: Verify Installation

1. **Check for the menu**:
   - Look for **Grading with AI** in the menu bar
   - If you don't see it, close the spreadsheet and reopen it
   - Or wait 30 seconds and refresh the page
   - Choose **Grading with AI → Start Here** to open the step-by-step panel

2. **Verify sheets**:
   - You should see three tabs at the bottom:
     - Your main data sheet (name it as you like)
     - **Answers** (for question data)
     - **Settings** (for configuration)

✅ **Success!** You now have a working copy with all code installed.

**Next**: Jump to [Configuring Your Settings](#configuring-your-settings)

---

## Method 2: Manual Installation (Advanced)

**For advanced users** who want to set up from scratch or modify the code.

### Step 1: Create a New Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **Blank** to create a new spreadsheet
3. Name it (e.g., "Canvas AI Grading - [Course Name]")

### Step 2: Open Apps Script Editor

1. In your spreadsheet, click **Extensions** → **Apps Script**
2. A new tab opens with the Apps Script editor
3. You'll see a default `Code.gs` file

### Step 3: Add Script Files

For each `.gs` file from the [`/src/`](https://github.com/jlouisbru/Canvas-grading-with-AI/tree/main/src) folder:

1. **Create New Script File**
   - Click the **+** icon next to "Files"
   - Select **Script**
   - Name it (without `.gs` extension)

2. **Copy Code from GitHub**
   - Open the corresponding file from the repository
   - Click the **Raw** button
   - Select all (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)

3. **Paste into Apps Script**
   - In Apps Script editor, select all (Ctrl+A / Cmd+A)
   - Paste (Ctrl+V / Cmd+V)
   - Click **Save** (💾 icon)

4. **Repeat for All 12 Files**:
   - `Constants.gs`
   - `Toast.gs`
   - `ConfigHelpers.gs`
   - `APIKeyHelpers.gs`
   - `CanvasAPIHelpers.gs`
   - `ClaudeAPIHelpers.gs`
   - `SheetUtilities.gs`
   - `SheetProcessingHelpers.gs`
   - `AIOperationContext.gs`
   - `FetchData.gs`
   - `GradingTools.gs`
   - `UploadData.gs`

### Step 4: Initial Configuration

1. **Update Constants.gs** (if needed)
   - Open `Constants.gs`
   - Update `DEFAULT_CANVAS_BASE_URL` to your institution's URL
   - Save changes

2. **Save Project**
   - Click the **💾 Save** icon
   - Or use Ctrl+S / Cmd+S

3. **Close Apps Script**
   - Close the Apps Script tab
   - Return to your Google Spreadsheet

### Step 5: Create Required Sheets

1. **Create Settings Sheet**:
   - Click the **+** at the bottom-left
   - Name it exactly: `Settings`

2. **Create Answers Sheet**:
   - Click the **+** again
   - Name it exactly: `Answers`

3. **Main Data Sheet**:
   - Rename "Sheet1" to your course name

**Next**: Continue to [Configuring Your Settings](#configuring-your-settings)

---

## Configuring Your Settings

Whether you used the template or manual installation, you need to configure your Canvas and course information.

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **Blank** to create a new spreadsheet
3. Name it (e.g., "Canvas AI Grading - [Course Name]")

### Step 2: Open Apps Script Editor

1. In your spreadsheet, click **Extensions** → **Apps Script**
2. A new tab opens with the Apps Script editor
3. You'll see a default `Code.gs` file

### Step 3: Add Script Files

For each `.gs` file from the repository:

1. **Create New Script File**
   - Click the **+** icon next to "Files"
   - Select **Script**
   - Name it (without `.gs` extension)

2. **Copy Code**
   - Open the corresponding file from GitHub
   - Click the **Raw** button
   - Select all (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)

3. **Paste into Apps Script**
   - In Apps Script editor, select all (Ctrl+A / Cmd+A)
   - Paste (Ctrl+V / Cmd+V)
   - Click **Save** (💾 icon)

4. **Repeat for All Files**
   Add all 12 script files:
   - `Constants.gs`
   - `Toast.gs`
   - `ConfigHelpers.gs`
   - `APIKeyHelpers.gs`
   - `CanvasAPIHelpers.gs`
   - `ClaudeAPIHelpers.gs`
   - `SheetUtilities.gs`
   - `SheetProcessingHelpers.gs`
   - `AIOperationContext.gs`
   - `FetchData.gs`
   - `GradingTools.gs`
   - `UploadData.gs`

### Step 4: Initial Configuration

1. **Update Constants.gs** (if needed)
   - Open `Constants.gs`
   - Update `DEFAULT_CANVAS_BASE_URL` to your institution's URL
   - Save changes

2. **Save Project**
   - Click the **💾 Save** icon
   - Or use Ctrl+S / Cmd+S

3. **Close Apps Script**
   - Close the Apps Script tab
   - Return to your Google Spreadsheet

---

## Configuring Your Settings

Whether you used the template or manual installation, you need to configure your Canvas and course information.

### Step 1: Update the Settings Sheet

1. **Open the Settings sheet** (click the tab at the bottom)

2. **If using the template**: You'll see pre-filled rows. Update the **Value** column (Column B).

3. **If manual installation**: Refresh the spreadsheet, then run **Grading with AI → More Tools → Set Up Settings Sheet**. It creates the rows below with defaults, descriptions, and dropdowns.

| Setting Name | Example Value | Your Value |
|--------------|---------------|------------|
| CANVAS_QUIZ_URL | `https://canvas.yourinstitution.edu/courses/12345/quizzes/67890` | The quiz's link, copied from the address bar |
| CLAUDE_GRADING_MODEL | `claude-sonnet-5` | (use default) |
| CLAUDE_COMMENTING_MODEL | `claude-sonnet-5` | (use default) |
| CLAUDE_EFFORT | `high` | `low`, `medium`, `high`, `xhigh`, or `max` |
| GRADING_GENEROSITY | `3` | 1 (Very Strict) to 5 (Very Generous) |
| INCLUDE_ANSWER_KEY_IN_FEEDBACK | `No` | `Yes` to start feedback with the correct answer |
| CANVAS_API_KEY | *(paste your token)* | Optional — moved to Script Properties and masked on first use |
| CLAUDE_API_KEY | *(paste your key)* | Optional — moved to Script Properties and masked on first use |

**Note**: If using the template, the model and other settings are already configured. You only need to paste the quiz link and your API keys.

### Step 2: Copy the Quiz Link

1. In Canvas, open the quiz you want to grade
2. Copy the whole address from the browser's address bar. It looks like `https://canvas.institution.edu/courses/12345/quizzes/67890`
3. Paste it into the `CANVAS_QUIZ_URL` row

A SpeedGrader link (`.../gradebook/speed_grader?assignment_id=...`) or an assignment link (`.../assignments/67890`) for the quiz works too. Run **Check Setup** to confirm it points to the right course and quiz.

**Older setups**: sheets that still have `CANVAS_COURSE_URL` + `ASSIGNMENT_ID` (or `COURSE_ID` + `CANVAS_BASE_URL`) keep working. If `CANVAS_QUIZ_URL` is filled in, it's used instead. To use a custom Claude endpoint, add a `CLAUDE_API_ENDPOINT` row.

---

## First-Time Authorization

The first time you use the menu, Google asks you to authorize the script.

### Step 1: Grant Script Permissions

1. **Trigger authorization**: click **Grading with AI → Check Setup** (or any other item)

2. **Authorization dialog appears**:
   - You'll see: "Authorization Required"
   - Click **Continue**

3. **Choose your Google Account**:
   - Select the account that owns this spreadsheet

4. **Grant permissions**:
   - You may see a warning: "Google hasn't verified this app"
   - Click **Advanced**
   - Click **Go to [Project Name] (unsafe)**
   - Note: This warning appears because it's your personal script
   - It's safe to proceed

5. **Review and allow**:
   - The script asks to view and manage this spreadsheet, connect to external services (Canvas and Anthropic), display dialogs and the side panel, and **run when you're not present** (used only to continue long grading runs in the background)
   - Click **Allow**

✅ **Done!** You only need to do this once per spreadsheet. (If you update the code later and it needs a new permission, Google asks again.)

### Step 2: Save Your API Keys

Paste your Canvas token into the `CANVAS_API_KEY` row and your Claude key into the `CLAUDE_API_KEY` row of the Settings tab. The first time the script uses them, it moves them into Script Properties and replaces the cells with `•••••`.

If you'd rather not paste them into the sheet, leave those rows empty: you'll be prompted for each key the first time it's needed.

---

## Testing Your Installation

The quickest test is the **Start Here** panel (**Grading with AI → Start Here**): work through its steps top to bottom. The checklist turns green as each step is done.

### Test 1: Check Setup

Click **Check Setup**. Every line should show ✅:
- Canvas settings, Canvas API key, and Quiz (with the number of essay questions)
- Claude API key, Grading model, and Feedback model

Anything marked ❌ comes with a plain-language explanation of what to fix.

### Test 2: Fetch from Canvas

1. Click **1. Fetch from Canvas**
2. Check the **Answers** sheet: one row per essay question (title, prompt, and max points; Column C and Columns E+ are yours to fill)
3. Check **Main Sheet**: one row per student, with Answer, Grade, and Comment columns for each question

### Test 3: Add an Answer Key

Type an answer key into Column C of the Answers sheet for at least one question, or click **2. Draft Answer Keys with AI** and review the highlighted drafts.

### Test 4: Grade

1. Click **3. Grade Answers**
2. The confirmation shows how many answers will be graded, the model, and the generosity level
3. Click **Yes** and watch the grades appear, highlighted in light purple until you review them

✅ **Success**: Grades appear in the grade columns
❌ **Failed**: Run **Check Setup** and see Troubleshooting

---

## Troubleshooting

### Menu Not Appearing

**Problem**: The **Grading with AI** menu doesn't show up

**Solutions**:
1. Wait 30 seconds and refresh the page
2. Check Apps Script:
   - Open Extensions → Apps Script
   - Click the ▶ (Run) icon next to any function
   - Check for errors in the execution log
3. Ensure all `.gs` files and `Sidebar.html` from the `src/` folder are added
4. Try a hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
5. Check the `onOpen()` function in SheetUtilities.gs is present

### Authorization Errors

**Problem**: "You do not have permission to call UrlFetchApp.fetch"

**Solutions**:
1. Clear previous authorizations:
   - Go to [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
   - Remove the Apps Script project
   - Retry authorization
2. Ensure you're granting all requested permissions

### Canvas API Errors

**Problem**: "Canvas API Error" or "Invalid Canvas token"

**Solutions**:
1. Verify Canvas token is correct
2. Check token hasn't expired
3. Ensure Canvas URL is correct (no trailing slash)
4. Verify Course ID and Assignment ID are correct
5. Run **Check Setup**: it tells you whether the problem is the URL, the course, the quiz, or the token
6. Replace the token: **Grading with AI → More Tools → Reset Canvas API Key**, then paste the new one into Settings

### Claude API Errors

**Problem**: "Claude API Error" or rate limiting

**Solutions**:
1. Run **Check Setup**: it confirms whether the key works and whether both model IDs exist
2. Check billing is set up in Anthropic Console
3. Ensure you have credits/balance
4. If rate limited, wait and retry
5. Consider upgrading API tier if needed

### No Questions Found

**Problem**: "No essay questions found"

**Solutions**:
1. Verify the assignment is a Quiz with essay questions
2. Ensure Assignment ID is correct
3. Check you're using a quiz with "Essay Question" type questions (not "File Upload")
4. Try viewing the quiz in Canvas to confirm it has essay questions

### Grades Not Appearing

**Problem**: AI grading runs but no grades appear

**Solutions**:
1. Check that answer keys are filled in Answers sheet (Column C)
2. Verify student has actually submitted an answer
3. Check Apps Script execution log:
   - Extensions → Apps Script
   - Click **Executions** (clock icon)
   - Review recent runs for errors
4. Look at the confirmation before grading: its "Skipped" list names questions with no answer key or missing points

### Stopping a Run

Click **Stop** in the Start Here panel, or **Grading with AI → Stop Current AI Run**. Google can't interrupt an answer that's already being processed, so the current one finishes first (usually a few seconds), then the run stops, keeps everything written, and cancels any scheduled background continuation.

### Background Continuation Didn't Resume

**Problem**: A long run said it would continue in the background, but nothing happened

**Solutions**:
1. Open **Start Here**: the banner shows the latest status (running, continuing, paused, or stopped) and why
2. Check **Extensions → Apps Script → Executions** for a `continueGradeAnswers` or `continueWriteFeedback` run and its error
3. If you declined the "run when you're not present" permission, just run the step again: finished cells are skipped
4. Continuation stops on its own after about 20 background runs, or if a run makes no progress, so it can't loop forever

### Data Mismatch

**Problem**: Questions don't match between Answers sheet and main sheet

**Solutions**:
1. Re-fetch question prompts
2. Re-fetch student submissions
3. Ensure Assignment ID hasn't changed
4. Don't manually modify Question IDs in Answers sheet

---

## Advanced Configuration

### Changing AI Models

To use different Claude models:

1. **Update Settings Sheet**
   - CLAUDE_GRADING_MODEL: the model that assigns grades
   - CLAUDE_COMMENTING_MODEL: the model that writes feedback (you can use a cheaper model here than for grading, or vice versa)

   The Settings sheet always wins over the defaults in the code, so a spreadsheet copied before an update keeps its old model until you change these cells.

2. **Available Models** (prices per million input / output tokens)

   | Model ID | Price | Notes |
   |----------|-------|-------|
   | `claude-sonnet-5` | $2 / $10 | Balanced quality and cost (default). Thinks before answering |
   | `claude-opus-5` | $5 / $25 | Highest quality. Thinks before answering |
   | `claude-haiku-4-5-20251001` | $1 / $5 | Fastest and cheapest; no thinking step. Fine for short, clear-cut answers |

   Check [Anthropic's models overview](https://docs.claude.com/en/docs/about-claude/models/overview) for the latest models. Older model IDs such as `claude-3-haiku-20240307` have been retired and will return an error; if your Settings sheet still has one, replace it.

   A good workflow is to try a new model on a handful of answers you've already graded by hand, and compare before switching a whole class.

3. **Effort (Opus and Sonnet only)**

   `CLAUDE_EFFORT` sets how much the model thinks before answering: `low`, `medium`, `high` (the default when blank), `xhigh`, or `max`. Lower levels are faster and cheaper, and both Sonnet 5 and Opus 5 hold up well at `medium`; start there if a full run takes too long or costs more than you'd like, and compare against a few hand-graded answers. Higher effort means slower calls, so fewer answers get graded per 5-minute run (just run it again to continue). Haiku ignores this setting.

4. **Declined requests**

   Claude's safety filters occasionally decline benign requests (Opus 5 is the most likely to, for example on some life-sciences content). On Opus 5, the script automatically asks Anthropic to re-run a declined request on its recommended fallback model. If a request is still declined, on any model, that cell is left empty, counted under "Errors/Skipped" in the summary, and the reason is written to the execution log, so you can grade that answer by hand.

### Rate Limits and Retries

Grading runs one request at a time, so rate limits are rare. If Claude returns a rate-limit (429), overload (529), or temporary server error (5xx), or the network drops, the script waits and retries automatically (5s, 15s, 30s, or the wait time the API asks for). To change the waits, edit `CLAUDE_RETRY_DELAYS_MS` in `Constants.gs`.

AI operations also stop cleanly after 5 minutes to stay within Google's 6-minute execution limit. Just run the operation again — cells that already have a grade or comment are skipped.

---

## Support

If you continue to experience issues:

1. **Check GitHub Issues**: [github.com/jlouisbru/Canvas-grading-with-AI/issues](https://github.com/jlouisbru/Canvas-grading-with-AI/issues)
2. **Create New Issue**: Include error messages and execution logs
3. **Review Logs**: Apps Script → Executions (provides detailed error information)

---

**Ready to start grading?** Return to the main [README](README.md) for usage instructions!
