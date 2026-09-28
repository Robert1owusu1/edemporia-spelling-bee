export type AccountRole = 'parent' | 'teacher' | 'admin' | 'student';

export interface Account {
  id: string;
  email?: string;
  name?: string;
  role: AccountRole;
  studentId?: string;
  avatarUrl?: string;
}

export interface StudentActivityLog {
  id: string;
  timestamp: string;
  action: 'login' | 'round_completed' | 'daily_challenge';
  details: string;
  wordCount?: number;
  correctCount?: number;
  durationMinutes?: number;
  tier?: number;
}

export interface Student {
  id: string;
  studentCode: string; // Unique Student ID for child login e.g. ST-84920
  name: string;
  age: number;
  className: string;
  currentTier: number;
  hearts: number;
  // `streak` is the round combo (resets on a wrong word, max 50) while
  // `dailyStreak` counts consecutive practice days. `streakDays` and
  // `heartsRemaining` are aliases the backend keeps for older payloads.
  streak: number;
  dailyStreak?: number;
  streakDays?: number;
  points: number;
  avatarColor?: string;
  avatarUrl?: string;
  isIndependent?: boolean; // True if age >= 15
  supervisorAccountId?: string;

  // Monitoring Statistics for Teachers & Parents
  lastActiveAt?: string;
  isLoggedInToday?: boolean;
  totalTimeSpentMinutes?: number;
  totalSpentSeconds?: number;
  wordsSpelledToday?: number;
  totalWordsAttemptedToday?: number;
  activityLogs?: StudentActivityLog[];
}

export interface AuthResponse {
  token: string;
  account: Account;
  students: Student[];
}

export interface Word {
  id: string;
  text: string;
  tier: number;
  category?: string | null;
  definition: string;
  exampleSentence: string;
}

/** One word's outcome, as produced by the game loop and shown on results. */
export interface WordFeedback {
  word: Word;
  isCorrect: boolean;
  userSpelling: string;
  attempts: number;
  combo: number;
  xpEarned: number;
}

/**
 * The `location.state` contract for /round-result. GameLoopPage is the only
 * writer; typing it here means a refresh/deep-link (state === null) can be
 * told apart from a real round without `any`.
 */
export interface RoundResultState {
  tier?: number;
  score?: number;
  totalWords?: number;
  pointsEarned?: number;
  streakDays?: number;
  heartsRemaining?: number;
  tierAdvanced?: boolean;
  earnedBadges?: Badge[];
  totalSpentSeconds?: number;
  results?: WordFeedback[];
  syncError?: boolean;
}

/** One word as posted to POST /admin/words/import-csv. */
export interface CsvImportWord {
  text: string;
  tier: number;
  category?: string;
}

/** Response body of POST /admin/words/import-csv (mirrors adminWordController). */
export interface CsvImportResponse {
  message: string;
  total: number;
  results: {
    /** Full rows of the words the database actually created. */
    successful: Word[];
    failed: Array<{ row: number; data: CsvImportWord; error: string }>;
    skipped: Array<{ row: number; data: CsvImportWord; reason: string }>;
  };
}

export interface SubmitRoundDto {
  studentId?: string;
  wordId?: string;
  tier?: number;
  score?: number;
  totalWords?: number;
  correct?: boolean;
  attempts?: number;
  results?: Array<{ wordId: string; correct: boolean; attempts?: number; spelling?: string }>;
  durationSeconds?: number;
  source?: 'PRACTICE' | 'TIER' | 'ACTIVITY';
}

export interface RoundResultResponse {
  points?: number;
  streak?: number;
  hearts?: number;
  pointsEarned?: number;
  totalPoints?: number;
  streakDays?: number;
  dailyStreak?: number;
  heartsRemaining?: number;
  currentTier?: number;
  tierAdvanced?: boolean;
  earnedBadge?: { id: string; name: string; description: string };
  earnedBadges?: Array<{ id: string; name: string; description: string; earnedAt?: string }>;
  message?: string;
  totalSpentSeconds?: number;
}

export interface DailyChallengeResponse {
  date: string;
  word: Word;
  completedToday: boolean;
  correctToday?: boolean;
}

export interface DailyChallengeResult {
  id: string;
  studentId?: string;
  date?: string;
  wordId?: string;
  correct: boolean;
  pointsAwarded?: number;
  streakDays?: number;
  dailyStreak?: number;
  heartsRemaining?: number;
  totalPoints?: number;
  currentTier?: number;
  earnedBadge?: Badge;
}

export interface Badge {
  id: string;
  code?: string;
  name: string;
  description: string;
  earnedAt?: string;
  unlockedAt?: string;
  icon?: string;
}

export interface LeaderboardEntry {
  id?: string;
  studentId?: string;
  name: string;
  tier?: number;
  points: number;
  // Days-long streak shown on rank cards. Older payloads only carry `streak`.
  streak: number;
  dailyStreak?: number;
  streakDays?: number;
  className?: string;
}

export interface StudentPreferences {
  darkMode: boolean;
  textSize: 'normal' | 'large' | 'xlarge';
}

export interface AccountPreferences {
  darkMode?: boolean;
  dyslexiaFont?: boolean;
  textSize?: 'normal' | 'large' | 'xlarge';
}

export interface AdminAccount {
  id: string;
  email: string;
  name?: string | null;
  role: 'parent' | 'teacher' | 'admin';
  approvedAt?: string | null;
  /** Set while an in-app forgot-password request is waiting for the admin. */
  passwordResetRequestedAt?: string | null;
  createdAt?: string;
  studentCount: number;
  classrooms?: Array<{ id: string; name: string; grade?: string | null }>;
}

export interface Classroom {
  id: string;
  name: string;
  grade?: string | null;
  teacherId?: string;
  teacherName?: string | null;
  studentCount: number;
}
