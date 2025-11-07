# Setup Guide: Canvas Grading with AI

This comprehensive guide walks you through setting up the Canvas Grading with AI tool from scratch.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Obtaining API Keys](#obtaining-api-keys)
3. [Setting Up Google Apps Script](#setting-up-google-apps-script)
4. [Configuring Your Spreadsheet](#configuring-your-spreadsheet)
5. [First-Time Setup](#first-time-setup)
6. [Testing Your Installation](#testing-your-installation)
7. [Troubleshooting](#troubleshooting)

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
   - Note: Haiku model is very cost-effective (~$0.25 per million input tokens)

---

## Setting Up Google Apps Script

### Step 1: Create a New Spreadsheet

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

## Configuring Your Spreadsheet

### Step 1: Create Settings Sheet

1. **Add New Sheet**
   - Click the **+** at the bottom-left
   - Name it exactly: `Settings`

2. **Add Configuration Headers**
   In Row 1, add:
   - A1: `Setting Name`
   - B1: `Value`

3. **Add Required Settings**
   Starting from Row 2:

| Setting Name | Example Value | Description |
|--------------|---------------|-------------|
| CANVAS_BASE_URL | `https://canvas.chapman.edu` | Your Canvas URL (no trailing slash) |
| COURSE_ID | `12345` | Your Canvas course ID |
| ASSIGNMENT_ID | `67890` | Your Canvas assignment/quiz ID |
| CLAUDE_API_ENDPOINT | `https://api.anthropic.com/v1/messages` | Claude API endpoint |
| CLAUDE_GRADING_MODEL | `claude-3-haiku-20240307` | Model for grading |
| CLAUDE_COMMENTING_MODEL | `claude-3-haiku-20240307` | Model for comments |

### Step 2: Find Canvas IDs

#### Finding Course ID
1. Open your Canvas course
2. Look at the URL: `https://canvas.institution.edu/courses/12345`
3. The number after `/courses/` is your Course ID

#### Finding Assignment ID
1. Open the assignment/quiz in Canvas
2. Look at the URL: `https://canvas.institution.edu/courses/12345/assignments/67890`
3. The number after `/assignments/` is your Assignment ID

### Step 3: Create Answers Sheet

1. **Add Another Sheet**
   - Click the **+** at the bottom
   - Name it exactly: `Answers`

2. **Leave It Empty**
   - This sheet will be auto-populated when you fetch questions
   - Don't add any headers manually

### Step 4: Main Data Sheet

1. **Rename Default Sheet**
   - Right-click "Sheet1"
   - Rename to your course name (e.g., "BIO101-Fall2024")

2. **This Sheet Will Store Student Data**
   - Student names, answers, grades, comments
   - Will be populated when you fetch submissions

---

## First-Time Setup

### Step 1: Refresh Spreadsheet

1. **Reload the Page**
   - Press F5 or click reload
   - Or close and reopen the spreadsheet

2. **Check for Menu**
   - You should see a new menu: **Canvas AI Grading**
   - If not visible, wait 30 seconds and refresh again

3. **Grant Permissions** (First Time Only)
   - Click any menu option
   - A dialog will appear: "Authorization Required"
   - Click **Continue**
   - Select your Google Account
   - Click **Advanced** → **Go to [Project Name] (unsafe)**
   - Click **Allow**
   - Note: "unsafe" warning appears because this is your personal script

### Step 2: Enter API Keys

#### Canvas API Token
1. Click **Canvas AI Grading** → **Fetch Data** → **Fetch Question Prompts**
2. You'll be prompted to enter Canvas API Token
3. Paste your Canvas token
4. Click **OK**

#### Claude API Key
1. Click **Canvas AI Grading** → **AI Grading** → **Auto-Grade with Claude**
2. You'll be prompted to enter Claude API Key
3. Paste your Claude key
4. Click **OK**

**Security Note**: These keys are stored in Script Properties, not visible in the spreadsheet.

---

## Testing Your Installation

### Test 1: Fetch Question Prompts

1. Click **Canvas AI Grading** → **Fetch Data** → **Fetch Question Prompts**
2. Wait for processing
3. Check the **Answers** sheet
   - Should populate with question data
   - Columns: Question ID, Prompt, Answer Key (empty), Max Points, Rubric Criteria

✅ **Success**: Questions appear in Answers sheet  
❌ **Failed**: See Troubleshooting section

### Test 2: Add Manual Answer Key

1. Go to **Answers** sheet
2. In Column C (Overall Answer Key), add an ideal answer for one question
3. This is what Claude will grade against

### Test 3: Fetch Student Submissions

1. Return to main data sheet
2. Click **Canvas AI Grading** → **Fetch Data** → **Fetch Student Submissions**
3. Wait for processing
4. Student data should populate

✅ **Success**: Student names and answers appear  
❌ **Failed**: See Troubleshooting section

### Test 4: Grade One Question with AI

1. Ensure you have:
   - Answer key in Answers sheet (Column C)
   - Student submission in main sheet
   - Empty grade cell for a student

2. Click **Canvas AI Grading** → **AI Grading** → **Auto-Grade with Claude**
3. Select generosity level (try "3" for Normal)
4. Confirm the operation
5. Wait for processing

✅ **Success**: Grade appears in the grade column  
❌ **Failed**: Check API keys and see Troubleshooting

---

## Troubleshooting

### Menu Not Appearing

**Problem**: Canvas AI Grading menu doesn't show up

**Solutions**:
1. Wait 30 seconds and refresh the page
2. Check Apps Script:
   - Open Extensions → Apps Script
   - Click the ▶ (Run) icon next to any function
   - Check for errors in the execution log
3. Ensure all 12 `.gs` files are added
4. Try a hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

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
5. Re-enter API key:
   - Apps Script → Run → Delete `CANVAS_API_KEY` from Script Properties
   - Retry operation to re-enter token

### Claude API Errors

**Problem**: "Claude API Error" or rate limiting

**Solutions**:
1. Verify Claude API key is correct
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
4. Ensure generosity level was selected

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
   - CLAUDE_GRADING_MODEL: `claude-3-sonnet-20240229` (more capable, higher cost)
   - CLAUDE_COMMENTING_MODEL: `claude-3-opus-20240229` (most capable, highest cost)

2. **Available Models**
   - `claude-3-haiku-20240307` - Fast & economical (recommended)
   - `claude-3-sonnet-20240229` - Balanced performance
   - `claude-3-opus-20240229` - Highest quality
   - Check [Anthropic docs](https://docs.anthropic.com/claude/docs/models-overview) for latest models

### Custom Sleep Delays

To adjust API call spacing (in GradingTools.gs):
- Line 77: `Utilities.sleep(1000);` - Delay after grading (1 second)
- Line 255: `Utilities.sleep(1500);` - Delay after rubric grading (1.5 seconds)

Increase these values if experiencing rate limiting.

---

## Support

If you continue to experience issues:

1. **Check GitHub Issues**: [github.com/jlouisbru/Canvas-grading-with-AI/issues](https://github.com/jlouisbru/Canvas-grading-with-AI/issues)
2. **Create New Issue**: Include error messages and execution logs
3. **Review Logs**: Apps Script → Executions (provides detailed error information)

---

**Ready to start grading?** Return to the main [README](README.md) for usage instructions!
