import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Activity, BookOpen, LogOut, Menu, School, Trophy, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const items = [
  { to: '/admin', label: 'Overview', icon: Activity },
  { to: '/admin/accounts', label: 'Accounts', icon: Users },
  { to: '/admin/classes', label: 'Classes', icon: School },
  { to: '/admin/words', label: 'Word Bank', icon: BookOpen },
  { to: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="border-b border-slate-700 px-6 py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-400">Spelling Bee</p>
        <h1 className="mt-2 text-xl font-semibold">Staff Dashboard</h1>
        <p className="mt-2 text-sm text-slate-300">School accounts, classes, and word-bank oversight.</p>
      </div>
      <nav className="mt-6 space-y-2 px-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive ? 'bg-amber-500 text-[#0A1128]' : 'text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}

export default function AdminLayout() {
  const { account, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-navy-900 dark:text-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-72 border-r border-slate-200 bg-[#0A1128] text-slate-50 dark:border-navy-700">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 dark:bg-black/80"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-[#0A1128] text-slate-50 shadow-xl">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:ml-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 sm:px-6 py-3 shadow-sm dark:border-navy-700 dark:bg-navy-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                className="lg:hidden rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 cursor-pointer dark:border-navy-700 dark:text-slate-400 dark:hover:bg-navy-700"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Internal Tool</p>
                <h2 className="truncate text-lg font-semibold text-[#0A1128] dark:text-slate-100">Admin content workspace</h2>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden md:block rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-navy-700 dark:bg-navy-900 dark:text-slate-400">
                {account?.email || 'Signed in'}
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 cursor-pointer dark:border-navy-600 dark:text-slate-300 dark:hover:bg-navy-700"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
