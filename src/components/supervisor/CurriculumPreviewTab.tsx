import React, { useEffect, useState } from 'react';
import { Word } from '../../api/types';
import { apiClient } from '../../api/client';
import { speakWord } from '../VoiceSpellingParser';
import { audioFx } from '../../utils/audioEffects';
import { useAudioInit } from '../../hooks/useAudioInit';
import { BookOpen, Volume2, Search, Loader, AlertCircle, GraduationCap, Trophy, Target, Sparkles } from 'lucide-react';

interface TierInfo {
  tier: number;
  label: string;
  grade: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export default function CurriculumPreviewTab() {
  const [selectedTier, setSelectedTier] = useState<number>(1);
  const [searchFilter, setSearchFilter] = useState('');
  const [wordsByTier, setWordsByTier] = useState<Record<number, Word[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bumping this drops the cached tier and refetches it (the Retry button).
  const [reloadToken, setReloadToken] = useState(0);
  const audioReady = useAudioInit();

  // Load the selected tier on demand instead of fetching all six up front:
  // a single failed request now surfaces as a real error state (with Retry)
  // rather than being swallowed into an empty word list.
  useEffect(() => {
    if (wordsByTier[selectedTier]) return;
    const controller = new AbortController();
    let cancelled = false;

    const loadTier = async () => {
      setLoading(true);
      setError(null);
      try {
        const words = await apiClient.getWordsByTier(selectedTier, undefined, { signal: controller.signal });
        if (!cancelled) setWordsByTier((prev) => ({ ...prev, [selectedTier]: words }));
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load curriculum words.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadTier();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // `wordsByTier` is only read for the cache guard; the state update that
    // fills the cache is what ends the loop.
  }, [selectedTier, reloadToken, wordsByTier]);

  // Tier configuration - Updated to be consistent across all tiers
  const tiers: TierInfo[] = [
    {
      tier: 1,
      label: 'Tier 1',
      grade: 'Grades K-1',
      description: 'Foundational words - simple 3-5 letter words with basic phonetic patterns',
      icon: <Target className="w-4 h-4" />,
      color: 'bg-green-500',
    },
    {
      tier: 2,
      label: 'Tier 2',
      grade: 'Grades 1-2',
      description: 'Common early learning words with regular spelling patterns',
      icon: <GraduationCap className="w-4 h-4" />,
      color: 'bg-blue-500',
    },
    {
      tier: 3,
      label: 'Tier 3',
      grade: 'Grades 2-3',
      description: 'Grade-level vocabulary with more complex patterns',
      icon: <BookOpen className="w-4 h-4" />,
      color: 'bg-purple-500',
    },
    {
      tier: 4,
      label: 'Tier 4',
      grade: 'Grades 3-4',
      description: 'Intermediate vocabulary with challenging spelling rules',
      icon: <Trophy className="w-4 h-4" />,
      color: 'bg-indigo-500',
    },
    {
      tier: 5,
      label: 'Tier 5',
      grade: 'Grades 4-5',
      description: 'Advanced vocabulary with complex structures and Greek/Latin roots',
      icon: <Sparkles className="w-4 h-4" />,
      color: 'bg-amber-500',
    },
    {
      tier: 6,
      label: 'Tier 6',
      grade: 'Grades 5-6',
      description: 'Challenging middle school vocabulary with advanced etymology',
      icon: <Target className="w-4 h-4" />,
      color: 'bg-rose-500',
    },
  ];

  const currentWords = wordsByTier[selectedTier] || [];
  const filteredWords = currentWords.filter(
    (w) =>
      w.text.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (w.category && w.category.toLowerCase().includes(searchFilter.toLowerCase())) ||
      w.definition.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  const handlePlayAudio = (text: string) => {
    audioFx.playClick();
    speakWord(text, 0.85);
  };

  const handleRetry = () => {
    // Drop the failed tier from the cache so the effect refetches it.
    setWordsByTier((prev) => {
      const next = { ...prev };
      delete next[selectedTier];
      return next;
    });
    setReloadToken((token) => token + 1);
  };

  const currentTierInfo = tiers.find((t) => t.tier === selectedTier);

  return (
    <div className="space-y-6">
      {/* Tier Selector Navigation */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3 dark:bg-navy-800 dark:border-navy-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 dark:text-slate-300">
            <BookOpen className="w-4 h-4 text-amber-500" /> Select Curriculum Tier to Preview:
          </span>
          <span className="text-xs text-slate-500 font-medium dark:text-slate-400">
            Tier {selectedTier} ({currentWords.length} Words)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {tiers.map((item) => (
            <button
              key={item.tier}
              type="button"
              onClick={() => {
                audioFx.playClick();
                setSelectedTier(item.tier);
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedTier === item.tier
                  ? 'bg-slate-900 border-slate-900 text-amber-400 shadow-sm dark:bg-navy-700 dark:border-navy-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-navy-900 dark:border-navy-700 dark:text-slate-300 dark:hover:bg-navy-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {item.icon}
                <div className="text-xs font-black">{item.label}</div>
              </div>
              <div
                className={`text-[10px] font-semibold ${
                  selectedTier === item.tier ? 'text-amber-300' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {item.grade}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 line-clamp-1 dark:text-slate-500">
                {item.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Curriculum Highlight Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 text-amber-800 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3 dark:from-amber-500/10 dark:to-yellow-500/10 dark:border-amber-500/30 dark:text-amber-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-amber-950 flex items-center justify-center shrink-0 font-black text-lg shadow-xs">
            📚
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {currentTierInfo?.label}: {currentTierInfo?.grade}
            </h2>
            <p className="text-xs text-slate-600 font-normal dark:text-slate-400">
              {currentTierInfo?.description} • {currentWords.length} words in this tier
            </p>
          </div>
        </div>
      </div>

      {/* Search & Word Cards List */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-3 dark:text-slate-500"
            aria-hidden="true"
            focusable="false"
          />
          <label className="sr-only" htmlFor="curriculum-word-search">
            Search word, definition, or category
          </label>
          <input
            id="curriculum-word-search"
            type="text"
            placeholder="Search word, definition, or category..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-xs dark:bg-navy-800 dark:border-navy-700 dark:text-slate-100"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200/80 rounded-2xl dark:bg-navy-800 dark:border-navy-700">
            <Loader className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Loading curriculum words...</p>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center py-16 bg-white border border-rose-200 rounded-2xl dark:bg-navy-800 dark:border-rose-500/30"
          >
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="mt-4 text-sm text-red-600 dark:text-rose-300">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-600 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center dark:bg-navy-800 dark:border-navy-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {searchFilter ? 'No words match your search.' : 'No words available in this tier yet.'}
            </p>
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="mt-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredWords.map((w) => (
              <div
                key={w.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-2 hover:border-amber-400 hover:shadow-md transition-all dark:bg-navy-800 dark:border-navy-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-slate-900 dark:text-slate-100">{w.text}</span>
                    <button
                      type="button"
                      onClick={() => handlePlayAudio(w.text)}
                      className="p-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                      title="Listen to pronunciation"
                      aria-label={`Listen to ${w.text}`}
                      disabled={!audioReady}
                    >
                      <Volume2 className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
                    </button>
                  </div>

                  <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md dark:bg-navy-700 dark:border-navy-700 dark:text-slate-300">
                    {w.category || 'Vocabulary'}
                  </span>
                </div>

                <div className="text-xs text-slate-700 space-y-1 dark:text-slate-300">
                  <p>
                    <strong className="text-slate-900 dark:text-slate-100">Definition:</strong> {w.definition}
                  </p>
                  <p className="italic text-slate-500 dark:text-slate-400">
                    "<span className="text-slate-700 font-medium dark:text-slate-300">{w.exampleSentence}</span>"
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
