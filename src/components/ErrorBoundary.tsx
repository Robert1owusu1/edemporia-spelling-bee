import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Last line of defence for the routed app: a render crash in any lazy page
 * would otherwise blank the whole screen with no way back. Keeps a friendly
 * fallback with a reload button instead.
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Surfacing the failure helps students/teachers report what broke.
    console.error('Unhandled render error:', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    // Full navigation (not router `navigate`): the app state may be the thing
    // that crashed, so start from a clean load.
    window.location.assign('/home');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-navy-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-2xl p-8 shadow-sm text-center space-y-5">
          <div className="text-4xl">🐝</div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Something went wrong</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Don't worry — your progress is saved. Reloading the page usually fixes it.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="flex-1 min-tap bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Reload the app
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="flex-1 min-tap bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-navy-700 font-semibold text-xs py-3 px-5 rounded-xl transition-colors cursor-pointer"
            >
              Go to home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
