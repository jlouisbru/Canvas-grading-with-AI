# Source Code - Google Apps Script Files

This folder contains all the Google Apps Script (`.gs`) files for the Canvas AI Grading tool.

## 📁 Files Overview

These files work together to provide AI-powered grading and feedback for Canvas LMS assignments.

### Core Files

| File | Lines | Purpose |
|------|-------|---------|
| [Constants.gs](Constants.gs) | ~50 | Defaults, model lists, dropdown choices, retry and time limits |
| [Toast.gs](Toast.gs) | ~60 | Toasts, alerts, and confirmations that also work in background runs |
| [ConfigHelpers.gs](ConfigHelpers.gs) | ~160 | Settings and configuration |
| [APIKeyHelpers.gs](APIKeyHelpers.gs) | ~250 | Secure API key storage and retrieval |

### Integration Files

| File | Lines | Purpose |
|------|-------|---------|
| [CanvasAPIHelpers.gs](CanvasAPIHelpers.gs) | ~370 | Canvas LMS API integration |
| [ClaudeAPIHelpers.gs](ClaudeAPIHelpers.gs) | ~570 | Claude API: prompts, retries, structured output, answer-key drafts |

### Workflow Files (one per menu step)

| File | Lines | Purpose |
|------|-------|---------|
| [FetchData.gs](FetchData.gs) | ~180 | Step 1: fetch from Canvas (and the question prompts half) |
| [FetchResponses.gs](FetchResponses.gs) | ~190 | Step 1: the student responses half |
| [AnswerKeyDrafts.gs](AnswerKeyDrafts.gs) | ~120 | Step 2: AI-drafted answer keys and rubrics |
| [GradingTools.gs](GradingTools.gs) | ~280 | Steps 3–4: grading and feedback engine |
| [UploadData.gs](UploadData.gs) | ~160 | Step 5: upload grades and comments to Canvas |

### Support Files

| File | Lines | Purpose |
|------|-------|---------|
| [SheetUtilities.gs](SheetUtilities.gs) | ~200 | Menu, Settings sheet and dropdowns, Clear tools |
| [SetupCheck.gs](SetupCheck.gs) | ~200 | Check Setup and the progress checklist |
| [Sidebar.gs](Sidebar.gs) + [Sidebar.html](Sidebar.html) | ~50 + ~230 | Start Here panel |
| [AIHighlights.gs](AIHighlights.gs) | ~95 | Highlighting AI-written cells until reviewed |
| [AutoContinue.gs](AutoContinue.gs) | ~80 | Background continuation of long runs |
| [SheetProcessingHelpers.gs](SheetProcessingHelpers.gs) | ~250 | Sheet parsing and writing |
| [AIOperationContext.gs](AIOperationContext.gs) | ~50 | Prerequisite checks for grading and feedback |

### Project Manifest

| File | Purpose |
|------|---------|
| [appsscript.json](appsscript.json) | Apps Script manifest (V8 runtime, time zone). Lets you deploy with [`clasp push`](https://github.com/google/clasp). |

## 🚀 Installation

### Recommended: Use the Template Spreadsheet

The easiest way to use these scripts is to copy our template spreadsheet, which has all code pre-installed:

**[📋 Copy Template Spreadsheet](https://docs.google.com/spreadsheets/d/1e2AKNNvqC4knz_jcwL0FVTWHY3bmk1ll9-cL0XQGIeY/edit?usp=sharing)**

### Advanced: Manual Installation

If you prefer to install manually:

1. Create a new Google Spreadsheet
2. Open **Extensions** → **Apps Script**
3. For each `.gs` file and `Sidebar.html` in this folder:
   - Create a new script (or HTML) file with the same name
   - Copy and paste the code
4. Save and refresh your spreadsheet

Alternatively, if you use [clasp](https://github.com/google/clasp), point `rootDir` at this folder and run `clasp push`.

See detailed instructions in [SETUP.md](../SETUP.md).

## 📚 Documentation

For detailed explanation of each file's functions and usage:
- [FILE_DESCRIPTIONS.md](../FILE_DESCRIPTIONS.md) - Comprehensive file documentation
- [SETUP.md](../SETUP.md) - Setup and installation guide
- [README.md](../README.md) - Main project documentation

## 🔗 Dependencies

### External APIs
- **Canvas LMS API**: For fetching questions, submissions, and uploading results
- **Anthropic Claude API**: For AI-powered grading and feedback generation

### Google Services
- **Google Apps Script**: Runtime environment
- **Google Sheets**: User interface and data storage
- **Script Properties**: Secure API key storage

## 🔒 Security Notes

- **API Keys**: Never commit API keys to version control
- **Script Properties**: Used for secure, encrypted storage
- **FERPA Compliance**: All student data remains in authorized educational systems
- See [SECURITY.md](../SECURITY.md) for complete security guidelines

## 🛠️ Development

### Code Style
- Use JSDoc comments for functions
- Follow Google Apps Script naming conventions
- Keep functions focused and single-purpose
- Add logging for debugging

### Testing
1. Create a test spreadsheet
2. Use small datasets
3. Check Apps Script execution logs
4. Test error conditions

### Contributing
See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on:
- Reporting bugs
- Suggesting features
- Submitting pull requests
- Code review process

## 📊 File Statistics

- **Total Lines**: ~3,400
- **Total Files**: 18 `.gs` files, `Sidebar.html`, and `appsscript.json`
- **Languages**: JavaScript (Google Apps Script)
- **APIs**: Canvas LMS, Anthropic Claude

## ⚡ Quick Reference

### Menu Items (Grading with AI)

- **Start Here** → `showStartHerePanel()`
- **1. Fetch from Canvas** → `fetchEverythingFromCanvas()`
- **2. Draft Answer Keys with AI** → `draftAnswerKeysWithAI()`
- **3. Grade Answers** → `gradeAnswers()` (continues in the background via `continueGradeAnswers()`)
- **4. Write Feedback** → `writeFeedback()` (continues in the background via `continueWriteFeedback()`)
- **5. Upload to Canvas** → `uploadEssayGradesToCanvas()`
- **Check Setup** → `checkSetup()`
- **More Tools** → `markAllAsReviewed()`, `clearGrades()`, `clearComments()`, `clearGradesAndComments()`, `fetchAndPopulateQuestionPrompts()`, `fetchAndPopulateQuizResponses()`, `setupSettingsSheet()`, `resetClaudeApiKey()`, `resetCanvasApiKey()`

Menu, trigger, and panel functions must stay public (no trailing underscore). `onOpen()` builds the menu and `onEdit()` clears AI highlights when a person edits a cell.

## 📝 License

MIT License - See [LICENSE](../LICENSE) for details

---

**Need Help?** 
- Check [SETUP.md](../SETUP.md) for setup instructions
- Review [FILE_DESCRIPTIONS.md](../FILE_DESCRIPTIONS.md) for detailed documentation
- Open an issue on GitHub for support
