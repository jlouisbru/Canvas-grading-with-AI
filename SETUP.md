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
   - Note: Haiku model is very cost-effective (~$0.25 per million input tokens)

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

1. **Check for the menus**:
   - Look for **Canvas Tools**, **Grading Tools**, and **Sheet Tools** in the menu bar
   - If you don't see them, close the spreadsheet and reopen it
   - Or wait 30 seconds and refresh the page

2. **Verify sheets**:
   - You should see three tabs at the bottom:
     - Your main data sheet (name it as you like)
     - **Answers** (for question data)
     - **Settings** (for configuration)

✅ **Success!** You now have a working copy with all code installed.

**Next**: Jump to [Configuring Your Settings](#configuring-your-settings)

---

## Method 2: Manual Installation (Advanced)

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

2. **If using the template**: You'll see pre-filled rows. Update the **Value** column (Column B) for:
   
3. **If manual installation**: Add these rows starting from Row 2:

| Setting Name | Example Value | Your Value |
|--------------|---------------|------------|
| CANVAS_BASE_URL | `https://canvas.chapman.edu` | Your institution's URL |
| COURSE_ID | `12345` | Your course ID |
| ASSIGNMENT_ID | `67890` | Your assignment ID |
| CLAUDE_API_ENDPOINT | `https://api.anthropic.com/v1/messages` | (use default) |
| CLAUDE_GRADING_MODEL | `claude-3-haiku-20240307` | (use default) |
| CLAUDE_COMMENTING_MODEL | `claude-3-haiku-20240307` | (use default) |

**Note**: If using the template, the API endpoint and model settings are already configured. You only need to update the Canvas-specific settings.

### Step 2: Find Canvas IDs

#### Finding Course ID
1. Open your Canvas course
2. Look at the URL: `https://canvas.institution.edu/courses/12345`
3. The number after `/courses/` is your Course ID

#### Finding Assignment ID
1. Open the assignment/quiz in Canvas
2. Look at the URL: `https://canvas.institution.edu/courses/12345/assignments/67890`
3. The number after `/assignments/` is your Assignment ID

---

## First-Time Authorization

When you first use any AI grading feature, you'll need to authorize the script and enter your API keys.

### Step 1: Grant Script Permissions

1. **Trigger authorization**:
   - Click **Canvas Tools** in the menu
   - Select any option (e.g., "Fetch Question Prompts to 'Answers' Sheet")

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
   - Review the permissions requested
   - Click **Allow**

✅ **Done!** You only need to do this once per spreadsheet.

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

1. Click **Canvas Tools** → **Fetch Question Prompts to "Answers" Sheet**
2. Enter your Canvas API token when prompted (first time only)
3. Wait for processing
4. Check the **Answers** sheet - it should populate with:
   - Column A: Question ID & Title (from Canvas)
   - Column B: Full Question Prompt (from Canvas)
   - Column C: Overall Answer Key (empty - for you to fill in)
   - Column D: Max Points (from Canvas)
   - Columns E+: Rubric Criteria (if rubrics are used in Canvas)

✅ **Success**: Questions appear in Answers sheet  
❌ **Failed**: See Troubleshooting section

### Test 2: Add Manual Answer Key

1. Go to **Answers** sheet
2. In Column C (Overall Answer Key), add an ideal answer for one question
3. This is what Claude will grade against

### Test 3: Fetch Student Submissions

1. Return to main data sheet
2. Click **Canvas Tools** → **Fetch Essay Quiz Responses (Main Sheet)**
3. Wait for processing
4. Student data should populate with:
   - Student Name (Sortable)
   - Canvas User ID
   - Question columns with student answers
   - Grade columns (empty)
   - Comment columns (empty)

✅ **Success**: Student names and answers appear  
❌ **Failed**: See Troubleshooting section

### Test 4: Grade One Question with AI

1. Ensure you have:
   - Answer key in Answers sheet (Column C)
   - Student submission in main sheet
   - Empty grade cell for a student

2. Click **Grading Tools** → **Grade without Rubric (using Claude.ai)**
3. Enter your Claude API key when prompted (first time only)
4. Select generosity level:
   - Try "3" for Normal/Balanced (default)
   - Range: 1 (Very Strict) to 5 (Very Generous)
5. Confirm the operation
6. Wait for processing - you'll see toast notifications showing progress

✅ **Success**: Grade appears in the grade column  
❌ **Failed**: Check API keys and see Troubleshooting

---

## Troubleshooting

### Menu Not Appearing

**Problem**: Canvas Tools, Grading Tools, and Sheet Tools menus don't show up

**Solutions**:
1. Wait 30 seconds and refresh the page
2. Check Apps Script:
   - Open Extensions → Apps Script
   - Click the ▶ (Run) icon next to any function
   - Check for errors in the execution log
3. Ensure all 12 `.gs` files are added
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
