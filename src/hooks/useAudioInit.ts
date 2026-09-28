// Browsers block Web Audio until the user has interacted with the page, so
// every surface that plays effects waits for the first click/touch/keypress
// before initialising the shared audio singleton. This hook is the single
// implementation of that listener (previously duplicated in App and the
// curriculum preview).

import { useEffect, useState } from 'react';
import { audioFx } from '../utils/audioEffects';

export function useAudioInit(): boolean {
  const [audioReady, setAudioReady] = useState(() => audioFx.isAvailable());

  useEffect(() => {
    const initAudioOnInteraction = () => {
      audioFx.init();
      if (audioFx.isAvailable()) {
        setAudioReady(true);
        removeListeners();
      }
    };

    const removeListeners = () => {
      document.removeEventListener('click', initAudioOnInteraction);
      document.removeEventListener('touchstart', initAudioOnInteraction);
      document.removeEventListener('keydown', initAudioOnInteraction);
    };

    document.addEventListener('click', initAudioOnInteraction);
    document.addEventListener('touchstart', initAudioOnInteraction);
    document.addEventListener('keydown', initAudioOnInteraction);

    return removeListeners;
  }, []);

  return audioReady;
}
