// Skeleton for Learner Profile List
export function ProfileListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-3xl animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs flex flex-col items-center text-center space-y-4 dark:bg-navy-800 dark:border-navy-700"
        >
          <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-navy-700" />
          <div className="space-y-2 w-full flex flex-col items-center">
            <div className="h-4 bg-slate-200 rounded-md w-3/4 dark:bg-navy-700" />
            <div className="h-3 bg-slate-100 rounded-md w-1/2 dark:bg-navy-700" />
          </div>
          <div className="h-6 bg-slate-100 border border-slate-200/60 rounded-md w-2/3 dark:bg-navy-700 dark:border-navy-700" />
        </div>
      ))}
    </div>
  );
}

// Skeleton for Word Bank & Spelling Interaction Game View
export function WordBankSkeleton() {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6 max-w-2xl mx-auto animate-pulse dark:bg-navy-800 dark:border-navy-700">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-navy-700">
        <div className="h-10 bg-slate-200 rounded-xl w-36 dark:bg-navy-700" />
        <div className="flex gap-2">
          <div className="h-8 bg-slate-100 rounded-lg w-24 dark:bg-navy-700" />
          <div className="h-8 bg-slate-100 rounded-lg w-24 dark:bg-navy-700" />
        </div>
      </div>

      <div className="h-10 bg-slate-100 rounded-xl w-full dark:bg-navy-700" />

      <div className="py-6 flex flex-col items-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-navy-700" />
        <div className="h-3 bg-slate-200 rounded-md w-48 dark:bg-navy-700" />
      </div>

      <div className="space-y-2">
        <div className="h-3 bg-slate-100 rounded-md w-28 mx-auto dark:bg-navy-700" />
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="w-9 h-10 bg-slate-200 rounded-lg dark:bg-navy-700" />
          ))}
        </div>
      </div>

      <div className="h-12 bg-slate-200 rounded-xl w-full mt-4 dark:bg-navy-700" />
    </div>
  );
}

// Skeleton for Leaderboard Table
export function LeaderboardSkeleton() {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3 animate-pulse dark:bg-navy-800 dark:border-navy-700">
      <div className="h-4 bg-slate-100 rounded-md w-full mb-4 dark:bg-navy-700" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="grid grid-cols-12 gap-2 items-center px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl dark:bg-navy-900 dark:border-navy-700"
        >
          <div className="col-span-2">
            <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-navy-700" />
          </div>
          <div className="col-span-5 space-y-1">
            <div className="h-4 bg-slate-200 rounded-md w-3/4 dark:bg-navy-700" />
          </div>
          <div className="col-span-2 text-center">
            <div className="h-5 bg-slate-200 rounded-md w-12 mx-auto dark:bg-navy-700" />
          </div>
          <div className="col-span-3 text-right">
            <div className="h-4 bg-slate-200 rounded-md w-16 ml-auto dark:bg-navy-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton for Badges Grid
export function BadgesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col items-center text-center space-y-3 dark:bg-navy-800 dark:border-navy-700"
        >
          <div className="w-16 h-16 bg-slate-200 rounded-2xl dark:bg-navy-700" />
          <div className="h-4 bg-slate-200 rounded-md w-3/4 dark:bg-navy-700" />
          <div className="h-3 bg-slate-100 rounded-md w-full dark:bg-navy-700" />
          <div className="h-5 bg-slate-100 rounded-md w-20 mt-2 dark:bg-navy-700" />
        </div>
      ))}
    </div>
  );
}
