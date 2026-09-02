// Central Component Exporter by Feature Architecture (common, game, dashboard)

// Common UI Components
export { default as Navbar } from './Navbar';
export { default as Footer } from './Footer';
export { default as HexagonBadge } from './common/HexagonBadge';
export { default as TopStatBar } from './common/TopStatBar';
export * from './common/Skeletons';
export { default as ProtectedRoute } from './auth/ProtectedRoute';

// Game Core Components
export { default as BeeMascot } from './game/BeeMascot';
export { default as SpellingInteraction } from './SpellingInteraction';
export { default as SuccessStarOverlay } from './SuccessStarOverlay';
export * from './VoiceSpellingParser';

// Dashboard & Supervisor Components
export { default as SupervisorAnalytics } from './dashboard/SupervisorAnalytics';
export { default as CreateStudentForm } from './dashboard/CreateStudentForm';
export { default as StudentDetailModal } from './supervisor/StudentDetailModal';
export { default as CurriculumPreviewTab } from './supervisor/CurriculumPreviewTab';
