# Canvas Grading with AI

A Google Apps Script integration that combines **Canvas LMS** with **Claude AI** to automate grading and provide intelligent feedback on student assignments.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Features

### AI-Powered Grading
- **Automated Scoring**: Grade student submissions using Claude AI with customizable strictness levels (1-5 scale)
- **Grade Based on Answer Key**: Grade responses based on an answer key for each question
- **Rubric-Based Grading**: Support grading with predetermined rubrics for all questions

### Use AI for Feedback
- **AI-Generated Comments**: Automatically generate personalized feedback based on students' responses and answer key
- **Rubric-Based Comments**: Feedback aligned with rubric criteria for each question
- **Customizable Output**: Choose whether to include answer keys in feedback to show ideal responses

### Canvas Integration
- **Fetch Question Data**: Import quiz questions, prompts, and rubrics directly from Canvas
- **Fetch Student Submissions**: Download student answers for grading
- **Upload Results**: Push grades and comments back to Canvas seamlessly

### Google Sheets Workflow
- **Clear Interface**: Work cirectly on Google Sheets
- **Progress Tracking**: Toast notifications indicate the progress of each task
- **Structured Data Management**: Organized answer keys, rubrics, and student data
- **Settings Configuration**: Customize Canvas URL, API endpoints, and AI models

## 📋 Prerequisites

- **Google Account** with access to Google Sheets and Google Apps Script
- **Canvas LMS Account** with instructor access
- **Canvas API Token** ([How to generate](https://www.jlouisbru.com/guide-to-canvas-api/))
- **Claude API Key** from [Anthropic](https://console.anthropic.com/)
- **Canvas Course** with a quiz assignment containing essay questions

## 🚀 Quick Start

### 1. Copy the Template Spreadsheet

**This is the easiest way to get started!** All the code is already included.

1. **Open the template**: [Canvas Grading with AI Template](https://docs.google.com/spreadsheets/d/1e2AKNNvqC4knz_jcwL0FVTWHY3bmk1ll9-cL0XQGIeY/edit?usp=sharing)
2. **Make a copy**: Click **File** → **Make a copy**
3. **Name your copy**: e.g., "Canvas AI Grading - [Your Course Name]"
4. **Save to your Drive**: Choose a location and click **Make a copy**

✨ **That's it!** All the Google Apps Script code is automatically included in your copy.

### 2. Refresh and Check Menu

1. **Close and reopen** your copied spreadsheet (or refresh the page)
2. You should see three new menus: **Canvas Tools**, **Grading Tools**, and **Sheet Tools**
3. If not visible, wait 30 seconds and refresh again

### 3. Configure Settings

Your copied spreadsheet already has a **"Settings"** sheet. Update these values:

| Setting Name | Value | Description |
|--------------|-------|-------------|
| CANVAS_BASE_URL | `https://canvas.yourinstitution.edu` | Your institution's Canvas URL |
| COURSE_ID | Your Canvas course ID | Find in Canvas URL |
| ASSIGNMENT_ID | Your Canvas assignment ID | Find in Canvas URL |

The following settings are already configured with defaults (you can customize if needed):
- **CLAUDE_API_ENDPOINT**: `https://api.anthropic.com/v1/messages`
- **CLAUDE_GRADING_MODEL**: `claude-3-haiku-20240307`
- **CLAUDE_COMMENTING_MODEL**: `claude-3-haiku-20240307`

**Note**: The "Answers" sheet will be auto-populated when you fetch questions from Canvas.

### 4. Set Up API Keys

When you first use a feature:
- You'll be prompted to enter your **Canvas API Token**
- You'll be prompted to enter your **Claude API Key**
- These are stored securely in Script Properties (not visible in the spreadsheet)

## 📖 Detailed Setup Guide

For comprehensive step-by-step instructions, see [SETUP.md](SETUP.md).

### Alternative: Manual Installation

**For advanced users** who prefer to manually set up the scripts:

1. Create a new Google Spreadsheet
2. Open **Extensions** → **Apps Script**
3. Copy each `.gs` file from the [`/src/`](src/) folder in this repository
4. Create corresponding script files in Apps Script
5. Follow the configuration steps in [SETUP.md](SETUP.md)

**Note**: The template method (above) is much easier and recommended for most users!

## 🎯 Usage

### Workflow Overview

1. **Fetch Question Prompts**: Import question text and rubrics from Canvas to "Answers" sheet
2. **Fetch Student Submissions**: Download student names and essay responses to main sheet
3. **Add Answer Keys**: Manually enter ideal answers in Column C of "Answers" sheet
4. **Grade with AI**: Use Claude to automatically grade submissions based on answer keys or rubrics
5. **Generate Comments**: Create AI-powered feedback for students
6. **Upload to Canvas**: Push grades and comments back to Canvas LMS

### Menu Options

Your spreadsheet provides three organized menus:

#### 📊 Canvas Tools (Data Import/Export)

**Fetch Essay Quiz Responses (Main Sheet)**
- Imports student submissions from Canvas quiz to your main data sheet
- Creates columns for each essay question with student answers
- Includes columns for grades and comments
- Automatically matches students by Canvas User ID
- Only fetches responses not already present (avoids duplicates)

**Fetch Question Prompts to "Answers" Sheet**
- Retrieves question text, rubrics, and max points from Canvas
- Populates the "Answers" sheet with:
  - Column A: Question ID and title
  - Column B: Full question prompt
  - Column C: Overall answer key (for you to fill in manually)
  - Column D: Maximum points
  - Columns E+: Rubric criteria (description and points)
- Preserves any answer keys you've already entered

**Upload Essay Grades & Comments to Canvas**
- Uploads all grades and comments from main sheet back to Canvas
- Matches students by Canvas User ID
- Updates Canvas gradebook automatically
- Provides summary of successful/failed uploads
- Can handle both grades-only, comments-only, or both

---

#### 🤖 Grading Tools (AI-Powered Assessment)

**Grade without Rubric (using Claude.ai)**
- Grades student essays using Claude AI based on overall answer keys (Column C in "Answers" sheet)
- Prompts you to select grading strictness (1-5 scale):
  - 1 = Very Strict (exact match required)
  - 3 = Normal/Balanced (default)
  - 5 = Very Generous (main concepts suffice)
- Only grades essays that don't have a grade yet (empty grade cells)
- Compares student answer against your answer key
- Assigns numerical score based on alignment with key

**Give Feedback without Rubric (using Claude.ai)**
- Generates personalized AI feedback for essays that didn't receive full points
- Uses overall answer keys from Column C of "Answers" sheet
- Prompts you to choose whether to include answer key in the feedback comment
- Only generates comments for students who received less than full points
- Creates constructive feedback explaining what was missed

**Grade with Rubric (using Claude.ai)**
- Grades using Canvas rubric criteria (from Columns E+ in "Answers" sheet)
- Prompts for grading strictness level (1-5)
- Evaluates student answer against each rubric criterion
- Assigns points based on rubric alignment
- More detailed than answer-key grading

**Give Feedback with Rubric (using Claude.ai)**
- Generates detailed feedback based on Canvas rubric criteria
- Explains performance on each rubric criterion
- Option to include overall answer key in feedback
- Only creates comments for non-full-score submissions
- Provides specific guidance on what to improve

---

#### 🛠️ Sheet Tools (Spreadsheet Management)

**Clear Grades/Comments on Main Sheet**
- Clears grades and/or comments from main data sheet
- Prompts you to choose: clear GRADES, COMMENTS, or BOTH
- Useful for re-grading or testing
- Does not affect student names or answers
- Cannot be undone (use with caution)

**Setup/Verify "Settings" Sheet**
- Creates or verifies the "Settings" sheet with default values
- Adds configuration rows with descriptions
- Useful if Settings sheet is accidentally deleted
- Pre-fills default Canvas URL and API endpoints
- Ensures all required settings are present

### Grading Generosity Levels

When using AI grading features, you can choose from 5 strictness levels:

| Level | Name | Behavior | When to Use |
|-------|------|----------|-------------|
| **1** | Very Strict | Exact match to key/rubric required, minimal partial credit | Precise answer needed (e.g., definitions, formulas) |
| **2** | Strict | Close alignment needed, very minor flexibility | Most factual questions |
| **3** | Normal/Balanced | Fair evaluation with proportionate partial credit | Default for most assignments |
| **4** | Generous | Main concepts matter, more partial credit awarded | Complex essays where approach varies |
| **5** | Very Generous | Significant benefit of doubt, focus on correct elements | Formative assessments, learning-focused |

## 🔒 Security & Privacy

### Data Protection
- **API keys** are stored in Script Properties, never visible in spreadsheets
- **Student data** remains within authorized educational systems (Canvas and Google Workspace)
- **No third-party storage**: All data stays in Canvas and Google infrastructure
- **HTTPS encryption**: All API communication uses secure connections

### FERPA Compliance
When using this tool, you must:
- ✅ Protect the confidentiality of student education records
- ✅ Limit spreadsheet access to authorized individuals only
- ✅ Use data only for legitimate educational purposes
- ✅ Follow your institution's data handling policies

See [SECURITY.md](SECURITY.md) for detailed security best practices.

## 🛠️ Configuration

### Constants (Constants.gs)
- `DEFAULT_CANVAS_BASE_URL`: Your institution's Canvas URL
- `DEFAULT_CLAUDE_API_ENDPOINT`: Claude API endpoint
- `DEFAULT_CLAUDE_GRADING_MODEL`: AI model for grading (default: claude-3-haiku-20240307)
- `DEFAULT_CLAUDE_COMMENTING_MODEL`: AI model for comments (default: claude-3-haiku-20240307)
- `MAX_RUBRIC_CRITERIA`: Maximum rubric criteria supported (default: 4)

### Settings Sheet Override
The "Settings" sheet overrides defaults without modifying code:
- Settings in the sheet take precedence over constants
- Allows per-spreadsheet customization
- Use Sheet Tools > Setup/Verify "Settings" Sheet to create/verify

## 📚 File Structure

```
Canvas-grading-with-AI/
├── README.md                       # This file
├── SETUP.md                        # Detailed setup instructions
├── SECURITY.md                     # Security best practices
├── CONTRIBUTING.md                 # Contribution guidelines
├── CODE_OF_CONDUCT.md              # Community guidelines
├── LICENSE                         # MIT License
├── LICENSE-DOCS.md                 # CC BY-SA 4.0 for documentation
├── FILE_DESCRIPTIONS.md            # Detailed explanation of each file
│
└── src/                            # Google Apps Script source code
    ├── README.md                   # Source code overview
    ├── Constants.gs                # Configuration constants
    ├── Toast.gs                    # Toast notification helper
    ├── ConfigHelpers.gs            # Configuration utilities
    ├── APIKeyHelpers.gs            # API key management
    ├── CanvasAPIHelpers.gs         # Canvas API integration
    ├── ClaudeAPIHelpers.gs         # Claude AI integration
    ├── SheetUtilities.gs           # Sheet manipulation & menu setup
    ├── SheetProcessingHelpers.gs   # Data processing helpers
    ├── AIOperationContext.gs       # AI operation context management
    ├── FetchData.gs                # Canvas data fetching functions
    ├── GradingTools.gs             # AI grading functions
    └── UploadData.gs               # Canvas upload functions
```

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Ways to Contribute
- 🐛 Report bugs
- 💡 Suggest new features
- 📝 Improve documentation
- 🔧 Submit pull requests

## 📄 License

This project uses dual licensing:

- **Code**: [MIT License](LICENSE)
- **Documentation**: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

## ⚠️ Disclaimer

This tool is **not affiliated with or endorsed by**:
- Instructure (Canvas LMS)
- Anthropic (Claude AI)
- Google

Use at your own discretion. Always review AI-generated grades and feedback before finalizing them for students.

## 🙏 Acknowledgments

Created by **Jean-Louis Bru, Ph.D.**  
Instructional Assistant Professor at [Chapman University](https://www.chapman.edu/)

### Support This Project
If you find this tool helpful, please:
- ⭐ Star this repository
- 🔗 Share it with colleagues
- 📣 Provide feedback
- ☕ [Support my work](https://ko-fi.com/louisfr)

## 📬 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/jlouisbru/Canvas-grading-with-AI/issues)
- **Website**: [jlouisbru.com](https://www.jlouisbru.com/)
- **Email**: bru@chapman.edu

## 🔗 Related Projects

- [Grade Tracking with Canvas API](https://github.com/jlouisbru/grade-tracking-Canvas-API) - Google Sheets integration for Canvas gradebook management

## 📊 Changelog

### Current Version (v1.0.0)
- Initial public release
- Three-menu system for organized workflow
- Essay question grading support
- Rubric-based grading and commenting
- Answer key-based grading and commenting
- Generosity level controls (1-5 scale)
- Full Canvas integration (fetch questions, submissions, upload results)
- Sheet management tools (clear data, setup settings)

---

**Made with ❤️ for educators by educators**
