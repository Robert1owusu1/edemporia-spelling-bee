import { useState } from 'react';
import { Student } from '../../api/types';
import { apiClient } from '../../api/client';
import BeeMascot from '../BeeMascot';
import { User, GraduationCap, Calendar, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

interface CreateStudentFormProps {
  onSuccess: (newStudent: Student) => void;
  onCancel?: () => void;
  assignedClasses?: string[];
}

export default function CreateStudentForm({ onSuccess, onCancel, assignedClasses }: CreateStudentFormProps) {
  const isTeacher = Array.isArray(assignedClasses);
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>(8);
  const [classNameInput, setClassNameInput] = useState(isTeacher ? assignedClasses?.[0] || '' : 'Grade 3');
  const [selectedTier, setSelectedTier] = useState(1);

  // Validation States
  const [errors, setErrors] = useState<{ name?: string; age?: string; className?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: { name?: string; age?: string; className?: string } = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Student name is required.';
    } else if (trimmedName.length < 2) {
      newErrors.name = 'Name must be at least 2 characters.';
    }

    if (age === '' || isNaN(Number(age))) {
      newErrors.age = 'Please enter a valid age.';
    } else if (Number(age) < 4 || Number(age) > 18) {
      newErrors.age = 'Age must be between 4 and 18 years.';
    }

    const trimmedClass = classNameInput.trim();
    if (!trimmedClass) {
      newErrors.className = 'Class or grade is required.';
    } else if (trimmedClass.length < 2) {
      newErrors.className = 'Class must be at least 2 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        name: name.trim(),
        age: Number(age),
        className: classNameInput.trim(),
        currentTier: selectedTier,
      };

      onSuccess(await apiClient.createStudent(payload));
    } catch (err) {
      setErrors({
        general: (err instanceof Error && err.message) || 'Failed to create student profile. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow max-w-md w-full space-y-6 dark:bg-navy-800 dark:border-navy-700">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-amber-50 border border-amber-200/60 shadow-xs mb-1 dark:bg-amber-500/10 dark:border-amber-500/30">
          <BeeMascot variant="emoji" size="md" className="mx-auto" />
        </div>
        <h2
          id="create-student-form-title"
          className="text-xl font-extrabold text-slate-900 tracking-tight dark:text-slate-100"
        >
          Create Student Profile
        </h2>
        <p className="text-xs text-slate-500 font-normal dark:text-slate-400">
          Add a new young speller to start their personalized learning trail
        </p>
      </div>

      {errors.general && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2.5 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" focusable="false" />
          <span>{errors.general}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="create-student-name"
            className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 dark:text-slate-300"
          >
            Student Full Name
          </label>
          <div className="relative">
            <User
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 dark:text-slate-500"
              aria-hidden="true"
              focusable="false"
            />
            <input
              id="create-student-name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="e.g. Alex Rivera"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'create-student-name-error' : undefined}
              className={`w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-medium placeholder-slate-400 outline-none transition-all dark:bg-navy-900 dark:text-slate-100 dark:placeholder-slate-500 ${
                errors.name
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-navy-700 dark:focus:bg-navy-800'
              }`}
            />
          </div>
          {errors.name && (
            <p id="create-student-name-error" className="text-[11px] text-rose-600 font-medium mt-1">
              {errors.name}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="create-student-age"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 dark:text-slate-300"
            >
              Age (Years)
            </label>
            <div className="relative">
              <Calendar
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 dark:text-slate-500"
                aria-hidden="true"
                focusable="false"
              />
              <input
                id="create-student-age"
                type="number"
                required
                min={4}
                max={18}
                value={age}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  setAge(val);
                  if (typeof val === 'number') {
                    if (val >= 15) {
                      setSelectedTier(6);
                    } else if (val >= 12) {
                      setSelectedTier(5);
                    } else if (val >= 10) {
                      setSelectedTier(4);
                    }
                  }
                  if (errors.age) setErrors((prev) => ({ ...prev, age: undefined }));
                }}
                placeholder="8"
                aria-invalid={errors.age ? true : undefined}
                aria-describedby={errors.age ? 'create-student-age-error' : undefined}
                className={`w-full bg-slate-50 border rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 font-medium outline-none transition-all dark:bg-navy-900 dark:text-slate-100 ${
                  errors.age
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-navy-700 dark:focus:bg-navy-800'
                }`}
              />
            </div>
            {errors.age && (
              <p id="create-student-age-error" className="text-[11px] text-rose-600 font-medium mt-1">
                {errors.age}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="create-student-class"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 dark:text-slate-300"
            >
              Class / Grade
            </label>
            <div className="relative">
              <GraduationCap
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 dark:text-slate-500"
                aria-hidden="true"
                focusable="false"
              />
              {isTeacher ? (
                <select
                  id="create-student-class"
                  required
                  value={classNameInput}
                  onChange={(e) => {
                    setClassNameInput(e.target.value);
                    if (errors.className) setErrors((prev) => ({ ...prev, className: undefined }));
                  }}
                  aria-invalid={errors.className ? true : undefined}
                  aria-describedby={errors.className ? 'create-student-class-error' : undefined}
                  className={`w-full bg-slate-50 border rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 font-medium outline-none transition-all dark:bg-navy-900 dark:text-slate-100 ${
                    errors.className
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-navy-700 dark:focus:bg-navy-800'
                  }`}
                >
                  {assignedClasses?.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="create-student-class"
                  type="text"
                  required
                  value={classNameInput}
                  onChange={(e) => {
                    setClassNameInput(e.target.value);
                    if (errors.className) setErrors((prev) => ({ ...prev, className: undefined }));
                  }}
                  placeholder="Grade 3"
                  aria-invalid={errors.className ? true : undefined}
                  aria-describedby={errors.className ? 'create-student-class-error' : undefined}
                  className={`w-full bg-slate-50 border rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 font-medium outline-none transition-all dark:bg-navy-900 dark:text-slate-100 ${
                    errors.className
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-navy-700 dark:focus:bg-navy-800'
                  }`}
                />
              )}
            </div>
            {errors.className && (
              <p id="create-student-class-error" className="text-[11px] text-rose-600 font-medium mt-1">
                {errors.className}
              </p>
            )}
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              {isTeacher
                ? 'Your assigned classroom is fixed by the school administrator.'
                : 'For a teacher roster, enter the classroom name supplied by the teacher.'}
            </p>
          </div>
        </div>

        {Number(age) >= 10 && (
          <div className="bg-slate-900 text-amber-300 border border-slate-800 p-3.5 rounded-xl text-[11px] font-bold space-y-1.5 shadow-xs dark:bg-navy-700 dark:border-navy-700">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" focusable="false" />
              <span>Age 10+ Explorer Mode Unlocked! 🐝</span>
            </div>
            <p className="text-[10px] text-slate-300 font-normal leading-relaxed">
              Learners age 10+ enjoy longer, richer vocabularies: journey, discovery, atmosphere, perseverance and
              magnificent champion-level words.
            </p>
          </div>
        )}

        <div>
          {/* A radio-style group of toggles: the legend is the group's name,
              and each button exposes whether it is the chosen tier. */}
          <div
            id="create-student-tier-label"
            className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 dark:text-slate-300"
          >
            Initial Difficulty Tier
          </div>
          <div
            role="group"
            aria-labelledby="create-student-tier-label"
            className="grid grid-cols-2 sm:grid-cols-3 gap-2"
          >
            {[
              { tier: 1, label: 'Tier 1', desc: 'Grades K-1' },
              { tier: 2, label: 'Tier 2', desc: 'Grades 2-3' },
              { tier: 3, label: 'Tier 3', desc: 'Grades 4-5' },
              { tier: 4, label: 'Tier 4', desc: 'Word Explorer' },
              { tier: 5, label: 'Tier 5', desc: 'Story Seeker' },
              { tier: 6, label: 'Tier 6', desc: 'Bee Champion' },
            ].map((item) => (
              <button
                key={item.tier}
                type="button"
                aria-pressed={selectedTier === item.tier}
                onClick={() => setSelectedTier(item.tier)}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  selectedTier === item.tier
                    ? 'border-amber-500 bg-amber-500 text-slate-950 font-extrabold shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100 dark:border-navy-700 dark:bg-navy-900/50 dark:text-slate-400 dark:hover:bg-navy-700'
                }`}
              >
                <div className="text-xs font-bold">{item.label}</div>
                <div className="text-[9px] opacity-80 font-normal">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3 flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-3 rounded-xl transition-colors cursor-pointer dark:bg-navy-700 dark:hover:bg-navy-600 dark:text-slate-300"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Save Student Profile</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
