import { Target, Zap } from 'lucide-react';

interface GoalsTabProps {
  classGoalText: string;
  goalEditing: boolean;
  onGoalTextChange: (value: string) => void;
  onToggleEditing: () => void;
}

// TAB 4: CLASSROOM TARGETS & GOALS
export default function GoalsTab({ classGoalText, goalEditing, onGoalTextChange, onToggleEditing }: GoalsTabProps) {
  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-500" />
            Active Classroom Spelling Target
          </h2>
          <button
            type="button"
            onClick={onToggleEditing}
            className="text-xs font-bold text-amber-600 hover:underline cursor-pointer"
          >
            {goalEditing ? 'Done Editing' : 'Edit Goal'}
          </button>
        </div>

        {goalEditing ? (
          <>
            <label className="sr-only" htmlFor="class-goal-text">
              Class spelling target
            </label>
            <textarea
              id="class-goal-text"
              value={classGoalText}
              onChange={(e) => onGoalTextChange(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 dark:bg-navy-700 border border-slate-300 dark:border-navy-600 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-950 dark:text-amber-300 p-4 rounded-xl text-xs font-bold flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-500 shrink-0" />
            <span>"{classGoalText}"</span>
          </div>
        )}
      </div>
    </div>
  );
}
