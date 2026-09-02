import React, { useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BeeMascot from './BeeMascot';
import TopStatBar from './common/TopStatBar';
import {
  Home,
  Map,
  Calendar,
  Trophy,
  Award,
  User,
  Settings,
  LogOut,
  Users,
  School,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';

export default function Navbar() {
  const { activeStudent, students, selectStudent, logout, isAuthenticated, account, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profileError, setProfileError] = useState('');
  const profileImageInput = useRef<HTMLInputElement>(null);

  const isSupervisor = account?.role === 'teacher' || account?.role === 'parent';
  const isAdmin = account?.role === 'admin';
  const displayName = account?.name || activeStudent?.name || 'Profile';
  const displayAvatar = account?.avatarUrl || activeStudent?.avatarUrl;

  const changeProfilePicture = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 1_000_000) {
      setProfileError('Choose an image smaller than 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      void updateProfile({ avatarUrl: String(reader.result) })
        .then(() => setProfileError(''))
        .catch((error: Error) => setProfileError(error.message));
    };
    reader.readAsDataURL(file);
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-xs select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2 sm:py-0 sm:min-h-16">
          {/* Brand Logo */}
          <NavLink
            to={isAuthenticated ? '/home' : '/'}
            className="flex items-center gap-2.5 group"
          >
            <BeeMascot size="sm" />
<div>
                <span className="font-bold text-base tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  Spelling Bee
                </span>
                <p className="text-[10px] text-slate-400 hidden sm:block font-normal">
                  Gamified Spoken Learning Trail
                </p>
              </div>
          </NavLink>

          {/* Desktop Links */}
          {isAuthenticated && (
            <nav className="hidden lg:flex items-center gap-1">
              <NavLink
                to="/home"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-amber-400 border border-slate-700/80'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`
                }
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </NavLink>

              <NavLink
                to="/trail"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-amber-400 border border-slate-700/80'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`
                }
              >
                <Map className="w-3.5 h-3.5" />
                <span>Trail Map</span>
              </NavLink>

              <NavLink
                to="/daily-challenge"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-amber-400 border border-slate-700/80'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`
                }
              >
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Daily</span>
              </NavLink>

              <NavLink
                to="/leaderboard"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-amber-400 border border-slate-700/80'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`
                }
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Leaderboard</span>
              </NavLink>

              <NavLink
                to="/badges"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-amber-400 border border-slate-700/80'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`
                }
              >
                <Award className="w-3.5 h-3.5" />
                <span>Badges</span>
              </NavLink>
              {isSupervisor && (
                <NavLink
                  to="/supervisor"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      isActive
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-amber-400 bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/60'
                    }`
                  }
                >
                  <School className="w-3.5 h-3.5" />
                  <span>Supervisor Portal</span>
                </NavLink>
              )}
              {isAdmin && (
                <NavLink to="/admin" className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isActive ? 'bg-amber-500 text-slate-950' : 'text-amber-400 bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/60'}`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </NavLink>
              )}
            </nav>
          )}

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated && activeStudent && (
              <TopStatBar
                hearts={activeStudent.hearts ?? 3}
                streak={activeStudent.streak ?? 0}
                points={activeStudent.points ?? 0}
                tier={activeStudent.currentTier ?? 1}
              />
            )}

            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 overflow-hidden rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center uppercase">
                    {displayAvatar ? <img src={displayAvatar} alt="Profile" className="h-full w-full object-cover" /> : displayName.charAt(0)}
                  </div>
                  <span className="hidden sm:inline text-xs font-semibold text-white max-w-[90px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-lg py-2 z-50 divide-y divide-slate-800">
                    <div className="px-3 py-2">
                      <div className="mb-3 flex items-center gap-2 rounded-lg bg-slate-800 p-2">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-amber-500 text-sm font-bold text-slate-950 flex items-center justify-center">
                          {displayAvatar ? <img src={displayAvatar} alt="Profile" className="h-full w-full object-cover" /> : displayName.charAt(0)}
                        </div>
                        <div className="min-w-0"><p className="truncate text-xs font-bold text-white">{displayName}</p><button type="button" onClick={() => profileImageInput.current?.click()} className="mt-0.5 text-[10px] font-semibold text-amber-400 hover:underline">Change profile picture</button></div>
                        <input ref={profileImageInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => changeProfilePicture(event.target.files?.[0])} />
                      </div>
                      {profileError ? <p className="mb-2 text-[10px] text-rose-300">{profileError}</p> : null}
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Switch Learner Profile
                      </p>
                      <div className="mt-1.5 space-y-1 max-h-40 overflow-y-auto">
                        {students.map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => {
                              selectStudent(st);
                              setShowProfileMenu(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                              activeStudent?.id === st.id
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : 'text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <span className="truncate">{st.name}</span>
                            <span className="text-[10px] opacity-80">
                              Tier {st.currentTier || 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-1 space-y-0.5">
                      {isSupervisor && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowProfileMenu(false);
                            navigate('/supervisor');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer font-bold"
                        >
                          <School className="w-3.5 h-3.5" />
                          <span>Supervisor Portal</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          navigate('/profiles');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Manage Profiles</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          navigate('/settings');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Settings</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          logout();
                          navigate('/login');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer font-bold"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                to="/login"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors"
              >
                Sign In
              </NavLink>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {isAuthenticated && (
        <nav className="lg:hidden flex items-center justify-around overflow-x-auto border-t border-slate-800 bg-slate-900 pt-2 pb-safe">
          <NavLink
            to="/home"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] font-bold shrink-0 ${
                isActive ? 'text-amber-400' : 'text-slate-400'
              }`
            }
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/trail"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] font-bold shrink-0 ${
                isActive ? 'text-amber-400' : 'text-slate-400'
              }`
            }
          >
            <Map className="w-4 h-4" />
            <span>Trail</span>
          </NavLink>

          <NavLink
            to="/daily-challenge"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] font-bold shrink-0 ${
                isActive ? 'text-amber-400' : 'text-slate-400'
              }`
            }
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Daily</span>
          </NavLink>

          <NavLink
            to="/leaderboard"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] font-bold shrink-0 ${
                isActive ? 'text-amber-400' : 'text-slate-400'
              }`
            }
          >
            <Trophy className="w-4 h-4" />
            <span>Ranks</span>
          </NavLink>
        </nav>
      )}
    </header>
  );
}
