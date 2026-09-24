// Constants.gs

// Default configurations (will be overridden by "Settings" sheet if present)
const DEFAULT_CANVAS_BASE_URL = "https://canvas.chapman.edu";
const DEFAULT_CLAUDE_API_ENDPOINT = "https://api.anthropic.com/v1/messages";
// Use fixed model IDs (never floating aliases) so grading stays consistent across a term.
const DEFAULT_CLAUDE_GRADING_MODEL = "claude-sonnet-5";
const DEFAULT_CLAUDE_COMMENTING_MODEL = "claude-sonnet-5";
const ANTHROPIC_API_VERSION = "2023-06-01";

// Models that think before answering (adaptive thinking) and accept the `effort` setting.
// max_tokens caps thinking + answer together, so these get a large limit.
const ADAPTIVE_THINKING_MODEL_PATTERN = /^claude-(opus-(4-[6-9]|5)|sonnet-(4-6|5)|fable-5|mythos-5)(?!\d)/;
const ADAPTIVE_THINKING_MAX_TOKENS = 16000;
const VALID_EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"];

// Models whose safety classifiers can decline a request. For these, the API re-runs a declined
// request on Anthropic's recommended fallback model instead of returning the refusal.
const REFUSAL_FALLBACK_MODEL_PATTERN = /^claude-(opus-5|fable-5|mythos-5)(?!\d)/;
const REFUSAL_FALLBACK_BETA = "server-side-fallback-2026-07-01";

// Models documented to support structured outputs (JSON schema responses). Others get plain-text grades.
const STRUCTURED_OUTPUT_MODEL_PATTERN = /^claude-(opus-(4-1|4-5|4-8|5)|sonnet-5|haiku-4-5|fable-5|mythos-5)(?!\d)/;
const MAX_RUBRIC_CRITERIA = 4; // As per your spec

// Claude API retry policy: retried on rate limits (429), overload (529), transient server errors, and network failures.
const CLAUDE_RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504, 529];
const CLAUDE_RETRY_DELAYS_MS = [5000, 15000, 30000]; // One entry per retry; used when no retry-after header is sent.
const CLAUDE_MAX_RETRY_AFTER_MS = 60000; // Cap on a server-requested retry-after wait.

// AI operations stop after this long — leaves ~1 min buffer before GAS hard-kills at 6 min.
const MAX_AI_RUNTIME_MS = 300000;

// Sheet names used throughout the tool.
const MAIN_SHEET_NAME = "Main Sheet";
const ANSWERS_SHEET_NAME = "Answers";
const SETTINGS_SHEET_NAME = "Settings";

// Choices offered as dropdowns in the Settings sheet.
const CLAUDE_MODEL_CHOICES = ["claude-sonnet-5", "claude-opus-5", "claude-haiku-4-5-20251001"];
const GENEROSITY_CHOICES = ["1", "2", "3", "4", "5"];
const DEFAULT_GENEROSITY = 3;
const YES_NO_CHOICES = ["Yes", "No"];

// AI-written cells are highlighted until a person edits them or marks them reviewed.
const AI_HIGHLIGHT_COLOR = "#e8e0f8";
const AI_CELL_NOTE = "Written by AI — review before uploading. Editing this cell (or Mark All as Reviewed) removes the highlight.";

// Long AI runs continue automatically in the background after the 5-minute pause.
const AUTO_CONTINUE_DELAY_MS = 60000;
const AUTO_CONTINUE_MAX_RUNS = 20; // Safety cap: ~20 × 5 min of work per chain.
const RUN_STALE_MS = 600000; // A "running" status with no update for 10 minutes means the run has stopped.
const AUTO_CONTINUE_MAX_LOCK_RETRIES = 10; // A continuation that finds another run busy retries this many times.
