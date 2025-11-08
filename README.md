# Canvas Grading with AI

A Google Apps Script integration that combines **Canvas LMS** with **Claude AI** to automate grading and provide intelligent feedback on student assignments.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Features

### AI-Powered Grading
- **Automated Scoring**: Grade student submissions using Claude AI with customizable strictness levels (1-5 scale)
- **Rubric-Based Grading**: Support for Canvas rubrics with AI interpretation
- **Answer Key Grading**: Grade against overall answer keys
- **Generosity Levels**: Choose from Very Strict to Very Generous grading approaches

### Intelligent Feedback
- **AI-Generated Comments**: Automatically generate personalized feedback for non-perfect scores
- **Rubric-Based Comments**: Feedback aligned with Canvas rubric criteria
- **Customizable Output**: Choose whether to include answer keys in feedback

### Canvas Integration
- **Fetch Question Data**: Import quiz questions, prompts, and rubrics directly from Canvas
- **Fetch Student Submissions**: Download student answers for grading
- **Upload Results**: Push grades and comments back to Canvas seamlessly
- **Bulk Operations**: Process multiple assignments efficiently

### Google Sheets Workflow
- **Spreadsheet-Based Interface**: Work with familiar Google Sheets
- **Visual Progress Tracking**: Toast notifications and progress indicators
- **Structured Data Management**: Organized answer keys, rubrics, and student data
- **Settings Configuration**: Customize Canvas URL, API endpoints, and AI models

## 📋 Prerequisites

- **Google Account** with access to Google Sheets and Google Apps Script
- **Canvas LMS Account** with instructor access
- **Canvas API Token** ([How to generate](https://community.canvaslms.com/t5/Admin-Guide/How-do-I-manage-API-access-tokens-as-an-admin/ta-p/89))
- **Claude API Key** from [Anthropic](https://console.anthropic.com/)
- **Canvas Course** with a quiz assignment containing essay questions

## 🚀 Quick Start

### 1. Copy the Template Spreadsheet

**This is the easiest way to get started!** All the code is already included.

1. **Open the template**: [Canvas AI Grading Template](https://docs.google.com/spreadsheets/d/1e2AKNNvqC4knz_jcwL0FVTWHY3bmk1ll9-cL0XQGIeY/edit?usp=sharing)
2. **Make a copy**: Click **File** → **Make a copy**
3. **Name your copy**: e.g., "Canvas AI Grading - [Your Course Name]"
4. **Save to your Drive**: Choose a location and click **Make a copy**

✨ **That's it!** All the Google Apps Script code is automatically included in your copy.

### 2. Refresh and Check Menu

1. **Close and reopen** your copied spreadsheet (or refresh the page)
2. You should see a new menu: **Canvas AI Grading**
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

1. **Fetch Question Prompts**: Import questions from Canvas
2. **Add Answer Keys**: Manually enter ideal answers in the "Answers" sheet
3. **Fetch Student Submissions**: Download student responses
4. **Grade with AI**: Use Claude to automatically grade submissions
5. **Generate Comments**: Create AI-powered feedback
6. **Upload to Canvas**: Push grades and comments back to Canvas

### Menu Options

#### Canvas AI Grading > Fetch Data
- **Fetch Question Prompts**: Import questions, rubrics, and max points from Canvas
- **Fetch Student Submissions**: Download all student answers for the assignment

#### Canvas AI Grading > AI Grading
- **Auto-Grade with Claude (Answer Key)**: Grade using overall answer keys with customizable strictness
- **AI Rubric-Based Grading**: Grade using Canvas rubric criteria

#### Canvas AI Grading > AI Commenting
- **Generate AI Comments (Answer Key)**: Create feedback based on answer keys
- **AI Rubric-Based Comments**: Generate feedback aligned with rubric criteria

#### Canvas AI Grading > Upload to Canvas
- **Upload Grades to Canvas**: Push all grades back to Canvas
- **Upload Comments to Canvas**: Push all feedback comments to Canvas
- **Upload Both Grades and Comments**: Combined upload operation

### Grading Generosity Levels

When grading, you can choose from 5 strictness levels:

1. **Very Strict**: Exact match required, minimal partial credit
2. **Strict**: Close alignment needed, very minor flexibility
3. **Normal/Balanced**: Fair evaluation with proportionate partial credit
4. **Generous**: Main concepts matter, more partial credit awarded
5. **Very Generous**: Significant benefit of doubt, focus on correct elements

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
Create a "Settings" sheet to override defaults without modifying code:
- Settings in the sheet take precedence over constants
- Allows per-spreadsheet customization

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
    ├── Constants.gs                # Configuration constants
    ├── Toast.gs                    # Toast notification helper
    ├── ConfigHelpers.gs            # Configuration utilities
    ├── APIKeyHelpers.gs            # API key management
    ├── CanvasAPIHelpers.gs         # Canvas API integration
    ├── ClaudeAPIHelpers.gs         # Claude AI integration
    ├── SheetUtilities.gs           # Sheet manipulation utilities
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
- **Email**: Contact via GitHub or website

## 🔗 Related Projects

- [Grade Tracking with Canvas API](https://github.com/jlouisbru/grade-tracking-Canvas-API) - Google Sheets integration for Canvas gradebook management

## 📊 Changelog

### Current Version
- Initial public release
- Support for essay question grading
- Rubric-based grading and commenting
- Answer key-based grading and commenting
- Generosity level controls (1-5 scale)
- Full Canvas integration (fetch questions, submissions, upload results)

---

**Made with ❤️ for educators by educators**
