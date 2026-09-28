import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStoredApiBaseUrl, setStoredApiBaseUrl } from '../api/client';
import { apiClient } from '../api/client';
import { useAuth } from './AuthContext';

// Spelling is voice-only by design: learners speak letters aloud and the app
// parses them. The typing input mode was removed, so there is a single mode.
export type TextSize = 'normal' | 'large' | 'xlarge';

interface SettingsContextType {
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  apiBaseUrl: string;
  updateApiBaseUrl: (url: string) => void;
  speechVoice: string;
  setSpeechVoice: (voiceURI: string) => void;
  dyslexiaFont: boolean;
  setDyslexiaFont: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeStudent, isAuthenticated, account } = useAuth();
  const [darkMode, setDarkModeState] = useState<boolean>(() => {
    return localStorage.getItem('spelling_bee_dark_mode') === 'true';
  });

  const [textSize, setTextSizeState] = useState<TextSize>(() => {
    return (localStorage.getItem('spelling_bee_text_size') as TextSize) || 'normal';
  });

  const [apiBaseUrl, setApiBaseUrlState] = useState<string>(getStoredApiBaseUrl());
  const [speechVoice, setSpeechVoiceState] = useState(() => localStorage.getItem('spelling_bee_speech_voice') || '');
  const [dyslexiaFont, setDyslexiaFontState] = useState(
    () => localStorage.getItem('spelling_bee_dyslexia_font') === 'true',
  );

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  useEffect(() => {
    document.documentElement.classList.toggle('dyslexia-mode', dyslexiaFont);
  }, [dyslexiaFont]);

  // Apply the saved reading size to the document. index.css scales the root
  // font for each data-text-size value; index.html applies the stored value
  // before first paint so the page never flashes the default size.
  useEffect(() => {
    document.documentElement.setAttribute('data-text-size', textSize);
  }, [textSize]);

  // Load saved preferences. Account-level preferences win; if the account has
  // none saved yet, fall back to the active learner's preferences so existing
  // per-student setups keep working.
  useEffect(() => {
    if (!isAuthenticated) return;
    void apiClient
      .getAccountPreferences()
      .then((preferences) => {
        const hasSaved =
          preferences &&
          (preferences.darkMode !== undefined ||
            preferences.textSize !== undefined ||
            preferences.dyslexiaFont !== undefined);
        if (hasSaved) {
          setDarkModeState(preferences.darkMode ?? darkMode);
          setTextSizeState(preferences.textSize ?? textSize);
          setDyslexiaFontState(preferences.dyslexiaFont ?? dyslexiaFont);
          return;
        }
        if (activeStudent) {
          void apiClient
            .getStudentPreferences(activeStudent.id)
            .then((studentPrefs) => {
              setDarkModeState(studentPrefs.darkMode);
              setTextSizeState(studentPrefs.textSize);
            })
            .catch(() => undefined);
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id, activeStudent?.id, isAuthenticated]);

  const sync = (partial: { darkMode?: boolean; textSize?: TextSize }) => {
    if (!isAuthenticated) return;
    const accountPatch: { darkMode?: boolean; dyslexiaFont?: boolean; textSize?: TextSize } = {};
    if (partial.darkMode !== undefined) accountPatch.darkMode = partial.darkMode;
    if (partial.textSize !== undefined) accountPatch.textSize = partial.textSize;
    void apiClient.updateAccountPreferences(accountPatch).catch(() => undefined);
    if (activeStudent) void apiClient.updateStudentPreferences(activeStudent.id, partial).catch(() => undefined);
  };

  const setDarkMode = (enabled: boolean) => {
    localStorage.setItem('spelling_bee_dark_mode', String(enabled));
    setDarkModeState(enabled);
    sync({ darkMode: enabled });
  };

  const setTextSize = (size: TextSize) => {
    localStorage.setItem('spelling_bee_text_size', size);
    setTextSizeState(size);
    sync({ textSize: size });
  };

  const updateApiBaseUrl = (url: string) => {
    setStoredApiBaseUrl(url);
    setApiBaseUrlState(url);
  };
  const setSpeechVoice = (voiceURI: string) => {
    localStorage.setItem('spelling_bee_speech_voice', voiceURI);
    setSpeechVoiceState(voiceURI);
  };
  const setDyslexiaFont = (enabled: boolean) => {
    localStorage.setItem('spelling_bee_dyslexia_font', String(enabled));
    setDyslexiaFontState(enabled);
    if (isAuthenticated) void apiClient.updateAccountPreferences({ dyslexiaFont: enabled }).catch(() => undefined);
  };

  return (
    <SettingsContext.Provider
      value={{
        darkMode,
        setDarkMode,
        textSize,
        setTextSize,
        apiBaseUrl,
        updateApiBaseUrl,
        speechVoice,
        setSpeechVoice,
        dyslexiaFont,
        setDyslexiaFont,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
