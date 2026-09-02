import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { lazy, Suspense, useEffect, useCallback } from 'react';
import { audioFx } from './utils/audioEffects';

// Preload route chunks on hover/focus for faster navigation
const preloadRoute = (importFn: () => Promise<any>) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    requestIdleCallback(() => importFn());
  } else {
    setTimeout(() => importFn(), 0);
  }
};

// Route-level code splitting: each page (and its heavy dependencies such as
// recharts) is only downloaded when the user actually navigates to it, which
// keeps the initial load on slow phone networks small.
const HeroLandingPage = lazy(() => import('./pages/HeroLandingPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const HomeDashboardPage = lazy(() => import('./pages/HomeDashboardPage'));
const ProfilePickerPage = lazy(() => import('./pages/ProfilePickerPage'));
const PlacementQuizPage = lazy(() => import('./pages/PlacementQuizPage'));
const TrailMapPage = lazy(() => import('./pages/TrailMapPage'));
const GameLoopPage = lazy(() => import('./pages/GameLoopPage'));
const RoundResultPage = lazy(() => import('./pages/RoundResultPage'));
const DailyChallengePage = lazy(() => import('./pages/DailyChallengePage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const BadgesPage = lazy(() => import('./pages/BadgesPage'));
const SupervisorDashboardPage = lazy(() => import('./pages/SupervisorDashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AccountRecoveryPage = lazy(() => import('./pages/AccountRecoveryPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminOverviewPage = lazy(() => import('./pages/admin/AdminOverviewPage'));
const AdminAccountsPage = lazy(() => import('./pages/admin/AdminAccountsPage'));
const AdminClassesPage = lazy(() => import('./pages/admin/AdminClassesPage'));
const WordBankAdminPage = lazy(() => import('./pages/admin/WordBankAdminPage'));
const LeaderboardAdminPage = lazy(() => import('./pages/admin/LeaderboardAdminPage'));
const ProtectedRoute = lazy(() => import('./components/auth/ProtectedRoute'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));

// Better Suspense fallback with loading indicator
function RouteFallback() {
  return (
    <div className="flex min-h-[400px] items-center justify-center bg-slate-50 dark:bg-navy-900">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-3 border-slate-200 dark:border-navy-700 rounded-full"></div>
          <div className="absolute inset-0 border-3 border-amber-400 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading page…</p>
      </div>
    </div>
  );
}

export default function App() {
  // Initialize audio on first user interaction
  useEffect(() => {
    const initAudioOnInteraction = () => {
      audioFx.init();
      // Optional: Play a subtle click to confirm audio works
      if (audioFx.isAvailable()) {
        console.log('🎵 Audio initialized successfully');
        // Remove listener after first successful init
        document.removeEventListener('click', initAudioOnInteraction);
        document.removeEventListener('touchstart', initAudioOnInteraction);
        document.removeEventListener('keydown', initAudioOnInteraction);
      }
    };

    // Listen for any user interaction
    document.addEventListener('click', initAudioOnInteraction);
    document.addEventListener('touchstart', initAudioOnInteraction);
    document.addEventListener('keydown', initAudioOnInteraction);

    return () => {
      document.removeEventListener('click', initAudioOnInteraction);
      document.removeEventListener('touchstart', initAudioOnInteraction);
      document.removeEventListener('keydown', initAudioOnInteraction);
    };
  }, []);

  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public Entry Points */}
            <Route path="/" element={<HeroLandingPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/reset-password" element={<AccountRecoveryPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Authenticated Learning Routes */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomeDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profiles"
              element={
                <ProtectedRoute>
                  <ProfilePickerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/placement-quiz"
              element={
                <ProtectedRoute>
                  <PlacementQuizPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trail"
              element={
                <ProtectedRoute>
                  <TrailMapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/game"
              element={
                <ProtectedRoute>
                  <GameLoopPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/round-result"
              element={
                <ProtectedRoute>
                  <RoundResultPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/daily-challenge"
              element={
                <ProtectedRoute>
                  <DailyChallengePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <LeaderboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/badges"
              element={
                <ProtectedRoute>
                  <BadgesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/supervisor"
              element={
                <ProtectedRoute requireSupervisor>
                  <SupervisorDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/learning-hub" element={<Navigate to="/supervisor" replace />} />
            <Route path="/teacher-hub" element={<Navigate to="/supervisor" replace />} />
            <Route path="/challenges" element={<Navigate to="/supervisor" replace />} />

            <Route
              path="/admin"
              element={
              <ProtectedRoute roles={['admin']}>
                <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminOverviewPage />} />
              <Route path="accounts" element={<AdminAccountsPage />} />
              <Route path="classes" element={<AdminClassesPage />} />
              <Route path="words" element={<WordBankAdminPage />} />
              <Route path="leaderboard" element={<LeaderboardAdminPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}
