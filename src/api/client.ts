import type {
  AccountPreferences,
  AdminAccount,
  AuthResponse,
  Badge,
  Classroom,
  DailyChallengeResponse,
  DailyChallengeResult,
  CsvImportResponse,
  CsvImportWord,
  LeaderboardEntry,
  RoundResultResponse,
  Student,
  StudentPreferences,
  SubmitRoundDto,
  Word,
} from './types';

const TOKEN_KEY = 'spelling_bee_token';
const ACCOUNT_KEY = 'spelling_bee_account';
const ACTIVE_STUDENT_KEY = 'spelling_bee_active_student_id';
const BASE_URL_KEY = 'spelling_bee_api_base_url';
let onUnauthorizedCallback: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorizedCallback = handler;
};

// Carries the HTTP status and parsed body so callers can react to specific
// failures (423 = out of hearts, 409 = already completed) instead of guessing
// from the message text.
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// Optional per-request extras. `signal` lets pages cancel in-flight fetches
// when they unmount; every request helper accepts it as a trailing argument so
// existing callers stay untouched.
export interface RequestOptions {
  signal?: AbortSignal;
}

const isAbortError = (err: unknown, signal?: AbortSignal | null) =>
  signal?.aborted === true || (err instanceof Error && err.name === 'AbortError');

// Resolve the host part of an API URL so we can tell whether an explicit
// override points at this machine (localhost/loopback) or somewhere else.
const hostnameOf = (raw: string | null | undefined): string => {
  if (!raw) return '';
  try {
    return new URL(raw).hostname;
  } catch {
    return '';
  }
};
const isLoopback = (hostname: string) => hostname === 'localhost' || hostname === '127.0.0.1';
const pageHost = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
const pageIsLocal = isLoopback(pageHost);

export const getStoredApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL;
  const stored = localStorage.getItem(BASE_URL_KEY);
  // Pick the strongest explicit override, but never point the browser at a
  // localhost/loopback API while the page itself was loaded from another host
  // (e.g. a phone opening the app served from a laptop's LAN address). In that
  // case fall through to the dynamically derived address below.
  const explicit = pageIsLocal
    ? stored || configured || null
    : stored && !isLoopback(hostnameOf(stored))
      ? stored
      : configured && !isLoopback(hostnameOf(configured))
        ? configured
        : null;
  // Otherwise assume the API runs next to the frontend: same host, port 4000.
  return explicit || `http://${pageHost}:4000`;
};
export const setStoredApiBaseUrl = (url: string) => {
  const trimmed = String(url || '')
    .trim()
    .replace(/\/+$/, '');
  // Only a real http(s) base is acceptable. Anything else (javascript:, a bare
  // path, no host at all) would be concatenated into every fetch() URL this app
  // issues, so reject it instead of silently saving it.
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Enter a full API URL starting with http:// or https://');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
    throw new Error('The API URL must start with http:// or https://');
  if (!parsed.hostname) throw new Error('The API URL is missing a host.');
  localStorage.setItem(BASE_URL_KEY, trimmed);
};
export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const setStoredToken = (token: string | null) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);
export const getStoredActiveStudentId = () => localStorage.getItem(ACTIVE_STUDENT_KEY);
export const setStoredActiveStudentId = (id: string | null) =>
  id ? localStorage.setItem(ACTIVE_STUDENT_KEY, id) : localStorage.removeItem(ACTIVE_STUDENT_KEY);
export const getStoredAccount = () => {
  try {
    const account = localStorage.getItem(ACCOUNT_KEY);
    return account ? JSON.parse(account) : null;
  } catch {
    return null;
  }
};
export const setStoredAccount = (account: unknown | null) =>
  account ? localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account)) : localStorage.removeItem(ACCOUNT_KEY);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  const token = getStoredToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${getStoredApiBaseUrl()}${path}`, { ...options, headers });
  } catch (err) {
    // An aborted request is not a network failure: rethrow the original error
    // so callers can silently ignore it instead of showing a bogus error state.
    if (isAbortError(err, options.signal)) throw err;
    // `cause` keeps the underlying TypeError available to debuggers while the
    // user-facing message stays actionable.
    throw new Error('Unable to reach the server. Check that the backend is running and the API URL is correct.', {
      cause: err,
    });
  }
  if (response.status === 401) {
    onUnauthorizedCallback?.();
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(body.error || 'The server could not complete that request.', response.status, body);
  return body as T;
}

export const apiClient = {
  // Auth methods
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  loginWithStudentCode: (studentCode: string) =>
    request<AuthResponse>('/auth/student-login', { method: 'POST', body: JSON.stringify({ studentCode }) }),
  signup: (email: string, password: string, role: 'parent' | 'teacher' = 'parent', name?: string) =>
    request<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, role, name }) }),
  // In-app forgot password: flags the account for the school administrator
  // (see the admin portal), who resets it to a default password there.
  requestPasswordReset: (email: string) =>
    request<{ message: string }>('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  // Self-service change from the dashboard. The returned token replaces the
  // stored one: the backend bumps tokenVersion, so every other session (and
  // the caller's old token) dies with the old password.
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string; token: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  updateMyProfile: (data: { name?: string; avatarUrl?: string }) =>
    request<AuthResponse['account']>('/users/me/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  getAccountPreferences: () => request<AccountPreferences>('/users/me/preferences'),
  updateAccountPreferences: (data: Partial<AccountPreferences>) =>
    request<AccountPreferences>('/users/me/preferences', { method: 'PATCH', body: JSON.stringify(data) }),

  // Student methods
  getStudents: (options?: RequestOptions) => request<Student[]>('/students', { signal: options?.signal }),
  createStudent: (data: { name: string; age: number; className: string; currentTier?: number }) =>
    request<Student>('/students', { method: 'POST', body: JSON.stringify(data) }),
  updateStudentTier: (studentId: string, currentTier: number) =>
    request<Student>(`/students/${studentId}`, { method: 'PATCH', body: JSON.stringify({ currentTier }) }),
  completeStudentPlacement: (studentId: string, tier: number) =>
    request<Student>(`/students/${studentId}/placement`, { method: 'POST', body: JSON.stringify({ tier }) }),
  updateStudentHearts: (studentId: string, hearts: number) =>
    request<Student>(`/students/${studentId}`, { method: 'PATCH', body: JSON.stringify({ hearts }) }),
  updateStudent: (studentId: string, data: Pick<Student, 'name' | 'age' | 'className'>) =>
    request<Student>(`/students/${studentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteStudent: (studentId: string) => request<void>(`/students/${studentId}`, { method: 'DELETE' }),

  // Word management methods
  getWords: () => request<Word[]>('/admin/words'),
  updateWord: (id: string, payload: Partial<Word>) =>
    request<Word>(`/admin/words/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteWord: (id: string) => request<void>(`/admin/words/${id}`, { method: 'DELETE' }),
  createWordFromDictionary: (text: string, tier: number, category?: string) =>
    request<Word>('/admin/words/from-dictionary', { method: 'POST', body: JSON.stringify({ text, tier, category }) }),
  importWordsFromCSV: async (words: CsvImportWord[]) => {
    return request<CsvImportResponse>('/admin/words/import-csv', {
      method: 'POST',
      body: JSON.stringify({ words }),
    });
  },

  // Game methods
  getWordsByTier: async (tier: number, studentId?: string, options?: RequestOptions) => {
    const data = await request<{ words: Word[] }>(
      `/wordlists/${tier}${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''}`,
      { signal: options?.signal },
    );
    return data.words;
  },
  getDailyChallenge: (studentId?: string, options?: RequestOptions) =>
    request<DailyChallengeResponse>(
      `/daily-challenge${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''}`,
      { signal: options?.signal },
    ),
  completeDailyChallenge: (studentId: string, wordId: string, spelling: string) =>
    request<DailyChallengeResult>('/daily-challenge/complete', {
      method: 'POST',
      body: JSON.stringify({ studentId, wordId, spelling }),
    }),
  submitRound: (data: SubmitRoundDto) =>
    request<RoundResultResponse>('/rounds', { method: 'POST', body: JSON.stringify(data) }),
  getStudentBadges: (studentId: string) => request<Badge[]>(`/students/${studentId}/badges`),
  getLeaderboard: (options?: RequestOptions) =>
    request<LeaderboardEntry[]>('/leaderboard', { signal: options?.signal }),

  // Preferences
  getStudentPreferences: (studentId: string) => request<StudentPreferences>(`/students/${studentId}/preferences`),
  updateStudentPreferences: (studentId: string, data: Partial<StudentPreferences>) =>
    request(`/students/${studentId}/preferences`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Classroom methods
  getClassrooms: (options?: RequestOptions) => request<Classroom[]>('/classrooms', { signal: options?.signal }),
  createClassroom: (name: string, grade?: string, teacherId?: string) =>
    request<Classroom>('/classrooms', { method: 'POST', body: JSON.stringify({ name, grade, teacherId }) }),
  updateClassroom: (id: string, data: { name?: string; grade?: string; teacherId?: string }) =>
    request<Classroom>(`/classrooms/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  assignStudentToClassroom: (classroomId: string, studentId: string) =>
    request<Student>(`/classrooms/${classroomId}/students`, { method: 'POST', body: JSON.stringify({ studentId }) }),

  // Admin account management
  getAdminAccounts: () => request<AdminAccount[]>('/admin/accounts'),
  createAdminAccount: (data: {
    email: string;
    password: string;
    name?: string;
    role: 'parent' | 'teacher';
    classroomIds?: string[];
  }) => request<AdminAccount>('/admin/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAdminAccount: (
    id: string,
    data: {
      name?: string;
      email?: string;
      password?: string;
      role?: 'parent' | 'teacher';
      approve?: boolean;
      classroomIds?: string[];
    },
  ) => request<AdminAccount>(`/admin/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAdminAccount: (id: string) => request<void>(`/admin/accounts/${id}`, { method: 'DELETE' }),
  // One-click fulfilment of an in-app forgot-password request: sets the
  // default password and returns it so the admin can relay it to the owner.
  resetAdminAccountPassword: (id: string) =>
    request<AdminAccount & { password: string }>(`/admin/accounts/${id}/reset-password`, { method: 'POST' }),
};
