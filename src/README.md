# Source Code - Google Apps Script Files

This folder contains all the Google Apps Script (`.gs`) files for the Canvas AI Grading tool.

## 📁 Files Overview

These files work together to provide AI-powered grading and feedback for Canvas LMS assignments.

### Core Files

| File | Lines | Purpose |
|------|-------|---------|
| [Constants.gs](Constants.gs) | ~20 | Configuration constants, model defaults, retry policy |
| [Toast.gs](Toast.gs) | ~10 | Toast notification helper functions |
| [ConfigHelpers.gs](ConfigHelpers.gs) | ~120 | Settings and configuration management |
| [APIKeyHelpers.gs](APIKeyHelpers.gs) | ~230 | Secure API key storage and retrieval |

### Integration Files

| File | Lines | Purpose |
|------|-------|---------|
| [CanvasAPIHelpers.gs](CanvasAPIHelpers.gs) | ~370 | Canvas LMS API integration |
| [ClaudeAPIHelpers.gs](ClaudeAPIHelpers.gs) | ~400 | Claude AI API integration (prompts, retries, response parsing) |

### Utility Files

| File | Lines | Purpose |
|------|-------|---------|
| [SheetUtilities.gs](SheetUtilities.gs) | ~190 | Google Sheets utilities & menu system |
| [SheetProcessingHelpers.gs](SheetProcessingHelpers.gs) | ~270 | Data processing and parsing |
| [AIOperationContext.gs](AIOperationContext.gs) | ~80 | Context initialization for AI operations |

### Feature Files

| File | Lines | Purpose |
|------|-------|---------|
| [FetchData.gs](FetchData.gs) | ~380 | Fetch questions and submissions from Canvas |
| [GradingTools.gs](GradingTools.gs) | ~510 | AI grading and feedback generation |
| [UploadData.gs](UploadData.gs) | ~150 | Upload grades and comments to Canvas |

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
3. For each file in this folder:
   - Create a new script file with the same name
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

- **Total Lines**: ~2,750
- **Total Files**: 12 `.gs` files + `appsscript.json`
- **Languages**: JavaScript (Google Apps Script)
- **APIs**: Canvas LMS, Anthropic Claude

## ⚡ Quick Reference

### Key Functions by Use Case

**Fetching Data** (Canvas Tools Menu):
- `fetchAndPopulateQuestionPrompts()` - Import questions, prompts, and max points to "Answers" sheet
- `fetchAndPopulateQuizResponses()` - Download student submissions to main sheet

**AI Grading** (Grading Tools Menu):
- `autoGradeWithClaude()` - Grade using overall answer keys (Column C)
- `aiRubricGrade()` - Grade using your rubric criteria (Columns E+)
- `generateAIComments()` - Generate feedback without rubrics
- `aiRubricComment()` - Generate rubric-based feedback

**Uploading Results** (Canvas Tools Menu):
- `uploadEssayGradesToCanvas()` - Upload grades and comments to Canvas

**Sheet Management** (Sheet Tools Menu):
- `clearGradesAndOrComments()` - Clear grades and/or comments from main sheet
- `setupSettingsSheet()` - Create or verify Settings sheet
- `resetClaudeApiKey()` / `resetCanvasApiKey()` - Clear a stored API key so it can be re-entered

**Menu System** (SheetUtilities.gs):
- `onOpen()` - Creates three menus: Canvas Tools, Grading Tools, Sheet Tools

## 📝 License

MIT License - See [LICENSE](../LICENSE) for details

---

**Need Help?** 
- Check [SETUP.md](../SETUP.md) for setup instructions
- Review [FILE_DESCRIPTIONS.md](../FILE_DESCRIPTIONS.md) for detailed documentation
- Open an issue on GitHub for support
