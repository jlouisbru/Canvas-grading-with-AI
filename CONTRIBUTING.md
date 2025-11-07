# Contributing to Canvas Grading with AI

First off, thank you for considering contributing to Canvas Grading with AI! It's people like you that make this tool better for educators everywhere. 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Style Guidelines](#style-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainer.

## How Can I Contribute?

### Reporting Bugs 🐛

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (anonymized student data if needed)
- **Describe the behavior you observed** and what you expected
- **Include screenshots** if applicable
- **Include your environment details**:
  - Google Sheets version
  - Canvas LMS version
  - Browser and version
  - Claude model used

**Template for Bug Reports:**

```markdown
## Description
A clear description of the bug.

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Screenshots
If applicable, add screenshots.

## Environment
- Google Sheets: [e.g., Web version]
- Canvas LMS: [e.g., Cloud instance]
- Browser: [e.g., Chrome 120]
- Claude Model: [e.g., claude-3-haiku-20240307]

## Additional Context
Any other context about the problem.
```

### Suggesting Enhancements 💡

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful** to most users
- **List examples** of how the enhancement would be used
- **Specify which files** would need to be modified (if known)

**Template for Feature Requests:**

```markdown
## Feature Description
A clear description of the feature.

## Use Case
Why is this feature important? Who would benefit?

## Proposed Solution
How should this feature work?

## Alternatives Considered
What alternatives have you considered?

## Additional Context
Any mockups, examples, or references.
```

### Contributing Code 💻

#### First Time Contributors

Look for issues labeled `good first issue` or `help wanted`. These are great starting points!

#### Pull Request Guidelines

1. **Fork the repository** and create your branch from `main`
2. **Follow the coding style** used in the project
3. **Test your changes** thoroughly
4. **Update documentation** if you're changing functionality
5. **Write clear commit messages** following our guidelines
6. **Ensure your PR description** clearly describes the problem and solution

## Getting Started

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a test Google Sheet**
4. **Install the code** in Apps Script
5. **Set up test Canvas course** with sample data
6. **Make your changes**

### Testing Your Changes

Before submitting a PR, test:

- ✅ All menu items work correctly
- ✅ Canvas API integration functions properly
- ✅ Claude API calls succeed
- ✅ Grading produces expected results
- ✅ Error handling works as expected
- ✅ No breaking changes to existing functionality

**Test with:**
- Various question types
- Different grading generosity levels
- Edge cases (empty responses, missing keys, etc.)
- Different Canvas configurations

## Development Process

### Branch Naming

Use descriptive branch names:

- `feature/add-multi-rubric-support`
- `fix/canvas-api-timeout`
- `docs/improve-installation-guide`
- `refactor/simplify-grade-upload`

### Code Organization

This project uses a modular structure:

- **Constants.gs**: Configuration constants
- **APIKeyHelpers.gs**: API key management
- **CanvasAPIHelpers.gs**: Canvas API functions
- **ClaudeAPIHelpers.gs**: Claude API functions  
- **GradingTools.gs**: Main grading logic
- **FetchData.gs**: Data fetching from Canvas
- **UploadData.gs**: Data upload to Canvas
- **SheetUtilities.gs**: Sheet manipulation helpers

When adding features, place code in the appropriate module or create a new one if needed.

## Style Guidelines

### Google Apps Script Style

Follow these conventions:

#### Naming Conventions

```javascript
// Constants - UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Functions - camelCase with trailing underscore for private functions
function publicFunction() { }
function privateFunction_() { }

// Variables - camelCase
const studentData = [];
let currentRow = 1;
```

#### Function Documentation

Use JSDoc comments for all public functions:

```javascript
/**
 * Grades student answers using Claude AI.
 * @param {string} answerKey The correct answer.
 * @param {string} studentAnswer The student's response.
 * @param {number} maxPoints Maximum possible points.
 * @param {string} apiKey The Claude API key.
 * @returns {Object} An object with grade and feedback.
 */
function gradeAnswer_(answerKey, studentAnswer, maxPoints, apiKey) {
  // Implementation
}
```

#### Code Formatting

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Maximum line length: 100 characters
- Place opening braces on the same line

```javascript
// Good
function example() {
  const result = callAPI_('endpoint');
  if (result) {
    return result;
  }
}

// Avoid
function example()
{
  const result = callAPI_("endpoint")
  if(result){return result}
}
```

### Error Handling

Always include proper error handling:

```javascript
try {
  const result = riskyOperation_();
  return { success: true, data: result };
} catch (error) {
  Logger.log(`Error in riskyOperation: ${error.message}`);
  return { success: false, error: error.message };
}
```

### Logging

Use descriptive log messages:

```javascript
// Good
Logger.log(`Grading QID ${questionId} for student ${studentId}. Points: ${points}`);

// Avoid
Logger.log('Grading');
```

## Commit Message Guidelines

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(grading): add support for multiple rubrics per question

Extends rubric support from 4 to 8 criteria per question.
Updates Answers sheet structure and grading logic.

Closes #123
```

```
fix(canvas-api): handle pagination for large student lists

Previously failed for courses with >100 students.
Now correctly paginates through all pages.

Fixes #456
```

```
docs(readme): update installation instructions for M1 Macs

Adds specific steps for Apple Silicon users.
```

## Pull Request Process

1. **Update documentation** for any changed functionality
2. **Add tests** if applicable (manual test procedures)
3. **Update CHANGELOG.md** with your changes
4. **Ensure code follows** style guidelines
5. **Get at least one review** from a maintainer
6. **Squash commits** if requested
7. **Wait for CI checks** to pass (if applicable)

### PR Description Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have tested with various Canvas configurations

## Screenshots
If applicable, add screenshots.

## Related Issues
Closes #123
```

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community support
- **Pull Requests**: Code contributions

### Recognition

Contributors will be recognized in:
- README.md Contributors section
- CHANGELOG.md for each release
- Special thanks in release notes

## Questions?

Don't hesitate to ask questions! You can:

1. Open a GitHub Discussion
2. Comment on related issues
3. Contact the maintainer

## Thank You!

Your contributions make this project better for educators everywhere. Thank you for taking the time to contribute! 🙏

---

**Remember**: Good code is important, but being kind and respectful to fellow contributors is even more important. Let's build a welcoming community together! ❤️
