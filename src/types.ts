export type DemoState = 'onboarding' | 'idle' | 'listening' | 'success' | 'intro' | 'about' | 'login' | 'signup' | 'profile-selector' | 'placement-quiz' | 'quiz-result' | 'learning-path' | 'game-screen' | 'game-result' | 'daily-challenge' | 'async-battle' | 'battle-result' | 'leaderboard' | 'achievements' | 'settings' | 'widget';

export interface Student {
  id: string;
  name: string;
  age: string;
  className: string;
  avatarSeed?: string; // Optional avatar choice
  stars?: number;
  streak?: number;
  accuracy?: number;
}

export interface SpellingWord {
  word: string;
  spelled: string;
  phonetic: string;
  definition: string;
  wordOverride?: string;
}

export const SAMPLE_WORDS: SpellingWord[] = [
  { word: 'bee', spelled: 'B - E - E', phonetic: '/biː/', definition: 'A stinging winged insect which collects nectar and pollen.' },
  { word: 'amber', spelled: 'A - M - B - E - R', phonetic: '/ˈæm.bər/', definition: 'A honey-yellow color, or fossilized tree resin.' },
  { word: 'wisdom', spelled: 'W - I - S - D - O - M', phonetic: '/ˈwɪz.dəm/', definition: 'The quality of having experience, knowledge, and good judgment.' },
  { word: 'stellar', spelled: 'S - T - E - L - L - A - R', phonetic: '/ˈstɛl.ər/', definition: 'Featuring or having the quality of a star.' }
];
