import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BeeMascot from '../components/game/BeeMascot';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CreateStudentForm from '../components/dashboard/CreateStudentForm';
import { ProfileListSkeleton } from '../components/common/Skeletons';
import { Plus } from 'lucide-react';
import { Student } from '../api/types';

export default function ProfilePickerPage() {
  const navigate = useNavigate();
  const { account, students, selectStudent, isLoading } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const isStudentSession = account?.role === 'student';

  const handleSelectStudent = (student: Student) => {
    selectStudent(student);
    if (!student.currentTier) {
      navigate('/placement-quiz');
    } else {
      navigate('/home');
    }
  };

  const handleCreatedSuccess = (newStudent: Student) => {
    selectStudent(newStudent);
    setShowCreateForm(false);
    navigate('/placement-quiz');
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans text-slate-900 antialiased dark:bg-navy-900 dark:text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 flex flex-col justify-center items-center">
        <div className="text-center space-y-2 mb-8">
          <BeeMascot size="lg" className="mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Who is spelling today?</h1>
          <p className="text-xs text-slate-500 font-normal dark:text-slate-400">Select a learner profile or create a new one</p>
        </div>

        {/* Loading Skeleton vs Profiles Grid */}
        {isLoading ? (
          <ProfileListSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-3xl mb-8">
            {students.map((st) => (
              <div
                key={st.id}
                onClick={() => handleSelectStudent(st)}
                className="bg-white border border-slate-200/80 hover:border-amber-400 p-6 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center space-y-3 group dark:bg-navy-800 dark:border-navy-700"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl group-hover:scale-105 transition-transform shadow-xs"
                  style={{ backgroundColor: st.avatarColor || '#F59E0B' }}
                >
                  {st.name ? st.name.charAt(0).toUpperCase() : 'S'}
                </div>

                <div>
                  <h3 className="font-bold text-base text-slate-900 group-hover:text-amber-600 transition-colors dark:text-slate-100">
                    {st.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-normal mt-0.5 dark:text-slate-400">
                    {st.className || 'Student'} • Age {st.age || 8}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-md border border-slate-200/60 dark:text-slate-300 dark:bg-navy-700 dark:border-navy-600">
                  <span>Tier {st.currentTier || 1}</span>
                  <span>•</span>
                  <span>⭐ {st.points || 0} pts</span>
                </div>
              </div>
            ))}

            {/* Add Profile Card */}
            {isStudentSession ? (
              <div className="bg-white/50 border border-dashed border-slate-300 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 min-h-[180px] shadow-xs dark:bg-navy-800/50 dark:border-navy-600">
                <p className="font-bold text-xs text-slate-700 uppercase tracking-wider dark:text-slate-300">
                  Your profile is managed by your parent or teacher
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Student accounts learn and play only — ask your parent or teacher to update your details.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="bg-white/50 border border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50/40 p-6 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-2 min-h-[180px] group shadow-xs dark:bg-navy-800/50 dark:border-navy-600 dark:hover:bg-amber-500/10"
              >
                <div className="w-10 h-10 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform dark:bg-navy-700">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider dark:text-slate-200">
                  Add New Learner
                </span>
              </button>
            )}
          </div>
        )}

        {/* Create Profile Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in dark:bg-black/80">
            <CreateStudentForm
              onSuccess={handleCreatedSuccess}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
